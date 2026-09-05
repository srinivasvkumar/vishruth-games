# Cluster Rush — Feature Inventory (02_feature_inventory.md)

Author: boss_bot (draft v1 — synthesized from verified recon + Round-1 team input;
pending @reviewer challenge). Every feature is a test target. IDs are stable.
Source evidence in findings.md / plan-implementation-analysis.md / audit-findings.md.

## Feature Register

| ID | Feature | Screen/Scope | Source | Class |
|----|---------|--------------|--------|-------|
| F001 | Web startup: engine boot, WASM+PCK download (~63MB), loading UI, WebGL2 context init, fatal-error status | pre-scene | Builds/WebGL/index.html, Godot runtime | CONFIRMED present; runtime behavior UNKNOWN until browser-tested |
| F002 | Main menu: Start Game / Level Select / Settings / Credits; Settings panel (SFX+Music sliders, Close) | main_menu.tscn | main_menu_ui.gd, settings_ui.gd | CONFIRMED |
| F003 | Level select: 35 tier-colored buttons, 7-col grid, star indicators, locked state, Restart, Back; scroll | level_select.tscn | level_select_ui.gd | CONFIRMED |
| F004 | Level generation: synchronous gen (ground 300u, truck convoy, 4 hazard types, falling debris spawner, finish x=140); LoadingScreen flash ~1 frame | game.tscn init | level_manager.gd L186-224, game_scene.gd L91-102 | CONFIRMED |
| F005 | Player movement: auto-run +X 5.0, strafe A/D (accel 12/friction 0.1), gravity 25, jump 10, double-jump 8.5, coyote 0.15s, jump buffer 0.1s | gameplay | player_movement.gd | CONFIRMED |
| F006 | Wall mechanics: wall slide (max fall 2.0), wall jump (7.0,10.5), wall coyote 0.1s, Q-climb 1.5 m/s; raycasts left/right len 1.0 | gameplay | player_movement.gd, game.tscn raycasts | CONFIRMED |
| F007 | Trucks: +X motion, speed re-roll every 1.5s within tier range, Z swerve ±1.5 every 2.5s (lerp), spacing 16, blue box 6×3×3, layer 2 | gameplay | truck_controller.gd, level_manager.gd | CONFIRMED |
| F008 | Hazards: saw (rotating red cylinder), ramp (yellow cone, launch 18.0 force y + min x 5.0, 0.5s cooldown), static debris (brown sphere), swinging hammer (pendulum 1.5–3s) | gameplay | level_manager.gd, ramp.gd | CONFIRMED |
| F009 | Falling debris: spawn every 3–5s above random truck, g=9.81, max fall 5s, **cosmetic-only (no damage, body_entered not wired)** | gameplay | level_manager.gd L371/L86 | CONFIRMED cosmetic |
| F010 | Hazard collision & death: Area3D body_entered → GameManager.player_died() (signal-only; player mask 3 = no physical hazard collision); 2-way check (player or player-child) | gameplay | level_manager.gd L691-699 | CONFIRMED |
| F011 | Fall death: y < -10 → player_died | gameplay | player_movement.gd L351-353 | CONFIRMED |
| F012 | Death flow: _handle_death → 1.0s freeze/teleport (0,5,0) → respawn (0,0.75,0), NO i-frames, internal state (jump_count/wall timers) NOT reset on hazard death | gameplay | game_scene.gd L129-153, level_manager.gd L647 | CONFIRMED |
| F013 | Lives: 3 for L1-5, 2 for L6-35; decrement on death; 0 → GameOver | gameplay/progression | game_manager.gd L41 | CONFIRMED |
| F014 | Level complete: player X ≥ 140 → LevelComplete overlay; score = 100 + min(elapsed×10,100); stars 3★(3 lives+bonus≥50)/2★(2+)/1★(completed); next-level unlock | progression | game_manager.gd L54-69 | CONFIRMED |
| F015 | Transitions: fade in 0.4s / out 0.3s tweens; _is_transitioning lockout (pause blocked, completion check blocked, button early-return); 0.7s window | gameplay UI | game_scene.gd L178-277 | CONFIRMED |
| F016 | GameOver: Retry (reload_current_scene — **lives/score/timer NOT reset = known bug**) / Level Select / Main Menu | overlay | game_scene.gd L262-273 | CONFIRMED + bug |
| F017 | Pause: toggle via "pause" action (keycode 4194310 = dead placeholder, NOT Escape); PauseMenu overlay Resume/Level Select/Main Menu; get_tree().paused | overlay | input_manager.gd L24-30, game_scene.gd L68 | CONFIRMED present, reachability UNKNOWN |
| F018 | HUD: Level label (top-center), Lives hearts (top-left, flash on change), Time (top-right), Score, ProgressBar (bottom, clamped 0-100); ~100ms update | gameplay UI | hud.gd | CONFIRMED |
| F019 | Save/Load: user://cluster_rush_save.dat (ConfigFile) + per-level JSON; highest_level + stars; **browser IndexedDB, origin-scoped** | persistence | game_manager.gd L101-113, level_manager.gd L706-719 | CONFIRMED |
| F020 | Camera: first-person follow +（0,1.5,0), lerp 10×delta, yaw match, airborne sway | gameplay | first_person_camera.gd | CONFIRMED |
| F021 | Audio: 6 SFX files on disk; AudioManager print-stub; **no music playback**; settings sliders (music slider inert) | audio | audio_manager.gd L31-34 | CONFIRMED partial |
| F022 | Particles: procedural 6 types (jump/land/death/complete/dust/sparks), visual-only | gameplay | particle_effects.gd | CONFIRMED |
| F023 | End screen: "All Levels Complete" + final score + Back to Main Menu (after L35) | end_screen.tscn | end_screen_ui.gd | CONFIRMED |
| F024 | Credits screen | credits.tscn | credits_ui.gd | CONFIRMED |
| F025 | Tier/difficulty curve: 5 tiers L1-35 (trucks 1→10, speed 10→25, gaps 4.0→1.0, hazards 0→5); deterministic per level index | progression | level_manager.gd L127-171 | CONFIRMED |
| F026 | Input bindings: A/D strafe (+dup ui_left/right), Space jump (no-repeat), Q climb; **R reset = dead, W/S = dead** | input | project.godot, audit | CONFIRMED |
| F027 | Truck regeneration on retry: new random positions/speeds/swerves/hazards (no seed) | gameplay | truck_controller.gd L45/L53 | CONFIRMED |

## Out of scope (documented, not tested)
- test_simple.tscn (dead scene), camera_controller.gd (dead code), WebGLBridge (commented out)
- Godot-side GUT suites in tests/ (separate from browser QA campaign)
