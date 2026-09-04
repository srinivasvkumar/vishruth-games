# Cluster Rush — Input Mapping & Interaction Matrix
## Physical Interaction Catalog

Generated: 2026-09-01 (AEST)

---

## 1. INPUT DEFINITIONS (from `project.godot` + `input_manager.gd`)

### 1.1 Keyboard/Mouse Action Map

| Action           | Key(s)                | Type         | Notes                                     |
|------------------|-----------------------|--------------|-------------------------------------------|
| `jump`           | Space, Up (Key 38), W (Key 87) | Just-Pressed (edge)  | Used via `Input.is_action_just_pressed()` |
| `strafe_left`    | A (Key 65), Left Arrow | Both pressed & just-pressed | Used via `Input.get_axis("strafe_left", "strafe_right")` |
| `strafe_right`   | D (Key 68), Right Arrow| Both pressed & just-pressed | Used via `Input.get_axis("strafe_left", "strafe_right")` |
| `climb`          | Q (Key 81)            | Held         | Held-action; no `ui_action_repeat` flag  |
| `pause`          | Escape (Key 4194310)  | Just-Pressed | Toggles `get_tree().paused`               |
| `reset`          | R (Key 82)            | Just-Pressed | Registered in input map but **not wired** to any handler in current code |
| `ui_left`        | A (Key 65), Left Arrow | Both        | Default Godot UI action, overlaps strafe_left |
| `ui_right`       | D (Key 68), Right Arrow| Both        | Default Godot UI action, overlaps strafe_right |
| `ui_up`          | W (Key 82), Up Arrow  | Both         | Default Godot UI action, overlaps jump    |
| `ui_down`        | S (Key 83), Down Arrow| Both         | Default Godot UI action, unused          |

### 1.2 Action Registration

All five game actions (`jump`, `strafe_left`, `strafe_right`, `climb`, `pause`) are also registered in `input_manager.gd._init_input_actions()` at runtime if they do not already exist. This is a safety net; they are already defined in `project.godot`.

### 1.3 Input Handling Pipeline

```
Keyboard event (just-pressed)
  └─> input_manager.gd._unhandled_input()
       ├─► pause  →  toggles get_tree().paused   (early return)
       └─► jump   →  buffers input, emits jump_requested signal
          
Keyboard event (held)
  └─> input_manager.gd.is_climbing()   →  Input.is_action_pressed("climb")
  
Continuous axis (every frame)
  └─> input_manager.gd.get_strafe_input()  →  Input.get_axis("strafe_left", "strafe_right")
```

---

## 2. INPUT-ACTION MATRIX

### 2.1 Single Inputs — By Game State

#### STATE: `menu` (main menu, level select, credits, end screen)

| Input        | Effect                                                                 |
|--------------|------------------------------------------------------------------------|
| `jump`       | Ignored. `ui_up` could move focus in a focusable control, but no focusable controls are wired to jump. |
| `strafe_left/right` | Ignored. No character to move.                                       |
| `climb`      | Ignored.                                                              |
| `pause`      | Ignored (no game to pause). No handler intercepts pause in menu scenes. |
| **R**        | Ignored (action exists but no handler).                               |

**Result:** Menu screens are input-dead except for button navigation (mouse/touch, which Godot handles natively).

#### STATE: `playing`

| Input        | Effect                                                                 |
|--------------|------------------------------------------------------------------------|
| `jump`       | Pressed → buffered for 0.1s; if player is grounded (or within coyote time 0.15s), executes ground jump (+10.0Y). If in air with jump_count=0 near wall → wall jump. If jump_count=1 → double jump (+8.5Y). |
| `strafe_left/right` | Continuously affects Z-axis velocity toward ±8.0 max (acceleration 12.0, friction 0.1). A=-1 Z, D=+1 Z. |
| `climb`      | When touching a wall (raycast detect), not on ground: activates wall climb (+1.5Y climb, strafe affects Z). |
| `pause`      | Toggles `get_tree().paused = true`, shows `PauseMenu`.               |
| **R**        | No handler wired. No effect.                                            |

#### STATE: `paused`

| Input        | Effect                                                                 |
|--------------|------------------------------------------------------------------------|
| `jump`       | Ignored. `get_tree().paused = true` blocks `_unhandled_input` from processing. |
| `strafe_left/right` | Ignored. Player physics not stepping.                                |
| `climb`      | Ignored.                                                               |
| `pause`      | Toggles `get_tree().paused = false`, hides PauseMenu.                  |

