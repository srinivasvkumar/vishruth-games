extends Node3D
# Ramp.cs - Launch player vertically
# Collision applies upward force to player

var launch_force: float = 15.0
var ramp_length: float = 3.0
var ramp_height: float = 1.0

func _ready():
	# Set up ramp shape
	_setup_ramp_shape()

func _setup_ramp_shape():
	if has_node("Visual"):
		var mesh = $Visual.mesh as ConeMesh
		if mesh:
			mesh.radius = ramp_length / 2
			mesh.height = ramp_height

func apply_launch(velocity: Vector3) -> Vector3:
	# Apply upward launch force
	var new_velocity := velocity
	new_velocity.y = launch_force
	return new_velocity

func get_launch_force() -> float:
	return launch_force

func set_launch_force(force: float) -> void:
	launch_force = force
