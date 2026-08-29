extends Node3D
# FallingDebris - Falling debris hazard
# Drops from above with gravity, causes death on contact

var fall_speed: float = -15.0
var spawn_height: float = 15.0
var spawn_width: float = 10.0
var gravity: float = 9.81

var velocity_y: float = 0.0
var _active: bool = false

func _ready():
	# Start inactive; activated by LevelManager when spawning
	_active = false

func activate(initial_y: float, initial_x: float, initial_z: float):
	position = Vector3(initial_x, initial_y, initial_z)
	velocity_y = 0.0
	_active = true

func _physics_process(delta: float) -> void:
	if not _active:
		return
	
	# Apply gravity
	velocity_y += gravity * delta
	position.y += velocity_y * delta
	
	# Remove if below ground
	if position.y < -15.0:
		_active = false
		queue_free()

func deactivate():
	_active = false
