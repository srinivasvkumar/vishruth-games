# Cluster Rush — Implementation Analysis for Test Plan

## 1. Player Collision Mask: mask 7 (player_movement.gd) vs mask 3/7 (level_manager.gd)

**Verdict: MASK_PLAYER = 7, so both resolve to 7. The findings.md flag was a false positive.**

- `player_movement.gd` L75: `collision_mask = 7` (Ground 1 | Hazard 4 | Truck 2)
- `level_manager.gd` L20: `MASK_PLAYER := LAYER_GROUND | LAYER_TRUCK = 1 | 2 = 3`
- **BUT** `level_manager.gd` L23: `MASK_HAZARD := LAYER_PLAYER` — and L452 sets hazard mask to MASK_HAZARD = 8, not 3
- The findings.md says "mask 3" but `MASK_PLAYER = 3` is correct. The **actual collision mask set by LevelManager at L557** is `MASK_PLAYER = 3`, NOT 7.

**Wait — let me re-check:** L20 says `MASK_PLAYER := LAYER_GROUND | LAYER_TRUCK` = 1 | 2 = 3. But the player_movement.gd sets mask 7. The LevelManager's `_place_player()` at L557 overwrites to MASK_PLAYER = 3.

**WINNER: mask 3 from level_manager.gd overwrites mask 7 from player_movement.gd.**

- **Mask 3 = detect Ground(1) + Truck(2) — does NOT detect Hazard(4)**
- **Mask 7 = detect Ground(1) + Truck(2) + Hazard(4)**

**CRITICAL BUG:** Hazard Area3Ds are parented to trucks (L352: `truck.add_child(hazard)`). The hazard has layer 4 (LAYER_HAZARD), mask 8 (MASK_HAZARD = LAYER_PLAYER). The player mask 3 means the player does NOT detect hazards (layer 4). Hazard collision detection relies entirely on the Area3D's `body_entered` signal (L691-699), not on physical collision. This works because hazards are Area3D with monitoring=true, and the code connects `body_entered` manually. So the game functionally works but the physics-based collision between player and hazards is bypassed — it's signal-based only.

**Risk:** If hazards are ever not parented to trucks, the player (mask 3) won't physically collide with them at all. Signal-based detection is fragile.

---

## 2. Level Generation: Is load_level() Synchronous?

**Verdict: load_level() IS synchronous (blocking). LoadingScreen is a flash that may not be visible.**

Flow in `game_scene.gd`:
1. `_load_level()` (L91): sets `loading_screen.visible = true`
2. `await get_tree().process_frame` (L96) — yields ONE frame
3. `LevelManager.load_level(GameManager.current_level)` (L99) — this calls `_generate_level()` which is fully synchronous (no awaits, no timers)
4. `loading_screen.visible = false` (L102) — immediately after

The entire `_generate_level()` at L186 runs in a single frame:
- Cleans scene children (L193-202) — O(n) loop, instant
- Creates ground (L209) — one StaticBody3D, instant
- Creates truck convoy (L215) — N trucks × ~60 lines each, instant
- Creates hazards (L218) — instant
- Places player (L221) — instant
- Ensures camera (L224) — instant

**Freeze window:** The `await process_frame` yields one frame. Then generation happens in one frame. Then hide loading. Total: ~1-2 frames of freeze at 60 FPS = 16-32ms. On WebGL/low-end devices, this might be 3-4 frames = 50-66ms. **The LoadingScreen overlay is effectively invisible** — it shows for less than one frame cycle, the user will never see it.

---

## 3. Respawn: Where exactly and i-frames?

**Respawn location:** `(0, 0.75, 0)` — the origin of the track, ground level.

Two paths:
1. **`GameManager.player_died()` (L45-52):** decrements lives, if lives > 0 calls `LevelManager.respawn_player()` which at L647 sets `player.position = Vector3(0, 0.75, 0)` and `velocity = Vector3.ZERO`.
2. **`game_scene._handle_death()` (L129-153):** sets `_is_transitioning = true`, stops player physics, teleports player to `Vector3(0, 5, 0)`, calls `player.die()`, then after 1.0s await calls `LevelManager.respawn_player()` and `player.reset()`.