#### STATE: `gameover` / `level_complete` / `completed`

| Input        | Effect                                                                 |
|--------------|------------------------------------------------------------------------|
| All inputs   | Ignored. Player physics stopped (`set_physics_process(false)`). `get_tree().paused` is NOT set, but `_unhandled_input` still fires — however, no game logic responds because `GameManager.get_state()` returns `"gameover"`, `"completed"`, etc. |

---

### 2.2 Rapid Repeated Input (Spamming)

| Spam Action       | Behavior in `playing` state                                            |
|-------------------|------------------------------------------------------------------------|
| Spam `jump`       | **Handled safely.** Jump buffer (0.1s) coalesces all presses. `jump_count` caps at 2, so after one ground jump + one double jump, additional presses are consumed (jump_count=2, `can_jump()` returns false). Spamming has **no negative effect** beyond wasted input. |
| Spam `strafe_left/right` | **No effect** — `Input.get_axis()` returns the current axis value (-1, 0, or 1). Repeated presses don't stack or overflow. Z velocity clamps at ±8.0. |
| Spam `climb`      | **No effect** — toggles `is_climbing` only when conditions are met (wall contact, not grounded). If conditions aren't met, presses are silently ignored. |
| Spam `pause`      | **Flashes between paused/unpaused** on each press. Each press toggles. At high spam rate the game will be in a rapid paused→unpaused→paused cycle, causing visual stutter. **Recommended fix:** debounce with a minimum toggle interval (e.g., 0.25s). |

---

### 2.3 Simultaneous / Conflicting Inputs

| Combination              | Behavior                                                              |
|--------------------------|-----------------------------------------------------------------------|
| `strafe_left` + `strafe_right` | `Input.get_axis()` returns 0. Player only has auto-run (X=5.0), no lateral Z movement. This is **correct and handled**. |
| `A` (strafe_left) + `W` (jump) + `Q` (climb) | `W` triggers jump buffer → ground/jump executes. `A` sets Z-axis target to -MOVE_SPEED. `Q` activates climb (if wall-contacted). All three execute simultaneously. **This is a valid combo** for a "jump while moving backward and immediately climbing on wall contact". |
| `strafe_left` during climb | Reused as climb vertical control. Strafe_left → climb up, strafe_right → climb down (same key, same velocity.y=+1.5). **Note:** The code always uses `WALL_CLIMB_SPEED` (up), not strafe for up/down — strafe only affects Z during climb. |
| `pause` during wall jump mid-air | `get_tree().paused` toggles, halting all physics mid-air. Resuming leaves player at the exact position where physics stopped. **Can be used as a "freeze frame" mechanic** — potentially exploitable to wait out dangerous situations. |
| `climb` + `jump` on wall  | `jump` (just-pressed) triggers wall jump in `_handle_jump_buffer`. `climb` (held) is checked in `_check_climbing` in the same physics frame. **Race condition:** `_physics_process` calls `_handle_jump_buffer` (step 2) before `_check_climbing` (step 5). If jump is buffered from the same frame, the wall jump executes (consuming wall contact), and then `_check_climbing` sees `is_on_wall=false` (wall_normal reset by `_perform_jump` via `last_wall_contact = -999.0`). **Result: wall jump wins, climb is ignored.** |

---

### 2.4 Held vs Just-Pressed

| Action        | Input Type     | Behavior                                                         |
|---------------|----------------|------------------------------------------------------------------|
| `jump`        | Just-Pressed   | `Input.is_action_just_pressed("jump")` — fires ONCE per press. Buffered for 0.1s. |
| `strafe_*`    | Both           | Used with `Input.get_axis()` which returns 0/-1/+1 every frame while held. Not edge-triggered. |
| `climb`       | Held           | `Input.is_action_pressed("climb")` — fires every frame while held. Checked every physics frame. |
| `pause`       | Just-Pressed   | `Input.is_action_just_pressed("pause")` — fires ONCE per press. Toggles game pause. |

**Key difference:** Jump is a discrete event (fire-once), while strafe and climb are continuous (persistent state).

---

### 2.5 Input During Transitions

