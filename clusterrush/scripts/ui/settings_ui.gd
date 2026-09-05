extends Control
# SettingsUI - Settings screen with audio and control options

var _audio_manager: Node = AudioManager

func _ready():
	_load_settings()

func _load_settings():
	var settings: Dictionary = {}
	if AudioManager and AudioManager.has_method("get_settings"):
		settings = AudioManager.get_settings()
	
	if has_node("AudioSlider"):
		$AudioSlider.value = settings["sfx"]
	
	if has_node("MusicSlider"):
		$MusicSlider.value = settings["music"]

func _on_audio_slider_value_changed(value: float) -> void:
	_audio_manager.set_sfx_volume(value)

func _on_music_slider_value_changed(value: float) -> void:
	_audio_manager.set_music_volume(value)

func _on_fullscreen_toggled(toggled_on: bool) -> void:
	if toggled_on:
		get_window().mode = Window.MODE_FULLSCREEN
	else:
		get_window().mode = Window.MODE_WINDOWED
