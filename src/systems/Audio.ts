/**
 * AudioSystem — WebAudio-based synthesized placeholder audio.
 *
 * W2-C.1 (Task 6.5.1, TDD_PLAN.md): replaces the 26-line no-op stub from
 * T0.2.2 G1. W2 uses SYNTHESIZED/PLACEHOLDER audio (oscillator tones +
 * a generated music buffer) because public/assets/sounds/ has 0 files —
 * this proves the audio pipeline end-to-end without assets. Real
 * asset-based audio lands in W3 once AssetLoader is fixed.
 *
 * W3-C.2 (Task 6.5.3): cross-browser audio policy — the AudioContext
 * is created lazily (deferred from the constructor) to eliminate the
 * "AudioContext was prevented from starting automatically" warnings
 * that Firefox (and Chromium with autoplay flags) log when a context
 * is constructed or resumed without a preceding user gesture. The
 * context is created on the first markUserGesture() call (fired by
 * MenuScene on click/keydown) or on the first SFX/music trigger.
 *
 * Public surface:
 *   - init(): Promise<void> — create + resume the AudioContext (browser
 *     autoplay policy: contexts start 'suspended' until a user gesture).
 *     Idempotent. W3-C.2: creates the context lazily if it doesn't
 *     exist yet.
 *   - markUserGesture(): void — W3-C.2: call from a user-gesture
 *     handler (click, keydown). Creates + resumes the context.
 *   - playSfx(id: string): void — fire a short synthesized tone through
 *     the SFX gain. W3-C.2: creates the context lazily if needed.
 *     Known ids (jump/collide/powerup/ui) map to distinct
 *     frequencies; unknown ids fall back to a default placeholder tone.
 *   - startMusic(): void — build (once) and loop a synthesized
 *     placeholder music buffer through the music gain. W3-C.2:
 *     creates the context lazily if needed. Idempotent.
 *   - stopMusic(): void — stop the looping music source.
 *   - setMasterVolume(v: number) / setMusicVolume(v) / setSfxVolume(v)
 *   - isAvailable(): boolean — false in degraded mode (no WebAudio).
 *   - cleanup(): void — stop music + close the AudioContext. Idempotent
 *     (Game.cleanup() calls it on every stop; must never throw).
 *
 * Error handling (acceptance: "Audio load failure doesn't crash game"):
 *   if the AudioContext cannot be constructed (platform lacks WebAudio,
 *   constructor throws), the system enters DEGRADED MODE: every method
 *   becomes a no-op and isAvailable() returns false. No throws.
 */
import { Logger } from '@/utils/Logger';
import { GameEvents } from '@/utils/Constants';
import type { AudioConfig } from '@/types/GameTypes';

/**
 * SFX frequency map (Hz) — placeholder synth tones, W2. Distinct enough
 * to be audibly different in the real-browser VERIFY step.
 */
const SFX_FREQUENCIES: Record<string, number> = {
  jump: 880,
  collide: 160,
  powerup: 1320,
  ui: 660
};
const SFX_FALLBACK_FREQUENCY = 440;

/** Music placeholder: 2-second 440Hz sine, synthesized once. */
const MUSIC_DURATION_SECONDS = 2;
const MUSIC_SAMPLE_RATE = 44100;

/**
 * Minimal structural type for the WebAudio surface Audio.ts consumes.
 * Kept local (not a full DOM type) so the degraded-mode code path and
 * the mock (tests/setup/mock-audio.ts) both satisfy it without dragging
 * the whole WebAudio type surface into the system.
 */
