# F022 — Particles (6 procedural types)

Source: particle_effects.gd — 6 procedural emitters: jump/land/death/level_complete/dust/sparks (no texture assets; CPUParticles3D or GPUParticles3D — verify at runtime).

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F022-01 | Jump burst | Jump | small upward puff at feet | video |
| F022-02 | Land puff | Land from jump | dust burst on impact | video |
| F022-03 | Death burst | Die | red/death burst at death pos | video |
| F022-04 | Complete sparkle | Finish | celebration burst at finish line | video |
| F022-05 | Dust on run | Run on ground | periodic dust behind player | video |
| F022-06 | Sparks on truck | Contact truck side | spark burst | video |
| F022-07 | Perf | 20 simultaneous bursts | <2ms frame cost | DevTools perf |
| F022-08 | No leak | 5 deaths in one run | particle node count stable | console (child count) |

## Exit criteria
F022-01…06 visually PASS; F022-07/08 PASS (budgets).
