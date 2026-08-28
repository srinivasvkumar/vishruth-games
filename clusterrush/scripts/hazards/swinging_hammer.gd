extends Node3D
# SwingingHammer.cs - Pendulum-style swinging hammer
# Contact causes knockback or death

var swing_period: float = 2.0
var swing_amplitude: float = PI / 4  # 45 degrees
var hammer_position: float = 0.0
var knockback_force: float = 20.0

func _ready():
	pass

func _process(delta: float) -> void:
	# Pendulum motion: θ(t) = θ₀·cos(√(g/L)·t)
	var time := Time.get_ticks_msec() / 1000.0
	hammer_position = swing_amplitude * cos(2 * PI * time / swing_period)
	
	# Apply rotation
	if has_node("Visual"):
		$Visual.rotate_z(hammer_position)

func get_swing_amplitude() -> float:
	return swing_amplitude

func set_swing_amplitude(amplitude: float) -> void:
	swing_amplitude = amplitude

func get_knockback_force() -> float:
	return knockback_force

func apply_knockback(velocity: Vector3) -> Vector3:
	# Apply knockback
	var new_velocity := velocity
	new_velocity.x = -knockback_force
	new_velocity.y = knockback_force * 0.5
	return new_velocity
