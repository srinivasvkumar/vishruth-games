# Cluster Rush — Shared Reconnaissance (findings.md)

Lead: boss_bot (QA Architect)
Date: 2026-09-01
Status: DRAFT v2 — verified against source, pending team discussion
Classification key: CONFIRMED (verified in source/build) | INFERRED | UNKNOWN | NOT PRESENT

## 1. Project Overview

| Property | Value | Class |
|---|---|---|
| Game name | Cluster Rush / ClusterRush | CONFIRMED |
| Engine | Godot 4.7.2, render backend **Forward Mobile** (renderer_backend=0, NOT Forward Plus) | CONFIRMED (audit) |
| Entry scene | `res://scenes/main_menu.tscn` | CONFIRMED (project.godot L15) |
| Export | WebGL single-threaded (no SharedArrayBuffer), Brotli | CONFIRMED (export_presets.cfg) |
| Levels | 35, 5 difficulty tiers | CONFIRMED (level_manager.gd) |
| MSAA 3D | 2x | CONFIRMED |
| Mouse | Hidden (`show_mouse=false`) | CONFIRMED |
| Virtual viewport | 1280×720 canvas init (stretch mode not in project.godot → default) | INFERRED — verify actual `display/window` settings in editor/project; stretch=none reported earlier |
| Build size | ~63.7 MB (index.wasm 37.0 MB + index.pck 26.7 MB + index.js 307 KB) | CONFIRMED |
| Live URL | https://srinivasvkumar.github.io/vishruth-games/Builds/WebGL/index.html ; local http://localhost:8765 (CORS server) | CONFIRMED |

Autoloads: GameManager, LevelManager, AudioManager, InputManager (all CONFIRMED, project.godot L20-23). WebGLBridge present on disk but **commented out** in project.godot — NOT PRESENT at runtime.

## 2. Screens / Scenes

| Scene | Script | Class |
|---|---|---|
| `main_menu.tscn` — Start Game / Level Select / Settings / Credits buttons, hidden SettingsPanel | `main_menu_ui.gd` | CONFIRMED |
| `level_select.tscn` — 35 dynamic buttons, 7-col grid, tier colors, stars, Restart + Back | `level_select_ui.gd` | CONFIRMED |
| `game.tscn` — gameplay: World (lights, ParticleEffects, Player CharacterBody3D + raycasts, Camera3D first-person) + GameUI overlay (HUD, LevelComplete, GameOver, PauseMenu, LoadingScreen) | `game_scene.gd` | CONFIRMED |
| `end_screen.tscn` — "All Levels Complete!" + final score + Back to Main Menu | `end_screen_ui.gd` | CONFIRMED |
| `credits.tscn` — title + RichTextLabel | `credits_ui.gd` | CONFIRMED |
| `test_simple.tscn` — debug "TEST" scene | n/a | CONFIRMED (out of test scope) |

KNOWN ISSUE (from prior session, needs team verification): gameplay was rendering empty in real browser (user tested: no player/terrain/trucks/camera/HUD after Start Game). Fix for `LevelManager.get_unlocked_levels()` now exists (CONFIRMED present in level_manager.gd) but whether gameplay actually renders in browser is UNKNOWN until re-tested — that's the subject of this QA plan.

## 3. Inputs (CONFIRMED from project.godot)

| Action | Key | Notes |
|---|---|---|
| ui_left / strafe_left | A | auto-repeat |
| ui_right / strafe_right | D | auto-repeat |
| ui_up | W | auto-repeat |
| ui_down | S | auto-repeat |
| jump | Space | no-repeat |
| climb | Q | wall climb |
| pause | (keycode 4194310 = KEY_ESCAPE-ish placeholder, key_string empty) | INFERRED: pause likely also via UI; key mapping looks incomplete — verify in game_scene.gd how pause is triggered |
| reset | R (physical 82) | **DEAD BINDING — no script consumes "reset"** (audit + @game-dev). Pressing R = no-op in all states. Test baseline: verify no effect. |

