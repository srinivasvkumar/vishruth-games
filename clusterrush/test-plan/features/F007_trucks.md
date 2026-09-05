# F007 — Trucks

Source: scripts/truck/truck_controller.gd; level_manager.gd spawn (spacing 16, blue box 6×3×3, layer 2).
Trucks move +X; speed re-rolled every 1.5s within tier range; Z swerve ±1.5 every 2.5s (lerp).

## Test cases

- **F007-01 Trucks move and persist**
  Observe a truck for ~5s. Expected: moves +X; speed re-rolls every 1.5s (observable as speed changes); swerves Z ±1.5 every 2.5s smoothly (lerp).
  PASS: motion + periodic speed/swerve changes. FAIL: static, jerky swerve, or trucks despawn offscreen.

- **F007-02 Truck collision = death**
  Player (mask includes layer 2) collides with a truck. Expected: player_died fires (F010); life lost.
  PASS: death on contact. FAIL: phase-through or no death.

- **F007-03 Swerve doesn't clip through geometry**
  Observe swerving trucks near track edges. Expected: lerp keeps truck on track; no clipping through walls/ground.
  PASS: clean swerve. FAIL: truck embeds in geometry.

- **F007-04 Speed within tier range**
  On L1 (slow tier) vs L35 (fast tier): later trucks noticeably faster.
  PASS: tier scaling. FAIL: same speed all tiers.

## Defect hypotheses
- H1: 1.5s speed re-roll could spike to a value that makes the track impassable.
- H2: trucks not culled when far behind → object accumulation over long levels (memory + perf).
