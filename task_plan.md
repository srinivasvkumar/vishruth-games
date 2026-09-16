# Task Plan — W3A.4: GameOverScene

Kanban task: t_de156e6e (assignee game-dev)
Parent: t_d2e9e91c (W3A.3 MenuScene full UI)

## Objective
Create src/scenes/GameOverScene.ts. On enter:
- Display 'GAME OVER'
- Show final score (from switchScene data or localStorage)
- Show high score (from localStorage HIGH_SCORE_KEY)
- RESTART button (click + Enter/Space -> switchScene('menu'))
- Register as 'gameover' in initGame() (src/index.ts)
- Clean listeners on exit
- Dark terminal theme (match MenuScene)

## File budget (<=3 source files)
1. src/scenes/GameOverScene.ts (NEW — implementation)
2. tests/unit/gameover-scene.test.ts (NEW — TDD RED surface)
3. src/index.ts (one-line registration add)

Plus mandatory: TDD_PLAN.md tracker touch + tests/evidence/w3/W3A4-RED.txt + W3A4-GREEN.txt

## TDD sequence
1. Baseline: full unit suite + tsc (record counts)
2. RED: write tests/unit/gameover-scene.test.ts
   - 'GAME OVER' heading renders
   - final score displayed (from data or 0)
   - high score displayed (from localStorage)
   - RESTART button click -> switchScene('menu')
   - Enter key -> switchScene('menu')
   - Space key -> switchScene('menu')
   - double-dispatch guard (second Enter/Space/click is no-op)
   - SceneManager has 'gameover' registered (integration via initGame or direct)
   Run target file -> capture RED evidence.
3. GREEN: implement GameOverScene.ts
4. VERIFY: target green, full suite green, tsc clean, eslint clean
5. Evidence: tests/evidence/w3/W3A4-RED.txt + W3A4-GREEN.txt
6. Tracker: TDD_PLAN.md W3-A Task 8.2 -> 'GameOverScene done'
7. Commit: no --no-verify ever

## Key design decisions
- GameOverScene reads final score from the `data` argument passed to switchScene('gameover', { score: N }), OR falls back to reading localStorage HIGH_SCORE_KEY.
- Restart target: 'menu' (clean loop: game-over -> menu -> start)
- Double-restart guard: same pattern as MenuScene BUG-W2-1a (restarted flag + detach + disable button; re-arm on reject)
- DOM ids: #gameover-container, #gameover-restart-button
- Register in initGame() as sm.registerScene('gameover', new GameOverScene(game))

## Errors log
| # | Error | Fix |
|---|-------|-----|
