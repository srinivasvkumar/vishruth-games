# F008 — Hazards (saw, ramp, static debris, swinging hammer)

Sources: level_manager.gd (spawning), ramp.gd. All hazards on layer 4; player runtime mask = 3 (NO layer 4) → detection is SIGNAL-ONLY via Area3D body_entered (level_manager.gd L691-699), 2-way check (player or player-child).

## Test cases

- **F008-01 Saw kills on contact (no physical block)**
  Player overlaps a rotating saw. Expected: death fires (F010). Because mask excludes layer 4, player should pass INTO the saw geometry, not be physically stopped.
  PASS: death on overlap; no physical bounce (confirms signal-only model). FAIL: bounce instead of death, or no death.

- **F008-02 Ramp launches player**
  Player hits ramp (yellow cone). Expected: launch force 18.0 (up) + min +X 5.0; 0.5s cooldown prevents multi-launch.
  PASS: clear upward+forward launch. FAIL: no launch, or multi-launch spam within 0.5s.

- **F008-03 Ramp launch overshoot boundary**
  Hit a ramp near the finish (x close to 140). Expected: player may overshoot past x=140 airborne. Verify completion still triggers (F014 checks x≥140 — does it fire while airborne?).
  PASS: completes on cross, even airborne. FAIL: overshoots finish and keeps running / falls past with no completion.

- **F008-04 Static debris kills on contact**
  Player overlaps static brown sphere. Expected: death (F010). PASS: death. FAIL: walk-through.

- **F008-05 Swinging hammer kills on contact**
  Time an overlap with the pendulum hammer (period 1.5-3s). Expected: death only during actual overlap window; no death when hammer is away.
  PASS: death only on true overlap. FAIL: constant death or never dies.

- **F008-06 Hazard density scales by tier**
  L1 (0-1 hazards) vs L35 (up to 5): hazard density visibly higher later.
  PASS: scaling. FAIL: same density all tiers.

## Defect hypotheses
- H1 (HIGH): signal-only detection depends on Area3D monitoring flags + body filter; if a hazard's Area3D has a restrictive monitoring mask, a hit silently doesn't register → "phased through a hazard." This is @game-dev risk #2.
- H2: ramp 0.5s cooldown — a second ramp within 0.5s of the first launch is ignored (verify by design: is that intended?).
- H3: hammer period RNG 1.5-3s has no seed → untestable deterministically; test with statistical timing (observed period in range).