| Transition              | Input Handling                                                           |
|-------------------------|--------------------------------------------------------------------------|
| Loading screen visible  | Physics running, but `_is_transitioning = true`. Pause works. Jump/strafe have effect on player but player position is reset when scene reloads. |
| Scene reload (`reload_current_scene`) | All state resets. Any buffered input is lost (Godot input events are per-frame). Player respawns at (0, 5, 0) with zero velocity. |
| Level complete animation (0.4s fade-in) | `_is_transitioning = true`. Player physics stopped. Input has no effect except pause. |
| Game over animation     | `_is_transitioning = true`. Player physics stopped. Input has no effect except pause. |
| `_toggle_pause()`       | Pause can be toggled from any state except when `_is_transitioning` is true in `_process`. Actually, pause is checked **before** the transition guard — it is only blocked by `get_tree().paused` state (i.e., when already paused, pressing pause again resumes). |

---

### 2.6 Input During Overlay Screens

| Overlay                  | Visible When          | Input Handling                                                        |
|--------------------------|-----------------------|-----------------------------------------------------------------------|
| `LoadingScreen`          | Level load in progress | `GameManager.get_state()` == "playing". Input technically fires, but player is at spawn position with auto-run. **Can move player during load.** |
| `PauseMenu`              | `get_tree().paused`   | `get_tree().paused = true` blocks `_unhandled_input`. Only UI buttons respond. |
| `LevelComplete`          | Level completion      | `GameManager.get_state()` == "completed". Player physics stopped. `jump/strafe/climb` have no effect. **Only `pause` toggles pause.** |
| `GameOver`               | No lives remaining    | Same as LevelComplete. Player physics stopped.                        |
| `EndScreen` (all levels) | Scene change to `end_screen.tscn` | Full scene swap. No player exists. All game inputs dead. Only button clicks work. |

---

### 2.7 Touch Input Support

| Aspect                  | Finding                                                                      |
|-------------------------|------------------------------------------------------------------------------|
| CSS `touch-action: none`| Set in `index.html` to prevent browser zoom/scroll on canvas.               |
| Touch events in Godot   | **No touch-specific code found.** Godot WebGL build handles touch natively, but no Godot input actions are bound to touch. |
| On-screen controls      | **None present.** The game has no virtual joystick or buttons.               |
| Actual behavior         | Touch on canvas will be treated as mouse click events by Godot. These could trigger `ui_up`/`ui_down` if Godot interprets taps as keyboard, but typically Godot WebGL does not map touch to keyboard actions. **Result: touch is effectively non-functional for gameplay.** |
| Recommendation          | Add touch input actions via `InputMap` with `InputEventScreenTouch` events, or add a virtual joystick overlay. |

---

### 2.8 Browser Blocks Keyboard Events (Tab Switch, Blur)

| Scenario                | Behavior                                                                     |
|-------------------------|------------------------------------------------------------------------------|
| Tab switch (blur)       | Browser suspends the WebGL canvas. Godot's `_physics_process` stops running. Input events queued in the browser but not delivered until tab refocus. |
| Refocus                 | Godot receives accumulated `Input.is_action_just_pressed()` events — **at most ONE just-pressed event per action** per frame. Spam pressed during blur is lost (only the latest state matters). Held inputs: `Input.is_action_pressed()` returns true if the key is currently held in the OS, so if the user held A during blur and still holds it on refocus, `is_action_pressed("strafe_left")` returns true. |
| Full-page freeze        | Godot's game loop pauses. Physics delta = 0. No movement, no gravity, no input processing. When resumed, physics continues with the current delta from the next frame. |
| Auto-resume issue       | When resuming, `_handle_jump_buffer` only processes jump presses from the current frame. Any jump pressed during the frozen period is **lost** (just-pressed state is consumed). This means if the player pressed Space while the tab was hidden, they must press it again on refocus. |

---

## 3. PHYSICAL INTERACTION CATALOG

### 3.1 Constants Reference

