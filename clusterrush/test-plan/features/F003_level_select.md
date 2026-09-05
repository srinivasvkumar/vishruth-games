# F003 — Level Select (35 buttons, stars, lock state, scroll)

Sources: scenes/level_select.tscn, scripts/ui/level_select_ui.gd.
Buttons: 35, 7-col grid, tier-colored (get_tier_color level_manager.gd L731+), star indicators, locked state, Restart, Back.

## Test cases

- **F003-01 Grid renders 35 buttons, all tier-colored**
  From menu → Level Select. Expected: 35 buttons in a 7-col grid; colors match tier (L1-5 green, next tiers per get_tier_color).
  Evidence: screenshot; count buttons in DOM/canvas = 35.
  PASS: 35 buttons, correct tier colors. FAIL: wrong count, uniform/missing color.

- **F003-02 Locked state (fresh save)**
  Fresh profile → Level Select. Expected: Level 1 enabled/unlocked; Levels 2-35 visually locked (disabled/dimmed).
  PASS: L1 clickable, others locked. FAIL: any level clickable when it shouldn't be.

- **F003-03 Select a locked level → blocked**
  Click a locked level. Expected: "Level N is locked. Complete earlier levels first." (level_select_ui.gd L220 print) — no scene change.
  Evidence: console shows that print; still on level-select.
  PASS: blocked + message. FAIL: navigates to a locked level.

- **F003-04 Select an unlocked level → loads it**
  With progress, click an unlocked level N. Expected: GameManager.start_level(N) (lives 3-if-N≤5-else-2, score 0) → game.tscn → HUD "Level N", correct lives.
  PASS: correct level + lives. FAIL: wrong level/lives/score.

- **F003-05 Star indicators reflect saved stars**
  After earning stars on L1, return to Level Select. Expected: L1 button shows the earned star count.
  PASS: stars shown match. FAIL: no stars / wrong count.

- **F003-06 Scroll behavior (if 35 buttons overflow viewport)**
  Attempt to scroll the grid at a small window height.
  Expected: all 35 reachable (scroll or fit). Document actual behavior.
  PASS: L35 reachable. FAIL: top or bottom buttons unreachable/occluded.

- **F003-07 Restart button**
  From a running level, open Level Select is not reachable mid-play; instead test the Restart affordance wherever present (level_select "Restart" reloads current).
  Document what Restart reloads and with what state. PASS: reloads expected level, HUD correct.

## Defect hypotheses
- H1: _unlock_threshold source — confirm it reads the same save as get_unlocked_levels(); a mismatch could lock/unlock wrongly.
- H2: 7-col grid with 35 = 5 rows; verify no 6th partial row misaligns or clips.
- H3: Restart may reuse the Start-Game path (no start_level) → same lives-carryover hazard.
