# F014 — Level Complete (x ≥ 140, score, stars, overlay)

Source: game_scene.gd L76-84 (completion check in _process), game_manager.gd L55-74 (complete_level: `if game_state != "playing": return`; elapsed*10 capped 100; stars: 1, or 2 if lives>=2, or 3 if lives>=3 AND bonus>=50; score += 100+bonus; _save_progress_with_stars).

## Defect hypotheses (source-verified by lead)
- **D4 (P0)**: `body_entered` hazard signal fires from physics, NOT gated by `_is_transitioning` → hazard death can race completion in the same frame at x≈140.
- **D5 (P1)**: Star formula gap: 3 lives remaining but bonus < 50 → only 2★ (spec intent: 3★ for flawless-ish runs). Formula is `lives>=3 AND bonus>=50`, not `lives==3`.

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F014-01 | Basic complete | Reach x=140 on L1 | LevelComplete overlay + 0.3s fade | screenshot |
| F014-02 | Score math | Complete L1 in 12.0s | 100 + min(120,100)=200 total | overlay/Debug label |
| F014-03 | 1★ floor | Die twice then complete (L1: 3→1 lives) | 1★ | stars on overlay + save |
| F014-04 | 2★ path | Die once, complete fast (bonus≥50) | 2★ | stars |
| F014-05 | **D5** 3★ path | No deaths + bonus≥50 (≤5s run) | 3★ expected; formula gives 3★ ✓ | stars |
| F014-06 | **D5** 3-lives slow | No deaths + bonus<50 (slow run) | **defect: 2★** (spec: 3★?) | stars + console |
| F014-07 | Save on complete | Complete L1 | save.dat updated: highest=2, L1 stars | console (LevelManager readback) |
| F014-08 | **D4** race | Place saw at x≈139.5, cross finish line | Ambiguous: complete OR death — document actual | console + screenshot |
| F014-09 | Double-complete guard | Force x≥140 twice in 2 frames | complete_level() once (game_state gate) | console |
| F014-10 | Next Level | Click Next | 0.4s delay + scene reload, HUD level +1 | screenshot |
| F014-11 | Next at L35 | Complete L35 | End screen (game_completed → end_screen) | screenshot |

## Edge cases
- Death exactly at x=140.0 (boundary).
- Complete while paused? (can't — pause stops player).
- Save write fails (quota) mid-complete → level complete but no save.

## Exit criteria
F014-01,02,07,09,10,11 PASS; F014-04,05 stars match formula; F014-06 documents D5; F014-08 documents D4 actual behavior.
