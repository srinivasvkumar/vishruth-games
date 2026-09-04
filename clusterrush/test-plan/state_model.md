# Cluster Rush — State Model (03_state_model.md)

Author: boss_bot (draft v1 — from verified recon). This is the state/transition
model the test plan must cover. Every transition is a test target; every state
has entry/exit conditions.

## Screen States (top level)

```
[SPLASH/LOADING] ──engine+WASM+PCK ok──▶ [MAIN_MENU]
       │
       └─fatal (WebGL2 missing, WASM abort, PCK 404)──▶ [FATAL_ERROR status UI]  (F001)

[MAIN_MENU] ─Start Game──▶ [GAMEPLAY level 1 always]
   │  _on_start_game() (main_menu_ui.gd L208-215): reads get_unlocked_levels() but
   │  DOES NOT PASS IT anywhere; just change_scene_to_file("game.tscn");
   │  game_scene._load_level() L99 loads GameManager.current_level (default 1).
   │  → "Start Game" ALWAYS starts at level 1. (CONFIRMED by boss_bot source read)
   │  → Test target: does start-after-progress still begin at L1, or should it
   │    resume at highest unlocked? Spec ambiguity = explicit test.
   ├─Level Select──▶ [LEVEL_SELECT]
   ├─Settings─────▶ [SETTINGS overlay on menu]
   └─Credits──────▶ [CREDITS]
[LEVEL_SELECT] ─pick level N (unlocked)──▶ [GAMEPLAY level N]
   │  _on_level_selected() (level_select_ui.gd L218-225): checks _unlock_threshold
   │  (locks N > threshold → print + return, button stays), then
   │  GameManager.start_level(level_num) (sets current_level, lives 3-if-N≤5-else-2,
   │  score=0) BEFORE change_scene_to_file("game.tscn"). ✓ properly initialized
   │  → Contrast with Start Game (no start_level call). Divergence is a test target.
   ─Restart──▶ reload current
   ─Back──▶ [MAIN_MENU]
[GAMEPLAY] ──(see sub-states below)
[END_SCREEN] ◀── L35 complete (==35) complete ──▶ Back to Main Menu
```

## Gameplay Sub-states (game_scene.gd / game_manager.gd)

| State | Entry | Exit | Notes / testable invariants |
|-------|-------|------|------------------------------|
| GAMEPLAY_LOADED | LevelManager.load_level() done, player placed (0,0.75,0), trucks spawned, HUD shown | first frame | Synchronous gen; LoadingScreen ~1 frame; verify world renders (P0 gate) |
| | **Start-Game path state hazard (CONFIRMED):** Start Game never calls start_level() → on a 2nd+ entry in the same page load, GameManager.lives (possibly 0 after GameOver), score, and current_level carry over; only the timer is reset (set_state("playing") game_manager.gd L29). **Start Game after GameOver can begin with lives=0 → instant game-over.** P0 test target. |
| GAMEPLAY_RUNNING | auto-run active, timer running | death OR complete | lives>0; camera follows; HUD updates ~100ms; no input gating |
| GAMEPLAY_TRANSITIONING | fade in/out tween started (_is_transitioning=true) | tween done (~0.7s) | pause BLOCKED, completion check BLOCKED, level buttons early-return; verify double-tap no-op |
| GAMEPLAY_DEAD | player_died (hazard signal OR fall y<-10) | 1.0s freeze → respawn | lives--; 0→GAME_OVER; NO i-frames; internal jump/wall timers NOT reset; death teleport (0,5,0) |
| GAMEPAUSE_PAUSED | "pause" action fired | Resume | get_tree().paused=true; overlay; reachability UNKNOWN (keycode dead) — verify UI alt path |
| LEVEL_COMPLETE | player X ≥ 140 (and not transitioning) | Next / Retry / Menu | score+=100+bonus; stars; unlock N+1; if N==35 → END_SCREEN |
| GAME_OVER | lives==0 | Retry / Level Select / Menu | Retry = reload_current_scene, **lives/score/timer NOT reset (known bug)** |

## Progression State (cross-level)
```
[unlocked=1] ─complete L1, save──▶ [unlocked=2] ─...──▶ [unlocked=35] ─complete L35──▶ [END_SCREEN, all-complete]
```
- Save written on each completion: user://cluster_rush_save.dat + per-level JSON (IndexedDB, origin-scoped).
- Reload/restart mid-campaign restores `unlocked` + stars; **in-progress level progress is NOT persisted** (refresh = back to L-start).

## Data / resource states a test may observe
- `GameManager.current_lives` (3 for L1-5, 2 for L6-35)
- `GameManager.total_score`, per-level `stars`
- `LevelManager.current_level_index`, generated truck set, debris spawner timer
- `InputManager` buffered input queue (0.1s) + coyote timestamp
- Save blob contents (dump via DevTools/IndexedDB for ground truth)

## Transition edge cases the test matrix MUST hit
- Jump/strafe/climb during GAMEPLAY_TRANSITIONING (fade) → should be ignored? (jump not gated — verify)
- Hazard hit exactly as X crosses 140 → death vs complete race
- Death → 0 lives mid-transit to GameOver
- Retry with 0 lives → playable with 0 lives (bug F016)
- Refresh during GAMEPLAY_RUNNING → no in-progress save; returns to menu/last-unlocked
- Pause during transition → blocked; Pause during DEATH freeze → ?
- Complete L35 → END_SCREEN vs back-to-menu
- Tab-switch (rAF pause) during RUNNING → dt spike, tunneling risk
