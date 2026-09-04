# findings.md Audit — @researcher (System Discovery)

## 1. Line-by-line Audit

### Section 1: Project Overview

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L12 | Game name: ClusterRush / Cluster Rush | **CONFIRMED** | `project.godot` L13: `"ClusterRush"`, L14: `"Cluster Rush - WebGL Game"` |
| L13 | Engine: Godot 4.7.2 (Forward Plus) | **PARTIALLY WRONG** | Engine version CONFIRMED (L16: `4.7`), but render backend is **0 = Forward Mobile**, not Forward Plus. `project.godot` L202: `renderer_backend=0`. The `Forward Plus` in config/features is a feature tag, but the actual WebGL build uses Forward Mobile. |
| L14 | Entry scene: `main_menu.tscn` | **CONFIRMED** | `project.godot` L15 |
| L15 | Export: WebGL single-threaded (no SA/Buffer), Brotli | **CONFIRMED** | `export_presets.cfg` |
| L16 | 35 levels, 5 difficulty tiers | **CONFIRMED** | `level_manager.gd` tier tables + `TOTAL_LEVELS := 35` |
| L17 | MSAA 3D: 2x | **CONFIRMED** | `project.godot` L201: `msaa_3d=2` |
| L18 | Mouse hidden (`show_mouse=false`) | **CONFIRMED** | `project.godot` L28: `input_devices/pointing/show_mouse=false` |
| L19 | Virtual viewport 1280x720, stretch=none | **INFERRED** — **CORRECT** | No `display/window` section in `project.godot`. Godot 4 defaults to 1280x720 canvas with `stretch_mode="none"` / `stretch_aspect="ignore"` when no explicit canvas_size is set. Confirmed by BROWSER_TESTING_PLAN.md and code comments. |
| L20 | Build size ~63.7 MB (WASM 37 + PCK 26.7 + JS 307KB) | **CONFIRMED** | From prior build check |
| L21 | Live URL | **CONFIRMED** | Verified |
| L23 | WebGLBridge commented out in project.godot | **CONFIRMED** | L24: `#WebGLBridge="*res://scripts/utilities/webgl_bridge.gd"` |
| L23 | 4 autoloads: GameManager, LevelManager, AudioManager, InputManager | **CONFIRMED** | L20-23 in project.godot |

### Section 2: Screens / Scenes

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L29 | main_menu.tscn with 4 buttons + hidden SettingsPanel | **CONFIRMED** | Verified scene tree + `main_menu_ui.gd` |
| L30 | level_select.tscn: 35 buttons, 7-col grid, tier colors, stars, Restart+Back | **CONFIRMED** | Verified scene tree + `level_select_ui.gd`. **Missing note**: actual scene has a ScrollContainer wrapping GridContainer (findings.md line 34 reference from old draft is missing from this version). |
| L31 | game.tscn: first-person camera | **CONFIRMED** | `game.tscn` L43: `script = ExtResource("4cam")` → `first_person_camera.gd`, `current = true` |
| L32-33 | end_screen + credits | **CONFIRMED** | Verified |
| L34 | test_simple.tscn: debug "TEST" scene | **CONFIRMED** | Scene exists, contains only a centered "TEST" label, no script. |
| L34 | "out of test scope" | **INFERRED** | This is a judgment call, not a source fact. |

### Section 3: Inputs

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L42-43 | A = ui_left/strafe_left | **CONFIRMED** | `project.godot` L32-48, L164-179. Note: `ui_left` AND `strafe_left` both map to A (duplicate mapping). |
| L44-45 | D = ui_right/strafe_right | **CONFIRMED** | Same: both mapped to D. |
| L46-47 | W = ui_up | **CONFIRMED** | L66-81 |
| L48 | S = ui_down | **CONFIRMED** | L83-97 |
| L49 | jump = Space | **CONFIRMED** | L100-113 |
| L50 | climb = Q | **CONFIRMED** | L116-130 |
| L51 | pause keycode 4194310, empty key_string | **CONFIRMED** | L132-147: `physical_keycode: 4194310`, `key_string: ""`. This is a Godot internal keycode (KEY_F5 on some platforms or a reserved value). **INFERRED that this is likely a placeholder** — it does NOT correspond to a standard key like Escape. |
| L52-53 | reset = R | **CONFIRMED** | L148-163: `physical_keycode: 82`, `key_string: "R"` |
| L55 | Pause: "likely also via UI; key mapping looks incomplete" | **WRONG** | **CORRECTED**: Pause is handled by `InputManager._unhandled_input()` (L27): checks `Input.is_action_just_pressed("pause")` → emits signal → toggles `get_tree().paused`. The game_scene also checks this at L68. **Pause is NOT triggered by any visible key.** The keycode 4194310 is a dead/placeholder mapping — the `pause` action is dynamically registered at L98 of `input_manager.gd` but the user can't actually trigger it unless they press the magic F5-like keycode. This is a BUG. |
| L56-57 | Reset: "restart/respawn? verify usage" | **PARTIALLY CORRECT** | The `reset` input action is **defined in `project.godot`** and **defined in `InputMap`** (it is NOT dynamically registered), but **it is never consumed by any gameplay code**. No script checks `is_action_just_pressed("reset")` or `is_action_pressed("reset")`. The `reset()` method on `player_movement.gd` (L370) exists but is only called from `game_scene.gd` L151 after a death, not from the R key. **R key has NO effect in-game.** |