| Constant                    | Value    | Description                                         |
|-----------------------------|----------|-----------------------------------------------------|
| `GRAVITY`                   | 25.0     | Downward acceleration (Y-axis) every frame          |
| `JUMP_FORCE`                | 10.0     | Vertical velocity on ground jump                    |
| `DOUBLE_JUMP_FORCE`         | 8.5      | Vertical velocity on second jump                    |
| `WALL_JUMP_FORCE_X`         | 7.0      | Horizontal velocity on wall jump (away from wall)   |
| `WALL_JUMP_FORCE_Y`         | 10.5     | Vertical velocity on wall jump                      |
| `MOVE_SPEED`                | 8.0      | Maximum lateral (Z-axis) velocity                   |
| `WALL_CLIMB_SPEED`          | 1.5      | Upward velocity while climbing                      |
| `COYOTE_TIME`               | 0.15s    | Grace period after leaving ground for jump          |
| `JUMP_BUFFER_TIME`          | 0.10s    | How long a jump press is remembered                 |
| `WALL_COYOTE_TIME`          | 0.10s    | Grace period after leaving wall for wall-jump       |
| `WALL_SLIDE_SPEED`          | 2.0      | Maximum downward speed while wall sliding            |
| `WALL_JUMP_INPUT_HANG_TIME` | 0.15s    | How long after leaving wall wall-jump is allowed    |
| `MAX_FALL_SPEED`            | 30.0     | Terminal velocity cap (Y-axis)                      |
| `FRICTION`                  | 0.1      | Z-axis deceleration coefficient                     |
| `ACCELERATION`              | 12.0     | Z-axis acceleration toward target velocity          |
| `AUTO_RUN_SPEED`            | 5.0      | Constant forward velocity (+X)                      |
| `WALL_DETECT_LENGTH`        | 1.0      | Raycast length for wall detection                   |
| `WALL_DETECT_Y_OFFSET`      | 0.4      | Raycast origin offset from player center            |
| `max_jumps`                 | 2        | Maximum simultaneous jumps (ground + double)        |

### 3.2 Movement Mechanics

#### 3.2.1 Auto-Run (X-axis)

```
Always active: velocity.x = 5.0 (AUTO_RUN_SPEED)
Never overridden except by: wall jump (sets velocity.x to ±7.0)
```

The player automatically moves forward at +5.0 units/second along X. This is set every physics frame **unless** the player is wall-jumping.

#### 3.2.2 Strafe Movement (Z-axis)

```
Input: strafe_left = -1, strafe_right = +1, neutral = 0
Target velocity: input_x * MOVE_SPEED (±8.0 max)
Actual velocity: lerp(current, target, ACCELERATION * delta)
             = lerp(current, target, 12.0 * delta)
Friction: when input_x == 0, lerp(velocity, 0, FRICTION * 60.0 * delta)
        = lerp(velocity, 0, 6.0 * delta)
```

- Acceleration is smooth (lerp-based), not instant.
- Friction is 60x stronger than acceleration (6.0 vs 12.0 per second), so the player stops quickly when releasing keys.
- At 60fps with default delta (~0.0167s): acceleration factor = 0.2, friction factor = 0.1.

#### 3.2.3 Gravity (Y-axis, falling)

```
velocity.y -= GRAVITY * delta = velocity.y -= 25.0 * delta
Clamped to: velocity.y >= -MAX_FALL_SPEED (-30.0)
```

At 60fps: velocity.y increases by ~0.417 per frame (25.0 × 0.0167).

### 3.3 Jump Mechanics

#### Ground Jump
```
Condition: is_on_ground == true OR (TimeSinceGround <= COYOTE_TIME == 0.15s)
Effect: velocity.y = JUMP_FORCE (10.0)
jump_count: 0 → 1
```

#### Double Jump
```
Condition: is_on_ground == false AND jump_count == 1
Effect: velocity.y = DOUBLE_JUMP_FORCE (8.5)
jump_count: 1 → 2
```

#### Wall Jump
```
Condition: is_on_wall == true AND wall_direction != 0 AND jump_count < 1
Effect: velocity.x = (-wall_direction) * WALL_JUMP_FORCE_X (±7.0)
        velocity.y = WALL_JUMP_FORCE_Y (10.5)
jump_count: 0 → 1
last_wall_contact: -999.0 (consumes wall coyote)
```

Jump direction: away from the wall the player is facing. If left wall detected (wall_direction = -1), jump pushes player in +X. If right wall detected (wall_direction = +1), jump pushes player in -X.

#### Variable Jump Height
```
jump_held_time: tracked (declared but NOT used in code)
If jump_held_time were used, velocity.y would be cut in half when released early.
Current state: variable height NOT implemented (jump_held_time is declared but never read).
```

**Bug note:** `jump_held_time` is declared and set to 0 after jump, but never incremented during `_process` or read. Variable jump height is a dead code path.

### 3.4 Wall Slide

```
Condition: is_on_wall == true AND NOT is_on_ground AND jump_count == 0 AND NOT is_climbing
Effect: if velocity.y > 0, velocity.y = min(velocity.y, WALL_SLIDE_SPEED)
       → velocity.y capped at +2.0 (downward)
```

- The player slides down the wall at a maximum of 2.0 units/second.
- `wall_slide_active` flag tracks this state but is only used for... nothing (no SFX is triggered from it).

### 3.5 Wall Climb

