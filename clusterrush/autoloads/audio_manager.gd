extends Node
## AudioManager - Centralized audio playback
## Handles SFX and music playback with volume control

const DEFAULT_MASTER_VOLUME := 0.8
const DEFAULT_SFX_VOLUME := 1.0
const DEFAULT_MUSIC_VOLUME := 0.5

var _master_volume: float = DEFAULT_MASTER_VOLUME
var _sfx_volume: float = DEFAULT_SFX_VOLUME
var _music_volume: float = DEFAULT_MUSIC_VOLUME

# AudioStreamPlayer for SFX playback
var _sfx_player: AudioStreamPlayer
var _music_player: AudioStreamPlayer

# Preloaded audio streams
var _sfx_streams: Dictionary = {}
var _music_streams: Dictionary = {}

func _ready():
	# Create AudioStreamPlayer for SFX
	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.name = "SFXPlayer"
	_sfx_player.volume_db = 0.0
	get_tree().root.call_deferred("add_child", _sfx_player)
	
	# Create AudioStreamPlayer for Music
	_music_player = AudioStreamPlayer.new()
	_music_player.name = "MusicPlayer"
	_music_player.bus = "Music"
	get_tree().root.call_deferred("add_child", _music_player)
	
	# Preload audio resources
	_preload_audio()
	
	print("[AudioManager] Audio system initialized with SFX and Music players")

func _preload_audio():
	# Preload SFX
	_sfx_streams["jump"] = preload("res://audio/sfx/jump.wav")
	_sfx_streams["wall_jump"] = preload("res://audio/sfx/wall_jump.wav")
	_sfx_streams["wall_slide"] = preload("res://audio/sfx/wall_slide.wav")
	_sfx_streams["land"] = preload("res://audio/sfx/land.wav")
	_sfx_streams["hit"] = preload("res://audio/sfx/hit.wav")
	_sfx_streams["death"] = preload("res://audio/sfx/death.wav")
	
	# Preload Music
	_music_streams["bgm_around"] = preload("res://audio/music/bgm_around.wav")
	
	print("[AudioManager] Preloaded ", _sfx_streams.size(), " SFX and ", _music_streams.size(), " music tracks")

## Play a sound effect by name
func play_sfx(name: String, pitch: float = 1.0) -> void:
	if _sfx_streams.has(name):
		_sfx_player.stream = _sfx_streams[name]
		_sfx_player.pitch_scale = pitch
		_sfx_player.volume_db = linear_to_db(_master_volume * _sfx_volume)
		_sfx_player.play()
	else:
		print("[AudioManager] Warning: SFX not found: ", name)

## Play a sound effect with custom stream (for dynamic audio)
func play_sfx_stream(stream: AudioStream, pitch: float = 1.0) -> void:
	if not stream:
		return
	
	_sfx_player.stream = stream
	_sfx_player.pitch_scale = pitch
	_sfx_player.volume_db = linear_to_db(_master_volume * _sfx_volume)
	_sfx_player.play()

## Play background music
func play_music(name: String, loop: bool = true) -> void:
	if _music_streams.has(name):
		_music_player.stream = _music_streams[name]
		_music_player.loop = loop
		_music_player.volume_db = linear_to_db(_master_volume * _music_volume)
		_music_player.play()
	else:
		print("[AudioManager] Warning: Music not found: ", name)

## Stop music
func stop_music() -> void:
	_music_player.stop()

## Set master volume (0.0 to 1.0)
func set_master_volume(volume: float) -> void:
	_master_volume = clampf(volume, 0.0, 1.0)
	# Update SFX player volume
	if _sfx_player:
		_sfx_player.volume_db = linear_to_db(_master_volume * _sfx_volume)
	# Update Music player volume
	if _music_player:
		_music_player.volume_db = linear_to_db(_master_volume * _music_volume)

## Get master volume
func get_master_volume() -> float:
	return _master_volume

## Set SFX volume (0.0 to 1.0)
func set_sfx_volume(volume: float) -> void:
	_sfx_volume = clampf(volume, 0.0, 1.0)
	# Update SFX player volume
	if _sfx_player:
		_sfx_player.volume_db = linear_to_db(_master_volume * _sfx_volume)

## Get SFX volume
func get_sfx_volume() -> float:
	return _sfx_volume

## Set Music volume (0.0 to 1.0)
func set_music_volume(volume: float) -> void:
	_music_volume = clampf(volume, 0.0, 1.0)
	# Update Music player volume
	if _music_player:
		_music_player.volume_db = linear_to_db(_master_volume * _music_volume)

## Get Music volume
func get_music_volume() -> float:
	return _music_volume
