# Task Plan — W3A.3: Full MenuScene (Start/Settings/HighScores + keyboard nav)

Kanban task: t_d2e9e91c (assignee game-dev)
Parent: t_16f7e67d (W3A.1 UISystem core) → child: t_de156e6e (W3A.4?)

## Objective
Replace the minimal start-path placeholder in src/scenes/MenuScene.ts with a full menu:
1. Title (keep existing "CLUSTER RUSH")
2. Visible START button — click + Enter/Space STILL work (preserve BUG-W2-1a behavior + existing 7 tests in tests/unit/menu-scene.test.ts must keep passing)
3. SETTINGS placeholder button — non-functional, shows toast/panel "coming in W3-C"
4. HIGH SCORES display — read from localStorage high score (ScoreManager / HIGH_SCORE_KEY = 'cluster-rush-high-score')
5. Basic keyboard focus / Tab navigation (native focusable buttons + visible :focus style)
6. Dark terminal theme styling (monospace, #00ff00 accents, glow)

OUT OF SCOPE: audio settings, difficulty, profile features.
D2 HUD-ownership: HUD lives in systems/UI.ts — GameScene.ts must NOT hand-roll HUD. This task is MenuScene only (no HUD).

## File budget (<=2 source files)
- src/scenes/MenuScene.ts (implementation)
- tests/unit/menu-scene-full.test.ts (NEW test file — RED surface)
Plus mandatory: TDD_PLAN.md tracker touch + tests/evidence/w3/W3A3-RED.txt + W3A3-GREEN.txt

## TDD sequence
1. Baseline: full unit suite green + tsc clean (record counts) — expect 573/573 (parent said 573/573 after W3A.1; verify actual).
2. RED: write tests/unit/menu-scene-full.test.ts covering:
   - START button visible + click -> switchScene('game') (1 call)
   - Enter still -> switchScene('game'); Space still -> switchScene('game')
   - HIGH SCORES panel shows the stored high-score value (set localStorage HIGH_SCORE_KEY=42 before boot -> panel text contains 42; absent key -> 0)
   - SETTINGS button renders (no crash) + click shows toast "coming in W3-C"
   - Tab navigation: buttons are focusable, tabbable in order (START before SETTINGS), visible focus style present
   - Existing menu-scene.test.ts (BUG-W2-1a, 7 tests) STILL PASSES (regression guard — run alongside)
   Run target file -> capture RED evidence.
3. GREEN: implement MenuScene.ts changes.
4. VERIFY: target file green, existing menu-scene.test.ts green, full unit suite green, tsc --noEmit clean, eslint clean.
5. Evidence: tests/evidence/w3/W3A3-RED.txt + W3A3-GREEN.txt
6. Tracker: TDD_PLAN.md W3-A Task 8.2 -> 'MenuScene full UI done'
7. Commit: no --no-verify ever.

## Key facts from code reading
- MenuScene.ts current state (217 lines, post BUG-W2-1a):
  * container div #menu-container (fixed full-viewport, rgba(0,0,0,0.85), monospace, flex column center, z-index 100)
  * title h1 "CLUSTER RUSH" (#00ff00, 48px, glow)
  * hint p "Press START to begin"
  * startButton #menu-start-button (background #00ff00, click -> startGame())
  * startGame(): started flag + detachKeydownHandler + disable button + switchScene('game').catch(re-arm)
  * attachKeydownHandler: window keydown Enter/Space -> preventDefault + startGame
  * onEnter: show container, re-arm if !started; onExit: detach + hide; onCleanup: detach + remove DOM + null
- Scene base: load() -> onLoad; enter() -> onEnter (gated isLoaded+!isActive); update() -> onUpdate; exit() -> onExit; cleanup() -> onCleanup.
- ScoreManager (src/systems/Score.ts): HIGH_SCORE_KEY='cluster-rush-high-score'; loadHighScore() reads localStorage, parseInt, clamp, 0 if null/corrupt. getHighScore() in-memory.
- Test infra (tests/unit/menu-scene.test.ts convention):
  * vi.mock('three', importOriginal + stub WebGLRenderer) — Scene ctor creates a renderer.
  * vi.mock('@/utils/Logger').
  * Game dep = lightweight mock: switchScene: vi.fn().mockResolvedValue(undefined).
  * MenuScene constructed DIRECTLY (new MenuScene(mockGame)), then load() + enter().
  * document.body reset in beforeEach/afterEach.
  * pressKey(key): window.dispatchEvent(new KeyboardEvent('keydown',{key})).
- localStorage available in happy-dom; window.localStorage works.
- Tab navigation: native <button> is focusable; order = DOM order. Use a visible :focus style (outline / glow) so keyboard focus is perceptible. No custom focus trap needed — "basic keyboard focus/Tab navigation".

## Decisions
- Keep the existing #menu-start-button id + behavior (BUG-W2-1a). The existing 7 tests in menu-scene.test.ts must keep passing — they query `#menu-start-button, button` and rely on first button being START. So START must remain the FIRST button and keep its id.
- SETTINGS button: id #menu-settings-button, text "SETTINGS", created after START (DOM order: title, hint, START, SETTINGS, high-score panel). Click -> showSettingsToast(): a small toast/panel element (id #menu-settings-toast) appears with text "Settings coming in W3-C". Non-destructive; auto-dismiss after ~2.5s (setTimeout, cleared on cleanup). No scene switch.
- HIGH SCORES display: a panel element (id #menu-high-score) with label "HIGH SCORE" + value. Value read via ScoreManager semantics: read localStorage.getItem(HIGH_SCORE_KEY) -> parseInt -> clamp -> 0 default. To avoid instantiating a full ScoreManager (which touches localStorage on construct + has saveHighScore side effects), read the raw key directly mirroring ScoreManager.loadHighScore() logic, OR import HIGH_SCORE_KEY constant and read window.localStorage. Decision: import { HIGH_SCORE_KEY } from '@/systems/Score' and read window.localStorage directly with the same parse/clamp — keeps MenuScene decoupled from ScoreManager state while using the canonical key. Re-read on onEnter so a fresh high score set in a prior game session shows when the menu is re-entered.
- Keyboard/Tab: buttons are native <button> (focusable). Add a focus style (outline: 2px solid #00ff00; or box-shadow glow) so :focus-visible is visible. Tab order = DOM order (START -> SETTINGS). No keydown handler on Tab (native). The Enter/Space window keydown handler from BUG-W2-1a must NOT double-fire when a button is focused and the user presses Enter/Space (button focused + Enter = native click AND our window keydown -> startGame). Mitigation: in the keydown handler, if event.target is a button element, let the native click handle it (skip our startGame) to avoid double dispatch — OR keep our handler but the double-start guard (started flag) makes a second dispatch a no-op. SAFER: guard already prevents double switchScene (started flag set on first dispatch). So even if both fire, only one switchScene. Keep BUG-W2-1a handler unchanged; rely on the started guard. This is the minimal-risk path and keeps existing tests intact.
- Dark terminal theme: keep existing container styling; add subtle styling to SETTINGS button (outline variant: transparent bg, #00ff00 border, #00ff00 text, hover fills) and high-score panel (bordered box, #00ff00 label, white value). Toast: small fixed box bottom-center, #00ff00 border, monospace.

## Risks / watch-outs
- Must NOT break the 7 existing tests in menu-scene.test.ts (regression). Run them in VERIFY.
- happy-dom localStorage: window.localStorage is available and persists per-test-file; reset in beforeEach (localStorage.removeItem(HIGH_SCORE_KEY)) to isolate.
- Double-start: started guard covers focused-button Enter/Space double fire.
- SETTINGS toast setTimeout: clear on onCleanup/onExit to avoid firing after cleanup (guard element existence).
- tsc: ensure no unused imports; HIGH_SCORE_KEY import used.
- eslint: follow existing style (arrow handlers, no var).

## Errors log
| # | Error | Fix |
|---|-------|-----|
