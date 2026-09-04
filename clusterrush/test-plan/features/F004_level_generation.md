# F004 — Level Generation (sync gen: ground, trucks, 4 hazards, debris, finish)

Sources: autoloads/level_manager.gd L186-224 (load_level), scripts/game_scene.gd L91-102 (_load_level), truck_controller.gd, ramp.gd.
Behavior: LevelManager.load_level(n) is synchronous; game_scene shows LoadingScreen → await process_frame → load_level → hide.

## Test cases

- **F004-01 Level 1 generates a playable world**
  Start L1. Expected: ground/track visible along +X, first truck convoy spawned, player at (0,0.75,0), finish at x≈140, HUD up.
  Evidence: T2 screenshot (world visible), player present, at least one truck visible.
  PASS: world + player + ≥1 truck + HUD. FAIL: empty world, no player, no trucks (this was the historical "nothing happens" bug — regression gate).

- **F004-02 LoadingScreen flash is ~1 frame (non-blocking)**
  Observe scene transition menu→game. Expected: LoadingScreen visible for only ~1 frame (16-32ms), effectively invisible.
  PASS: no perceptible black/blank hold. FAIL: visible loading pause >200ms.

- **F004-03 Generation is synchronous (no multi-frame hitch)**
  Start a heavier level (e.g. L35). Measure time from click to first rendered frame.
  Expected: single frame spike, not a multi-second stall. Document measured ms.
  PASS: <~200ms. FAIL: multi-second freeze.

- **F004-04 Truck count/spacing scales by tier**
  Compare L1 vs L18 vs L35: truck speed range and density increase.
  Expected: later tiers faster/denser (level_manager tier curve).
  PASS: observable increase. FAIL: identical density across tiers.

- **F004-05 All 4 hazard types present where expected**
  On a hazard-bearing level, verify saw, ramp, static debris, and swinging hammer each appear (per tier allocation).
  PASS: each type observed at least once in sweep. FAIL: a type never spawns.

- **F004-06 Finish line reachable at x=140**
  Play toward the finish. Expected: completion triggers at player x≥140 (F014).
  PASS: level completes on reaching ~140.

## Defect hypotheses
- H1: Synchronous gen could hitch on low-end browsers — measure.
- H2: Truck spacing 16 units + tier speed could produce an impassable gap at high tiers (solvable-ness check — is every level beatable?).
- H3: Hazard placement RNG has no seed → each load differs (affects reproducibility, not correctness).
