# F011 — Fall Death

Source: player_movement.gd L351-353 (y < -10 → player_died).

## Test cases

- **F011-01 Fall off track = death**
  Maneuver player off the track edge, fall below y=-10. Expected: exactly one death; respawn at (0,0.75,0) after 1.0s.
  PASS: death + respawn. FAIL: no death (player falls forever) or double death.

- **F011-02 No death above threshold**
  Jump to apex (~4-5 units) and fall back onto track. Expected: no death.
  PASS: safe landing. FAIL: false death.

- **F011-03 Ramp launch apex is safe**
  Launch via ramp (peak ~11 units per @game-dev). Expected: no accidental fall-death from normal ramp use; apex well above -10.
  PASS: safe. FAIL: unexpected death from launch.

## Defect hypotheses
- H1: camera sway at high altitude could make y<-10 visually ambiguous — ensure death triggers on logic, not camera.
