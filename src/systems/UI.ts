/**
 * Minimal GREEN stub for T0.2.2 (kanban G1) against pre-existing RED in
 * tests/unit/game.test.ts. Real implementation: Week 1 (TDD_PLAN.md feature
 * spec).
 *
 * Stub surface = exactly what src/core/Game.ts references:
 *   - constructor(config: UIConfig)       — src/core/Game.ts:28 `new UISystem(config.ui)`
 *   - update(deltaTime: number): void    — src/core/Game.ts:102 `this.uiSystem.update(deltaTime)`
 *   - cleanup(): void                   — src/core/Game.ts:115 `this.uiSystem.cleanup()`
 * No business logic beyond that surface (boss ruling D0.2 / task G1).
 */
import type { UIConfig } from '@/types/GameTypes';

export class UISystem {
  /**
   * Retain the config for the Week 1 implementation (theme, fontSize,
   * showFPS, showDebug). Unused by this stub.
   */
  constructor(_config: UIConfig) {
    // no-op — HUD/debug overlay is implemented in Week 1
  }

  /** Per-frame update driven by the game loop. No-op in this stub. */
  update(_deltaTime: number): void {
    // no-op
  }

  /** Release UI resources. No-op in this stub (nothing is allocated). */
  cleanup(): void {
    // no-op
  }
}
