extends Area3D
# FallingDebris - Falling debris hazard
# Drops from above with gravity, causes death on contact
# Activated by LevelManager, freed after hitting ground or timeout

@export var gravity_force: float = 9.81
@export var spawn_height: float = 20.0
@export var max_fall_time: float = 5.0

var velocity_y: float = 0.0
var _active: bool = false
var _spawn_x: float = 0.0
var _spawn_z: float = 0.0
var _fall_timer: float = 0.0
var _visual: MeshInstance3D = null
var _spawned: bool = false

func _ready():
	# Find visual for reference
	for child in get_children():
		if child is MeshInstance3D:
			_visual = child
			break

func activate(target_x: float, target_z: float, initial_y: float = 20.0):
	"""Activate and spawn debris at the given position."""
	_spawn_x = target_x
	_spawn_z = target_z
	position = Vector3(target_x, initial_y, target_z)
	velocity_y = 0.0
	_active = true
	_fall_timer = 0.0
	_spawned = true

func _physics_process(delta: float) -> void:
	if not _active or not _spawned:
		return
	
	# Apply gravity
	velocity_y += gravity_force * delta
	position.y += velocity_y * delta
	
	_fall_timer += delta
	
	# Remove if below ground level or timed out
	if position.y < -2.0 or _fall_timer > max_fall_time:
		_active = false
		_spawned = false
		queue_free()

func deactivate():
	_active = false
	_spawned = false

func is_active() -> bool:
	return _active and _spawned