```
Condition: (raycast_left OR raycast_right colliding) AND is_action_pressed("climb") AND NOT is_on_floor()
Effect: is_climbing = true
        velocity.y = 0 (then overridden to WALL_CLIMB_SPEED = 1.5)
        velocity.z = lerp(velocity.z, input_x * MOVE_SPEED, ACCELERATION * delta)
        velocity.x = AUTO_RUN_SPEED (set in _handle_movement)
```

- Climb overrides gravity completely (early return in `_apply_physics`).
- Strafe (A/D) affects Z-axis movement during climb with the same acceleration/friction curve.
- The climb condition is checked every physics frame, so the player must **continuously hold** the climb key.
- Releasing Q (climb) when conditions are no longer met: `is_climbing = false`, player falls under gravity.

### 3.6 Fall Death

```
Condition: position.y < -10.0
Effect: player_died.emit()
        → GameManager.player_died() → lives -= 1
        → If lives <= 0: game over
        → If lives > 0: respawn at (0, 5, 0), reset physics
```

### 3.7 Hazard Detection

```
Player collision_mask = 7 = Ground(1) | Hazard(4) | Truck(2)
Hazard collision_mask = MASK_HAZARD = Player(8)

Hazard types and their effects:
- Saw blade (type 0): Area3D, kills on contact via player_died signal
- Ramp (type 1): Area3D, launches player upward (launch_force = 18.0)
- Static debris (type 2): Area3D, no special behavior, marks falling debris spawn point
- Hammer (type 3): Area3D, swings on a period/amplitude, kills on contact
- Falling debris: randomly spawned from trucks, falls at gravity
```

### 3.8 Level Completion

```
Condition: player.global_position.x >= LevelManager.finish_x (140.0)
  AND GameManager.get_state() == "playing"
  AND NOT _is_transitioning
Effect: player set_physics_process(false), position.x = finish_x, velocity = ZERO
  → GameManager.complete_level()
  → Score = 100 + time_bonus (up to 100, calculated as elapsed * 10.0)
  → Stars: 1 (default), 2 (if lives >= 2), 3 (if lives >= 3 AND time_bonus >= 50)
  → If current_level >= 35: game_completed → switch to end_screen.tscn
```

### 3.9 Physics Step Order (per `_physics_process`)

```
Frame N (60Hz, delta ≈ 0.0167s):

1.  _update_wall_state(delta)    — Raycast wall detection, wall_normal, wall_direction
2.  _update_ground_state(delta)  — Raycast ground detection, last_ground_contact
3.  _handle_jump_buffer(delta)   — Consume buffered jump input → _perform_jump()
4.  _apply_physics(delta)        — Gravity or wall slide or climb override
5.  _handle_movement(delta)      — Auto-run + strafe Z-axis
6.  _check_climbing(delta)       — Activate/deactivate wall climb
7.  _check_fall_death()          — Check if y < -10.0
8.  move_and_slide()             — Godot physics engine step
9.  Post-slide: update is_on_ground, emit on_ground_changed
```

---

## 4. EDGE CASES & NOTES

### 4.1 Known Issues

| # | Issue                                                                 | Severity |
|---|-----------------------------------------------------------------------|----------|
| 1 | `pause` key has no physical key mapping in project.godot. Keycode 4194310 is `KEY_ESCAPE`, but `key_string` is empty. Godot may still detect it via `physical_keycode`. Test to confirm. | Medium |
| 2 | `jump` action has no `ui_action_repeat` flag, so held-down Space does NOT continuously buffer jumps (correct behavior). | None |
| 3 | `strafe_left` and `strafe_right` DO have `ui_action_repeat`, but the code uses `Input.get_axis()` which doesn't care about repeats. | None |
| 4 | `R` (reset) action exists in project.godot but no handler exists anywhere in the codebase. Dead input. | Low |
| 5 | `jump_held_time` is declared and zeroed but never incremented — variable jump height is non-functional. | Medium |
| 6 | `wall_slide_active` is set but only checked locally — no SFX or visual feedback from wall sliding. | Low |
| 7 | `can_jump()` in `input_manager.gd` duplicates `can_jump()` in `player_movement.gd`. Both use coyote time + jump buffer, but they may diverge if timing is off. | Low |
| 8 | Input buffering only stores `"jump"` with a timestamp. If multiple inputs happen within 0.1s, only the latest is kept. | None |
| 9 | `get_tree().paused` is used directly in `input_manager.gd` but also toggled in `game_scene.gd`. If both fire, the pause state could be inconsistent. | Medium |
| 10 | On scene reload (`reload_current_scene()`), the player resets but there's no input drain — any input pressed during the brief reload window (one frame) may or may not be delivered. | Low |