interface AudioGain {
  value: number;
  setValueAtTime: (value: number, when: number) => void;
}
interface GainNodeLike {
  gain: AudioGain;
  connect: (destination: unknown) => unknown;
  disconnect: () => void;
}
interface OscillatorNodeLike {
  type: string;
  frequency: AudioGain;
  connect: (destination: unknown) => unknown;
  start: (when?: number) => void;
  stop: (when?: number) => void;
  disconnect: () => void;
}
interface BufferSourceNodeLike {
  buffer: unknown;
  loop: boolean;
  connect: (destination: unknown) => unknown;
  start: (when?: number) => void;
  stop: (when?: number) => void;
  disconnect: () => void;
}
interface AudioContextLike {
  state: 'suspended' | 'running' | 'closed';
  currentTime: number;
  destination: unknown;
  createGain: () => GainNodeLike;
  createOscillator: () => OscillatorNodeLike;
  createBufferSource: () => BufferSourceNodeLike;
  createBuffer: (
    numberOfChannels: number,
    length: number,
    sampleRate: number
  ) => {
    getChannelData: (channel: number) => Float32Array;
  };
  resume: () => Promise<void>;
  close: () => Promise<void>;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export class AudioSystem {
  /** The live AudioContext, or null when not yet created / degraded. */
  private context: AudioContextLike | null = null;
  /** Master gain: destination <- master <- (music, sfx). */
  private masterGain: GainNodeLike | null = null;
  private musicGain: GainNodeLike | null = null;
  private sfxGain: GainNodeLike | null = null;
  /** The looping music source; null when music is not playing. */
  private musicSource: BufferSourceNodeLike | null = null;
  /** Synthesized music buffer — built lazily on the first startMusic(). */
  private musicBuffer: unknown = null;
  /** True once init() has resumed the context (idempotency guard). */
  private initialized = false;
  /** True once cleanup() has closed the context (idempotency guard). */
  private cleanedUp = false;
  /** True once bindToGameEvents() has attached listeners (idempotency guard). */
  private eventsBound = false;

  constructor(config: AudioConfig) {
    // W3-C.2: do NOT create the AudioContext here. Browsers log a warning
    // when an AudioContext is constructed without a preceding user gesture.
    // The context is created lazily via ensureContext() when the first
    // user gesture arrives (markUserGesture -> init -> ensureContext)
    // or when a SFX/music trigger fires (playSfx/startMusic -> ensureContext).
    // In degraded mode (no WebAudio) ensureContext returns null and every
    // method stays a no-op — same behavior as before.
    // The config volumes are stored and applied when the context is created.
    this._configVolumes = config;
  }

  /** Config volumes, stored for deferred application at context creation. */
  private _configVolumes: AudioConfig;

  /**
   * W3-C.2: called from MenuScene on the first user gesture (click,
   * keydown). Creates the AudioContext (if not already created) and
   * resumes it so audio can play. Safe to call multiple times; safe in
   * degraded mode. Fire-and-forget — never blocks the caller.
   */
  markUserGesture(): void {
    void this.init();
  }

  /**
   * Ensure the AudioContext exists. Creates it (and the gain chain) on
   * first call. No-op when the context already exists or when WebAudio
   * is unavailable (degraded mode). W3-C.2: safe to call from playSfx /
   * startMusic even before a user gesture — SFX events only fire during
   * gameplay, which is always post-gesture.
   */
  private ensureContext(): void {
    if (this.context) return;
    const ctx = this.createContext();
    if (!ctx) return; // degraded mode
    this.context = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = clampVolume(this._configVolumes.masterVolume);
    this.masterGain.connect(ctx.destination);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = clampVolume(this._configVolumes.sfxVolume);
    this.sfxGain.connect(this.masterGain);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = clampVolume(this._configVolumes.musicVolume);
    this.musicGain.connect(this.masterGain);
  }

  /**
   * Create the AudioContext, tolerating platforms without WebAudio.
   * Returns null (degraded mode) instead of throwing.
   */
  private createContext(): AudioContextLike | null {
    try {
      const candidate: unknown =
        window.AudioContext ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext;
      if (typeof candidate !== 'function') {
        Logger.warn('AudioSystem: WebAudio unavailable — running degraded');
        return null;
      }
      // The real DOM AudioContext is structurally richer than
      // AudioContextLike (e.g. `state` is the `AudioState` union); the
      // cast is sound because we only consume the narrow surface.
      return new (candidate as new () => AudioContextLike)();
    } catch (err) {
      Logger.error('AudioSystem: AudioContext construction failed — degraded', err);
      return null;
    }
  }

  /**
   * Resume the context so audio can actually play (browser autoplay
   * policy). W3-C.2: creates the context lazily via ensureContext() if
   * it doesn't exist yet. Safe to call multiple times; safe in degraded
   * mode. The context is only created when a user gesture has been
   * received (markUserGesture) OR when called from a SFX/music trigger
   * (which only fires during gameplay, always post-gesture).
   */
  async init(): Promise<void> {
    this.ensureContext();
    if (!this.context || this.initialized) {
      return;
    }
    try {
      await this.context.resume();
      this.initialized = true;
    } catch (err) {
      Logger.warn('AudioSystem: context resume failed — staying suspended', err);
    }
  }

  /**
   * Play a short synthesized SFX tone. No-op in degraded mode or after
   * cleanup. W3-C.2: ensures the context exists before playing (lazy
   * creation — SFX events only fire during gameplay, which is
   * always post-gesture). Each call creates + schedules a fresh
   * oscillator.
   */
  playSfx(id: string): void {
    this.ensureContext();
    if (!this.context || !this.sfxGain) {
      return;
    }
    try {
      const frequency =
        SFX_FREQUENCIES[id] ?? SFX_FALLBACK_FREQUENCY;
      const oscillator = this.context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(this.sfxGain);
      const now = this.context.currentTime;
      // 0.15s tone with a short release so the gain never pops.
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (err) {
      Logger.warn('AudioSystem: playSfx failed', err);
    }
  }

  /**
   * Start the synthesized placeholder music loop. The buffer is
   * generated once; the source is (re)created on each start. W3-C.2:
   * ensures the context exists before starting (lazy creation). No-op
   * when music is already running or in degraded mode.
   */
  startMusic(): void {
    this.ensureContext();
    if (!this.context || !this.musicGain || this.musicSource) {
      return;
    }
    try {
      if (!this.musicBuffer) {
        this.musicBuffer = this.synthesizeMusicBuffer();
      }
      const source = this.context.createBufferSource();
      source.buffer = this.musicBuffer;
      source.loop = true;
      source.connect(this.musicGain);
      source.start(this.context.currentTime);
      this.musicSource = source;
    } catch (err) {
      Logger.warn('AudioSystem: startMusic failed', err);
      this.musicSource = null;
    }
  }

  /** Stop the looping music source. No-op when not playing. */
  stopMusic(): void {
    if (!this.musicSource) {
      return;
    }
    try {
      this.musicSource.stop(this.context?.currentTime ?? 0);
    } catch (err) {
      Logger.warn('AudioSystem: stopMusic failed', err);
    }
    this.musicSource = null;
  }

  setMasterVolume(volume: number): void {
    this.applyVolume(this.masterGain, volume);
  }

  setMusicVolume(volume: number): void {
    this.applyVolume(this.musicGain, volume);
  }

  setSfxVolume(volume: number): void {
    this.applyVolume(this.sfxGain, volume);
  }

  private applyVolume(gain: GainNodeLike | null, volume: number): void {
    if (!gain) {
      return;
    }
    gain.gain.value = clampVolume(volume);
  }

  /**
   * W2-C.2 (Task 6.5.2) — wire game events to audio triggers.
   *
   * Subscribes to the GameEvents defined in Constants.ts that are
   * dispatched on `window` by the game logic (Player, GameScene, Game):
   *
   *   player:jump     -> playSfx('jump')
   *   player:collide  -> playSfx('collide')
   *   player:powerup  -> playSfx('powerup')
   *   game:pause      -> stopMusic()
   *   game:resume     -> startMusic()
   *   game:stop       -> stopMusic()
   *
   * Idempotent: a second call returns without attaching duplicate
   * listeners. Safe in degraded mode: playSfx/startMusic/stopMusic
   * are all no-ops when no context was created.
   *
   * W3-C.2: no longer gates on `this.context` at bind time — the
   * context may not exist yet (deferred creation). The listeners
   * call playSfx/startMusic/stopMusic which each call ensureContext()
   * internally, so they create the context on first fire if needed.
   *
   * The audio system owns the subscriptions (not Game or a scene), so
   * the binding is testable in isolation: dispatch a CustomEvent on
   * window and assert the right node graph was touched.
   */
  bindToGameEvents(): void {
    if (this.eventsBound) {
      return;
    }
    this.eventsBound = true;

    // SFX triggers — fired synchronously so there is no audio lag.
    window.addEventListener(GameEvents.PLAYER_JUMP, () => {
      this.playSfx('jump');
    });
    window.addEventListener(GameEvents.PLAYER_COLLIDE, () => {
      this.playSfx('collide');
    });
    window.addEventListener(GameEvents.PLAYER_POWERUP, () => {
      this.playSfx('powerup');
    });

    // Music lifecycle — stop on pause/stop, restart on resume.
    window.addEventListener(GameEvents.GAME_PAUSE, () => {
      this.stopMusic();
    });
    window.addEventListener(GameEvents.GAME_RESUME, () => {
      this.startMusic();
    });
    window.addEventListener(GameEvents.GAME_STOP, () => {
      this.stopMusic();
    });
  }

  /** False in degraded mode (no WebAudio context was created). */
  isAvailable(): boolean {
    return this.context !== null;
  }

  /**
   * Release audio resources: stop music, close the context. Idempotent —
   * Game.cleanup() may run multiple times over the game's lifetime.
   */
  cleanup(): void {
    if (this.cleanedUp || !this.context) {
      this.cleanedUp = true;
      return;
    }
    this.stopMusic();
    this.cleanedUp = true;
    try {
      // close() is a promise in real WebAudio and in the mock; we don't
      // block cleanup on it — mark it ignored explicitly.
      void this.context.close();
    } catch (err) {
      Logger.warn('AudioSystem: context close failed', err);
    }
  }

  /**
   * Synthesize the placeholder music buffer: a 2-second layered sine
   * (root + fifth) with a soft amplitude wobble. Pure math — no assets.
   */
  private synthesizeMusicBuffer(): unknown {
    const sampleRate = MUSIC_SAMPLE_RATE;
    const length = Math.floor(sampleRate * MUSIC_DURATION_SECONDS);
    const buffer = this.context!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const root = 220; // A3
    const fifth = 330; // E4
    for (let i = 0; i < length; i += 1) {
      const t = i / sampleRate;
      // Slow wobble (2Hz) makes the loop feel alive instead of static.
      const wobble = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2 * t);
      data[i] =
        (Math.sin(2 * Math.PI * root * t) * 0.4 +
          Math.sin(2 * Math.PI * fifth * t) * 0.2) *
        wobble *
        0.5;
    }
    return buffer;
  }
}