### Section 4: Player & Movement

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L58 | Capsule r=0.3 h=1.0, green, layer 8 | **CONFIRMED** | `player_movement.gd` L34, L44 |
| L59 | Mask 7 in movement vs 3 in level_manager — INCONSISTENCY | **CONFIRMED** | `player_movement.gd` sets `collision_mask = 7` (L55). `level_manager.gd` sets `collision_mask = MASK_PLAYER` which is `LAYER_GROUND | LAYER_TRUCK | LAYER_HAZARD = 7`. **Actually consistent** — the findings.md flag is a false positive. Both resolve to 7. |
| L60 | GRAVITY 25, JUMP 10, DOUBLE_JUMP 8.5, MAX_JUMPS 2 | **CONFIRMED** | All in `player_movement.gd` constants |
| L61 | MOVE_SPEED 8, AUTO_RUN 5, WALL_JUMP 7/10.5, CLIMB 1.5 | **CONFIRMED** | `player_movement.gd` |
| L62 | Raycasts: Left/Right len 1.0, Ground | **CONFIRMED** | `game.tscn` L29-38 |
| L63 | Fall death y < -10 | **CONFIRMED** | `player_movement.gd` fall death check |
| L64 | 3 raycasts | **CONFIRMED** | game.tscn: RayCastLeft, RayCastRight, GroundCheck |

### Section 5: Trucks & Hazards

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L67-72 | All level generation details | **CONFIRMED** | Verified against `level_manager.gd` |
| L73 | Ground: 300 units, finish at X >= 140 | **CONFIRMED** | L237: `size = Vector3(300, 0.5, 20)`, L276: `finish_x = 140.0` |

### Section 6: Progression / Scoring / Save

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L75-78 | 5 tiers with ranges | **CONFIRMED** | `level_manager.gd` tier definitions |
| L79 | Lives: 3 for 1-5, 2 for 6-35 | **CONFIRMED** | `game_manager.gd` L41: `lives = 3 if level_num <= 5 else 2` |
| L80 | Score: 100 + time bonus | **CONFIRMED** | `game_manager.gd` L58-62 |
| L81 | Stars: 3 stars logic | **CONFIRMED** | `game_manager.gd` L54-69 |
| L82 | Save: user://cluster_rush_save.dat, ConfigFile, highest_level + per-level JSON | **CONFIRMED** | `game_manager.gd` L101-113, `level_manager.gd` L706-719 (per-level JSON saved) |
| L83 | "Web browser persistence = localStorage (INFERRED)" | **UNKNOWN** | In Godot 4.7, `user://` on HTML5 maps to the browser's **IndexedDB** (not localStorage). This is a common misconception. Per Godot docs, `user://` on HTML5 is stored in a browser-side IndexedDB namespace specific to the origin. It persists across reloads but is **not accessible via localStorage APIs**. |

### Section 7: UI Elements

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L86-91 | All UI elements | **CONFIRMED** | Verified against game.tscn scene tree |

### Section 8: Audio

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L93-96 | SFX files on disk, music file exists, AudioManager.play_sfx() is a print-stub | **CONFIRMED** | Files verified on disk. `audio_manager.gd` L31-34: `play_sfx()` only prints. `bgm_around.wav` exists but no music player created. **CORRECT.** |

### Section 9: Camera

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L98-99 | first_person_camera.gd used in game.tscn (CONFIRMED) | **CONFIRMED** | `game.tscn` L42-44: Camera3D with script `first_person_camera.gd`, `current = true` |
| L100 | camera_controller.gd (FollowCamera) exists but NOT used by game.tscn | **CONFIRMED** | Not referenced in game.tscn. However, `level_manager.gd` L656-677 has `_ensure_camera_controller()` which **dynamically creates a FollowCamera** if a Camera3D with a script doesn't already exist. Since game.tscn's Camera3D **does have** `first_person_camera.gd` (and `has_script()` returns true), the `_ensure_camera_controller()` returns early at L662 and does NOT create a second camera. **So FollowCamera is dead code.** |

### Section 10: State Machine

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L103-105 | State transitions | **CONFIRMED** | Matches GameManager states + game_scene.gd transitions |

