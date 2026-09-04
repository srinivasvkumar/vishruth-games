# F009 — Falling Debris (cosmetic)

Source: level_manager.gd L86 (max fall 5s), L371 (spawn every 3-5s above random truck), g=9.81. CONFIRMED cosmetic: body_entered not wired to damage (per @game-dev analysis).

## Test cases

- **F009-01 Debris spawns and falls**
  On a debris-bearing level, wait ~10s. Expected: debris spawns above a random truck every 3-5s, falls with g=9.81, disappears after ~5s max fall.
  PASS: periodic spawn + fall + despawn. FAIL: no spawn, or objects accumulate.

- **F009-02 Debris causes NO damage**
  Stand directly under a debris spawn point, let it hit. Expected: no death, no knockback.
  PASS: pure cosmetic. FAIL: any damage (would contradict source — escalate as regression).

- **F009-03 No object accumulation**
  60s of gameplay; watch for debris accumulation / growing object count (FPS sample over time).
  PASS: count stable. FAIL: monotonic growth (leak).

## Defect hypotheses
- H1: debris never despawned on hitting ground → accumulation leak.
