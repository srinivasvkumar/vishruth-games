# Cluster Rush — State Transition Table & Edge Case Catalog

**Source files analyzed:**
- `autoloads/game_manager.gd` — central state machine (5 states, autoload singleton)
- `scripts/game_scene.gd` — scene controller, overlay management, transitions (324 lines)
- `scripts/player/player_movement.gd` — player physics states (398 lines)
- `scripts/ui/hud.gd` — HUD display (118 lines)
- `scripts/ui/end_screen_ui.gd` — game completion screen (57 lines)
- `autoloads/level_manager.gd` — level generation (741 lines)
- `scripts/ui/main_menu_ui.gd` — main menu (242 lines)
- `scripts/ui/level_select_ui.gd` — level select (235 lines)
- `scenes/game.tscn` — scene tree (307 lines)

---

## 1. GAME STATE DEFINITIONS

### GameManager.game_state ( autoload singleton, persists across scene changes )

| State    | Description              | Can transition from      | Can transition to       |
|----------|--------------------------|--------------------------|-------------------------|
| `"menu"` | Main menu / title        | gameover, completed, _ready | playing, level_select, credits |
| `"playing"` | Active gameplay       | menu, _load_level()       | paused, gameover, completed |
| `"paused"` | Game paused locally    | playing                  | playing (resume)        |
| `"gameover"` | No lives remaining  | playing (via player_died) | (terminal — no out)     |
| `"completed"` | All 35 levels done  | playing (level 35 done)  | (terminal — scene switch) |

### GameScene local flags

| Flag               | Type  | Default | Scope                    |
|--------------------|-------|---------|--------------------------|
| `_is_transitioning`| bool  | false   | Per-game-scene instance  |
| `_is_paused`       | bool  | false   | Per-game-scene instance  |

### Overlays (Control nodes, children of `GameUI`)

| Overlay         | Visible when                          | Alpha animation |
|-----------------|---------------------------------------|-----------------|
| `level_complete`| Player reached finish line            | Fade-in 0.4s    |
| `game_over`     | `gameover` signal received             | Fade-in 0.4s    |
| `pause_menu`    | `_toggle_pause()` called               | Instant toggle  |
| `loading_screen`| `_load_level()` running                | Instant show/hide|

---

## 2. COMPLETE STATE TRANSITION TABLE

### 2a. Transition triggers

| From → To          | Trigger / Condition                                  | Code path                                                                                     |
|--------------------|------------------------------------------------------|----------------------------------------------------------------------------------------------|
| menu → playing     | "Start Game" button                                  | `main_menu_ui.gd: _on_start_game()` → `change_scene_to_file("res://scenes/game.tscn")` → game.tscn `_ready()` → `_load_level()` → `GameManager.set_state("playing")` |
| menu → level_select| "Level Select" button                                | `main_menu_ui.gd: _on_level_select()` → `change_scene_to_file("res://scenes/level_select.tscn")` |
| menu → credits     | "Credits" button                                     | `main_menu_ui.gd: _on_credits()` → `change_scene_to_file("res://scenes/credits.tscn")`       |
| playing → paused   | Pause input (E key)                                  | `_process()` → `_toggle_pause()` → `get_tree().paused = true`, `pause_menu.visible = true`, `GameManager.set_state("paused")` |
| paused → playing   | Pause input (E key) / Resume button                  | `_toggle_pause()` → `get_tree().paused = false`, `pause_menu.visible = false`, `GameManager.set_state("playing")` |
| playing → gameover | `lives <= 0` after death                             | `GameManager.player_died()` → `set_state("gameover")` → signal → `_on_game_over()` → overlay shown |
| playing → level_complete | Player reaches `finish_x`                        | `_process()` → `_trigger_level_complete()` → `GameManager.complete_level()` → signal → `_on_level_completed()` → overlay shown |
| playing → completed| Level 35 completion                                  | `GameManager.complete_level()` → `set_state("completed")` → signal → `_on_game_completed()` → scene switch to end_screen.tscn |
| gameover → game    | "Retry" button                                       | `_on_retry()` → tween hide → 0.4s delay → `reload_current_scene()` → fresh game instance   |
| gameover → level_select| "Level Select" button                            | `_on_level_select()` → tween hide overlays → `change_scene_to_file("res://scenes/level_select.tscn")` |
| gameover → menu    | "Main Menu" button                                   | `_on_main_menu()` → tween hide overlays → `change_scene_to_file("res://scenes/main_menu.tscn")` |
| level_complete → game| "Next Level" button                              | `_on_next_level()` → tween hide → 0.4s delay → `reload_current_scene()` (next level)        |
| level_complete → level_select| From pause menu buttons                     | `_on_level_select()` → tween hide overlays → `change_scene_to_file(...)`                     |
| level_complete → menu| From pause menu buttons                          | `_on_main_menu()` → tween hide overlays → `change_scene_to_file(...)`                        |
| game → level_select| Pause → "Level Select" button                        | `_on_level_select()` (from pause_menu) → tween hide → `change_scene_to_file(...)`             |
| game → menu        | Pause → "Main Menu" button                           | `_on_main_menu()` (from pause_menu) → tween hide → `change_scene_to_file(...)`                |

