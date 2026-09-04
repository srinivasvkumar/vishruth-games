# F027 — Cross-feature: session integrity (state across screens)

Source: GameManager autoload persists across scene changes; game.tscn reloads re-run _load_level WITHOUT start_level() (verified).

## Test cases (full-session flows)
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F027-01 | Clean session | Boot → Start → complete L1 → L2 → pause → resume → complete L2 → level select → L1 → complete → main menu | every transition clean, no stale state | full session log |
| F027-02 | **D1** GameOver→Retry loop | 0-lives → Retry ×3 | each retry lives=3 (spec) / **0 (defect)** | HUD per retry |
| F027-03 | Refresh mid-pause | Pause → F5 | main menu, lives=3 | HUD |
| F027-04 | Back/forward buttons | Browser back after scene change | document (WebGL state may break) | console + screenshot |
| F027-05 | 30-min soak | Continuous play 30 min (auto-complete loop) | no crash, memory < 500MB, no jank >100ms | DevTools memory+perf |
| F027-06 | Concurrent hazards | Force 3 hazards overlapping player | single death, no stack | console |
| F027-07 | Save round-trip | Complete 10 levels in one session → refresh | all stars + unlocks persist | Level Select |
| F027-08 | Star overwrite | 3★ L1, redo L1 with 1★ | save keeps 3★ | Level Select |

## Exit criteria
F027-01,03,05,07,08 PASS; F027-02/04/06 documented.