### 4.2 Input Remapping

The `input_manager.remap_action(old_action, new_action)` method exists but is **not wired to any UI**. The Settings screen (`settings_ui.gd`) only controls audio sliders, not key bindings. Remapping is dead code.

### 4.3 Signal Emissions During Input

| Input        | Signal(s) Emitted                                      |
|--------------|--------------------------------------------------------|
| jump         | `jump_requested` (input_manager), `jump_performed` / `double_jump_performed` / `wall_jump_performed` (player) |
| climb        | `climb_requested` / `climb_released` (input_manager) — actually NOT wired up in _unhandled_input. Only `climb_started` / `climb_stopped` (player). |
| pause        | `pause_requested` (input_manager) — NOT connected to any handler (signal exists but nobody listens). Pause is handled directly via `get_tree().paused`. |
| strafe       | No signal emitted. Direct axis reading only.           |

**Important:** `climb_requested` and `climb_released` signals in input_manager are never emitted because `input_manager.gd._unhandled_input()` does not check for climb. The `climb` action is only checked via `is_action_pressed()` in the player script.

### 4.4 Raycast Configuration

| Raycast        | Direction       | Length | Purpose                    |
|----------------|-----------------|--------|----------------------------|
| `RayCastLeft`  | Vector3.LEFT    | 1.0    | Left wall detection        |
| `RayCastRight` | Vector3.RIGHT   | 1.0    | Right wall detection       |
| `GroundCheck`  | Vector3.DOWN    | 0.5    | Ground detection (fallback)|

All raycasts: `collide_with_areas = true`, `collide_with_bodies = true`, cast to = direction × length.

### 4.5 Collision Layer / Mask Matrix

| Object         | collision_layer | collision_mask | Detects                    |
|----------------|-----------------|----------------|----------------------------|
| Player         | 8               | 7 (1\|4\|2)    | Ground, Hazard, Truck      |
| Ground         | 1               | 0              | Nothing                    |
| Truck          | 2               | 10 (1\|8)      | Ground, Player             |
| Hazard         | 4               | 8              | Player                     |

---

## 5. COMPLETE INPUT COMBO MATRIX

### 5.1 All Possible Input Combinations (4 active inputs × 2 states: pressed / not pressed)

| strafe | climb | jump  | Result (in air, no wall contact)     | Result (on wall, not grounded)       | Result (on ground)           |
|--------|-------|-------|--------------------------------------|--------------------------------------|------------------------------|
| 0      | off   | off   | Auto-run only (X=5.0), falling       | Wall slide (Y≤2.0)                   | Auto-run only                |
| -1     | off   | off   | Auto-run + strafe left (Z-=8.0)      | Wall slide (Y≤2.0), Z-=8.0           | Auto-run + strafe left       |
| +1     | off   | off   | Auto-run + strafe right (Z+=8.0)     | Wall slide (Y≤2.0), Z+=8.0           | Auto-run + strafe right      |
| 0      | on    | off   | **No climb** (no wall contact)       | **Climbing** (Y+=1.5)                | **No climb** (on ground)     |
| 0      | on    | on    | **Double jump** (Y+=8.5)             | **Wall jump** (X±7.0, Y+=10.5)       | **Ground jump** (Y+=10.0)    |
| -1     | on    | on    | **Double jump** (Y+=8.5) + strafe L  | **Wall jump** (X±7.0, Y+=10.5) + Z-  | **Ground jump** (Y+=10.0) + strafe L |
| +1     | on    | on    | **Double jump** (Y+=8.5) + strafe R  | **Wall jump** (X±7.0, Y+=10.5) + Z+  | **Ground jump** (Y+=10.0) + strafe R |

### 5.2 State Transition Table

```
[ground] ──jump──→ [air, jump_count=1] ──jump──→ [air, jump_count=2]
   ↑                     │
   │                    jump
   └───────fall──────────┘

[wall, sliding] ──jump──→ [air, jump_count=1, moving away from wall]
    │                         │
    │                        jump
    │                         ↓
    └───────fall─────────→ [air, jump_count=2]
    │
    └─────climb(hold)──→ [climbing] ──release climb──→ [air, falling]

[air, jump_count=2] ──fall──→ [ground] (on floor contact: jump_count=0)
```
