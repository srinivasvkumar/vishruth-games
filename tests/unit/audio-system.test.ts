import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioSystem } from '@/systems/Audio';
import type { AudioConfig } from '@/types/GameTypes';
import {
  MockAudioContext,
  installMockAudioContext,
  removeMockAudioContext
} from '../setup/mock-audio';

/**
 * W2-C.1 (Task 6.5.1) — AudioSystem real implementation (synthesized).
 *
 * Replaces the 26-line no-op stub from T0.2.2 G1 with a WebAudio-based
 * system. W2 uses SYNTHESIZED/PLACEHOLDER audio (oscillator/noise) since
 * public/assets/sounds/ has 0 files — real asset-based audio is W3.
 *
 * TDD evidence:
 *   RED: the pre-implementation stub exposes only {constructor, cleanup}
 *        — every behavior below fails against it (verified in
 *        tests/evidence/w2/W2-C1-RED.txt).
 *   GREEN: minimal WebAudio implementation in src/systems/Audio.ts.
 *
 * WebAudio is mocked (tests/setup/mock-audio.ts) because happy-dom has no
 * AudioContext. The mock records node creation and param sets so the
 * pipeline (context -> master gain -> music/sfx gains -> oscillators /
 * buffer sources) is assertable without hardware.
 *
 * Acceptance criteria (TDD_PLAN.md Task 6.5.1):
 *   - [x] AudioContext initialized
 *   - [x] Background music loops correctly (synthesized placeholder in W2)
 *   - [x] Sound effects play on trigger
 *   - [x] Volume controls work (master, music, SFX)
 *   - [x] Error Handling: Audio load failure doesn't crash game
 */

const AUDIO_CONFIG: AudioConfig = {
  masterVolume: 1,
  musicVolume: 0.8,
  sfxVolume: 0.9,
  spatialAudio: false
};

// The mock's class identity — used to assert AudioSystem grabbed it.
let MockCtx: typeof MockAudioContext;

beforeEach(() => {
  // happy-dom lacks AudioContext; install the mock BEFORE constructing
  // AudioSystem (ctor reads window.AudioContext ?? window.webkitAudioContext).
  MockCtx = installMockAudioContext();
});

afterEach(() => {
  removeMockAudioContext();
});

function lastMockContext(system: AudioSystem): MockAudioContext {
  return (
    system as unknown as { context: MockAudioContext }
  ).context;
}

