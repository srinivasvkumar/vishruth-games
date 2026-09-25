# W4-B.5 Findings

## Codebase facts (verified 2026-09-25, main @ cc0f166)
- Scene names (registry): 'boot', 'menu', 'game', 'gameover' (scenes/*: BootScene,
  MenuScene, GameScene, GameOverScene).
- SceneManager.loadScene() (src/core/SceneManager.ts:47) is the single transition
  point; emits GameEvents.LEVEL_START ('level:start') with { name, data } AFTER
  scene.enter() (line 80).
- SceneManager has `this.game` (Game) — can call game.getAccessibilitySystem().
- GameScene.gameOver() (src/scenes/GameScene.ts:438): switchScene('gameover',
  { score, highScore }) — score available in transition data.
- GameOverScene.restartGame(): switchScene('menu') with no data.
- BootScene: switchScene('menu') at src/scenes/BootScene.ts:83.
- MenuScene START: .switchScene('game') at src/scenes/MenuScene.ts:362.
- Score.ts:99 ScoreManager; statics: HIGH_SCORE_KEY='cluster-rush-high-score',
  readStoredHighScore(storage) pure helper.
- GameOverScene.setFinalScore(n) exists; final score displayed there.
- UISystem (src/systems/UI.ts) owns HUD divs; created by Game.ts:62; cleaned up in
  Game.cleanup() via uiSystem.cleanup().
- Test convention: vitest + happy-dom, vi.mock('three') with MockWebGLRenderer,
  vi.mock('@/utils/Logger'), direct scene construction with mock game
  (see tests/unit/gameover-scene.test.ts).
- Repo git: main branch, last commit cc0f166 W4-B.3. Working tree has pre-existing
  modified evidence files (png/txt from earlier cards + findings/progress/task_plan)
  — must NOT commit those. Use explicit pathspec commits.
- lint-staged runs `npm run test:run` + `npm run lint` on commit.
- package.json scripts: test:run = vitest run; lint = eslint src config scripts;
  type-check = tsc --noEmit.
