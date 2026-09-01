# F018 — HUD (level label, lives hearts, progress bar, score)

Source: hud.gd L65-90 (_update_progress_bar: clampf(x/finish_x); **creates 3 StyleBoxFlat per call** L80-82), hud.gd _process timer 0.1s → ~10Hz update.

## Defect hypotheses (source-verified by lead)
- **D9 (P1)**: Every _update_progress_bar call allocates 3 new StyleBoxFlat + 3 add_theme_stylebox_override → ~30 allocations/sec on a 63MB WASM heap. Measure GC pressure / jank over a 60s run.

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F018-01 | Level label | Start L3 | "Level 3" top-center | screenshot |
| F018-02 | Hearts reflect lives | 3 lives | 3 hearts; on death → 2 with flash | screenshots |
| F018-03 | Progress at 0 | spawn | 0% | screenshot |
| F018-04 | Progress at 100 | x=140 | 100% | screenshot |
| F018-05 | Progress monotonic | full run | never decreases (x only +) | video scrub |
| F018-06 | **D9** allocation | 60s run, heap snapshot at 10s/30s/60s | <10MB delta, no jank spikes | DevTools memory |
| F018-07 | HUD during overlay | pause/complete | HUD hidden or behind overlay (document) | screenshot |
| F018-08 | Resize 50%→200% | drag window | HUD reflows without clipping | screenshots |

## Exit criteria
F018-01…05,07,08 PASS; F018-06 documents D9 magnitude.
