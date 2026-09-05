extends Area3D
# SawBlade - Rotating saw blade hazard
# Spinning blade that causes instant death on contact

var rotation_speed: float = 12.0
var collision_radius: float = 0.8
var _visual: Node3D = null
var _collision_shape: CollisionShape3D = null

func _ready():
	# Find visual mesh child — could be auto-named or named "Visual"
	_visual = get_node_or_null("Visual")
	if not _visual:
		# Try to find the first MeshInstance3D child
		for child in get_children():
			if child is MeshInstance3D:
				_visual = child
				break
	
	# Find or create collision shape
	_collision_shape = get_node_or_null("CollisionShape3D")
	
	# Ensure we have a collision radius that matches our shape
	if _collision_shape and _collision_shape.shape:
		var shape = _collision_shape.shape
		if shape is SphereShape3D:
			collision_radius = shape.radius
		elif shape is CylinderShape3D:
			collision_radius = shape.radius

func _process(delta: float) -> void:
	# Rotate the blade around its local Z axis (it's already rotated X=90 in level gen)
	if _visual:
		_visual.rotation.z += rotation_speed * delta
		_visual.rotation.x += rotation_speed * delta * 0.1  # subtle tumble

func get_collision_radius() -> float:
	return collision_radius

func set_rotation_speed(speed: float) -> void:
	rotation_speed = speed

func trigger_sparks():
	# Emit particles effect if particle system available
	var particles = get_node_or_null("Particles")
	if particles and particles is GPUParticles3D:
		particles.emitting = true
		particles.restart()
