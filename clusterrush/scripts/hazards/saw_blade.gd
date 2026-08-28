extends Node3D
# SawBlade.cs - Rotating saw blade hazard
# Spinning obstacle that causes instant death on contact

var rotation_speed: float = 10.0
var collision_radius: float = 0.8

func _ready():
	# Set up rotation
	if has_node("Visual"):
		$Visual.rotate_z(rotation_speed)

func _process(delta: float) -> void:
	# Rotate the blade
	if has_node("Visual"):
		$Visual.rotate_z(rotation_speed * delta)

func get_collision_radius() -> float:
	return collision_radius

func set_rotation_speed(speed: float) -> void:
	rotation_speed = speed
