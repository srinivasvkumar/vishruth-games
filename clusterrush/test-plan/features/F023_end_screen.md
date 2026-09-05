# F023 — End Screen ("All Levels Complete")

Source: end_screen_ui.gd: title + ScoreLabel (`VBoxContainer/ScoreLabel`) + Main Menu button. **`set_score()` (L55-57) is NEVER called from anywhere** (grep: zero call sites — source-verified).

## Defect hypotheses
- **D11 (P1)**: ScoreLabel stays at scene default (likely empty or "0") — final score is never displayed.

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F023-01 | Reach end screen | Complete L35 (or force: set current_level=34, complete) | End screen shows | screenshot |
| F023-02 | **D11** Score display | Complete L35 with score>0 | "Final Score: N" shown | **blank/default (defect)** |
| F023-03 | Back to menu | Click Main Menu | main menu, clean state | screenshot |
| F023-04 | Save intact | After end screen | all 35 stars in save | Level Select |

## Exit criteria
F023-01,03,04 PASS; F023-02 expected-to-FAIL (D11).