**There are NO invulnerability i-frames.** After the 1.0s delay in _handle_death(), the player is immediately active again at position (0, 0.75, 0). The `player.die()` method at L387-398:
- Sets velocity to ZERO
- Sets jump_count = max_jumps (prevents jumping)
- Plays death SFX
- Emits `player_died` signal
- Calls `set_physics_process(false)` — then in _handle_death, after respawn, `set_physics_process(true)` is called again (L150)

**BUG/RISK:** After respawning from a fall death, the player is placed at (0, 0.75, 0). But if a truck is at that position (the first truck spawns at start_x=4.0, so it won't be at x=0), the player is safe. However, the player has no collision mask for hazards, and the `reset()` method at L370-381 resets movement state but does NOT restore collision_mask. The mask is 3 (no hazard detection), so if a hazard Area3D's body_entered fires on a player that's somehow overlapping (e.g., from being knocked into a truck), the signal handler at L691-699 will still detect it.

---

## 4. Transitions: Fade tweens and input locking

**Input locking via `_is_transitioning` flag.**

The tween animations:
- Fade IN: 0.4s (L186: `tween_property(overlay, "modulate:a", 1.0, 0.4)`)
- Fade OUT: 0.3s (L192: `tween_property(overlay, "modulate:a", 0.0, 0.3)`)

During `_is_transitioning = true`:
- L68-69: pause toggle blocked in _process
- L72-77: level completion check blocked
- Each button handler (_on_next_level L242, _on_retry L262, _on_level_select L275) returns early if `_is_transitioning`

**Sequence for "Next Level":**
1. `_is_transitioning = true` (L245)
2. Fade out LevelComplete overlay (0.3s tween)
3. callback: `level_complete.visible = false`
4. `await get_tree().create_timer(0.4).timeout` (L256)
5. `get_tree().reload_current_scene()` (L257)

**Total blocking window:** 0.3s (fade out) + 0.4s (await timer) = 0.7s minimum. During this window, `_is_transitioning` is true, so all button clicks are rejected (early return). **Double-tap is impossible within the transition.**

**After reload:** Scene reloads, `_load_level()` runs, game starts fresh. `_is_transitioning` is NOT reset to false before the reload. It stays true across scene reload because it's a member variable that persists... **actually NO** — `reload_current_scene()` destroys the entire scene and recreates it, so ALL member variables are reset. `game_scene.gd`'s `_ready()` sets `level_complete.visible = false` and `level_complete.alpha = 0.0`. `_is_transitioning` defaults to false (L26: `var _is_transitioning: bool = false`). So after reload, the game is clean.

**BUG:** If user rapidly double-clicks "Next Level" or "Retry" from their respective overlays, only the first click succeeds (the second is rejected by the `_is_transitioning` guard). This is intentional and correct behavior.

---

## 5. Retry vs Next Level vs Level Select — State Reset

| Field | Next Level | Retry | Level Select (from GameOver/Pause) | Main Menu |
|---|---|---|---|---|
| **Scene reload** | Yes (reload_current_scene) | Yes (reload_current_scene) | No (change_scene_to_file) | No (change_scene_to_file) |
| **GameManager.current_level** | SAME (saved in autoload) | SAME (saved in autoload) | SAME (saved in autoload) | SAME (saved in autoload) |
| **GameManager.lives** | RESET by start_level() via autoload ready | RESET by start_level() via autoload ready | RETAINED (load_progress reads saved highest_level) | RESET? (no, autoload stays) |
| **GameManager.score** | RESET by start_level() via autoload ready | RESET by start_level() via autoload ready | RETAINED | RETAINED |
| **GameManager.level_start_time** | RESET by start_level() | RESET by start_level() | RETAINED (game_state was "gameover" or "paused") | RETAINED |
| **GameManager.game_state** | RESET to "playing" by _load_level() L112 | RESET to "playing" by _load_level() L112 | RETAINED ("gameover" or "paused") | RETAINED ("menu" only from main_menu) |

**Critical: Scene reload via `reload_current_scene()` destroys and recreates game.tscn.** This means:
1. `game_scene.gd` is recreated → `_ready()` runs → `_load_level()` is called → `GameManager.start_level(current_level)` is NOT called explicitly from _load_level(), but `LevelManager.load_level(GameManager.current_level)` is called.
2. `GameManager` is an autoload (singleton) — it persists across scene reloads. Its `lives` and `score` are NOT reset by scene reload.
3. `LevelManager.load_level()` at L173-184 emits signals, calls `_generate_level()`, sets finish_x.

**BUG: `GameManager.start_level()` is never called after scene reload!** This means:
- `lives` is NOT reset (retains whatever it was at death)
- `score` is NOT reset (retains previous score)
- `level_start_time` is NOT reset (the old timer continues)
- `level_started` signal is never emitted on retry

**This is a significant bug for Retry:** the lives counter from the failed attempt persists. If you had 1 life left before dying, retrying will start with 1 life — but the code at L121-127 checks `GameManager.is_player_alive()` which checks `lives > 0`. If you died (lives decremented), then retry with `reload_current_scene()`, lives remain at the decremented value. If it was 0, you'd immediately be in game_over state with no lives.

Wait — let me trace more carefully:
1. Player dies, `GameManager.player_died()` → `lives -= 1` (say 2→1)
2. If lives still > 0: `_handle_death()` in game_scene.gd runs, 1s delay, respawn
3. If lives = 0: game_over signal fires, game_scene shows GameOver overlay
4. User clicks "Retry" → `reload_current_scene()` → `_load_level()` → `LevelManager.load_level(current_level)` → `GameManager.set_state("playing")` (L112)
5. But `GameManager.lives` is still 1 (or 0 if it was the last life)!

**VERDICT: Retry does NOT reset lives or score. This is a bug.**

Level Select (change_scene_to_file to level_select.tscn) destroys game.tscn, but GameManager autoload persists. Lives/score/state are retained.

---

## 6. Trucks on Retry: Regenerated with new random params?

**Yes, fully re-generated with new random params.**

On `reload_current_scene()`:
1. Scene recreates, `game_scene._ready()` → `_load_level()` → `LevelManager.load_level(current_level)`
2. `_generate_level()` at L186-224:
   - Cleans all dynamic children from World (L193-202)
   - Recreates ground (L209)
   - **Recreates truck convoy** via `_create_truck_convoy()` (L215) → `_create_truck()` (L269-285)
   - **Recreates hazards** via `_create_hazards()` (L218)
   - Replaces player (L221)

Each truck gets random parameters via `randf_range()` in truck_controller.gd L45 and L53. The `randf_range(min_speed, max_speed)` and `randf_range(-1.5, 1.5)` calls use Godot's global RNG. **There is NO deterministic seed set anywhere** — `randi()` and `randf_range()` calls use the default RNG with no seed configuration.

**Implication for testers:** Every retry produces a different truck layout, different speed targets, different swerve targets. Hazards on trucks also get `randf_range()` positions (L355-356). Hammer periods are `randf_range(1.5, 3.0)` (L394). Falling debris spawn interval is `randf_range(3.0, 5.0)` (L371).

**Same level params** (tier config, truck_count, gap_size) are deterministic via `get_level_parameters()` L127-171 — these use linear interpolation based on level index, not random. Only the per-truck runtime behavior is random.

---

## 7. Timing Assumptions: Deterministic seed or fully random?

**Fully random. No seed anywhere in the codebase.**

| Event | Interval | Source | Deterministic? |
|---|---|---|---|
| Debris spawn | 3-5s initial, 4s after | L371: `randf_range(3.0, 5.0)`; L86: interval = 4.0 | NO — initial interval random |
| Truck speed re-roll | 1.5s fixed | truck_controller.gd L20: `SPEED_CHANGE_INTERVAL = 1.5` | YES — fixed interval, but the TARGET speed is random |
| Truck swerve | 2.5s fixed | truck_controller.gd L19: `SWERVE_CHANGE_INTERVAL = 2.5` | YES — fixed interval, but TARGET is random |
| Hammer period | 1.5-3s random | L394: `randf_range(1.5, 3.0)` | NO — per-hazard random |
| Ramp cooldown | 0.5s fixed | ramp.gd L35: `_launch_cooldown = 0.5` | YES |
| Debris fall | max 5s | L8: `max_fall_time = 5.0` | YES |

**No `RandomNumberGenerator` or `seed()` calls found anywhere.** Godot's RNG is seeded automatically from system time on engine start. **Two test runs at the same time are still different** because the engine start time differs by at least a millisecond.

---

## 8. Ramp Launch: 18.0 Force Upward — Can Player Escape Bounds?

**Yes, player can be launched very high. No bound check exists.**

Ramp.gd L37-42:
```
player_body.velocity.y = launch_force  # = 18.0
if player_body.velocity.x > 0:
    player_body.velocity.x = maxf(player_body.velocity.x, 5.0)
```

Player physics: gravity 25.0, max fall speed 30.0 (player_movement.gd L17, L29).

**Maximum height calculation:**
- Upward velocity = 18.0
- Deceleration = 25.0 gravity
- Time to peak = 18.0 / 25.0 = 0.72s
- Height = 18.0 × 0.72 - 0.5 × 25.0 × 0.72² = 12.96 - 6.48 = **6.48 units above launch point**
- Launch point is at ramp position on truck (~y=4.0 on truck, truck at y=0, so ramp at ~y=4.5)
- Peak = ~11.0 units above ground

**This is well below the fall-death threshold of y=-10** (opposite direction). So the player will not escape via falling death.

**However:** At peak height, the player is ~11 units above the track. The ground is 300 units long (-150 to +150 in X). If the player was near the end (x > 130) and gets launched, their auto-run (5.0 X velocity) during the 0.72s airtime moves them ~3.6 units forward. Combined with forward truck velocity (if on a truck), this could theoretically push them past x=140 while airborne.

**BUG POTENTIAL:** During launch, `player_body.velocity.y = launch_force` OVERWRITES the y-velocity. But `velocity.x` is also set by player_movement.gd L307: `velocity.x = AUTO_RUN_SPEED`. The ramp's set happens in `_physics_process` which runs concurrently with player_movement. **Order of execution matters:** If the ramp's `_physics_process` runs after player_movement's, the ramp's forward velocity preservation (L41-42) could be overwritten by the next frame's AUTO_RUN. If it runs before, the AUTO_RUN will set it back to 5.0.

**The ramp does NOT check bounds or cap height.** The player will always land because gravity is constant 25.0 and max fall speed is 30.0.

---

## 9. Fall Death & Tunneling Risk

**Fall death:** `player_movement.gd` L351-353: `if position.y < -10.0: player_died.emit()`

**Tunneling risk: MODERATE.** The player is a CharacterBody3D with `move_and_slide()` at L138. This provides **continuous collision detection only for the player vs static bodies** (CharacterBody3D's move_and_slide handles per-frame collision). However:

- **Player vs Trucks:** Truck mask is 3 (Ground 1 | Truck 2). Player mask is 3. They share layers 1 and 2. The player WILL physically collide with trucks via move_and_slide.
- **Player vs Hazards:** Player mask is 3, hazards are layer 4. **No physical collision possible.** Detection is only via `body_entered` signal. If the player's capsule (radius 0.3, height 1.0) somehow overlaps an Area3D without the signal firing (unlikely but possible with fast movement), there's no safety net.
- **High-speed tunneling:** At max speed (25 units/s truck + 8 units/s player Z movement), the player moves ~0.42 units per frame (25 * 0.016). The capsule radius is 0.3. In a narrow gap between two hazards (e.g., saw blade radius 0.8, spacing < 1.6), the player could theoretically pass between them if they're moving fast enough. **Godot's physics does not have sub-stepping by default** in forward-only mode.

**The actual tunneling risk is LOW for the track layout** because:
1. Hazards are placed on trucks with generous sizing (radius 0.8 sphere for saw, radius 1.0 cylinder for ramp)
2. The player capsule is small (r=0.3)
3. move_and_slide detects collisions at each physics step

**But a known regression risk is:** If hazard collision shapes are reduced or gaps between hazards shrink (hard/expert tiers have more hazards with tighter truck spacing), the detection could fail at high speeds.

---

## 10. Fragile Areas / Known Regression Risks

### Critical

1. **Lives not reset on Retry** (game_scene.gd L262-273): `reload_current_scene()` does not call `GameManager.start_level()`. Lives, score, and timer persist from the failed attempt. **This is a game-breaking bug.** A player who dies with 0 lives and retries will have lives=0, game_state="gameover" from the autoload — but `_load_level()` at L112 calls `GameManager.set_state("playing")` which changes state. However, `is_player_alive()` at L122 checks `lives > 0` — so if lives is still 0, the next hazard collision at L121-127 would pass silently without triggering death (because `is_player_alive()` returns false). The player could play with 0 lives.

2. **No hazard collision mask** (level_manager.gd L557): Player collision_mask = MASK_PLAYER = 3, does not include LAYER_HAZARD (4). Hazard detection relies entirely on Area3D body_entered signals, not physics collision. If the signal connection breaks (e.g., hazard parented incorrectly), there's no fallback.

3. **AudioManager is a stub** (findings.md L89): `AudioManager.play_sfx()` is a print-stub. SFX played through player's AudioStreamPlayer3D node but music doesn't play at all.

### High

4. **LoadingScreen is invisible** (game_scene.gd L91-102): Shows for ~1 frame. Users won't see it, which is fine for performance but bad UX — there's no actual loading indicator.

5. **HUD progress bar re-styled every 100ms** (hud.gd L77-82): Creates new StyleBoxFlat objects every frame. Creates memory pressure over long play sessions. Should be done once in _ready().

6. **_bar_style() allocates new StyleBoxFlat every call** (hud.gd L84-88): Called 3 times per 100ms update. On mobile/WebGL this could cause GC pressure.

### Medium

7. **No `rand_seed()` anywhere**: Non-deterministic gameplay makes bug reproduction and speedrun verification impossible.

8. **`reload_current_scene()` destroys ALL scene state** (game_scene.gd L257): Camera, player, particles — everything is destroyed and recreated. If any custom node setup fails, the level won't render. No fallback if scene root is missing.

9. **HUD _find_player() walks node tree every 100ms** (hud.gd L98-106): Gets current scene → World → Player. This O(depth) lookup every 100ms is fine for this game but could be cached.

10. **Player start position vs truck spawn**: Player at x=0, first truck at x=4.0. If truck speed starts at 10 and gap is large, the player can cross the truck safely. But on expert tier with 10 trucks and 1.0-2.0 gap spacing, the first gap appears at truck 1's position. The player starts behind truck 0, which moves at 22-25 units/s. In 0.72s (ramp launch time), truck 0 moves 15.8-18.0 units forward. **The player is at risk of being squished between the starting truck and the ground edge if the player tries to jump over it.**

11. **Death teleport to (0, 5, 0) during _handle_death** (game_scene.gd L139): This places the player ABOVE the starting position. If a hazard Area3D is present at the spawn point (from a previously generated level that wasn't fully cleaned), the player could instantly die on respawn.

12. **`_is_transitioning` flag persists through `_handle_death`** (game_scene.gd L130, L153): 1.0 second of input lock during death animation. During this time, the player cannot control the character even though physics is stopped. This is intentional for the death animation but means the player cannot "cancel" a bad jump mid-fall.