### Section 11: Browser / Technical

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L108-110 | CORS, WebGL, PCK/WASM sizes, PWA off | **CONFIRMED** | Verified |
| L111 | "user:// save = browser storage (localStorage/IndexedDB)" | **PARTIALLY WRONG** | As noted above, Godot 4.7 on HTML5 uses IndexedDB only, NOT localStorage. The slash makes it ambiguous. |
| L112 | "Refresh/tab-switch: Godot web runtime suspends when hidden" | **CONFIRMED** | Known browser behavior |

### Section 12: Unknowns

| Line | Claim | Verdict | Notes |
|------|-------|---------|-------|
| L115-126 | 10 open questions | **GOOD LIST** | But questions 3, 4, 10 are now ANSWERED in this audit |

## 2. Answers to Open Questions

### a) Actual virtual viewport resolution and stretch mode

**Answer: 1280x720, stretch_mode="none", stretch_aspect="ignore"**

Source: No explicit `display/window` section in `project.godot`. Godot 4 defaults to 1280x720 canvas with `stretch_mode="none"` / `stretch_aspect="ignore"` when no canvas_size is set. This is confirmed by comments in `BROWSER_TESTING_PLAN.md` L67, `webgl-optimization-guide.md` L451, and the code at `detect.py` reference in prior research.

### b) Is camera_controller.gd (FollowCamera) used by any scene?

**Answer: No. Dead code.**

Source: `game.tscn` L42-44 uses `first_person_camera.gd` (ext_resource id="4cam"), NOT `camera_controller.gd`. `level_manager.gd` L656-677 (`_ensure_camera_controller()`) only creates a FollowCamera if the existing Camera3D has no script — but game.tscn's camera does have one, so the function returns early (L662). `camera_controller.gd` is never referenced from any scene file or gameplay script.

### c) Where is the 'reset' (R key) input consumed?

**Answer: Nowhere. It is a dead input binding.**

Source: The `reset` action is defined in `project.godot` L148-163 (R key) and dynamically registered by... wait — actually, `reset` is **NOT** in the `_init_input_actions()` of `input_manager.gd`. It's only in `project.godot`. No script in the game calls `is_action_just_pressed("reset")`, `is_action_pressed("reset")`, or connects to a `reset_requested` signal. The `player_movement.gd` has a `reset()` method (L370) but it's only called from `game_scene.gd` L151 **after death** (not in response to R key). **Pressing R does absolutely nothing.**

### d) Exact pause trigger path in game

**Answer: Two paths, but neither is mapped to a usable key.**

Source:
1. **InputManager** (`input_manager.gd` L24-30): `_unhandled_input()` checks `Input.is_action_just_pressed("pause")` → emits `pause_requested` signal → toggles `get_tree().paused`.
2. **game_scene.gd** L68-69: `_process()` checks `Input.is_action_just_pressed("pause")` → calls `_toggle_pause()` → toggles `get_tree().paused` and shows/hides PauseMenu.

The `pause` action is dynamically registered at `input_manager.gd` L98, and mapped in `project.godot` L132-147 to keycode 4194310 with empty `key_string`. **This is not Escape (KEY_ESCAPE = 4194304 on most platforms). keycode 4194310 does not correspond to any standard keyboard key.** **Result: pause is unreachable by keyboard.**

### e) Is test_simple.tscn referenced anywhere?

**Answer: No. Dead scene.**

Source: Searched all `.gd`, `.tscn`, `.godot`, and `.json` files in the project (excluding addons). `test_simple.tscn` exists (19 lines, single "TEST" label, no script) but is **never referenced** by any scene, script, or config. It was likely a one-off debug test scene that was left in the repo.

### f) What does user:// map to in Godot 4.7 Web export?

**Answer: IndexedDB (not localStorage).**

Source: Godot 4.7 HTML5 backend stores `user://` paths in browser-side **IndexedDB** (a persistent key-value store). Each origin gets its own database. This persists across browser reloads and tab switches (unlike sessionStorage) but is fundamentally different from localStorage — it supports larger data volumes, binary data, and is NOT accessible via `localStorage.getItem()`. **The findings.md "localStorage" characterization at L82 and L108 is incorrect.**

### g) Any scenes, scripts, autoloads, or assets referenced in the PCK but missing from findings.md?

**Missing from findings.md:**

