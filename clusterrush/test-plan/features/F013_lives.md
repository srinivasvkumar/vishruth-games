# F013 — Lives (3 for L1-5, 2 for L6-35, decrement on death)

Source: game_manager.gd L14 (`lives = 3`), L39-44 (start_level: `lives = 3 if level_num <= 5 else 2`), L46-53 (player_died). HUD hearts bound via `lives_changed`.

## Defect hypotheses (source-verified by lead)
- **D6 (P1)**: "Start Game" from main menu NEVER calls start_level() → lives stay at initial 3 for ALL levels, including L6-35 which should have 2. Only Level Select → start_level resets lives.

## Test cases
| ID | TC | Steps | Expected (spec) | Evidence |
|----|----|-------|-----|----------|
| F013-01 | Lives on L1-5 | Level Select → L1 | 3 hearts | HUD screenshot |
| F013-02 | Lives on L6 | Level Select → L6 (after completing L5) | 2 hearts | HUD screenshot |
| F013-03 | **D6** Start Game lives | Main menu → Start Game → level 1 | 3 hearts (correct) | HUD |
| F013-04 | **D6** Lives NOT tiered from Start Game | Start Game → complete to L6 → death | 3 hearts still (defect: should be 2 at L6+) | HUD + console |
| F013-05 | Decrement on death | Die ×1 on L1 | 3→2, hearts flash | HUD screenshot pre/post |
| F013-06 | lives_changed signal | Observe hearts update latency | <1 frame | console |
| F013-07 | Score NOT reset by death | Score 50 → die → respawn | score stays 50 (spec: death has no score penalty) | HUD |

## Edge cases
- Death at exactly 1 life → GameOver, not respawn (F016 cross-ref).
- Simultaneous two-hazard contact → single decrement (F010 cross-ref).

## Exit criteria
F013-01…06 PASS. F013-04 expected-to-FAIL (defect D6) — document actual.
