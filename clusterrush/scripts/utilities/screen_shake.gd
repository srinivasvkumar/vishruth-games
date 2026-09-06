extends Node
## ScreenShake - Utility for camera/screen shake effects
## Provides different intensity levels of screen shake for impactful moments
##
## Usage:
##   - Add as child to Camera3D or main game scene
##   - Call shake_weak(), shake_medium(), or shake_strong() as needed

# Shake parameters
var _current_shake_intensity: float = 0.0
var _current_shake_duration: float = 0.0
var _shake_timer: float = 0.0

# Shake intensity presets
const SHAKE_WEAK := 0.3
const SHAKE_MEDIUM := 0.5
const SHAKE_STRONG := 0.8

# Shake duration presets (seconds)
const DURATION_WEAK := 0.3
const DURATION_MEDIUM := 0.5
const DURATION_STRONG := 0.8

var _camera: Camera3D = null

func _ready():
	# Try to find a Camera3D node
	_camera = get_parent().get_node_or_null("Camera3D") if get_parent() else null
	if not _camera:
		# Try to find any Camera3D in the scene tree
		_camera = get_tree().current_scene.get_node_or_null("Camera3D")

func _process(delta: float):
	if _current_shake_duration > 0:
		_shake_timer += delta
		
		# Calculate current shake amount (fade out over duration)
		var shake_progress := _shake_timer / _current_shake_duration
		var current_amount := _current_shake_intensity * (1.0 - shake_progress)
		
		if current_amount > 0.01:
			# Apply random shake to camera
			if _camera:
				var offset := Vector3(
					randf_range(-current_amount, current_amount),
					randf_range(-current_amount, current_amount),
					randf_range(-current_amount, current_amount)
				)
				_camera.position_offset = offset
		else:
			# Shake complete - reset camera
			if _camera:
				_camera.position_offset = Vector3.ZERO
			_current_shake_duration = 0.0
			_current_shake_intensity = 0.0

## Trigger a weak shake (minor impacts)
func shake_weak():
	_start_shake(SHAKE_WEAK, DURATION_WEAK)

## Trigger a medium shake (truck encounters, moderate impacts)
func shake_medium():
	_start_shake(SHAKE_MEDIUM, DURATION_MEDIUM)

## Trigger a strong shake (death, explosions, major impacts)
func shake_strong():
	_start_shake(SHAKE_STRONG, DURATION_STRONG)

## Start a shake with custom intensity and duration
func shake_custom(intensity: float, duration: float):
	_start_shake(intensity, duration)

func _start_shake(intensity: float, duration: float):
	_current_shake_intensity = intensity
	_current_shake_duration = duration
	_shake_timer = 0.0
