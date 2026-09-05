extends CharacterBody3D
# PlayerMovement - Core player movement and physics
# Handles strafe, jump, double-jump, wall-slide, wall-jump, variable jump height
# Uses Godot's CharacterBody3D for smooth physics-based movement

signal jump_performed
signal double_jump_performed
signal wall_jump_performed
signal climb_started
signal climb_stopped
signal player_died
signal on_ground_changed
signal hit_hazard
signal landed_on_truck

# ---- Configuration ----
const GRAVITY: float = 25.0               # Higher gravity for snappy platformer feel
const JUMP_FORCE: float = 10.0
const DOUBLE_JUMP_FORCE: float = 8.5
const WALL_JUMP_FORCE_X: float = 7.0
const WALL_JUMP_FORCE_Y: float = 10.5
const MOVE_SPEED: float = 8.0
const WALL_CLIMB_SPEED: float = 1.5
const COYOTE_TIME: float = 0.15
const JUMP_BUFFER_TIME: float = 0.1
const WALL_COYOTE_TIME: float = 0.1        # brief grace period after leaving a wall
const WALL_SLIDE_SPEED: float = 2.0        # max downward speed while sliding a wall
const WALL_JUMP_INPUT_HANG_TIME: float = 0.15  # hold into wall after leaving it
const MAX_FALL_SPEED: float = 30.0
const FRICTION: float = 0.1
const ACCELERATION: float = 12.0
const WALL_DETECT_LENGTH: float = 1.0
const WALL_DETECT_Y_OFFSET: float = 0.4  # raycasts aim from slightly below player centre
const AUTO_RUN_SPEED: float = 5.0         # forward auto-run velocity

# ---- State ----
var jump_count: int = 0
var max_jumps: int = 2
var is_climbing: bool = false
var is_on_ground: bool = false
var is_on_wall: bool = false
var wall_normal: Vector3 = Vector3.ZERO
var wall_direction: int = 0  # -1 = left wall, +1 = right wall
var last_ground_contact: float = -999.0
var last_wall_contact: float = -999.0
var jump_buffer_timer: float = 0.0
var jump_held_time: float = 0.0
var jump_cancelled: bool = false
var wall_slide_active: bool = false
var wall_jump_input_hang: float = 0.0

# ---- Audio references ----
var _sfx_player: AudioStreamPlayer
var _jump_sound: AudioStream
var _death_sound: AudioStream
var _land_sound: AudioStream
var _hazard_sound: AudioStream
var _complete_sound: AudioStream
var _click_sound: AudioStream
var _wall_slide_sound: AudioStream
var _wall_jump_sound: AudioStream

@onready var raycast_left: RayCast3D = $RayCastLeft
@onready var raycast_right: RayCast3D = $RayCastRight
@onready var ground_check: RayCast3D = $GroundCheck


# =============================================================================
# _ready – collision layers, raycast config, audio refs
# =============================================================================
func _ready():
	# Collision layers – match LevelManager constants
	#   LAYER_GROUND=1  LAYER_PLAYER=8  LAYER_HAZARD=4  LAYER_TRUCK=2
	collision_layer = 8   # LAYER_PLAYER
	collision_mask = 7    # Ground(1) | Hazard(4) | Truck(2)

	_configure_raycast(raycast_left, Vector3.LEFT, WALL_DETECT_LENGTH)
	_configure_raycast(raycast_right, Vector3.RIGHT, WALL_DETECT_LENGTH)
	_configure_raycast(ground_check, Vector3.DOWN, 0.5)

	# Collision shape: create if level_manager didn't already add one
	var existing_cs := get_node_or_null("CollisionShape3D")
	if not existing_cs:
		var collision := CollisionShape3D.new()
		collision.name = "CollisionShape3D"
		var shape := CapsuleShape3D.new()
		shape.radius = 0.3
		shape.height = 1.0
		collision.shape = shape
		add_child(collision)

	# Wire up SFX audio player reference
	_sfx_player = get_node_or_null("SFX")

	# Load audio files (graceful fallback if files missing)
	_jump_sound = load("res://audio/sfx/jump.wav") if FileAccess.file_exists("res://audio/sfx/jump.wav") else null
	_death_sound = load("res://audio/sfx/death.wav") if FileAccess.file_exists("res://audio/sfx/death.wav") else null
	_land_sound = load("res://audio/sfx/land.wav") if FileAccess.file_exists("res://audio/sfx/land.wav") else null
	_hazard_sound = load("res://audio/sfx/hit.wav") if FileAccess.file_exists("res://audio/sfx/hit.wav") else null
	_wall_slide_sound = load("res://audio/sfx/wall_slide.wav") if FileAccess.file_exists("res://audio/sfx/wall_slide.wav") else null
	_wall_jump_sound = load("res://audio/sfx/wall_jump.wav") if FileAccess.file_exists("res://audio/sfx/wall_jump.wav") else null


