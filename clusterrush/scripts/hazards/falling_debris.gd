extends Node3D
# FallingDebris.cs - Falling debris hazard
# Drops from above with gravity, causes death on contact

var fall_speed: float = -15.0
var spawn_height: float = 15.0
var spawn_width: float = 10.0
var gravity: float = 9.81

var velocity_y: float = 0.0

func _ready():
	# Start above the scene
	position.y = spawn_height
	velocity_y = 0

func _physics_process(delta: float) -> void:
	# Apply gravity
	velocity_y += gravity * delta
	position.y += velocity_y * delta
	
	# Kill player if below ground
	if position.y < -5:
		queue_free()

func set_fall_speed(speed: float) -> void:
	fall_speed = speed

func get_fall_speed() -> float:
	return fall_speed
