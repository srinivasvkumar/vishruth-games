extends Node3D
# SwingingHammer - Pendulum-style swinging hammer
# Contact causes knockback or death

var swing_period: float = 2.0
var swing_amplitude: float = PI / 4  # 45 degrees
var hammer_position: float = 0.0
var knockback_force: float = 20.0

var _visual: Node3D = null
var _pivot: Vector3 = Vector3.ZERO

func _ready():
	# Find the visual child (created by LevelManager)
	_visual = get_node_or_null("Visual")
	if _visual:
		# Record pivot point (base of hammer)
		_pivot = _visual.position
	
func _process(delta: float) -> void:
	# Pendulum motion: θ(t) = θ₀·cos(√(g/L)·t)
	var time: float = Time.get_ticks_msec() / 1000.0
	hammer_position = swing_amplitude * cos(2 * PI * time / swing_period)
	
	# Apply rotation to visual child
	if _visual:
		_visual.rotation.z = hammer_position

func get_swing_amplitude() -> float:
	return swing_amplitude

func set_swing_amplitude(amplitude: float) -> void:
	swing_amplitude = amplitude

func get_knockback_force() -> float:
	return knockback_force
