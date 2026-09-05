# Cluster Rush — Defect Ledger

IDs D1–D19 preserved from `test-plan/task_plan.md` and `test-plan/discussion_log.md`.

| ID | Severity | Feature | Description | Status | Owner | Verification |
|----|----------|---------|-------------|--------|-------|--------------|
| D1 | P0 | F014 | Retry after Game Over reloads scene without `start_level()` → starts with 0 lives. Post-GameOver Retry is unplayable. | OPEN | game-dev | game-tester then reviewer |
| D2 | P0 | F011 | Pause double-bound: single press produces no-op (toggle fires twice). | OPEN | game-dev | game-tester then reviewer |
| D3 | P0 | F011 | Pause bound to KP_Enter (4194310); laptops without numpad cannot pause. | OPEN | game-dev | game-tester then reviewer |
| D4 | P0 | F010 | Hazard death race at finish line — no transition lockout. | OPEN | game-dev | game-tester then reviewer |
| D5 | P1 | F014 | Star formula uses `lives` after decrement; off-by-one on lives=1. | OPEN | game-dev | game-tester then reviewer |
| D6 | P1 | F013 | Lives tier: L1–5=3, L6–35=2 — verify no off-by-one at boundary. | OPEN | game-dev | game-tester then reviewer |
| D7 | P1 | F018 | HUD allocation churn: `StyleBoxFlat.new()` every 100ms in `_update_progress_bar`. | OPEN | game-dev | game-tester then reviewer |
| D8 | P1 | F016 | Wall-clock timer uses `Time.get_ticks_msec()` — not pause-aware. | OPEN | game-dev | game-tester then reviewer |
| D9 | P1 | F027 | End screen: `set_score()` never called → Final Score stays "0". | OPEN | game-dev | game-tester then reviewer |
| D10 | P1 | F024 | Credits screen has no exit button — player trapped. | OPEN | game-dev | game-tester then reviewer |
| D11 | P1 | F002 | "Start Game" calls `change_scene_to_file("game.tscn")` but never calls `GameManager.start_level()`. | OPEN | game-dev | game-tester then reviewer |
| D12 | P1 | F024 | Credits screen is static (no script, no exit). Verify no exit path exists. | OPEN | game-dev | game-tester then reviewer |
| D13 | P2 | F008 | Ramp: no x-min check — ramp at negative X unreachable. | OPEN | game-dev | game-tester then reviewer |
| D14 | P2 | F012 | Possible double-respawn on hazard death (both `_on_player_died` and `player_died` signal fire). | OPEN | game-dev | game-tester then reviewer |
| D15 | P2 | F006 | Wall climb: both strafe inputs active → `get_axis` returns 0 → drift. | OPEN | game-dev | game-tester then reviewer |
| D16 | P2 | F005 | Auto-run: `velocity.x = AUTO_RUN_SPEED` overwrites momentum every frame. | OPEN | game-dev | game-tester then reviewer |
| D17 | P2 | F019 | AudioManager: `play_sfx()` is a print-stub — no audio plays. | OPEN | game-dev | game-tester then reviewer |
| D18 | P2 | F004 | Level generation: no random seed → replayability issue. | OPEN | game-dev | game-tester then reviewer |
| D19 | P2 | F001 | WebGL: no COOP/COEP headers on GitHub Pages — cross-origin isolation not guaranteed. | OPEN | implementer | game-tester then reviewer |

## Rules
- A defect is CLOSED only with: original test re-run PASS + related regression PASS + reviewer sign-off.
- New defects get IDs D20+ and are appended here.