describe('W2-C.1 AudioSystem (Task 6.5.1, synthesized placeholder)', () => {
  describe('context init', () => {
    it('constructs an AudioContext from the platform class on construction', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      expect(ctx).toBeInstanceOf(MockCtx);
      expect(ctx.state).toBe('suspended');
    });

    it('init() resumes a suspended context (browser autoplay policy)', async () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      expect(lastMockContext(audio).state).toBe('suspended');
      await audio.init();
      expect(lastMockContext(audio).state).toBe('running');
    });

    it('init() is idempotent (a second call is a no-op, not a re-resume)', async () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      await audio.init();
      const ctx = lastMockContext(audio);
      const resumeSpy = vi.spyOn(ctx, 'resume');
      await audio.init();
      expect(resumeSpy).not.toHaveBeenCalled();
      expect(ctx.state).toBe('running');
    });
  });

  describe('synthesized SFX trigger', () => {
    it('playSfx("jump") starts a new oscillator through the sfx gain', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      audio.playSfx('jump');
      const sfxGain = ctx.nodes.gains[1]; // creation order: master, sfx, music
      const osc = ctx.nodes.oscillators[0];
      expect(osc).toBeDefined();
      expect(osc.started).toBe(true);
      // Routing: destination <- master <- sfx gain <- osc. The mock
      // records each source node's direct target: osc.target === sfxGain,
      // sfxGain.target === master, master.target === ctx.destination.
      expect(osc.target).toBe(sfxGain);
      expect(sfxGain.target).toBe(ctx.nodes.gains[0]);
      expect(ctx.nodes.gains[0].target).toBe(ctx.destination);
    });

    it('each playSfx call creates its own oscillator (no node reuse)', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      audio.playSfx('jump');
      audio.playSfx('collide');
      audio.playSfx('powerup');
      expect(ctx.nodes.oscillators.length).toBe(3);
    });

    it('SFX oscillators are scheduled to stop (envelopes, not run-away nodes)', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      audio.playSfx('jump');
      const osc = ctx.nodes.oscillators[0];
      expect(osc.stopped).toBe(true);
      expect(typeof osc.stopTime).toBe('number');
    });

    it('different SFX ids use distinct frequencies (audible variety)', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      audio.playSfx('jump');
      audio.playSfx('collide');
      const jump = ctx.nodes.oscillators[0];
      const collide = ctx.nodes.oscillators[1];
      const jumpFreq = (jump.frequency as { value: number }).value;
      const collideFreq = (collide.frequency as { value: number }).value;
      expect(jumpFreq).not.toBe(collideFreq);
    });

    it('unknown SFX ids still play a valid placeholder tone (no throw)', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      expect(() => audio.playSfx('not-a-real-sfx')).not.toThrow();
      expect(ctx.nodes.oscillators.length).toBe(1);
      expect(ctx.nodes.oscillators[0].started).toBe(true);
    });
  });

  describe('music loop (synthesized placeholder)', () => {
    it('startMusic() runs a looping buffer source through the music gain', async () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      await audio.init();
      audio.startMusic();
      const src = ctx.nodes.bufferSources[0];
      const musicGain = ctx.nodes.gains[2]; // creation order: master, sfx, music
      expect(src).toBeDefined();
      expect(src.loop).toBe(true);
      expect(src.started).toBe(true);
      expect(src.buffer).toBeDefined();
      // Routing: destination <- master <- music gain <- source.
      expect(src.target).toBe(musicGain);
      expect(musicGain.target).toBe(ctx.nodes.gains[0]);
    });

    it('the music buffer is synthesized, not loaded from a file', async () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      await audio.init();
      audio.startMusic();
      // createBuffer was used (0 files on disk in W2).
      expect(ctx.nodes.buffers.length).toBe(1);
      const buffer = ctx.nodes.buffers[0];
      expect(buffer.length).toBeGreaterThan(0);
      // Placeholder synth: at least some non-silent samples.
      expect(Array.from(buffer).some((s) => Math.abs(s) > 0)).toBe(true);
    });

    it('startMusic() is idempotent (no duplicate sources on repeat)', async () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      await audio.init();
      audio.startMusic();
      audio.startMusic();
      expect(ctx.nodes.bufferSources.length).toBe(1);
    });

    it('stopMusic() stops the looping source', async () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      await audio.init();
      audio.startMusic();
      audio.stopMusic();
      const src = ctx.nodes.bufferSources[0];
      expect(src.stopped).toBe(true);
      // Stopped source can be restarted cleanly on the next startMusic().
      audio.startMusic();
      expect(ctx.nodes.bufferSources.length).toBe(2);
    });
  });

  describe('volume controls', () => {
    it('constructor applies the config volumes to the gain chain', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      const master = ctx.nodes.gains[0];
      const sfx = ctx.nodes.gains[1];
      const music = ctx.nodes.gains[2];
      expect((master.gain as { value: number }).value).toBeCloseTo(1);
      expect((sfx.gain as { value: number }).value).toBeCloseTo(0.9);
      expect((music.gain as { value: number }).value).toBeCloseTo(0.8);
    });

    it('setMasterVolume / setMusicVolume / setSfxVolume each update exactly their gain', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      audio.setMasterVolume(0.5);
      audio.setMusicVolume(0.25);
      audio.setSfxVolume(0.75);
      const [master, sfx, music] = ctx.nodes.gains;
      expect((master.gain as { value: number }).value).toBeCloseTo(0.5);
      expect((sfx.gain as { value: number }).value).toBeCloseTo(0.75);
      expect((music.gain as { value: number }).value).toBeCloseTo(0.25);
    });

    it('volume setters clamp out-of-range values into [0, 1]', () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      audio.setMasterVolume(2.5);
      audio.setMusicVolume(-1);
      audio.setSfxVolume(NaN);
      const [master, sfx, music] = ctx.nodes.gains;
      expect((master.gain as { value: number }).value).toBe(1);
      expect((sfx.gain as { value: number }).value).toBe(0);
      expect((music.gain as { value: number }).value).toBe(0);
    });
  });

  describe('cleanup + graceful load failure (no crash)', () => {
    it('cleanup() closes the context and is idempotent', async () => {
      const audio = new AudioSystem(AUDIO_CONFIG);
      const ctx = lastMockContext(audio);
      audio.cleanup();
      expect(ctx.state).toBe('closed');
      // Second cleanup must not throw (Game.cleanup() runs on every stop).
      expect(() => audio.cleanup()).not.toThrow();
    });

    it('AudioContext constructor failure -> degraded mode, no crash', () => {
      // Simulate a platform with NO WebAudio (or a throwing constructor):
      // both globals are removed so the ctor fallback chain finds nothing.
      removeMockAudioContext();
      vi.stubGlobal('AudioContext', class {
        constructor() {
          throw new Error('simulated WebAudio unavailable');
        }
      });
      // The system must NOT throw at construction...
      const audio = new AudioSystem(AUDIO_CONFIG);
      // ...and the whole lifecycle stays no-throw (load-failure path).
      expect(() => audio.playSfx('jump')).not.toThrow();
      expect(() => audio.startMusic()).not.toThrow();
      expect(() => audio.stopMusic()).not.toThrow();
      expect(() => audio.setMasterVolume(0.5)).not.toThrow();
      expect(() => audio.cleanup()).not.toThrow();
      expect(audio.isAvailable()).toBe(false);
    });
  });
});

