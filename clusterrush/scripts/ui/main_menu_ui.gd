extends Control
# MainMenuUI - Main menu screen
# Provides Start Game, Level Select, Settings, Credits buttons

var _settings_open: bool = false

func _ready():
	_setup_ui()

func _setup_ui():
	# Get UI elements
	var start_button: Button = $VBoxContainer/StartButton as Button
	var level_select_button: Button = $VBoxContainer/LevelSelectButton as Button
	var settings_button: Button = $VBoxContainer/SettingsButton as Button
	var credits_button: Button = $VBoxContainer/CreditsButton as Button
	
	# Connect signals
	if start_button:
		start_button.pressed.connect(_on_start_game)
	
	if level_select_button:
		level_select_button.pressed.connect(_on_level_select)
	
	if settings_button:
		settings_button.pressed.connect(_on_settings)
	
	if credits_button:
		credits_button.pressed.connect(_on_credits)

func _process(delta: float) -> void:
	# Handle pause toggle
	if Input.is_action_just_pressed("pause"):
		_toggle_pause()

func _on_start_game():
	print("Starting new game")
	# Start from level 1
	var highest_level := LevelManager.get_unlocked_levels()
	if highest_level <= 1:
		highest_level = 1
	GameManager.start_level(highest_level)
	get_tree().change_scene_to_file("res://scenes/game.tscn")

func _on_level_select():
	print("Opening level select")
	get_tree().change_scene_to_file("res://scenes/level_select.tscn")

func _on_settings():
	print("Opening settings")
	$SettingsPanel.visible = not $SettingsPanel.visible

func _on_credits():
	print("Showing credits")
	get_tree().change_scene_to_file("res://scenes/credits.tscn")

func _toggle_pause():
	var current_state: String = GameManager.get_state()
	if current_state == "playing":
		get_tree().paused = true
		$PauseMenu.visible = true
	elif current_state == "paused":
		get_tree().paused = false
		$PauseMenu.visible = false

func show_pause_menu():
	$PauseMenu.visible = true

func hide_pause_menu():
	$PauseMenu.visible = false
