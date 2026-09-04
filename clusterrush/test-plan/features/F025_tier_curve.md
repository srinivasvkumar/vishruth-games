# F025 — Tier/Difficulty Curve (5 tiers, L1-35)

Source: level_manager.gd tier tables: trucks 1→10, truck speed 10→25, gap width, hazard density per tier. @researcher flagged **tutorial gap [3.0,4.0]**: L5 (tier-2 start) may be harder than L4 — inverse difficulty curve at the tier 1→2 boundary.

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F025-01 | L1 playable | 3 attempts | complete in ≤3 tries (tier 1 baseline) | session log |
| F025-02 | **D18** L4→L5 | Complete L4, first L5 attempt | L5 should be ≥ as easy as L4; **if harder (gap [3,4]) document** | attempts-to-complete |
| F025-03 | Tier monotonic | Sample L1,5,10,15,20,25,30,35 | difficulty non-decreasing per tier (count trucks/hazards on screen) | screenshots per level |
| F025-04 | L35 passable | Expert tier | completable by human tester in ≤10 tries; if never → curve broken | session log |
| F025-05 | Star attainability | Each tier, aim for 3★ | 3★ reachable on every level | save readback |

## Exit criteria
F025-01,04,05 PASS; F025-02/03 document curve shape.
