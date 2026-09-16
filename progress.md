# Progress — t_d2e9e91c (W3A.3: Full MenuScene UI)

## Completed
- [x] Code reading: MenuScene.ts (BUG-W2-1a minimal), Scene base, Score.ts
      (HIGH_SCORE_KEY + ScoreManager.loadHighScore semantics),
      tests/unit/menu-scene.test.ts (7-test regression convention).
- [x] Baseline: 557/557 unit tests green (23 files), tsc clean.
- [x] RED: tests/unit/menu-scene-full.test.ts written (10 tests).
      6 failed (HIGH SCORES panel x3, SETTINGS button, SETTINGS toast,
      Tab order) + 4 passed (START visible / click / Enter / Space
      regression guards that already hold).
- [x] RED evidence: tests/evidence/w3/W3A3-RED.txt
- [x] GREEN: src/scenes/MenuScene.ts rewritten with full menu —
      title + START (BUG-W2-1a preserved: started guard + keydown +
      button) + SETTINGS placeholder (#menu-settings-button, toast
      "Settings coming in W3-C", auto-dismiss 2.5s, timer cleared on
      exit/cleanup) + HIGH SCORES panel (#menu-high-score /
      #menu-high-score-value, reads HIGH_SCORE_KEY from localStorage,
      refreshed on onEnter) + native Tab order (START before SETTINGS).
- [x] Target file: 10/10 green.
- [x] Regression (menu-scene.test.ts BUG-W2-1a): 7/7 green.
- [x] Full suite: 567/567 green (24 files).
- [x] tsc --noEmit: clean.
- [x] eslint (npm run lint): 0 errors; 7 pre-existing warnings in
      src/utils/Logger.ts (out of scope).
- [x] GREEN evidence: tests/evidence/w3/W3A3-GREEN.txt
- [x] Tracker touch: TDD_PLAN.md W3-A Task 8.2 -> 'MenuScene full UI
      done' (MenuScene portion; GameOverScene still pending).

## Pending
- [ ] Commit (pre-commit hook runs lint-staged: test:run + lint).
- [ ] kanban_complete with summary + metadata (+ evidence artifacts).

## Decisions (final)
- START stays the FIRST button with id #menu-start-button (keeps the 7
  existing BUG-W2-1a tests passing). SETTINGS is second.
- HIGH SCORES read via the canonical HIGH_SCORE_KEY constant + a direct
  window.localStorage read mirroring ScoreManager.loadHighScore()
  (parseInt base-10, >0 else 0). NOT instantiating a ScoreManager
  (avoids its saveHighScore/reset side effects in a menu context).
- Refreshed on every onEnter so a record set in a prior game session is
  shown on re-entry (matches the "menu displays the stored high score"
  contract).
- SETTINGS toast: non-destructive, no scene switch; auto-dismiss 2.5s
  with a guarded timer cleared in onExit/onCleanup.
- Double-start guard (BUG-W2-1a) also covers focused-button Enter/Space:
  only the first dispatch reaches switchScene.

## Errors log
| # | Error | Fix |
|---|-------|-----|
| 1 | LSP: settingsButton declared-but-never-read | Used it in showSettingsToast (re-enable belt-and-braces). |
| 2 | RED test artifact: HIGH SCORE "42" set after boot -> showed 0 | Rewrote test to set value BEFORE boot (matches onEnter read contract). Made test async. |
