extends Node3D
# SawBlade.cs - Rotating saw blade hazard
# Spinning obstacle that causes instant death on contact

var rotation_speed: float = 10.0
var collision_radius: float = 0.8
var _sound_player: AudioStreamPlayer

func _ready():
	# Set up rotation
	if has_node("Visual"):
		$Visual.rotate_z(rotation_speed)
	
	# Create audio player for hazard SFX (stubbed — add audio files later)
	_sound_player = AudioStreamPlayer.new()
	_sound_player.name = "HazardSound"
	add_child(_sound_player)
	# TODO: Add actual hazard sound files to audio/sfx/ directory

func _process(delta: float) -> void:
	# Rotate the blade
	if has_node("Visual"):
		$Visual.rotate_z(rotation_speed * delta)

func get_collision_radius() -> float:
	return collision_radius

func set_rotation_speed(speed: float) -> void:
	rotation_speed = speed
