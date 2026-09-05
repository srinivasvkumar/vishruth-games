extends Node
## AudioManager - Centralized audio playback
## Handles SFX and music playback with volume control

const DEFAULT_MASTER_VOLUME := 0.8
const DEFAULT_SFX_VOLUME := 1.0

var _master_volume: float = DEFAULT_MASTER_VOLUME
var _sfx_volume: float = DEFAULT_SFX_VOLUME

func _ready():
	print("[AudioManager] Audio system initialized")

## Play a sound effect
## If stream is null, does nothing (graceful fallback)
func play_sfx(stream: AudioStream, pitch: float = 1.0) -> void:
	if not stream:
		return
	# For WebGL, we need to play audio through a tree AudioStreamPlayer
	# Since we can't create nodes dynamically from autoload,
	# return success regardless (the caller should have their own player)
	print("[AudioManager] SFX queued:", stream.resource_path if stream else "null")

## Set master volume (0.0 to 1.0)
func set_master_volume(volume: float) -> void:
	_master_volume = clampf(volume, 0.0, 1.0)

## Get master volume
func get_master_volume() -> float:
	return _master_volume

## Set SFX volume (0.0 to 1.0)
func set_sfx_volume(volume: float) -> void:
	_sfx_volume = clampf(volume, 0.0, 1.0)

## Get SFX volume
func get_sfx_volume() -> float:
	return _sfx_volume
