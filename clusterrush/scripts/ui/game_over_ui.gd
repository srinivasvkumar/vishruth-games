extends Control
# GameOverUI - Game over screen
# Shows retry, level select, and main menu buttons

func _ready():
	var retry_button: Button = $VBoxContainer/RetryButton as Button
	var level_select_button: Button = $VBoxContainer/LevelSelectButton as Button
	var main_menu_button: Button = $VBoxContainer/MainMenuButton as Button
	
	if retry_button:
		retry_button.pressed.connect(_on_retry)
	
	if level_select_button:
		level_select_button.pressed.connect(_on_level_select)
	
	if main_menu_button:
		main_menu_button.pressed.connect(_on_main_menu)

func _on_retry():
	# Retry current level
	GameManager.start_level(GameManager.current_level)
	get_tree().change_scene_to_file("res://scenes/game.tscn")

func _on_level_select():
	get_tree().change_scene_to_file("res://scenes/level_select.tscn")

func _on_main_menu():
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
