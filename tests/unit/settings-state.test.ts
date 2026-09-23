/**
 * W3-C.4 (kanban t_421f4c7f) — Settings state manager (src/systems/Settings.ts).
 *
 * Settings persist to LocalStorage under 'cluster-rush-settings'.
 *   Defaults: volume=80, speed=1.0, difficulty='normal'.
 *
 * Unit tests (per card):
 *   - load() returns defaults when nothing is stored.
 *   - save() writes the settings object to LocalStorage under the right key.
 *   - load() restores saved values (incl. non-default speed/difficulty).
 *   - load() is resilient: corrupt JSON / partial objects fall back to
 *     defaults per-field, never throw.
 *   - setVolume/setSpeed/setDifficulty mutate state + save to storage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SettingsManager,
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
} from '@/systems/Settings';

describe('W3-C.4: Settings state manager', () => {
  let settings: SettingsManager;

  beforeEach(() => {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    settings = new SettingsManager();
  });

  it('defaults are volume=80, speed=1.0, difficulty=normal', () => {
    expect(DEFAULT_SETTINGS.volume).toBe(80);
    expect(DEFAULT_SETTINGS.speed).toBe(1.0);
    expect(DEFAULT_SETTINGS.difficulty).toBe('normal');
    const loaded = settings.load();
    expect(loaded).toEqual({
      volume: 80,
      speed: 1.0,
      difficulty: 'normal',
    });
  });

  it('load() returns defaults when nothing is stored in LocalStorage', () => {
    expect(settings.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('save() persists the current settings under the storage key', () => {
    settings.setVolume(30);
    settings.setSpeed(1.5);
    settings.setDifficulty('hard');
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({ volume: 30, speed: 1.5, difficulty: 'hard' });
  });

  it('load() restores previously saved settings', () => {
    settings.setVolume(15);
    settings.setSpeed(2.0);
    settings.setDifficulty('easy');
    const fresh = new SettingsManager();
    expect(fresh.load()).toEqual({ volume: 15, speed: 2.0, difficulty: 'easy' });
  });

  it('load() tolerates corrupt JSON and returns defaults', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{not valid json!!');
    expect(settings.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('load() falls back to per-field defaults for partial/invalid objects', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ volume: 50, speed: 'fast', difficulty: 'nightmare' })
    );
    const loaded = settings.load();
    expect(loaded.volume).toBe(50);
    expect(loaded.speed).toBe(1.0); // invalid speed -> default
    expect(loaded.difficulty).toBe('normal'); // invalid difficulty -> default
  });

  it('setters mutate state and persist immediately', () => {
    settings.setSpeed(0.5);
    expect(settings.getSpeed()).toBe(0.5);
    const raw = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY)!);
    expect(raw.speed).toBe(0.5);
    expect(raw.volume).toBe(80); // untouched default
  });
});