# =============================================================================
# Raycast helpers
# =============================================================================
func _configure_raycast(ray: RayCast3D, direction: Vector3, length: float) -> void:
	ray.enabled = true
	ray.cast_to = direction * length
	ray.collide_with_areas = true
	ray.collide_with_bodies = true


# =============================================================================
# _physics_process – main game loop
# =============================================================================
func _physics_process(delta: float):
	# 1. Update grounded / wall state from raycasts
	_update_wall_state(delta)
	_update_ground_state(delta)

	# 2. Handle jump buffer → jump
	_handle_jump_buffer(delta)

	# 3. Apply gravity (or wall slide)
	_apply_physics(delta)

	# 4. Handle horizontal input
	_handle_movement(delta)

	# 5. Wall climb (if requested)
	_check_climbing(delta)

	# 6. Fall death
	_check_fall_death()

	# 7. Physics step
	move_and_slide()

	# 8. Post-slide: update grounded state for signals
	var was_on_ground = is_on_ground
	is_on_ground = is_on_floor()

	if is_on_ground and not was_on_ground:
		jump_count = 0
		landed_on_truck.emit(is_on_floor())

	if was_on_ground != is_on_ground:
		on_ground_changed.emit()


# =============================================================================
# Ground state
# =============================================================================
func _update_ground_state(delta: float):
	# Raycast-based ground check as fallback
	var ground_hit := ground_check.is_colliding()

	# Godot's is_on_floor() is the primary source
	var on_floor := is_on_floor()

	if on_floor or ground_hit:
		last_ground_contact = Time.get_ticks_msec() / 1000.0


# =============================================================================
# Wall state – detect walls via side raycasts + wall slide / wall jump input
# =============================================================================
func _update_wall_state(delta: float):
	var left_wall := raycast_left.is_colliding()
	var right_wall := raycast_right.is_colliding()

	var prev_wall_dir = wall_direction
	wall_direction = 0
	wall_normal = Vector3.ZERO
	is_on_wall = false

	if left_wall:
		wall_direction = -1
		wall_normal = raycast_left.get_collision_normal()
		is_on_wall = true
	elif right_wall:
		wall_direction = 1
		wall_normal = raycast_right.get_collision_normal()
		is_on_wall = true

	# Track wall contact time
	if is_on_wall:
		last_wall_contact = Time.get_ticks_msec() / 1000.0
	else:
		# Brief "wall coyote" so wall-jump still works just after leaving a wall
		wall_jump_input_hang = WALL_JUMP_INPUT_HANG_TIME

	if wall_jump_input_hang > 0:
		wall_jump_input_hang -= delta

	# Wall slide SFX (subtle)
	if is_on_wall and not is_on_ground and not is_climbing:
		wall_slide_active = true
	else:
		wall_slide_active = false


# =============================================================================
# Jump buffer → jump execution
# =============================================================================
func _handle_jump_buffer(delta: float):
	# Register jump press
	if Input.is_action_just_pressed("jump"):
		jump_buffer_timer = JUMP_BUFFER_TIME

	if jump_buffer_timer > 0:
		jump_buffer_timer -= delta
		if can_jump():
			_perform_jump()


# =============================================================================
# can_jump – coyote time + wall coyote + double jump allowance
# =============================================================================
func can_jump() -> bool:
	if jump_count >= max_jumps:
		return false

	# On ground
	if is_on_ground:
		return true

	# Coyote time (just left ground)
	var time_since_ground = Time.get_ticks_msec() / 1000.0 - last_ground_contact
	if time_since_ground <= COYOTE_TIME:
		return true

	# Wall coyote (just left a wall, pressed jump near wall)
	if jump_count == 0 and wall_jump_input_hang > 0 and is_on_wall:
		return true

	return false