Runtime registration: InputManager registers jump/strafe_left/strafe_right/climb/pause at runtime (CONFIRMED patterns in input_manager.gd). Mouse: hidden → mouse clicks on 2D UI buttons only (menu navigation). Touch/controller: NOT PRESENT.
**DEAD MAPPINGS (CONFIRMED by audit):** ui_up (W) and ui_down (S) are defined but consumed nowhere in gameplay — movement is auto-run +X, strafe A/D only. ui_left/ui_right ALSO map to A/D (duplicate mapping alongside strafe_left/strafe_right). Pause keycode 4194310 = placeholder, NOT Escape (KEY_ESCAPE=4194304) → **pause likely unreachable by keyboard = critical test target**.

## 4. Player & Movement (CONFIRMED, player_movement.gd ~13KB)

- Capsule r=0.3 h=1.0, green, layer 8. **COLLISION MASK RESOLVED (source-verified):** player_movement.gd L75 sets mask=7, but LevelManager._place_player() L557 OVERWRITES to MASK_PLAYER=3 (LAYER_GROUND|LAYER_TRUCK=1|2, NO hazard layer 4). So at runtime player physically collides with ground+trucks only; **hazards are detected signal-only via Area3D body_entered** (level_manager L691-699). Testable implication: hazard hit = signal, no physics bounce.
- GRAVITY 25.0; JUMP 10.0; DOUBLE_JUMP 8.5; MAX_JUMPS 2; MOVE_SPEED 8.0; AUTO_RUN 5.0 (+X forward); WALL_JUMP (7.0, 10.5); WALL_CLIMB 1.5 (Q held); WALL_SLIDE max 2.0; ACCEL 12.0; FRICTION 0.1; COYOTE 0.15s; JUMP_BUFFER 0.1s; WALL_COYOTE 0.1s; MAX_FALL 30.0; raycasts: Left/Right (len 1.0), Ground.
- Fall death: y < -10 → player_died.
- Three raycasts (left/right/ground) for wall & floor detection.

## 5. Trucks & Hazards (CONFIRMED, level_manager.gd ~24KB)

- Trucks: blue box 6×3×3, layer 2, +X motion, speed re-rolled every 1.5s within tier min/max, Z swerve ±1.5 every 2.5s, lerp smoothing. Spacing 16 (width 6 + gap 10).
- Hazards on trucks (4 types): saw blade (rotating red cylinder), ramp (yellow cone, launches player at 18 force, 0.5s cooldown), static debris (brown sphere), swinging hammer (pendulum, period 1.5–3s).
- Falling debris: spawned every 3–5s above random truck, gravity 9.81, max 5s fall.
- Hazard collision: Area3D body_entered → GameManager.player_died().
- Ground: 300 units long (-150..+150). Finish at player X ≥ 140.

## 6. Progression / Scoring / Save (CONFIRMED, game_manager.gd + level_manager.gd)

