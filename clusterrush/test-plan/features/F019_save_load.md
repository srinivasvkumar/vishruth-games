# F019 — Save/Load (ConfigFile, per-level stars, web IndexedDB)

Source: game_manager.gd L78-108 (_save_progress_with_stars = **single writer**; L130-150 load_progress), level_manager.gd L704-730 (read-only ConfigFile consumers: get_unlocked/get_star_rating). Save at user://cluster_rush_save.dat → **browser IndexedDB per origin** on Web (CONFIRMED by @researcher + @game-tester).

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F019-01 | Save on complete | Complete L1 | save.dat: highest=2, L1: {stars, best} | LevelManager console readback |
| F019-02 | Load on boot | Relaunch → Level Select | L2+ unlocked, L1 stars shown | screenshot |
| F019-03 | Per-origin isolation | 2 browsers (Chrome/Firefox) | independent saves | both screenshots |
| F019-04 | Refresh mid-level | F5 mid-run | back to main menu; lives=3; save intact | HUD |
| F019-05 | Corrupt save | Manually delete/corrupt IndexedDB key → boot | graceful fallback to fresh save (or error — document) | console |
| F019-06 | Quota full | Fill IndexedDB to limit → complete level | save fails gracefully; no crash | console + HUD |
| F019-07 | Stars max | Earn 3★ L1, then 1★ L1 again | save keeps 3★ (max, not overwrite) | Level Select |
| F019-08 | 35-level save | Complete all | highest clamps at 35; L35 stars stored | console |
| F019-09 | No reset-progress UI | Search menus | **absent** (feature gap) — document | UI tour |

## Edge cases
- Save write race: complete_level → immediate refresh before ConfigFile flush.
- Private browsing mode (IndexedDB may be ephemeral).

## Exit criteria
F019-01,02,03,07 PASS; F019-05,06,08 documented (failure mode acceptable if non-crashing); F019-09 filed as gap.