# =============================================================================
# perform_jump – grounded, wall, or double jump
# =============================================================================
func _perform_jump():
	var is_wall_jump = false

	if is_on_wall and wall_direction != 0 and jump_count < 1:
		# Wall jump
		is_wall_jump = true
		var dir = -wall_direction  # jump away from wall
		velocity.x = dir * WALL_JUMP_FORCE_X
		velocity.y = WALL_JUMP_FORCE_Y
		jump_count = 1
		last_wall_contact = -999.0   # consume wall coyote

		if _wall_jump_sound:
			_play_sfx(_wall_jump_sound)
		wall_jump_performed.emit()

	elif is_on_ground or (Time.get_ticks_msec() / 1000.0 - last_ground_contact <= COYOTE_TIME):
		# Ground jump
		velocity.y = JUMP_FORCE
		jump_count = 1

		if _jump_sound:
			_play_sfx(_jump_sound)
		jump_performed.emit()

	elif jump_count == 1:
		# Double jump
		velocity.y = DOUBLE_JUMP_FORCE
		jump_count = 2

		if _jump_sound:
			_play_sfx(_jump_sound)
		double_jump_performed.emit()

	# Reset buffer & timer
	jump_buffer_timer = 0.0
	jump_cancelled = false
	jump_held_time = 0.0


# =============================================================================
# Physics application – gravity + wall slide
# =============================================================================
func _apply_physics(delta: float):
	if is_climbing:
		return  # climbing overrides gravity

	if is_on_wall and not is_on_ground and jump_count == 0 and not is_climbing:
		# Wall slide – slow descent
		if velocity.y > 0:
			velocity.y = minf(velocity.y, WALL_SLIDE_SPEED)
	else:
		# Regular gravity
		velocity.y -= GRAVITY * delta
		velocity.y = maxf(velocity.y, -MAX_FALL_SPEED)


# =============================================================================
# Horizontal movement
# =============================================================================
func _handle_movement(delta: float):
	# Apply auto-run forward velocity (constant forward motion along +X)
	if not is_climbing and not is_on_wall:
		velocity.x = AUTO_RUN_SPEED
	
	if is_climbing:
		var input_x := Input.get_axis("strafe_left", "strafe_right")
		velocity.z = lerp(velocity.z, input_x * MOVE_SPEED, ACCELERATION * delta)
		velocity.y = WALL_CLIMB_SPEED
		return
	
	var input_x := Input.get_axis("strafe_left", "strafe_right")

	# Apply acceleration toward target velocity (lateral = Z axis)
	var target_velocity := input_x * MOVE_SPEED
	velocity.z = lerp(velocity.z, target_velocity, ACCELERATION * delta)

	# Apply friction when not moving
	if input_x == 0:
		velocity.z = lerp(velocity.z, 0, FRICTION * 60.0 * delta)


# =============================================================================
# Wall climb (manual hold-to-climb)
# =============================================================================
func _check_climbing(delta: float):
	if (raycast_left.is_colliding() or raycast_right.is_colliding()) \
			and Input.is_action_pressed("climb") \
			and not is_on_ground:
		if not is_climbing:
			is_climbing = true
			climb_started.emit()
			velocity.y = 0
	else:
		if is_climbing:
			is_climbing = false
			climb_stopped.emit()

	# If climbing, override velocity
	if is_climbing:
		var input_y := Input.get_axis("strafe_left", "strafe_right")  # re-use strafe for climb up/down
		velocity.y = WALL_CLIMB_SPEED


# =============================================================================
# Fall death
# =============================================================================
func _check_fall_death():
	if position.y < -10.0:
		player_died.emit()


# =============================================================================
# Audio helpers
# =============================================================================
func _play_sfx(audio: AudioStream) -> void:
	if _sfx_player and audio:
		_sfx_player.stream = audio
		_sfx_player.play()
	elif _sfx_player and AudioManager:
		AudioManager.play_sfx(audio)


# =============================================================================
# Reset – called on respawn
# =============================================================================
func reset():
	velocity = Vector3.ZERO
	jump_count = 0
	is_climbing = false
	is_on_wall = false
	wall_direction = 0
	wall_jump_input_hang = 0.0
	jump_buffer_timer = 0.0
	jump_held_time = 0.0
	last_ground_contact = -999.0
	last_wall_contact = -999.0
	set_physics_process(true)


# =============================================================================
# Die – invoked by hazard detection
# =============================================================================
func die():
	velocity = Vector3.ZERO
	jump_count = max_jumps  # prevent further jumps

	# Death SFX
	_death_sound = load("res://audio/sfx/death.wav") if FileAccess.file_exists("res://audio/sfx/death.wav") else null
	if _death_sound and _sfx_player:
		_sfx_player.stream = _death_sound
		_sfx_player.play()

	player_died.emit()
	set_physics_process(false)