/**
 * W2-C.2 (Task 6.5.2) — Audio synchronization: wire SFX triggers to game
 * events and stop music when the game stops/pauses.
 *
 * TDD evidence:
 *   RED: AudioSystem exposes no bindToGameEvents() — every test in this
 *        block fails (method is not a function) until GREEN lands the
 *        window-event → playSfx/startMusic/stopMusic wiring in Audio.ts.
 *   GREEN: AudioSystem.bindToGameEvents() subscribes to the GameEvents
 *        window events the game logic already defines in Constants.ts:
 *          player:jump     -> playSfx('jump')
 *          player:collide  -> playSfx('collide')
 *          player:powerup  -> playSfx('powerup')
 *          game:pause      -> stopMusic()
 *          game:resume     -> startMusic()
 *          game:stop       -> stopMusic() (cleanup() closes the context)
 *        The audio system owns the subscriptions (not Game or a scene),
 *        so the binding is testable in isolation against the mock
 *        AudioContext: dispatch a CustomEvent on window and assert the
 *        right node graph was touched.
 *
 * Acceptance criteria (TDD_PLAN.md Task 6.5.2):
 *   - [x] Audio events triggered correctly (unit: SFX fires on the right events)
 *   - [x] No audio lag or desync (SFX is fired synchronously from the event)
 *   - [x] Audio stops when game stops (game:stop + game:pause -> stopMusic)
 *   VERIFY (browser): tests/e2e/audio.spec.ts — a jump produces an audio
 *   node in real Chrome. Audibility itself is a manual VERIFY, recorded
 *   in tests/evidence/w2/.
 */
