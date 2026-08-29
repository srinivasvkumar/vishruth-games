extends CharacterBody3D
# PlayerMovement - Core player movement and physics
# Handles strafe, jump, double-jump, wall-climb, variable jump height
# Uses Godot's CharacterBody3D for smooth physics-based movement

signal jump_performed
signal double_jump_performed
signal climb_started
signal climb_stopped
signal player_died
signal on_ground_changed
signal hit_hazard
signal landed_on_truck

const GRAVITY: float = 9.81
const JUMP_FORCE: float = 10.0
const DOUBLE_JUMP_FORCE: float = 8.0
const MOVE_SPEED: float = 6.0
const CLIMB_SPEED: float = 4.0
const COYOTE_TIME: float = 0.15
const JUMP_BUFFER_TIME: float = 0.1
const MAX_JUMP_HEIGHT: float = 5.0
const WALL_CLIMB_DISTANCE: float = 1.0
const WALL_CLIMB_RAYCAST_LENGTH: float = 1.0
const MAX_FALL_SPEED: float = 50.0
const FRICTION: float = 0.1
const ACCELERATION: float = 10.0

var jump_count: int = 0
var max_jumps: int = 2
var is_climbing: bool = false
var is_on_ground: bool = false
var last_ground_contact: float = -999.0
var jump_buffer_timer: float = 0.0
var jump_held_time: float = 0.0
var jump_cancelled: bool = false

# Audio references
var _sfx_player: AudioStreamPlayer
var _jump_sound: AudioStream
var _death_sound: AudioStream

@onready var raycast_left: RayCast3D = $RayCastLeft
@onready var raycast_right: RayCast3D = $RayCastRight
@onready var ground_check: RayCast3D = $GroundCheck

# Hazard contact detection
var _on_hazard: bool = false

func _ready():
	_configure_raycast(raycast_left, Vector3.LEFT, WALL_CLIMB_RAYCAST_LENGTH)
	_configure_raycast(raycast_right, Vector3.RIGHT, WALL_CLIMB_RAYCAST_LENGTH)
	_configure_raycast(ground_check, Vector3.DOWN, 0.5)
	
	# Collision shape: only create if level_manager didn't already add one
	var existing_cs := get_node_or_null("CollisionShape")
	if not existing_cs:
		var collision := CollisionShape3D.new()
		collision.name = "CollisionShape"
		var shape := CapsuleShape3D.new()
		shape.radius = 0.3
		shape.height = 1.0
		collision.shape = shape
		add_child(collision)
	
	# Collision layers — must match LevelManager constants:
	#   LAYER_PLAYER=8  LAYER_GROUND=1  LAYER_HAZARD=4  LAYER_TRUCK=2
	collision_layer = 8
	collision_mask = 7  # Ground(1) | Hazard(4) | Truck(2)
	
	# Wire up SFX audio player reference
	_sfx_player = get_node_or_null("SFX")
	
	# Load audio files for jump and death SFX
	_jump_sound = load("res://audio/sfx/jump.wav")
	_death_sound = load("res://audio/sfx/death.wav")

func _configure_raycast(ray: RayCast3D, direction: Vector3, length: float) -> void:
	ray.enabled = true
	ray.cast_to = direction * length
	ray.collide_with_areas = true
	ray.collide_with_bodies = true

func _physics_process(delta: float):
	_handle_input(delta)
	apply_gravity(delta)
	handle_movement(delta)
	check_climbing(delta)
	check_fall_death()
	
	move_and_slide()
	
	# Update grounded state
	var was_on_ground = is_on_ground
	is_on_ground = is_on_floor()
	
	if is_on_ground and not was_on_ground:
		jump_count = 0
		landed_on_truck.emit(is_on_floor())
	
	if is_on_ground:
		last_ground_contact = Time.get_ticks_msec() / 1000.0
	
	if was_on_ground != is_on_ground:
		notify_ground_change()

func _handle_input(delta: float):
	# Track jump input timing
	if Input.is_action_just_pressed("jump"):
		jump_buffer_timer = JUMP_BUFFER_TIME
	
	# Process jump buffer
	if jump_buffer_timer > 0:
		jump_buffer_timer -= delta
		if can_jump():
			perform_jump()
	
	# Track jump hold time for variable jump height
	if Input.is_action_pressed("jump") and not is_on_ground:
		jump_held_time += delta
		if jump_held_time > 0.3:
			jump_cancelled = true
	else:
		jump_held_time = 0.0
		jump_cancelled = false

func can_jump() -> bool:
	var time_since_ground = Time.get_ticks_msec() / 1000.0 - last_ground_contact
	return jump_count < max_jumps and time_since_ground <= COYOTE_TIME

func perform_jump() -> void:
	var force: float = JUMP_FORCE
	if jump_count == 1:
		force = DOUBLE_JUMP_FORCE
	velocity.y = force
	jump_count += 1
	jump_buffer_timer = 0.0
	
	# Play jump SFX
	if _sfx_player and AudioManager:
		AudioManager.play_sfx(_jump_sound)
	
	if jump_count == 1:
		jump_performed.emit()
	elif jump_count == 2:
		double_jump_performed.emit()

func apply_gravity(delta: float):
	if not is_on_ground and not is_climbing:
		velocity.y -= GRAVITY * delta
		velocity.y = maxf(velocity.y, -MAX_FALL_SPEED)

func handle_movement(delta: float):
	if is_climbing:
		var input_x := Input.get_axis("strafe_left", "strafe_right")
		velocity.x = lerp(velocity.x, input_x * MOVE_SPEED, ACCELERATION * delta)
		velocity.y = CLIMB_SPEED
		return
	
	var input_x := Input.get_axis("strafe_left", "strafe_right")
	
	# Apply acceleration toward target velocity
	var target_velocity := input_x * MOVE_SPEED
	velocity.x = lerp(velocity.x, target_velocity, ACCELERATION * delta)
	
	# Apply friction when not moving
	if input_x == 0:
		velocity.x = lerp(velocity.x, 0, FRICTION * 60.0 * delta)

func check_climbing(delta: float):
	var left_wall := raycast_left.is_colliding()
	var right_wall := raycast_right.is_colliding()
	
	if (left_wall or right_wall) and Input.is_action_pressed("climb") and not is_on_ground:
		if not is_climbing:
			is_climbing = true
			climb_started.emit()
			velocity.y = 0
	else:
		if is_climbing:
			is_climbing = false
			climb_stopped.emit()

func check_fall_death():
	if position.y < -10.0:
		player_died.emit()

func notify_ground_change():
	on_ground_changed.emit(is_on_ground)

func reset():
	velocity = Vector3.ZERO
	jump_count = 0
	is_climbing = false
	jump_held_time = 0.0
	last_ground_contact = -999.0

func die():
	if _on_hazard:
		# Play death SFX
		if _sfx_player and AudioManager:
			AudioManager.play_sfx(_death_sound)
		player_died.emit()