- 5 tiers: Tutorial 1–5, Easy 6–10, Medium 11–20, Hard 21–30, Expert 31–35 (trucks 1→10, speed 10→25, gaps 4.0→1.0, hazards 0→5).
- Lives: 3 for levels 1–5, 2 for 6–35.
- Score: 100 base + time bonus `min(elapsed*10, 100)` per level.
- Stars: 3★ (3 lives + bonus≥50), 2★ (2+ lives), 1★ (completed).
- Save: `user://cluster_rush_save.dat` (ConfigFile; highest_level + per-level JSON). **Web persistence = browser IndexedDB per origin, NOT localStorage** (CONFIRMED by @researcher + @game-tester: Godot 4.7 HTML5 stores user:// in origin-scoped IndexedDB). Consequence: localhost:8765 save is invisible from github.io, and a new port = new save. No in-game "reset progress" UI exists (verify absence as a finding).
- Level N complete unlocks N+1.
- Last level complete → end_screen.

## 7. UI Elements (CONFIRMED)

- HUD: LevelLabel (top center), LivesLabel (top-left, hearts), TimeLabel (top-right), ScoreLabel (below timer), ProgressBar (bottom); updates ~every 100ms; lives flash on change.
- Overlays (fade via Tween modulate): LevelComplete (Next Level), GameOver (Retry / Level Select / Main Menu), PauseMenu (Resume / Level Select / Main Menu), LoadingScreen (bar).
- Main menu: 4 buttons + settings panel (SFX slider, Music slider, Close).
- Level select: 35 buttons tier-colored, star indicators, locked greyed out, scrollable, Restart + Back.
- End screen: trophy, final score, back to menu.
- Credits: text.

## 8. Audio (PARTIALLY PRESENT)

- SFX files on disk: jump, land, death, hit, wall_slide, wall_jump (CONFIRMED). Music: bgm_around.wav (1.7MB) exists (CONFIRMED) but NO music player is created — AudioManager.play_sfx() is a print-stub (CONFIRMED, audio_manager.gd L31-34). Settings panel exposes Music + SFX volume sliders; **music slider controls nothing at runtime** (CONFIRMED by @researcher audit).

## 9. Camera

- `first_person_camera.gd` used in game.tscn (CONFIRMED, game.tscn L42-44, current=true): follows player at +(0,1.5,0), lerp smoothing (factor 10.0*delta), matches player yaw, airborne sin sway.
- `camera_controller.gd` (FollowCamera, third-person) = **DEAD CODE** (CONFIRMED by @researcher): not referenced by any scene; LevelManager._ensure_camera_controller() L656-677 only creates a FollowCamera if the existing Camera3D has NO script — but game.tscn's camera HAS first_person_camera.gd, so it returns early. No second camera is ever created.

## 10. State Machine (draft, to be finalized in 03_state_model.md)

Loading → Main Menu → (Level Select | Gameplay | Settings | Credits)
Gameplay: Playing ⇄ Paused; Playing → LevelComplete → next level; Playing → GameOver → (Retry | Level Select | Main Menu); Level 35 complete → End Screen → Main Menu.
Death: lives-1 → respawn in same level; lives 0 → GameOver.

## 11. Browser / Technical Notes

- Single-threaded WASM; COOP/COEP headers served by local cors_server.py for CORS; GitHub Pages serves via .nojekyll.
- WebGL context: requires GPU; canvas-based rendering (DOM tests can't see inside).
- 26.7 MB PCK + 37 MB WASM = heavy initial download; progressive loading not enabled (PWA off).
- Refresh/tab-switch: Godot web runtime suspends when hidden — timing-sensitive behavior UNKNOWN (needs browser testing).
- user:// save = browser storage (localStorage/IndexedDB) — persistence across reloads INFERRED.

## 12. Unknowns / Open Questions (for team discussion)

1. Does gameplay actually render in real browser now? (prior user test: NO) — baseline P0 test.
2. Which player collision mask wins (7 vs 3)?
3. What does R (reset) actually do in-game?
4. How is pause triggered (key mapping looks empty)?
5. Is music actually played anywhere?
6. Does the save persist across browser refresh?
7. Does the loading screen actually appear, or is level generation synchronous?
8. What happens on WebGL context loss / low-memory mobile?
9. Is test_simple.tscn referenced anywhere (dead scene)?
10. Are W/S (ui_up/ui_down) used for anything in gameplay? (movement seems X/Z-plane; verify.)

## 13. Assumptions (must not become tests without verification)

- A3: 1280×720 virtual resolution, stretch none (CONFIRMED by audit: no display/window section → Godot 4 default).
- A4: user:// persists per-origin in browser IndexedDB (CONFIRMED — corrected from localStorage).
- A5: first-person camera is the only active camera (CONFIRMED — FollowCamera is dead code).
- A6: no touch/controller support (CONFIRMED).

## 14. Additional Features/Assets (from @researcher audit — were missing from original findings)

- **Procedural particle system** (`scripts/utilities/particle_effects.gd`): 6 types (jump/land/death/complete/dust/sparks), all procedural (no textures), auto-free. Visual feedback only — no gameplay effect.
- **Input buffering / coyote time** (`autoloads/input_manager.gd`): time-based input queue (INPUT_BUFFER_TIME=0.1s) + ground-contact timestamp.
- **Action remapping** (`input_manager.gd` L74-82): remap_action() at runtime.
- **Dead scene** `test_simple.tscn` (19 lines, "TEST" label, no script, never referenced) — out of test scope.
- **`default_env.tres` MISSING on disk** but referenced in project.godot L205 (environment/default_environment) — possible engine-load warning; verify console at startup.
- **Tests already in repo** (do NOT re-invent): `tests/fixtures/` (dump_level_params, m5_geometry_probe, m5_save_migration), `tests/integration/` (5 GUT), `tests/unit/` (2 GUT). These are Godot-side, separate from the browser QA plan.
- **Per-level JSON save** (`level_manager.gd` L706-719) in addition to GameManager's save.
