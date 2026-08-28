extends CharacterBody3D
# TruckController - Physics-driven truck movement
# Trucks move with randomized acceleration/braking/swerving
# Form and break clusters to create jumpable gaps

var min_speed: float = 10.0
var max_speed: float = 15.0
var current_speed: float = 10.0
var swerve_offset: float = 0.0
var swerve_target: float = 0.0
var swerve_timer: float = 0.0

const ACCELERATION_RATE: float = 2.0
const SWERVE_RATE: float = 0.5
const SWERVE_CHANGE_INTERVAL: float = 3.0

signal truck_spawned
signal cluster_formed
signal cluster_broken

func _ready():
	set_min_speed(10.0)
	set_max_speed(15.0)
	truck_spawned.emit()

func _physics_process(delta: float) -> void:
	# Apply movement
	velocity.x = current_speed
	apply_swerve(delta)
	
	# Randomly change speed
	adjust_speed(delta)
	
	# Change swerve target periodically
	swerve_timer += delta
	if swerve_timer >= SWERVE_CHANGE_INTERVAL:
		swerve_timer = 0
		swerve_target = randf_range(-2.0, 2.0)
	
	move_and_slide()

func apply_swerve(delta: float) -> void:
	swerve_offset = lerp(swerve_offset, swerve_target, SWERVE_RATE * delta)
	position.z = swerve_offset

func adjust_speed(delta: float) -> void:
	# Perlin noise-like smooth variation
	var target_speed := current_speed + randf_range(-ACCELERATION_RATE, ACCELERATION_RATE) * delta
	target_speed = clampf(target_speed, min_speed, max_speed)
	current_speed = lerp(current_speed, target_speed, 0.1)

func set_min_speed(speed: float) -> void:
	min_speed = speed

func set_max_speed(speed: float) -> void:
	max_speed = speed

func set_speed(speed: float) -> void:
	current_speed = clampf(speed, min_speed, max_speed)
