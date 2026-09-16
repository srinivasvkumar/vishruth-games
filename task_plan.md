# Task Plan — BUG-W2-1a: MenuScene player start path

Kanban task: t_4298322b (assignee game-dev)

## Objective
In src/scenes/MenuScene.ts add a MINIMAL player start path:
1. keydown listener on Enter AND Space -> this.game.switchScene('game')
2. visible clickable START button in setupMenuUI() -> same transition
3. double-start guard (once started: listeners removed, button disabled)
4. cleanup listeners in onExit/onCleanup so menu can be re-entered

Out of scope: full menu UI (W3 Task 8.2).

## File budget (<=2 source files)
- src/scenes/MenuScene.ts (implementation)
- tests/unit/menu-scene.test.ts (new test file — RED surface)
Plus mandatory TDD_PLAN.md tracker touch + tests/evidence/w2/ evidence files.

## TDD sequence
1. Baseline: full unit suite green + tsc clean (record counts).
2. RED: write tests/unit/menu-scene.test.ts (3 tests):
   - Enter keydown -> switchScene('game') called once
   - Space keydown -> switchScene('game') called once
   - START button click -> switchScene('game') called once
   - after a start, repeat key presses + click do NOT re-fire (guard)
   Run target file -> capture RED evidence (tests fail).
3. GREEN: implement MenuScene.ts changes.
4. VERIFY: target file green, full unit suite green, tsc --noEmit clean,
   eslint on touched files clean.
5. Evidence: tests/evidence/w2/W2-W21a-RED.txt + W2-W21a-GREEN.txt
6. Tracker: TDD_PLAN.md BUG-W2-1 status -> 'decomposed + 1a in flight'
   (add a BUG-W2-1 progress note next to W2-A.3 note, line ~301).
7. Commit: no --no-verify (husky lint-staged runs test:run + lint).

## Key facts from code reading
- Game.switchScene(name, data?) -> Promise<void> (Game.ts:221), returns
  this.sceneManager.loadScene(name, data). BootScene:83 pattern:
  this.exit(); this.game.switchScene('menu').catch(log).
- SceneManager.loadScene: exits current scene, loads+enters target.
  If target load/enter throws -> falls back to previous scene (menu stays).
  isLoading re-entrancy guard: concurrent calls queue (100ms setTimeout).
- Scene lifecycle: load() (onLoad, sets isLoaded), enter() (onEnter),
  exit() (onExit), cleanup() (onCleanup, resets flags).
- MenuScene currently: menuContainer div (#menu-container) with title h1 +
  hint p. onEnter shows, onExit hides, onCleanup removes from DOM.
- Test infra: vitest + happy-dom. scenes.test.ts convention:
  vi.mock('three') with importOriginal + stubbed WebGLRenderer (happy-dom
  cannot create WebGL contexts), vi.mock('@/utils/Logger').
  Game dep = lightweight mock: switchScene: vi.fn().mockResolvedValue(undefined).
- window.key repeat: guard by flag + listener removal on first start.
  keydown fires on key press (not hold-repeat by default in happy-dom,
  but real browsers auto-repeat keydown — guard must cover that too).

## Decisions
- startGame(): private method; sets this.started=true; removes keydown
  listener; disables button (disabled=true, aria-disabled) ; calls
  this.game.switchScene('game').catch(err => Logger.error(...)).
  If the transition throws/rejects (no 'game' registered), fall back:
  re-arm listeners + re-enable button so the menu remains usable.
  (loadScene falls back to previous scene internally, but the rejection
  still propagates to our .catch — re-arming keeps the menu reachable.)
- keydown handler: if key === 'Enter' || key === ' ' (Space) -> preventDefault
  + startGame().
- Listeners registered in onEnter (menu visible) via setupInputHandlers(),
  removed in onExit (removeInputHandlers()). Button created once in
  setupMenuUI (onLoad), click handler calls startGame() (no-op when started
  or disabled).
- onExit also hides container (existing). onCleanup: remove listeners +
  remove container DOM (existing + new).
- 'started' flag reset on onExit? No — task says guard against double-start;
  once transitioned, stay guarded. Re-entry (menu loaded again after a
  failed transition fallback) re-arms via onEnter re-registration; started
  flag is cleared only when a transition REJECTED (re-arm path).
  Keep it simple: started=true only on successful dispatch; on rejection,
  started=false + listeners re-added + button re-enabled.

## Risks / watch-outs
- happy-dom: HTMLElement click() dispatches real click event — works.
- KeyboardEvent construction: new KeyboardEvent('keydown', { key: 'Enter' })
  then document.dispatchEvent / window.dispatchEvent. Listener goes on
  window (matches "keydown listener" phrasing, and works regardless of focus).
- vi.mock('three') must stub WebGLRenderer (Scene constructor creates one).
- Existing scenes.test.ts W2-A.3 test 3 calls menu.load(); menu.enter()
  directly — our onEnter will add a window listener; that test's
  afterEach does vi.restoreAllMocks + resetModules; a lingering window
  listener on Enter/Space in happy-dom's global window could leak into
  subsequent tests if they dispatch those keys — mitigate: our listener
  checks document body for #menu-container existence? No — keep listener
  narrow: only act if the menu is active (this.isActive via
  Scene.isActive getter isSceneActive()). That prevents cross-test leaks:
  after enter() in that test, it calls exit() before finishing, so
  listener is removed. Good.
- tsc: KeyboardEvent key type is string; fine.

## Errors log
| # | Error | Fix |
|---|-------|-----|
