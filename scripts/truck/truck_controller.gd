extends CharacterBody3D
# TruckController - Physics-driven truck movement
# Trucks move forward along +X with randomized acceleration/braking/swerving
# Form and break clusters to create jumpable gaps

signal truck_spawned
signal cluster_formed
signal cluster_broken

@export var min_speed: float = 10.0
@export var max_speed: float = 15.0
var current_speed: float = 10.0
var swerve_offset: float = 0.0
var swerve_target: float = 0.0
var swerve_timer: float = 0.0

const ACCELERATION_RATE: float = 3.0
const SWERVE_RATE: float = 0.8
const SWERVE_CHANGE_INTERVAL: float = 2.5
const SPEED_CHANGE_INTERVAL: float = 1.5

var speed_target: float = 10.0
var speed_timer: float = 0.0

func _ready():
	set_min_speed(10.0)
	set_max_speed(15.0)
	current_speed = min_speed
	speed_target = min_speed
	truck_spawned.emit()

func _physics_process(delta: float) -> void:
	# Apply gravity if airborne
	if not is_on_floor():
		velocity.y -= 9.81 * delta

	# Forward movement (X axis, the direction of play)
	velocity.x = current_speed
	apply_swerve(delta)

	# Randomly change speed
	speed_timer += delta
	if speed_timer >= SPEED_CHANGE_INTERVAL:
		speed_timer = 0
		speed_target = randf_range(min_speed, max_speed)

	current_speed = lerp(current_speed, speed_target, 2.0 * delta)

	# Change swerve target periodically
	swerve_timer += delta
	if swerve_timer >= SWERVE_CHANGE_INTERVAL:
		swerve_timer = 0
		swerve_target = randf_range(-1.5, 1.5)

	# Clamp swerve to keep truck on platform
	swerve_offset = clampf(swerve_offset, -3.0, 3.0)

	velocity.z = swerve_offset * 5.0

	move_and_slide()

func apply_swerve(delta: float) -> void:
	swerve_offset = lerp(swerve_offset, swerve_target, SWERVE_RATE * delta)

func set_min_speed(speed: float) -> void:
	min_speed = speed

func set_max_speed(speed: float) -> void:
	max_speed = speed

func set_speed(speed: float) -> void:
	current_speed = clampf(speed, min_speed, max_speed)

func get_current_speed() -> float:
	return current_speed
