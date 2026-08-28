extends Node
# AudioManager - Centralized audio management
# Handles sound effects and music playback
# Supports volume control and audio settings

var _master_volume: float = 0.8
var _sfx_volume: float = 1.0
var _music_volume: float = 0.7

var _audio_stream_player: AudioStreamPlayer
var _audio_stream_player_2: AudioStreamPlayer

func _ready():
	_setup_audio_players()

func _setup_audio_players():
	# Create audio player nodes
	_audio_stream_player = AudioStreamPlayer.new()
	_audio_stream_player.name = "MasterAudio"
	add_child(_audio_stream_player)
	
	# Create second audio player for layered sounds
	_audio_stream_player_2 = AudioStreamPlayer.new()
	_audio_stream_player_2.name = "SecondaryAudio"
	add_child(_audio_stream_player_2)

func play_sfx(stream: AudioStream, pitch: float = 1.0, volume: float = 1.0):
	if stream == null:
		return
	
	_audio_stream_player.stream = stream
	_audio_stream_player.pitch_scale = pitch
	_audio_stream_player.volume_db = linear_to_db(_sfx_volume * volume)
	_audio_stream_player.play()

func play_music(stream: AudioStream):
	if stream == null:
		return
	
	_audio_stream_player_2.stream = stream
	_audio_stream_player_2.volume_db = linear_to_db(_music_volume)
	_audio_stream_player_2.play()

func stop_music():
	_audio_stream_player_2.stop()

func set_master_volume(volume: float):
	_master_volume = clampf(volume, 0.0, 1.0)
	AudioServer.set_bus_volume_db(0, linear_to_db(_master_volume))

func set_sfx_volume(volume: float):
	_sfx_volume = clampf(volume, 0.0, 1.0)

func set_music_volume(volume: float):
	_music_volume = clampf(volume, 0.0, 1.0)

func get_master_volume() -> float:
	return _master_volume

func get_sfx_volume() -> float:
	return _sfx_volume

func get_music_volume() -> float:
	return _music_volume

func get_settings() -> Dictionary:
	return {
		"master": _master_volume,
		"sfx": _sfx_volume,
		"music": _music_volume
	}

func apply_settings(settings: Dictionary):
	if settings.has("master"):
		set_master_volume(settings["master"])
	if settings.has("sfx"):
		set_sfx_volume(settings["sfx"])
	if settings.has("music"):
		set_music_volume(settings["music"])
