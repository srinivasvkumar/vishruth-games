# F016 — Game Over (0 lives, Retry, level-select, main-menu)

Source: game_manager.gd L46-53 (player_died → gameover), game_scene.gd L240-260 (_on_retry: 0.4s delay + `get_tree().reload_current_scene()`; _on_level_select; _on_main_menu).

## Defect hypotheses (source-verified by lead)
- **D1 (P0)**: `reload_current_scene()` re-instantiates game.tscn whose _load_level calls `set_state("playing")` but NEVER `start_level()` → GameManager.lives (0), score, level_start_time all PERSIST. Post-GameOver Retry starts a **0-lives run**: first hazard/fall = instant GameOver again.

## Test cases
| ID | TC | Steps | Expected (spec) | Expected (defect D1) | Evidence |
|----|----|-------|-----|-----|----------|
| F016-01 | GameOver trigger | Lives → 0 | GameOver overlay + fade | same | screenshot |
| F016-02 | **D1** Retry lives | GameOver → Retry | 3 (or 2) hearts | **0 hearts; die → instant GameOver** | HUD |
| F016-03 | **D1** Retry score | Score 150 → GameOver → Retry | 0 | **150 persists** | HUD |
| F016-04 | **D1** Retry timer | GameOver → Retry | timer reset | **stale timer → star/score corruption on complete** | HUD/Debug |
| F016-05 | Level Select from GameOver | Click Level Select | level select UI | same (scene change resets via start_level) | screenshot |
| F016-06 | Main Menu from GameOver | Click Main Menu | main menu; next Start = clean state | same | HUD |
| F016-07 | GameOver at L35 | 0 lives on final level | GameOver (no "all complete") | same | screenshot |

## Edge cases
- Retry during GameOver fade (lockout).
- Refresh tab at GameOver state → reload → level select/main menu, lives=3 (autoload _ready).

## Exit criteria
F016-01,05,06,07 PASS. F016-02/03/04 expected-to-FAIL (D1) — record exact behavior for the fix ticket.
