# Findings — W3A.2

## Code facts (verified at commit 13982a3)
- src/systems/UI.ts:163 — UISystem public surface: constructor, update,
  cleanup, setScore, setHealth, setLevel, setPowerUpIndicator,
  getPowerUpIndicator. NO hide/clear method exists.
- UISystem.setScore(n) makes #game-score visible (display:block) + sets
  text "SCORE: n". Same pattern for setHealth/setLevel.
- UISystem.cleanup() removes the three divs from DOM + detaches resize
  listener + sets cleanedUp=true (all setters become no-ops after).
- UISystem.createHud() is idempotent: if #game-score already in DOM,
  reuses it instead of stacking a duplicate.
- src/core/Game.ts:281 — getUISystem(): UISystem { return this.uiSystem; }
- src/core/Game.ts:55 — this.uiSystem = new UISystem(config.ui) in
  constructor. Game.ts:242 calls uiSystem.update(deltaTime) per frame.
  Game.ts:262 calls uiSystem.cleanup() in Game.cleanup().
- src/scenes/GameScene.ts:280-327 — setupUI() creates three divs with
  document.createElement, appends to document.body.
- src/scenes/GameScene.ts:332-348 — updateUI() writes textContent to the
  three divs.
- src/scenes/GameScene.ts:353-357 — removeUI() removes the three divs.
- src/scenes/GameScene.ts:20-22 — three private fields: scoreElement,
  healthElement, levelElement.
- src/scenes/GameScene.ts:28 — constructor calls this.setupUI().
- src/scenes/GameScene.ts:77-79 — onEnter sets display:block on all three.
- src/scenes/GameScene.ts:117-119 — onExit sets display:none on all three.
- src/scenes/GameScene.ts:139 — onCleanup calls this.removeUI().
- src/scenes/GameScene.ts:110 — onUpdate calls this.updateUI().
- src/scenes/GameScene.ts:386-421 — gameOver() creates its own overlay
  div (NOT a HUD element — separate concern, stays in GameScene).

## Test infra
- vitest + happy-dom (config/vite.config.ts:52).
- Test files: tests/**/*.test.ts (config/vite.config.ts:53).
- setupFiles: tests/setup/mock-three.ts, tests/setup/mock-cannon.ts
  (config/vite.config.ts:89) — global mocks for three.js + cannon-es.
- scenes.test.ts:96-106 — createMockGame() has NO getUISystem.
- ui-system.test.ts — tests the real UISystem directly (16 tests, all pass).
- scenes.test.ts:396-409 — existing test asserts GameScene constructor
  creates hidden HUD divs. This test WILL BREAK after migration (the divs
  will be created by UISystem, not GameScene). Must be updated.

## Baseline test state (commit 13982a3)
- tests/unit/scenes.test.ts: 28 tests, all pass
- tests/unit/ui-system.test.ts: 16 tests, all pass
- Full suite: 573/573 (from W3A.1 handoff)

## E2E references to HUD ids (NOT in scope, but noted)
- tests/e2e/smoke/smoke.spec.ts:84,121,171,172
- tests/e2e/w2-w21b-start-path.spec.ts:80,83,186,219,237
- tests/e2e/fps.spec.ts:92
- tests/e2e/verify-signoff.spec.ts:48,65
These use document.getElementById('game-score') etc. — they will still work
after migration because UISystem creates the same div ids. No changes needed.

## W3A.1 out-of-budget fix (from handoff)
- tests/unit/systems-stub.test.ts:140 — toEqual(['cleanup','constructor','update'])
  changed to expect.arrayContaining([...]) to accommodate set* methods.
  Not relevant to this task but noted for context.