describe('W2-C.2 AudioSystem.bindToGameEvents (Task 6.5.2)', () => {
  const JUMP_EVENT = 'player:jump';
  const COLLIDE_EVENT = 'player:collide';
  const POWERUP_EVENT = 'player:powerup';
  const PAUSE_EVENT = 'game:pause';
  const RESUME_EVENT = 'game:resume';
  const STOP_EVENT = 'game:stop';

  it('bindToGameEvents() is a no-op until the system is available', () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    expect(() => audio.bindToGameEvents()).not.toThrow();
  });

  it('player:jump fires the jump SFX (oscillator through the sfx gain)', () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    const ctx = lastMockContext(audio);
    audio.bindToGameEvents();
    window.dispatchEvent(new CustomEvent(JUMP_EVENT));
    const osc = ctx.nodes.oscillators[0];
    expect(osc).toBeDefined();
    expect(osc.started).toBe(true);
    // jump SFX = 880 Hz (SFX_FREQUENCIES.jump in Audio.ts).
    expect((osc.frequency as { value: number }).value).toBe(880);
    expect(osc.target).toBe(ctx.nodes.gains[1]); // sfx gain
  });

  it('player:collide fires the collide SFX with a distinct frequency', () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    const ctx = lastMockContext(audio);
    audio.bindToGameEvents();
    window.dispatchEvent(new CustomEvent(JUMP_EVENT));
    window.dispatchEvent(new CustomEvent(COLLIDE_EVENT));
    const jump = ctx.nodes.oscillators[0];
    const collide = ctx.nodes.oscillators[1];
    expect((jump.frequency as { value: number }).value).not.toBe(
      (collide.frequency as { value: number }).value
    );
    // collide SFX = 160 Hz (low thud, SFX_FREQUENCIES.collide in Audio.ts).
    expect((collide.frequency as { value: number }).value).toBe(160);
  });

  it('player:powerup fires the powerup SFX', () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    const ctx = lastMockContext(audio);
    audio.bindToGameEvents();
    window.dispatchEvent(new CustomEvent(POWERUP_EVENT));
    const osc = ctx.nodes.oscillators[0];
    expect(osc.started).toBe(true);
    // powerup SFX = 1320 Hz (SFX_FREQUENCIES.powerup in Audio.ts).
    expect((osc.frequency as { value: number }).value).toBe(1320);
  });

  it('game:pause stops the music; game:resume restarts it', async () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    const ctx = lastMockContext(audio);
    await audio.init();
    audio.startMusic();
    audio.bindToGameEvents();
    window.dispatchEvent(new CustomEvent(PAUSE_EVENT));
    const src = ctx.nodes.bufferSources[0];
    expect(src.stopped).toBe(true);
    // Resuming re-creates the looping source (startMusic is the restart).
    window.dispatchEvent(new CustomEvent(RESUME_EVENT));
    expect(ctx.nodes.bufferSources.length).toBe(2);
    expect(ctx.nodes.bufferSources[1].started).toBe(true);
  });

  it('game:stop stops the music', async () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    const ctx = lastMockContext(audio);
    await audio.init();
    audio.startMusic();
    audio.bindToGameEvents();
    window.dispatchEvent(new CustomEvent(STOP_EVENT));
    expect(ctx.nodes.bufferSources[0].stopped).toBe(true);
  });

  it('bindToGameEvents() is idempotent (no duplicate listeners)', () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    const ctx = lastMockContext(audio);
    audio.bindToGameEvents();
    audio.bindToGameEvents();
    window.dispatchEvent(new CustomEvent(JUMP_EVENT));
    // Two bound listeners would create two oscillators for one jump.
    expect(ctx.nodes.oscillators.length).toBe(1);
  });

  it('event wiring survives degraded mode (no listeners, no throw)', () => {
    // No WebAudio at all: bind + dispatch must be a silent no-op.
    removeMockAudioContext();
    const audio = new AudioSystem(AUDIO_CONFIG);
    expect(audio.isAvailable()).toBe(false);
    expect(() => audio.bindToGameEvents()).not.toThrow();
    expect(
      () => window.dispatchEvent(new CustomEvent(JUMP_EVENT))
    ).not.toThrow();
  });
});
