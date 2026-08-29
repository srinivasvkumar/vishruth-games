extends Node3D
# SawBlade - Rotating saw blade hazard
# Spinning obstacle that causes instant death on contact

var rotation_speed: float = 10.0
var collision_radius: float = 0.8
var _visual: MeshInstance3D = null

func _ready():
	# Find the visual mesh child (created by LevelManager)
	_visual = get_node_or_null("Visual")
	
	# Set up collision shape if not present
	if not has_node("CollisionShape3D"):
		var collision = CollisionShape3D.new()
		collision.name = "CollisionShape3D"
		var shape = SphereShape3D.new()
		shape.radius = collision_radius
		collision.shape = shape
		add_child(collision)

func _process(delta: float) -> void:
	# Rotate the blade around its own axis
	if _visual:
		_visual.rotation.z += rotation_speed * delta

func get_collision_radius() -> float:
	return collision_radius

func set_rotation_speed(speed: float) -> void:
	rotation_speed = speed
