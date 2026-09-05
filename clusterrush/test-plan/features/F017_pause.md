# F017 — Pause (toggle, menu, state lockout)

Source: project.godot L132-141: "pause" action = **KP_Enter physical 4194310** (dead Numpad Enter). input_manager.gd L27-30: on pause just_pressed → `get_tree().paused = !get_tree().paused`. game_scene.gd L68-69: ALSO toggles tree.paused on same action → **double toggle in one frame**. pause_menu.gd (238B): Resume / Restart / Quit buttons.

## Defect hypotheses (source-verified by lead)
- **D2 (P0)**: Double-bound toggle → single keypress toggles twice → net no-op. Pause may be UNREACHABLE via keyboard.
- **D3 (P0)**: Key is KP_Enter (numpad Enter), not Escape. No Escape binding. Laptops without numpad / many web users have no working pause key.

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F017-01 | **D3** Escape | Press Escape mid-run | **no pause** (no binding) | console/screenshot |
| F017-02 | **D3** Numpad Enter | KP_Enter on full keyboard | Pause menu (if D2 not netting out) | screenshot |
| F017-03 | **D2** Double-toggle | KP_Enter once, observe within 2 frames | Tree stays unpaused (defect) | console (pause signal count) |
| F017-04 | Pause via menu only? | Any working path to pause menu | Document the ONLY working path | screenshot |
| F017-05 | While paused: world frozen | Any pause → wait 3s | trucks/debris frozen; timer keeps running (wall clock!) | console |
| F017-06 | While paused: input ignored | A/D/Space while paused | no movement | console |
| F017-07 | Resume | Pause → Resume | 0.3s fade in, timer continues (wall-clock gap = time bonus loss) | HUD |
| F017-08 | Restart from pause | Pause → Restart | scene reload; lives reset? (same D1 path? verify — restart may also skip start_level) | HUD |
| F017-09 | Quit to menu from pause | Pause → Quit | main menu, clean state | HUD |
| F017-10 | Pause in menu/overlay | KP_Enter at main menu / level select | state machine should ignore (game_state gate) | console |
| F017-11 | **D10** wall-clock | Pause 30s → resume | level_start_time stale → time_bonus computed over 30s+ → star/score distortion | HUD/Debug |

## Edge cases
- Pause during 0.4s transition.
- Pause ×2 rapid (D2 interaction).
- Tab-switch (browser auto-pauses rAF; Godot Web keeps physics? document).

## Exit criteria
F017-01,02,03 expected-to-FAIL (D2/D3). F017-05,06,07,09,10 PASS. F017-11 documents D10.