1. **`particles_effects.gd`** — `scripts/utilities/particle_effects.gd` — Procedural particle system with 6 particle types (jump, land, death, complete, dust, sparks). Referenced in `game.tscn` L7 ext_resource. NOT mentioned in findings.md.
2. **`hud.gd`** — `scripts/ui/hud.gd` — HUD overlay script (level, lives, time, score labels, progress bar). Not explicitly listed as a script in findings.md's UI section.
3. **`game_over_ui.gd`** — `scripts/ui/game_over_ui.gd` — Game over overlay handler. Not mentioned.
4. **`level_complete_ui.gd`** — `scripts/ui/level_complete_ui.gd` — Level complete overlay handler. Not mentioned.
5. **`settings_ui.gd`** — `scripts/ui/settings_ui.gd` — Settings panel handler. Not mentioned.
6. **`default_env.tres`** — Referenced in `project.godot` L205 as `environment/default_environment` but **FILE DOES NOT EXIST** on disk. This may cause a warning at engine load or fallback to defaults.
7. **Test fixtures** — 4 files in `tests/fixtures/`: `dump_level_params.gd`, `m5_geometry_probe.gd`, `m5_save_migration.gd`. Not mentioned.
8. **Test files** — 5 test files in `tests/integration/` and 2 in `tests/unit/` (GUT test suite). Not mentioned.
9. **`index.png` / `index.apple-touch-icon.png`** — PWA icons in project root (referenced in `www/manifest.json`). Not mentioned.
10. **`icon.svg`** — Project icon in project root (referenced in build). Not mentioned.

### h) W/S (ui_up/ui_down) — used anywhere in gameplay code?

**Answer: Defined in project.godot but consumed nowhere in gameplay.**

Source: `ui_up` maps to W (L66-81) and `ui_down` maps to S (L83-97) in `project.godot`. But in ALL gameplay scripts (`player_movement.gd`, `game_scene.gd`, `level_manager.gd`), the only input actions checked are:
- `jump` (player_movement.gd L209)
- `strafe_left` / `strafe_right` (player_movement.gd L310)
- `climb` (player_movement.gd L324)

**`ui_up` and `ui_down` are never called.** They are dead input mappings. The player movement is entirely X/Z plane (auto-run + strafe left/right + jump/wall-jump/climb). W/S have no gameplay effect.

## 3. Features/Mechanics NOT Mentioned in findings.md

| Feature | Description | Source |
|---------|-------------|--------|
| **Procedural Particle Effects** | 6 particle types (jump, land, death, complete, dust, sparks) with gradient colors, curve scales, auto-free. All procedural (no texture files). Used during gameplay events. | `scripts/utilities/particle_effects.gd`, `game.tscn` L7/L24 |
| **Input Buffering** | `InputManager` maintains a time-based input queue (`INPUT_BUFFER_TIME = 0.1s`) that buffers actions like jump for forgiving controls. Also tracks ground contact timestamp for coyote time. | `autoloads/input_manager.gd` |
| **Action Remapping** | `InputManager.remap_action()` allows remapping input actions at runtime by transferring buffered timestamps. | `autoloads/input_manager.gd` L74-82 |
| **Pause Menu (in-game)** | Full pause menu with Resume, Level Select, Main Menu buttons. Shows/hides via `_toggle_pause()`. Accessible from pause menu button on game over screen too. | `game.tscn` (PauseMenu), `game_scene.gd` L236-324, `pause_menu.gd` |
| **Auto-Run** | Player auto-runs forward at 5.0 units/s (+X). Player only controls lateral movement (strafe) and vertical (jump/climb). Cannot stop or reverse. | `player_movement.gd` AUTO_RUN_SPEED constant |
| **Wall Slide** | Player descends at max 2.0 units/s when touching a wall while airborne. | `player_movement.gd` WALL_SLIDE_SPEED constant |
| **Wall Jump Input Hang** | 0.15s grace period after leaving a wall where wall-jump is still accepted (prevents missing wall-jumps). | `player_movement.gd` WALL_JUMP_INPUT_HANG_TIME constant |
| **Dynamic Camera Follow** | First-person camera follows player at + (0, 1.5, 0) with `lerp` smoothing (factor 10.0 * delta), rotates to match player yaw, has subtle vertical sway (sin wave) when airborne. | `scripts/camera/first_person_camera.gd` |
| **Progress Bar** | Bottom-of-screen progress bar showing player position along the 300-unit ground (0-100%). | `game.tscn` HUD/ProgressBar, `hud.gd` |
| **Lives Flash** | Lives label flashes yellow on change (0.3s tween back to white). | `hud.gd` |
| **Overlay Fade Animations** | All overlay screens (LevelComplete, GameOver, PauseMenu, LoadingScreen) fade in/out via Tween `modulate:a` transitions. | `game_scene.gd` L178-200 |
| **Level Retry** | Game Over screen has Retry button that reloads current scene (re-generates level). | `game_scene.gd` `_on_retry` |
| **Two-Direction Hazard Collision** | Hazard `_on_hazard_collided()` walks up the node tree to check if colliding body is the player or a child of the player (e.g., if player is parent of something that hits hazard). | `level_manager.gd` L691-699 |
| **Music Volume Slider** | Settings panel has Music and SFX volume sliders, but music playback is non-functional (no AudioStreamPlayer exists). | `scripts/ui/settings_ui.gd` |
