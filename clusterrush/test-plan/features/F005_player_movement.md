# F005 — Player Movement

Source: scripts/player/player_movement.gd (CONFIRMED params).
Auto-run +X 5.0; strafe A/D accel 12, friction 0.1; gravity 25; jump 10; double-jump 8.5; coyote 0.15s; jump buffer 0.1s. Input buffering in input_manager.gd (0.1s queue).

## Test cases

- **F005-01 Auto-run without input**
  Start level, no keys. Expected: player steadily moves +X at ~5.0 units/s.
  Measure: ~5s of play → player x delta ≈25 units (compare HUD progress bar or camera).
  PASS: steady forward motion, no drift in Z. FAIL: stationary or erratic.

- **F005-02 Strafe forward/back (A/D)**
  Hold A → player speeds up relative to auto-run; release → decays (friction) back to 5.0. Hold D → slows toward stop/reverse.
  PASS: responsive accel, clean decay. FAIL: instant snap, no decay, or stuck velocity.

- **F005-03 Jump + double jump**
  Press Space → jump (10). Mid-air press Space → double jump (8.5). Third press → no effect.
  Measure: double-jump apex clearly higher than single.
  PASS: exactly two jumps. FAIL: >2 jumps or first jump missing.

- **F005-04 Coyote time**
  Walk off edge, press Space within 0.15s of leaving ground. Expected: jump still triggers.
  Press Space just after 0.15s → no jump.
  PASS: window behaves. FAIL: no coyote or too long.

- **F005-05 Jump buffer**
  Press Space 0.1s BEFORE landing. Expected: jump fires on landing (input_manager buffer).
  PASS: buffered jump on land. FAIL: input lost.

- **F005-06 Space held = one jump only**
  Hold Space from the moment of first jump. Expected: exactly one jump; no auto-repeat re-jump on land.
  Evidence: console keydown/keyup log (Godot no-repeat action).
  PASS: single jump. FAIL: repeat jumps while held (echo leak).

- **F005-07 A+D simultaneously**
  Press A and D together. Expected: axis cancels; low-friction drift; no crash.
  PASS: stable (may drift). FAIL: oscillation/crash.

## Defect hypotheses
- H1: no-repeat on jump could double-fire if action re-registered at runtime (InputManager registers jump at runtime) — verify F005-06.
- H2: friction 0.1 per-frame is frame-rate dependent → behavior differs at 30 vs 60fps (document, don't fail).
