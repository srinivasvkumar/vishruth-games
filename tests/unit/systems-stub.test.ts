import { describe, it, expect, vi } from 'vitest';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';
import type { AudioConfig, UIConfig } from '@/types/GameTypes';

/**
 * W1-C gap-fill (t_fa4d5774): stub-method coverage for the D0.2 G1 GREEN
 * stubs (boss ruling D0.2 / task G1):
 *
 *   src/systems/Audio.ts — AudioSystem: constructor(config) + cleanup()
 *   src/systems/UI.ts    — UISystem:    constructor(config) + update(dt) + cleanup()
 *
 * These are RETROACTIVE tests against frozen production code: the stubs are
 * no-ops by documented design (each class's header comment states "Stub
 * surface = exactly what src/core/Game.ts references ... No business logic
 * beyond that surface"). The tests verify CURRENT behavior:
 *   - construction succeeds and is repeatable
 *   - every stub method is callable, no-throw, returns undefined
 *   - repeated (idempotent) calls stay no-op
 *
 * No console output is produced by the stub bodies — we assert call
 * acceptance instead of side effects, because no side effects exist.
 */

const AUDIO_CONFIG: AudioConfig = {
  masterVolume: 1,
  musicVolume: 0.8,
  sfxVolume: 0.9,
  spatialAudio: false
};

const UI_CONFIG: UIConfig = {
  theme: 'dark',
  fontSize: 16,
  showFPS: true,
  showDebug: false
};

describe('AudioSystem stub (W1-C gap-fill)', () => {
  it('constructs without error with a valid AudioConfig', () => {
    expect(() => new AudioSystem(AUDIO_CONFIG)).not.toThrow();
  });

  it('constructs with zeroed volumes / spatial audio on', () => {
    expect(
      () =>
        new AudioSystem({
          masterVolume: 0,
          musicVolume: 0,
          sfxVolume: 0,
          spatialAudio: true
        })
    ).not.toThrow();
  });

  it('cleanup() is callable and no-throw', () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    expect(() => audio.cleanup()).not.toThrow();
    expect(audio.cleanup()).toBeUndefined();
  });

  it('cleanup() is idempotent (multiple calls stay no-op)', () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    audio.cleanup();
    audio.cleanup();
    audio.cleanup();
    // Stub retains no state — repeated calls must never throw.
    expect(() => audio.cleanup()).not.toThrow();
  });

  it('exposes exactly the documented stub surface (constructor + cleanup)', () => {
    const audio = new AudioSystem(AUDIO_CONFIG);
    // The stub class declares only `cleanup` as an instance method
    // (constructor is implicit). No Week-1 surface (playMusic, playSfx,
    // setVolume, ...) may exist yet.
    const protoNames = Object.getOwnPropertyNames(Object.getPrototypeOf(audio)).sort();
    expect(protoNames).toEqual(['cleanup', 'constructor']);
  });
});

describe('UISystem stub (W1-C gap-fill)', () => {
  it('constructs without error with a valid UIConfig', () => {
    expect(() => new UISystem(UI_CONFIG)).not.toThrow();
  });

  it('constructs with the light theme variant', () => {
    expect(
      () =>
        new UISystem({
          theme: 'light',
          fontSize: 12,
          showFPS: false,
          showDebug: true
        })
    ).not.toThrow();
  });

  it('update(deltaTime) is callable and no-throw for typical deltas', () => {
    const ui = new UISystem(UI_CONFIG);
    expect(() => ui.update(0.016)).not.toThrow();
    expect(ui.update(0.016)).toBeUndefined();
    expect(() => ui.update(0)).not.toThrow();
  });

  it('update(deltaTime) tolerates out-of-range deltas (stub does not validate)', () => {
    const ui = new UISystem(UI_CONFIG);
    // Current behavior: the stub ignores the argument entirely, so
    // negative/huge deltas are accepted without error.
    expect(ui.update(-1)).toBeUndefined();
    expect(ui.update(1e9)).toBeUndefined();
  });

  it('cleanup() is callable and no-throw', () => {
    const ui = new UISystem(UI_CONFIG);
    expect(() => ui.cleanup()).not.toThrow();
    expect(ui.cleanup()).toBeUndefined();
  });

  it('update() + cleanup() are idempotent (repeated calls stay no-op)', () => {
    const ui = new UISystem(UI_CONFIG);
    for (let i = 0; i < 3; i += 1) {
      ui.update(0.016);
      ui.cleanup();
    }
    expect(() => ui.update(0.016)).not.toThrow();
    expect(() => ui.cleanup()).not.toThrow();
  });

  it('exposes exactly the documented stub surface (update + cleanup)', () => {
    const ui = new UISystem(UI_CONFIG);
    // The stub class declares only `update` and `cleanup` as instance
    // methods. No Week-1 surface (showScore, renderMenu, ...) may exist yet.
    const protoNames = Object.getOwnPropertyNames(Object.getPrototypeOf(ui)).sort();
    expect(protoNames).toEqual(['cleanup', 'constructor', 'update']);
  });

  it('is constructible via the src/core/Game.ts call shape', () => {
    // src/core/Game.ts:27-28 constructs both systems from config.audio /
    // config.ui at startup and calls cleanup() on teardown (:114-115).
    // Verify that exact lifecycle runs without error.
    const audio = new AudioSystem(AUDIO_CONFIG);
    const ui = new UISystem(UI_CONFIG);
    expect(() => {
      ui.update(0.016);
      audio.cleanup();
      ui.cleanup();
    }).not.toThrow();
  });
});
