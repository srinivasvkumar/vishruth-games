/**
 * AudioSystem — WebAudio-based synthesized placeholder audio.
 *
 * W2-C.1 (Task 6.5.1, TDD_PLAN.md): replaces the 26-line no-op stub from
 * T0.2.2 G1. W2 uses SYNTHESIZED/PLACEHOLDER audio (oscillator tones +
 * a generated music buffer) because public/assets/sounds/ has 0 files —
 * this proves the audio pipeline end-to-end without assets. Real
 * asset-based audio lands in W3 once AssetLoader is fixed.
 *
 * Public surface:
 *   - init(): Promise<void> — resume the AudioContext (browser autoplay
 *     policy: contexts start 'suspended' until a user gesture). Idempotent.
 *   - playSfx(id: string): void — fire a short synthesized tone through
 *     the SFX gain. Known ids (jump/collide/powerup/ui) map to distinct
 *     frequencies; unknown ids fall back to a default placeholder tone.
 *   - startMusic(): void — build (once) and loop a synthesized
 *     placeholder music buffer through the music gain. Idempotent.
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
  /** The live AudioContext, or null in degraded mode (no WebAudio). */
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

  constructor(config: AudioConfig) {
    this.context = this.createContext();
    if (this.context) {
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = clampVolume(config.masterVolume);
      this.masterGain.connect(this.context.destination);

      this.sfxGain = this.context.createGain();
      this.sfxGain.gain.value = clampVolume(config.sfxVolume);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = clampVolume(config.musicVolume);
      this.musicGain.connect(this.masterGain);
    }
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
   * policy). Safe to call multiple times; safe in degraded mode.
   */
  async init(): Promise<void> {
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
   * cleanup. Each call creates + schedules a fresh oscillator.
   */
  playSfx(id: string): void {
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
   * generated once; the source is (re)created on each start. No-op when
   * music is already running or in degraded mode.
   */
  startMusic(): void {
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
