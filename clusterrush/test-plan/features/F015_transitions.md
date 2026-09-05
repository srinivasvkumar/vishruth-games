# F015 — Transitions (fade in/out, _is_transitioning lockout)

Source: game_scene.gd L100-130, 240-300 (_hide_overlay_with_animation, _on_next_level 0.4s delay + reload, _on_retry, _on_level_select, _on_main_menu, _is_transitioning guard on each).

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F015-01 | Next lockout | Double-tap Next during 0.4s window | single reload; second click ignored | console (1 reload msg) |
| F015-02 | Retry lockout | Double-tap Retry | single reload | console |
| F015-03 | Pause during fade | Press KP_Enter mid-fade | Document actual (pause overlay stacks?) | screenshot |
| F015-04 | Fade timing | Measure fade out duration | 0.3s out, 0.4s in (±2 frames) | video/perf |
| F015-05 | Reload correctness | Complete L1 → Next | HUD shows L2, score carries | HUD |
| F015-06 | Back-to-menu reset | GameOver → Main Menu → Start | lives=3, score=0, level=1 | HUD + console |

## Edge cases
- Click Next then immediately close tab (mid-reload).
- Resize window during fade.

## Exit criteria
F015-01,02,05,06 PASS; F015-03 documented.
