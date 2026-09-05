# F026 — Input (bindings, keyboard-only, layout-independence)

Source: project.godot [input]: jump=Space(32) & K_W(87)? — verify each; strafe_left=Q, strafe_right=E, reset=R(82, **dead**), pause=KP_Enter(4194310). InputManager ALSO registers jump/strafe_left/strafe_right/climb/pause at runtime (CONFIRMED). **All actions are physical-keycode based → QWERTY-assuming** (source-verified by @game-tester).

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F026-01 | Full binding map | Press each key, watch console action log | correct action fires | console |
| F026-02 | R no-op | Press R mid-run | nothing (dead binding) | console |
| F026-03 | **Non-QWERTY AZERTY** | AZERTY layout: A key → Q action, Q key → A action | **strafe swap** (defect class) | console |
| F026-04 | Dvorak | Dvorak layout | keys mapped to wrong actions | console |
| F026-05 | Numpad-only keyboard | Laptop (no numpad) | **pause unreachable** (KP_Enter only) | input tour |
| F026-06 | Modifier interference | Ctrl+A / Alt+Tab / Ctrl+W | game doesn't capture browser shortcuts (or document what it does) | console |
| F026-07 | Focus loss | Click outside canvas → press keys | keys ignored until refocus | console |
| F026-08 | Rapid repeat | Hold A (key repeat) | smooth continuous strafe, no stutter | video |
| F026-09 | Simultaneous A+D | Both strafe keys | net zero lateral (or last-wins — document) | console |

## Exit criteria
F026-01,02,05,07,08 PASS (05 documents pause gap). 03/04/06/09 documented.
