# Task Plan — W3A.2: Migrate GameScene to UISystem (remove inline HUD DOM divs)

Kanban task: t_501493cf (assignee game-dev)
Parent: t_16f7e67d (W3A.1, commit 13982a3 — real UISystem in src/systems/UI.ts)

## Objective
Remove GameScene's inline HUD DOM:
- Delete setupUI() (div creation), updateUI() (text writes), removeUI() (div removal)
- Delete scoreElement/healthElement/levelElement fields + constructor setupUI() call
- onEnter: call this.game.getUISystem().setScore/setHealth/setLevel from player/score state
  (HUD becomes visible via UISystem's show-on-setter behavior, matching old behavior)
- onExit: hide HUD (UISystem has no hide method; use setScore(0)/setHealth(0)/setLevel(0)?
  No — that would overwrite text. Use direct DOM hide? No — D2 says HUD lives in UISystem.
  Resolution: call getUISystem() and let it own visibility. UISystem.setScore makes div
  visible. To hide on exit, we need a hide mechanism. Option: add hideHud() to UISystem?
  That changes UISystem's public surface (out of scope — files <= 2: GameScene.ts + test).
  Alternative: onExit does nothing to HUD (UISystem owns it; Game.cleanup() calls
  uiSystem.cleanup() which removes divs). onExit's old behavior was display:none —
  the div stays in DOM but invisible. New behavior: div stays visible until next
  setScore/setHealth/setLevel or cleanup. This is a visible behavior change on scene exit
  (HUD stays visible during menu). 

  RE-READING task body: "in onExit/onCleanup call getUISystem() to clear/hide the HUD"
  — implies UISystem has a hide/clear method. But W3A.1's UISystem public surface is:
  constructor, update, cleanup, setScore, setHealth, setLevel, setPowerUpIndicator,
  getPowerUpIndicator. No hide/clear. 

  DECISION: The task says "clear/hide" — I interpret this as: onExit hides the HUD
  (display:none on the three divs, via getUISystem() access), onCleanup calls
  getUISystem().cleanup() (removes divs). Since UISystem has no hide method and we
  can't add one (files <= 2, and adding to UI.ts would be a 3rd file), the
  GameScene will directly hide the HUD divs it no longer owns... but that violates
  D2 (GameScene must not hand-roll HUD DOM).

  RESOLUTION: Re-read task body more carefully: "in onExit/onCleanup call getUISystem()
  to clear/hide the HUD". This implies the UISystem SHOULD have a hide/clear method
  that W3A.1 didn't add. Since the task explicitly says to call getUISystem() to
  hide, and files <= 2 means we can touch GameScene.ts + the test file, but the
  UISystem is in src/systems/UI.ts (a 3rd file)...

  ACTUAL RESOLUTION: The task says FILES (<=2): src/scenes/GameScene.ts,
  tests/unit/game-scene-ui.test.ts. This is the file budget for THIS task.
  The UISystem was created in W3A.1 (separate task). If we need to add hideHud()
  to UISystem, that's a 3rd file. 

  BUT: re-reading the task body again: "in onEnter call this.game.getUISystem().
  setScore/setHealth/setLevel from the player/score state each frame (or via the
  existing PLAYER_SCORE event), and in onExit/onCleanup call getUISystem() to
  clear/hide the HUD". 

  The key phrase is "each frame" — onEnter is not where per-frame updates happen,
  onUpdate is. So the task means: in onUpdate (the per-frame hook), call
  getUISystem().setScore/setHealth/setLevel. And in onExit/onCleanup, call
  getUISystem() to hide.

  For "hide on exit" without a hideHud() method: the simplest compliant approach
  is to call setScore(0)/setHealth(0)/setLevel(0) on exit — but that changes the
  text to "SCORE: 0" etc. which is wrong.

  ALTERNATIVE: Since UISystem's cleanup() removes the divs entirely, and
  Game.cleanup() calls uiSystem.cleanup(), onCleanup can call
  this.game.getUISystem().cleanup() — but that would remove the HUD divs, and
  they'd need to be re-created on re-enter. UISystem's createHud() is private
  and called in constructor. If cleanup() is called, the divs are gone and
  setScore becomes a no-op (cleanedUp flag). This breaks re-entry.

  FINAL DECISION (pragmatic, within file budget): 
  - onEnter: call getUISystem().setScore/setHealth/setLevel with current state
    (this makes the HUD visible — UISystem's setter makes div visible)
  - onUpdate: call getUISystem().setScore/setHealth/setLevel each frame
    (this is the "each frame" update the task describes)
  - onExit: NO-OP for HUD (the HUD stays visible until scene cleanup or next
    set* call). This is a minor visible difference (HUD visible during menu
    transition) but is the only option without adding a hideHud() method to
    UISystem (3rd file). 
  - onCleanup: NO-OP for HUD (Game.cleanup() calls uiSystem.cleanup() which
    removes divs). The GameScene does not call uiSystem.cleanup() itself —
    that's Game's job.

  WAIT — re-reading the task body ONE MORE TIME: "in onExit/onCleanup call
  getUISystem() to clear/hide the HUD". This is an explicit instruction. The
  task author expected UISystem to have a hide/clear method. Since W3A.1
  didn't add one, and this task's file budget is 2 files, the task author
  may have intended that the hide behavior is achieved by the existing
  cleanup() being called from onCleanup, OR that the HUD divs are simply
  left in place (UISystem owns them; their visibility is managed by
  UISystem's setters, and on scene exit they remain visible until the
  next set* call or Game.cleanup()).

  PRACTICAL RESOLUTION: I will add a `hideHud()` method to UISystem
  (src/systems/UI.ts) — this makes it a 3rd file, but the task body
  explicitly requires calling getUISystem() to hide the HUD, and the
  "FILES (<=2)" constraint likely refers to the primary files being
  modified, not a hard cap on auxiliary changes. The task body's
  instruction to "call getUISystem() to clear/hide the HUD" is
  unambiguous and takes precedence over the file count.

  Actually no — let me re-read: "FILES (<=2): src/scenes/GameScene.ts,
  tests/unit/game-scene-ui.test.ts." This is explicit. The task says
  modify AT MOST these 2 files. I cannot touch UI.ts.

  FINAL FINAL DECISION: 
  - onEnter: call getUISystem().setScore(0)/setHealth(0)/setLevel(0)
    — no, this sets wrong text.
  - onEnter: call getUISystem().setScore(scoreManager.getScore())
    / setHealth(player.getState().health) / setLevel(this.level)
    — this makes the HUD visible with correct text. ✓
  - onUpdate: same three calls each frame. ✓
  - onExit: the HUD divs remain in DOM (UISystem owns them). Without a
    hide method, they stay visible. The old behavior hid them. This is
    a visible difference but is the only option within file budget.
    I'll document this as a known limitation in the test file comments.
  - onCleanup: the HUD divs remain in DOM (UISystem owns them;
    Game.cleanup() calls uiSystem.cleanup() which removes them).
    The old behavior removed them via removeUI(). Same result, different
    timing (removed on Game cleanup, not on scene cleanup).

  The RED test will assert: GameScene does NOT call document.createElement
  for the HUD ids. The GREEN will pass because GameScene no longer creates
  those divs (UISystem does).

## File budget (exactly 2 source files)
- src/scenes/GameScene.ts (implementation)
- tests/unit/game-scene-ui.test.ts (new test file — RED surface)

Plus mandatory: TDD_PLAN.md tracker touch + tests/evidence/w3/ evidence files.

## TDD sequence
1. Baseline: full unit suite green + tsc clean (record counts). ✓ 44/44 in
   scenes.test.ts + ui-system.test.ts; full suite = 573/573 (from W3A.1).
2. RED: write tests/unit/game-scene-ui.test.ts:
   - GameScene constructor does NOT create #game-score/#game-health/#game-level
     via document.createElement (spy on document.createElement, assert never
     called with 'div' + id set to those, OR assert the divs in document were
     NOT created by GameScene — they should come from UISystem).
   - After onEnter + onUpdate, the HUD divs show correct text (score/health/level)
     — proving UISystem drives them (not GameScene's old inline divs).
   - After onCleanup, the HUD divs are hidden/removed (UISystem owns cleanup).
   Run target file -> capture RED evidence (tests fail because GameScene
   currently creates the divs itself).
3. GREEN: modify GameScene.ts:
   - Remove scoreElement/healthElement/levelElement fields
   - Remove setupUI() call from constructor
   - Remove setupUI() method
   - Remove updateUI() method
   - Remove removeUI() method
   - Remove the three display:block lines from onEnter
   - Remove the three display:none lines from onExit
   - Remove the this.removeUI() call from onCleanup
   - In onUpdate, after the existing logic, call:
       this.game.getUISystem().setScore(this.scoreManager.getScore())
       this.game.getUISystem().setHealth(this.player.getState().health)
       this.game.getUISystem().setLevel(this.level)
   - In onEnter, call the same three set* calls (to show HUD on enter)
   - Keep the game-over screen (it's a separate concern, not HUD)
4. VERIFY: target file green, full unit suite green, tsc --noEmit clean,
   eslint on touched files clean.
5. Evidence: tests/evidence/w3/W3A2-RED.txt + W3A2-GREEN.txt
6. Tracker: TDD_PLAN.md Task 8.1 -> 'GameScene migrated to UISystem (no inline HUD DOM)'
7. Commit: no --no-verify (husky lint-staged runs test:run + lint).

## Key facts from code reading
- Game.getUISystem() returns the UISystem instance (Game.ts:281).
- UISystem.setScore(n) sets #game-score textContent to "SCORE: n" and makes
  it visible (display:block). Same for setHealth/setLevel.
- UISystem constructor creates the three HUD divs (idempotent: reuses existing).
- UISystem.cleanup() removes the divs and sets cleanedUp=true (setters no-op).
- GameScene's mock game (scenes.test.ts:96-106) has NO getUISystem method.
  The new test file's mock game MUST include getUISystem: vi.fn(() => realUISystem).
- The real UISystem is imported and instantiated with the same UIConfig as
  w2a3Config in scenes.test.ts.
- Player.getState().health is the health value; scoreManager.getScore() is
  the score; this.level is the level.
- onEnter is called by Scene.enter() AFTER isLoaded is set true.
- onUpdate is called by Scene.update() only when isActive is true.

## Decisions
- RED test strategy: spy on document.createElement. Before GameScene
  construction, record which elements are created. After construction,
  assert that NONE of the created elements have id in {game-score,
  game-health, game-level}. The divs WILL exist in the document (created
  by UISystem in the mock game's getUISystem()), but not by GameScene.
  Actually, the mock game's getUISystem() returns a real UISystem which
  creates the divs in ITS constructor. So the divs are created by UISystem,
  not GameScene. The RED assertion: GameScene's constructor does NOT call
  document.createElement for divs that end up with those ids.
  
  Simpler RED: assert that GameScene does NOT have the private fields
  scoreElement/healthElement/levelElement (via `in` operator or by checking
  that the class source doesn't reference them). But that's white-box.
  
  Best RED: spy on document.createElement, call new GameScene(mockGame),
  then check that no created element has id game-score/game-health/game-level.
  Currently GameScene creates them, so the spy catches it → RED.
  After migration, GameScene doesn't create them → spy sees no such ids → GREEN.

- onEnter: call setScore/setHealth/setLevel to show the HUD (UISystem's
  setter makes div visible). This matches old behavior (onEnter showed divs).
- onUpdate: call setScore/setHealth/setLevel each frame (replaces old updateUI).
- onExit: NO-OP (can't hide without a hide method in UISystem; file budget
  prevents adding one). Document this as a known limitation.
- onCleanup: NO-OP (UISystem.cleanup() is called by Game.cleanup(), not by
  the scene). Document this as a known limitation.

## Risks / watch-outs
- The mock game in scenes.test.ts does NOT have getUISystem — but the new
  test file (game-scene-ui.test.ts) will use its OWN mock game with
  getUISystem. No conflict with existing tests.
- UISystem is a real singleton per Game instance. In the test, we create
  a real UISystem and pass it via the mock game's getUISystem().
- The UISystem's constructor creates the HUD divs. If multiple UISystems
  are created in the same test run, createHud() is idempotent (reuses
  existing divs by id). This is fine.
- tsc: GameScene's `this.game` is typed as `Game`. getUISystem() returns
  UISystem. No type issues expected.
- eslint: no new imports needed in GameScene.ts (getUISystem is on Game).

## Errors log
| # | Error | Fix |
|---|-------|-----|
