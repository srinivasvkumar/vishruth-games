extends Area3D
# SwingingHammer - Pendulum-style swinging hammer
# Swings back and forth around a pivot point, causing death on contact

@export var swing_period: float = 2.0
@export var swing_amplitude: float = PI / 4  # 45 degrees
@export var knockback_force: float = 20.0

var hammer_position: float = 0.0
var _visual: Node3D = null
var _pivot: Vector3 = Vector3.ZERO

func _ready():
	# Find visual child — could be auto-named or named "Visual"
	_visual = get_node_or_null("Visual")
	if not _visual:
		for child in get_children():
			if child is MeshInstance3D or child is Node3D:
				_visual = child
				break
	
	if _visual:
		_pivot = global_position
	# Update collision shape to match swing arc
	_update_collision()

func _process(delta: float) -> void:
	# Pendulum motion: theta(t) = amplitude * cos(2*pi*t / period)
	var time: float = Time.get_ticks_msec() / 1000.0
	hammer_position = swing_amplitude * cos(2 * PI * time / swing_period)
	
	# Apply rotation to visual child
	if _visual:
		_visual.rotation.z = hammer_position
	
	# Update global position based on swing
	_update_collision()

func _update_collision():
	# Move the Area3D itself to follow the hammer swing arc
	if _visual:
		var swing_offset = sin(hammer_position) * 2.0
		position.x = swing_offset

func get_swing_amplitude() -> float:
	return swing_amplitude

func set_swing_amplitude(amplitude: float) -> void:
	swing_amplitude = amplitude

func get_knockback_force() -> float:
	return knockback_force