### 2b. Invalid / No-op transitions

| Attempted From → To | What happens                                         |
|---------------------|------------------------------------------------------|
| gameover → anything| No code path exists. All navigation requires buttons on game_over overlay, which DO work (retry, level_select, main_menu). |
| completed → anything| No code path exists. Scene switches to end_screen.tscn (different scene). No way back except from end_screen. |
| menu → paused       | No game state to pause in menu. `_process()` only checks `playing` state. |

---

## 3. HUD VISIBILITY RULES

| Game State     | HUD Visible | HUD Alpha Tween | Notes                          |
|----------------|-------------|-----------------|--------------------------------|
| `menu`         | N/A (wrong scene) | —          | HUD not in main_menu scene     |
| `playing`      | ✅ True     | —               | Set in `_load_level()` line 108 |
| `paused`       | ✅ True     | —               | Pause overlays game, HUD still behind |
| `gameover`     | ❌ False    | —               | Hidden in `_on_game_over()` line 197 |
| `level_complete`| ❌ False   | —               | Hidden in `_on_level_completed()` line 158 |
| `completed`    | ❌ False    | Fade out 0.5s   | HUD alpha tweened to 0 in `_on_game_completed()` lines 221-223 |
| `loading`      | ❌ False    | —               | Set in `_load_level()` line 109 after hide |

**HUD update loop:** `_process()` runs every frame, calls `updateHUD()` every 100ms. Only reads from GameManager (autoload, persists).

---

## 4. OVERLAY VISIBILITY RULES

| Overlay         | Shown when                           | Hidden when                              | Animation  |
|-----------------|--------------------------------------|------------------------------------------|------------|
| `level_complete`| Player reaches `finish_x`            | "Next Level" button pressed              | Fade-in 0.4s / fade-out 0.3s |
| `game_over`     | `lives <= 0` (game_over signal)      | Retry / Level Select / Main Menu buttons | Fade-in 0.4s / fade-out 0.3s |
| `pause_menu`    | Pause input pressed                  | Resume / navigation buttons              | Instant toggle |
| `loading_screen`| `_load_level()` begins               | Level generation complete                | Instant show/hide |

### Overlay stacking scenarios

| Stack order              | Triggered by                                       | Valid? |
|--------------------------|----------------------------------------------------|--------|
| pause_menu on level_complete | User pauses during level_complete animation  | ✅ Works (both visible, pause_menu on top) |
| pause_menu on game_over  | User pauses during game_over                       | ✅ Works (both visible) |
| game_over + level_complete simultaneously | Player hits finish at exact moment of last-life death | ⚠️ Both fade in; game_over wins (last signal wins via z-order) |

---

## 5. PLAYER STATE SPACE

### PlayerMovement independent state variables

