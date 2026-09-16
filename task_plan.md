# Task Plan — W3A.5: Full Game Loop Wiring

Kanban task: t_77ceb449 (assignee game-dev)
Parent: t_de156e6e (W3A.4 GameOverScene)

## Objective
Integrate the full game loop:
- GameScene (on death) -> GameOverScene -> MenuScene (restart)
- Replace inline `gameOver()` DOM overlay with `switchScene('gameover', {score, highScore})`
- Ensure state reset on re-entry into GameScene (no stale state from prior run)

## File budget (<=3 source files)
1. src/scenes/GameScene.ts (MODIFIED — gameOver() + resetRunState())
2. tests/unit/game-loop-wiring.test.ts (NEW — TDD RED surface)
3. tests/unit/scenes.test.ts (MODIFIED — update death test for new behavior)

Plus mandatory: TDD_PLAN.md tracker touch + tests/evidence/w3/W3A5-RED.txt + W3A5-GREEN.txt

## TDD sequence
1. Baseline: full unit suite + tsc (record counts) — DONE: 579/579 pass, tsc clean (1 pre-existing TS5101)
2. RED: write tests/unit/game-loop-wiring.test.ts — DONE: 8 failing, 3 passing
3. GREEN: implement GameScene.gameOver() + resetRunState() — DONE: 11/11 pass
4. VERIFY: target green, full suite green, tsc clean, eslint clean — DONE: 590/590 pass, 0 lint errors
5. Evidence: tests/evidence/w3/W3A5-RED.txt + W3A5-GREEN.txt — DONE
6. Tracker: TDD_PLAN.md W3-A Task 8.3 -> 'Game loop wiring done'
7. Commit: no --no-verify ever

## Key design decisions
- GameScene.gameOver() calls `this.game.switchScene('gameover', { score, highScore })` instead of creating inline DOM div
- GameScene.onEnter() calls `resetRunState()` which resets: isGameOver, level, scoreManager, obstacles, player position/health
- State reset replaces the old `location.reload()` behavior
- Defensive `Promise.resolve(transition).catch(...)` pattern to handle mocks that return undefined

## Errors log
| # | Error | Fix |
|---|-------|-----|
| 1 | `switchScene` mock returned `undefined` (vi.fn() mock implementation stripped by vi.clearAllMocks/restoreAllMocks) | Used plain-array call recorder in new test; `Promise.resolve(transition).catch(...)` in source for defensive handling |
| 2 | scenes.test.ts death test expected old inline DOM overlay | Updated test to expect `switchScene('gameover', ...)` call |
| 3 | highScore test: old scene's event listener fired instead of new scene | Added `scene.exit()` before `scene.cleanup()` in the test |
