/**
 * Minimal GREEN stub for T0.2.2 (kanban G1) against pre-existing RED in
 * tests/unit/game.test.ts. Real implementation: Week 1 (TDD_PLAN.md feature
 * spec).
 *
 * Stub surface = exactly what src/core/Game.ts references:
 *   - constructor(config: AudioConfig)  — src/core/Game.ts:27 `new AudioSystem(config.audio)`
 *   - cleanup(): void                  — src/core/Game.ts:114 `this.audioSystem.cleanup()`
 * No business logic beyond that surface (boss ruling D0.2 / task G1).
 */
import type { AudioConfig } from '@/types/GameTypes';

export class AudioSystem {
  /**
   * Retain the config for the Week 1 implementation (master/music/sfx
   * volumes, spatialAudio). Unused by this stub.
   */
  constructor(_config: AudioConfig) {
    // no-op — audio playback is implemented in Week 1
  }

  /** Release audio resources. No-op in this stub (nothing is allocated). */
  cleanup(): void {
    // no-op
  }
}
