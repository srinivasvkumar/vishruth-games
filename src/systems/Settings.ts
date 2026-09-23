/**
 * Settings state manager (W3-C.4).
 *
 * Owns the user-facing settings persisted to LocalStorage under
 * SETTINGS_STORAGE_KEY ('cluster-rush-settings'):
 *   - volume: master volume, 0–100 (default 80).
 *   - speed: game-speed multiplier (default 1.0).
 *   - difficulty: 'easy' | 'normal' | 'hard' (default 'normal').
 *
 * Responsibilities:
 *   - load(): read + validate settings from LocalStorage; fall back to
 *     per-field defaults (corrupt JSON, partial objects, out-of-domain
 *     values never throw).
 *   - save(): persist the current settings object.
 *   - setVolume / setSpeed / setDifficulty: mutate state + persist.
 *
 * Consumers:
 *   - MenuScene (settings panel): renders controls, applies volume to
 *     AudioSystem.setMasterVolume and speed to Game.setSpeedMultiplier,
 *     persists on every change, re-loads on menu onEnter().
 *   - GameScene: reads difficulty to pick obstacle spawn parameters.
 *
 * No WebAudio / DOM dependencies here — pure state + storage, so the
 * manager is trivially unit-testable in happy-dom.
 */
import { Logger } from '@/utils/Logger';

/** LocalStorage key for persisted settings (per card: 'cluster-rush-settings'). */
export const SETTINGS_STORAGE_KEY = 'cluster-rush-settings';

/** Difficulty levels. */
export type Difficulty = 'easy' | 'normal' | 'hard';

/** Persisted settings shape. */
export interface Settings {
  /** Master volume, 0–100 (percentage). */
  volume: number;
  /** Game-speed multiplier (0.5, 1.0, 1.5, 2.0). */
  speed: number;
  /** Obstacle spawn difficulty. */
  difficulty: Difficulty;
}

/** Default settings (per card: volume=80, speed=1.0, difficulty='normal'). */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  volume: 80,
  speed: 1.0,
  difficulty: 'normal',
});

/** Allowed speed multipliers (validated on load). */
const ALLOWED_SPEEDS: readonly number[] = [0.5, 1.0, 1.5, 2.0];

function isValidDifficulty(value: unknown): value is Difficulty {
  return (
    value === 'easy' || value === 'normal' || value === 'hard'
  );
}

function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SETTINGS.volume;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function sanitizeSpeed(value: unknown): number {
  if (typeof value === 'number' && ALLOWED_SPEEDS.includes(value)) {
    return value;
  }
  return DEFAULT_SETTINGS.speed;
}

function sanitizeDifficulty(value: unknown): Difficulty {
  return isValidDifficulty(value) ? value : DEFAULT_SETTINGS.difficulty;
}

/**
 * Validate a raw parsed storage value into a clean Settings object.
 * Per-field fallback to defaults — corrupt JSON / partial / out-of-domain
 * values never throw (they degrade to the matching default).
 */
export function sanitizeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    volume: clampVolume(obj.volume),
    speed: sanitizeSpeed(obj.speed),
    difficulty: sanitizeDifficulty(obj.difficulty),
  };
}

export class SettingsManager {
  private settings: Settings = { ...DEFAULT_SETTINGS };

  /**
   * Load settings from LocalStorage, merging over defaults. Never throws:
   * unreadable / corrupt / partial storage yields the default (or the
   * valid subset of) settings.
   */
  load(): Settings {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw === null) {
        this.settings = { ...DEFAULT_SETTINGS };
        return this.settings;
      }
      const parsed: unknown = JSON.parse(raw);
      this.settings = sanitizeSettings(parsed);
      return this.settings;
    } catch (err) {
      Logger.warn('SettingsManager: failed to load settings — using defaults', err);
      this.settings = { ...DEFAULT_SETTINGS };
      return this.settings;
    }
  }

  /** Persist the current settings object to LocalStorage. */
  save(): void {
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(this.settings)
      );
    } catch (err) {
      Logger.warn('SettingsManager: failed to save settings', err);
    }
  }

  /** Current settings snapshot. */
  getSettings(): Settings {
    return { ...this.settings };
  }

  getVolume(): number {
    return this.settings.volume;
  }

  getSpeed(): number {
    return this.settings.speed;
  }

  getDifficulty(): Difficulty {
    return this.settings.difficulty;
  }

  /** Set master volume (0–100), clamp, persist. */
  setVolume(volume: number): void {
    this.settings.volume = clampVolume(volume);
    this.save();
  }

  /** Set game-speed multiplier (must be an allowed value), persist. */
  setSpeed(speed: number): void {
    const sanitized = sanitizeSpeed(speed);
    this.settings.speed = sanitized;
    this.save();
  }

  /** Set difficulty (must be a valid level), persist. */
  setDifficulty(difficulty: Difficulty): void {
    const sanitized = sanitizeDifficulty(difficulty);
    this.settings.difficulty = sanitized;
    this.save();
  }
}