| Variable         | Type         | Values              | Meaning                              |
|------------------|--------------|---------------------|--------------------------------------|
| `is_on_ground`   | bool         | true / false        | `is_on_floor()` or ground raycast hit|
| `is_on_wall`     | bool         | true / false        | Side raycast collision               |
| `is_climbing`    | bool         | true / false        | Manual climb mode active             |
| `jump_count`     | int          | 0, 1, 2             | Jumps remaining (max 2)              |
| `wall_direction` | int          | -1, 0, +1           | Wall side (-1=left, +1=right, 0=none)|
| `wall_slide_active`| bool       | true / false        | Currently wall-sliding               |
| `velocity`       | Vector3      | any                 | Physics velocity                     |

### Derived state invariants

| Invariant                                    | Enforced by                                    | Violation risk |
|----------------------------------------------|------------------------------------------------|----------------|
| alive ⟺ game_state == "playing" ∧ lives > 0  | `GameManager.is_player_alive()`                | ⚠️ Manual check required |
| dead ⟺ game_state == "gameover" ∧ lives == 0 | `GameManager.player_died()` path               | ✅ Reliable    |
| physics_active ⟺ set_physics_process(true)   | Explicit enable/disable calls                  | ✅ Relies on code discipline |

### Valid player state combinations (non-trivial)

| on_ground | on_wall | climbing | jump_count | Meaning                      | Valid |
|-----------|---------|----------|------------|------------------------------|-------|
| true      | false   | false    | 0          | Standing on ground           | ✅    |
| true      | false   | false    | 1          | Just landed after jump       | ✅    |
| true      | false   | false    | 2          | Just landed after double jump| ✅    |
| false     | true    | false    | 0          | Sliding down wall            | ✅    |
| false     | true    | true     | 0          | Climbing wall                | ✅    |
| false     | false   | false    | 0          | In air, no coyote            | ✅    |
| false     | false   | false    | 1          | In air, 1 jump left          | ✅    |
| false     | false   | false    | 2          | In air, max jumps            | ✅    |

### Invalid / impossible combinations

