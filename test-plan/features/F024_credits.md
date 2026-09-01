# F024 — Credits Screen

Source: scenes/credits.tscn (**no script attached**), scripts/ui/credits_ui.gd = **20 bytes** (empty stub). Static scene with no exit button in scene tree (lead-verified: no `change_scene` in credits context).

## Test cases
| ID | TC | Steps | Expected (spec) | Expected (current) | Evidence |
|----|----|-------|-----|-----|----------|
| F024-01 | Open | Main menu → Credits | credits screen | same | screenshot |
| F024-02 | **D12** Exit | Any input / button | back to menu | **trapped — no exit** | input tour |
| F024-03 | Only escape: refresh | F5 | main menu | works (only path) | screenshot |

## Exit criteria
F024-01 PASS; F024-02 expected-to-FAIL (D12).