| Combination                          | Why impossible |
|--------------------------------------|----------------|
| on_ground=true ∧ climbing=true       | `_check_climbing()` requires `not is_on_ground` |
| on_ground=true ∧ jump_count=2        | Ground contact resets `jump_count` to 0 |
| on_wall=true ∧ on_ground=false ∧ climbing=true ∧ jump_count>0 | Climbing overrides movement, but jump_count only matters for jumps (can't jump while climbing due to physics override) |
| any combination when physics_process=false | Player frozen, all kinematic state static |

---

## 6. INPUT HANDLING PER STATE

| Input              | menu      | playing       | paused          | gameover      | level_complete | completed |
|--------------------|-----------|---------------|-----------------|---------------|----------------|-----------|
| E (pause)          | No-op     | ✅ Toggle     | ✅ Toggle       | ❌ Blocked    | ❌ Blocked     | N/A       |
| Strafe (Z/X)       | N/A       | ✅ Lateral    | ✅ If climbing  | ❌ Frozen     | ❌ Frozen      | N/A       |
| Jump               | N/A       | ✅ Jump       | N/A             | ❌ Frozen     | ❌ Frozen      | N/A       |
| Climb (hold W/S)   | N/A       | ✅ If on wall | ✅                | ❌ Frozen     | ❌ Frozen      | N/A       |
| LevelComplete btn  | N/A       | N/A           | N/A             | N/A           | ✅ Valid       | N/A       |
| Retry btn          | N/A       | N/A           | N/A             | ✅ Valid       | N/A            | N/A       |
| LevelSelect btn    | N/A       | N/A           | N/A (use pause) | ✅ Valid       | N/A            | N/A       |
| MainMenu btn       | N/A       | N/A           | N/A (use pause) | ✅ Valid       | N/A            | N/A       |
| Resume btn         | N/A       | N/A           | ✅ Valid         | N/A           | N/A            | N/A       |
| Next Level btn     | N/A       | N/A           | N/A             | N/A           | ✅ Valid       | N/A       |
| Pause:LevelSelect  | N/A       | N/A           | ✅ Valid         | N/A           | N/A            | N/A       |
| Pause:MainMenu     | N/A       | N/A           | ✅ Valid         | N/A           | N/A            | N/A       |

### Input gating

| Gate                    | Checked in                                    | Blocks input when `_is_transitioning` |
|-------------------------|-----------------------------------------------|---------------------------------------|
| Pause (E key)           | `_process()` line 68                          | ✅ Yes                                |
| Level completion check  | `_process()` line 72                          | ✅ Yes                                |
| Button callbacks        | Each `_on_*` function (e.g. line 243, 263, 276) | ✅ Yes                               |

---

## 7. EDGE CASE CATALOG

### EC-01: PAUSE-BREAKING BUG (HIGH SEVERITY)

**Description:** `_toggle_pause()` does NOT emit a signal when RESUMING the game. This leaves `_is_paused` stuck at `true` even after the game is unpaused.

**Root cause:** `GameManager.set_state("paused")` only emits `game_paused` signal when transitioning TO paused (line 33). The `elif new_state == "playing"` path does nothing. Meanwhile, `_is_paused` is only set in `_on_game_paused()` (line 237) and never reset when resuming.

**Flow:**
1. User is playing, presses E → `_toggle_pause()` → game paused, `game_paused` signal fires → `_is_paused = true`
2. User presses E again → `_toggle_pause()` → `get_tree().paused = false`, `pause_menu.visible = false`
3. `GameManager.set_state("playing")` fires → `game_resumed` signal fires → **BUT `_on_game_resumed()` sets `_is_paused = false`** ✅
4. **Wait:** actually, step 3 DOES work because `game_resumed` is emitted. Let me re-check...

**Re-evaluation:** `GameManager.set_state("playing")` emits nothing, but the `elif new_state == "paused"` path emits `game_paused`, and the `elif new_state == "playing"` path does nothing. BUT `_on_game_resumed()` connects to `GameManager.game_resumed` signal. Does `set_state("playing")` emit that signal? **NO — it does not.** Only `game_paused` is emitted (line 33). There is no `game_resumed` emission.

**Confirmed bug:**
1. Playing, press E → `set_state("paused")` → `game_paused` signal → `_on_game_paused()` → `_is_paused = true` ✅
2. Press E again → `set_state("playing")` → **no signal emitted** → `_on_game_resumed()` **never fires** → `_is_paused` remains `true`
3. Next `_process()` call: `if not _is_paused` evaluates to `false` → **pause input ignored**
4. User cannot unpause via E key again. The pause menu is already hidden. **Game is unplayable until scene reload.**

**Impact:** Game-breaking. After pausing and resuming once, the user cannot pause again.

**Fix:** Either emit `game_resumed` signal in `set_state("playing")` when coming from "paused", or replace `_is_paused` checks with direct `get_tree().paused` checks in `_process()`.

---

### EC-02: DUPLICATE GAME OVER (MEDIUM SEVERITY)

**Description:** The `_on_hazard_collided()` handler does not check if the player is already dead. If the player is colliding with hazards during the 1-second death animation (from falling), multiple hazard collisions fire before the scene transitions.

**Root cause:** `_connect_hazard_signals()` connects `hazard.body_entered` → `_on_hazard_collided` which calls `GameManager.player_died()`. If the player is still in the physics tree (falling after death animation starts), and collides with multiple hazard areas, each collision fires `body_entered`.

**Flow:**
1. Player falls below y=-10 → `player_died.emit()` → `_on_player_died()` → `GameManager.is_player_alive()` returns true → `_handle_death()`
2. `_handle_death()` sets `_is_transitioning = true`, disables physics, but player is still in scene (just frozen)
3. Hazard area still monitoring. If player body_entered is pending → `_on_hazard_collided()` → `GameManager.player_died()` → lives -= 1 again

**Mitigation:** `_handle_death()` disables physics (`set_physics_process(false)`), and the player is teleported to (0, 5, 0). Hazard collisions won't fire because the player is static. **Edge case is unlikely but possible if collision is queued before physics stops.**

**Impact:** Potential loss of an extra life, leading to premature game over.

**Fix:** Add `is_player_alive()` check in `_on_hazard_collided()` before calling `player_died()`.

---

### EC-03: HUD DISPLAY STALE DURING DEATH ANIMATION (LOW SEVERITY)

**Description:** When `player_died()` decrements lives, the HUD doesn't immediately update to reflect the new life count.

**Root cause:** `_on_player_died()` calls `GameManager.player_died()` which updates lives and emits `lives_changed`. HUD connects to `lives_changed` and flashes the lives label. However, if the death animation is 1.0 second long, the HUD still shows the old lives count until the flash completes.

**Flow:**
1. HUD shows "❤️❤️❤️"
2. Player dies → lives = 2 → `lives_changed` fires → HUD flashes yellow then back to white
3. Flash duration is 0.3s. HUD correctly shows 2 hearts.

**Actually:** This works correctly. The `lives_changed` signal causes HUD to update and flash. **Not a bug, just a latency observation.**

**Impact:** Negligible — 0.3s flash delay is acceptable.

---

### EC-04: LEVEL 35 NEXT BUTTON IS NO-OP (LOW SEVERITY)

**Description:** If the player reaches level 35 and completes it, pressing "Next Level" has no effect.

**Root cause:** `_on_next_level()` checks `if next_level <= 35` (line 254). When `current_level == 35`, `next_level == 36`, so the else branch calls `GameManager.complete_level()` again — which is a no-op since `game_state` is already "completed".

**Flow:**
1. Level 35 complete → `game_state = "completed"` → `_on_game_completed()` → `change_scene_to_file("res://scenes/end_screen.tscn")`
2. User somehow presses "Next Level" before scene switch completes → `_is_transitioning` blocks it

**Impact:** Minimal — `_is_transitioning` prevents interaction during the transition.

---

### EC-05: SAVE PERSISTS ACROSS SCENE RELOADS (DESIGN NOTE)

**Description:** GameManager is an autoload singleton. Its state persists across `reload_current_scene()`.

**Verified:** Save data (stars, highest_level) is written to disk in `_save_progress_with_stars()` and survives scene reloads. The GameManager loads this in `_ready()`.

**Behavior:**
- `reload_current_scene()` after level complete → GameManager re-instantiated → `_ready()` loads save → `current_level` restored from save → `_load_level()` sets state to "playing"
- The game starts fresh (lives=3, score=0) because `reload_current_scene()` creates a new scene instance with default variable values, BUT GameManager's `current_level` is set from save

**Key:** `_load_level()` does NOT call `GameManager.start_level()` — it just sets state to "playing". So `current_level` from the previous game persists.

**Flow for level restart:**
1. User completes level 5 → save saves "level 5 complete, level 6 unlocked"
2. User presses "Next Level" → `reload_current_scene()` → GameManager loads save → `current_level = 6` → `_load_level()` → `set_state("playing")`
3. New game starts at level 6 ✅

**Flow for game over → retry:**
1. User dies on level 5 → game over → "Retry" → `reload_current_scene()` → GameManager loads save → `current_level = 5` (not changed by death) → `_load_level()` → `set_state("playing")`
2. New game starts at level 5 ✅

**Edge case:** If user completes level 35 (game_state="completed"), then navigates to level select, then starts game again, the save already has level 35 complete. GameManager's `current_level` might be 36 (highest_level). `_load_level()` would try to load level 36 which doesn't exist.

**Impact:** Potential crash or invisible level.

**Fix:** `GameManager.load_progress()` should cap `current_level` at 35.

---

### EC-06: RAPID NAVIGATION — MENU → GAME → PAUSE → MENU → GAME (MEDIUM SEVERITY)

**Sequence analysis:**
1. Menu → Start Game → `change_scene_to_file("game.tscn")` → scene loaded, `_is_transitioning=false`, game_state=playing ✅
2. Press E → pause → `_toggle_pause()` → game paused, pause_menu visible ✅
3. Pause → Main Menu → `_on_main_menu()` → `_is_transitioning=true` → fade → `change_scene_to_file("main_menu.tscn")` ✅
4. Menu → Start Game → `change_scene_to_file("game.tscn")` → **NEW scene instance** → `_is_transitioning=false` ✅
5. game.tscn `_ready()` → `_load_level()` → `GameManager.set_state("playing")` ✅

**Result:** Works correctly. Each `change_scene_to_file()` creates a fresh GameScene instance with `_is_transitioning=false`.

**However:** GameManager's `current_level` from step 1 persists (autoload). If the user was on level 35, they'll restart at level 35 (or 36 from save). This is a data persistence issue (see EC-05).

---

### EC-07: WEBGL / LOAD FAILURE HANDLING (HIGH SEVERITY)

**Description:** The game has no error handling for WebGL-specific failure modes.

**Failure modes identified:**

| Failure                          | Affected code                                      | Consequence                          |
|----------------------------------|-----------------------------------------------------|--------------------------------------|
| Missing scene file               | `change_scene_to_file("res://scenes/credits.tscn")` | Godot engine error, no graceful fallback |
| Missing audio file               | `FileAccess.file_exists()` + `load()`               | ✅ Already handled (null check)     |
| Missing script preload           | `preload("res://scripts/...")`                      | **Compile-time error** at game launch |
| WebGL offline (resource loading) | `load_threaded_request()` (docs reference)          | No fallback implemented              |
| ConfigFile load failure          | `config.load(_save_path)`                           | ✅ Already handled (err == OK check)|

**Critical preload failures:**
- `preload("res://scripts/hazards/saw_blade.gd")` — If this file doesn't exist, game won't even launch
- `preload("res://scripts/camera/camera_controller.gd")` — Same risk
- `preload("res://scripts/utilities/particle_effects.gd")` — Same risk
- `preload("res://scripts/truck/truck_controller.gd")` — Same risk

**Impact:** If any preload path is broken (e.g., renamed files, missing addons), the game fails at startup with no recovery.

**Fix:** Use `ResourceLoader.load()` with error checking instead of `preload()` for non-critical resources. For critical resources (scripts), add scene loading fallbacks.

---

### EC-08: CONCURRENT OVERLAY FADE-IN (LOW SEVERITY)

**Description:** If both `game_over` and `level_complete` overlays fade in simultaneously, their tweens interfere.

**Root cause:** `_show_overlay_with_animation()` creates a new tween on `_transition_tween` (line 185: `create_tween()`). If two overlays are shown in quick succession, the second call kills the first tween (`_transition_tween.kill()`), so only the second overlay animates.

**Flow:**
1. Player hits finish line → `_trigger_level_complete()` fires → `_on_level_completed()` → `level_complete` fades in
2. In the same frame, `lives <= 0` → game_over signal → `_on_game_over()` → kills level_complete tween → game_over fades in instead

**Impact:** Level complete overlay never shown; game_over shown immediately. Minor UX issue.

---

### EC-09: RESPAWN PLAYER TELEPORT POSITION (MEDIUM SEVERITY)

**Description:** During `_handle_death()`, the player is teleported to `Vector3(0, 5, 0)` — 5 units above ground.

**Issue:** This position is not aligned with the actual ground surface. If the ground is at y=0 (top surface), the player center at y=5 means the player is floating. During the 1.0 second delay, the player falls (but physics is disabled, so they don't move).

**When respawn occurs:**
1. `LevelManager.respawn_player()` → `player.position = Vector3(0, 0.75, 0)`
2. `respawn_player.reset()` → velocity reset, physics re-enabled
3. Player starts at ground level ✅

**Impact:** Visual artifact only — player doesn't actually fall. No gameplay impact.

---

### EC-10: HAZARD SIGNAL RE-CONNECTION ON RELOAD (LOW SEVERITY)

**Description:** `_connect_hazard_signals()` in `LevelManager` connects hazard signals every time a level loads.

**Check:** `if hazard.body_entered.is_connected(_on_hazard_collided)` — duplicate connections are avoided.

**However:** When `reload_current_scene()` is called, the old hazards are freed, new ones created, and signals reconnected in `_load_level()` → `_connect_hazard_signals()`. This is fine because old hazards no longer exist.

**Impact:** None — properly handled.

---

### EC-11: FINISH LINE CHECK DURING DEATH (LOW SEVERITY)

**Description:** `_process()` checks `if player_node.global_position.x >= LevelManager.finish_x` every frame. If the player is dead (physics disabled) but their position is past the finish line, the check might fire.

**Mitigation:** 
1. `_trigger_level_complete()` already fires before death (player reaches finish → level complete handler)
2. If death happens at exactly the finish line, `_is_transitioning` is already true, preventing the check

**Flow:**
1. Player reaches finish → `_is_transitioning = true` → physics stopped → player teleported to finish
2. Player dies → `_is_transitioning = true` already
3. Check: `GameManager.get_state() == "playing"` → if game_state changed to "gameover", check fails

**Impact:** Minimal — death at finish line results in game_over screen (no level complete), which is acceptable.

---

### EC-12: LEVEL SELECT BUTTONS GENERATED AT READY (MEDIUM SEVERITY)

**Description:** `LevelSelectUI._setup_ui()` generates 35 buttons every time the scene loads.

**Issue:** If the user rapidly navigates between level_select and game, buttons are regenerated each time. Also, the `_unlock_threshold` is read once at ready, so if levels unlock mid-session (between navigation), the buttons don't reflect the new unlock state.

**Edge case:** User completes level 5 → goes to level select → buttons show level 5 as completed. User navigates away, then back — buttons regenerate with updated data. ✅ Works correctly on re-entry.

**No bug, but a design note:** No lazy loading or caching of button state.

---

### EC-13: `_on_level_select()` RESETS `_is_transitionING` BUG (HIGH SEVERITY)

**Description:** In `_on_level_select()` (line 281), `_is_transitioning` is set to `false` after the overlay fade, but then the function proceeds to call `change_scene_to_file()`. If the function is called again (from another button) before the first call completes, both will run.

**Root cause:**
```gdscript
func _on_level_select():
    if _is_transitioning:  # line 276: early return check
        return
    _is_transitioning = true  # line 278
    # ... tween hide overlays ...
    _is_transitioning = false  # line 281: RESETS FLAG
    var tween = create_tween()
    # ... tween animation ...
    await tween.finished
    for o in overlays: o.visible = false
    get_tree().change_scene_to_file("res://scenes/level_select.tscn")  # line 293
```

The `await` makes this an async function. After `await tween.finished`, the function resumes but `_is_transitioning` was already reset to `false` at line 281. This means a second call to `_on_level_select()` (e.g., from a different button that also calls it) would pass the early return check and start a second transition.

**Actually:** Both pause_menu and game_over have buttons connecting to the same `_on_level_select` handler. If both buttons are visible (e.g., level_complete + pause_menu), both could fire.

**Flow:**
1. User pauses during level_complete → both overlays visible
2. User clicks both buttons rapidly → two calls to `_on_level_select()`
3. First call: `_is_transitioning = true` → fades
4. Second call: early return check at line 276 sees `true` → returns ✅

**Wait:** The early return at line 276 DOES prevent concurrent calls. But then at line 281, `_is_transitioning = false` happens BEFORE the scene switch. If the scene switch fails (e.g., scene not found), `_is_transitioning` is now false but overlays are hidden — user sees nothing.

**Impact:** If scene load fails, user is in a blank state with no way back.

---

### EC-14: GAME STATE NOT RESET ON DIRECT MENU→GAME NAVIGATION (MEDIUM SEVERITY)

**Description:** From main menu, "Start Game" calls `get_tree().change_scene_to_file("res://scenes/game.tscn")` without first calling `GameManager.start_level()`.

**GameManager values on entry:**
- `current_level` = value from save file (e.g., 6 if player previously completed level 5)
- `lives` = 3 (default)
- `score` = 0 (default)
- `game_state` = "playing" (set by `_load_level()`)

**Issue:** If the save has `highest_level = 36` (all levels completed), `current_level = 36`. `_load_level()` calls `LevelManager.load_level(36)` which will use the "expert" tier template but there are only 35 levels. No bounds check in `load_level()`.

**Impact:** Level 36 would generate with expert-tier parameters. The game would be playable but there is no actual level 36 data. Could cause visual/gameplay glitches.

**Fix:** Cap `current_level` at 35 in `load_progress()` or add bounds check in `_load_level()`.

---

### EC-15: `_on_game_completed()` TWINS HUD TWEEN (LOW SEVERITY)

**Description:** `_on_game_completed()` creates a HUD alpha tween but sets `_is_transitioning = true` at the start (line 216).

**Issue:** `_is_transitioning` was already true from `_trigger_level_complete()` or `_handle_death()`. Setting it again is redundant. More importantly, after `change_scene_to_file("res://scenes/end_screen.tscn")` at line 234, `_is_transitioning` is never set to `false` — but since we're in a different scene, this doesn't matter.

**Flow:**
1. `_is_transitioning = true` (line 216) — redundant
2. Fade HUD alpha 0.5s
3. Stop player
4. Wait 0.5s
5. `change_scene_to_file("end_screen.tscn")`

**Impact:** Minimal — correct behavior but redundant flag setting.

---

### EC-16: PLAYER POSITION LIFTOFF DURING DEATH ANIMATION (LOW SEVERITY)

**Description:** In `_handle_death()`, player is teleported to `Vector3(0, 5, 0)` (line 139). In game.tscn, the player starts at `Vector3(0, 1, 0)` (scene file line 28).

**Issue:** Death animation puts player at y=5, but the game camera follows the player. If the camera has a large follow distance or height offset, it might not capture the player in the frame during the brief 1-second death animation.

**Camera config:** `follow_distance = 8.0`, `height_offset = 4.0`. Camera at y = 5 + 4 = 9, looking at x = 0 + 8 = 8. Player at (0, 5, 0) is visible. ✅

**Impact:** Visual only — player is briefly floating at y=5 during death animation.

---

## 8. SUMMARY OF FINDINGS

### Critical bugs
| ID    | Description                              | Severity | Fix effort |
|-------|------------------------------------------|----------|------------|
| EC-01 | Pause input stops working after first use| **HIGH** | 1 line fix (emit game_resumed or check get_tree().paused) |

### High severity issues
| ID    | Description                                    | Severity | Fix effort |
|-------|------------------------------------------------|----------|------------|
| EC-07 | No WebGL / load failure handling               | **HIGH** | Add error guards for preload/load |
| EC-13 | `_is_transitioning` reset before scene switch  | **HIGH** | Reset after scene change, not before |

### Medium severity issues
| ID    | Description                                      | Severity | Fix effort |
|-------|--------------------------------------------------|----------|------------|
| EC-02 | Duplicate game over from hazard collision queue   | MEDIUM   | Add is_player_alive check |
| EC-05 | Save persists; level 36 possible via navigation   | MEDIUM   | Cap current_level at 35 |
| EC-14 | Direct menu→game doesn't reset current_level      | MEDIUM   | Call start_level or cap level |
| EC-13 | (also) blank state if scene load fails            | MEDIUM   | Add error handling |

### Low severity issues
| ID    | Description                                    | Severity | Fix effort |
|-------|------------------------------------------------|----------|------------|
| EC-03 | HUD latency during death animation             | LOW      | None needed |
| EC-04 | Level 35 "Next Level" is no-op                 | LOW      | Add "Game Complete" button |
| EC-08 | Concurrent overlay fade-in                    | LOW      | Order overlays by priority |
| EC-09 | Teleport position during death                | LOW      | Use ground height |
| EC-11 | Finish check during death                     | LOW      | Check transition flag |
| EC-12 | Button regneration cost                       | LOW      | Lazy load / cache |
| EC-15 | Redundant flag in game_completed              | LOW      | Remove |
| EC-16 | Player float position                         | LOW      | Visual tweak |

---

## 9. RECOMMENDED STATE MACHINE REFINEMENTS

1. **Add `game_resumed` signal** to `GameManager.set_state()` — critical for sync
2. **Change `_is_paused` checks** to use `get_tree().paused` directly
3. **Add bounds check** for level numbers (1-35) everywhere
4. **Add `_is_transitioning` persistence** — set to false only after scene load completes
5. **Add `is_player_alive()` guard** to all hazard collision handlers
6. **Add WebGL error boundary** — try/catch around `change_scene_to_file()`
7. **Consider using a proper state machine** — the current string-based state is error-prone; consider an enum-based approach with explicit transition guards
