extends Control
# PauseMenu - Pause menu overlay
# Provides Resume, Restart, Settings, and Main Menu options

func _ready():
	var resume_button: Button = $VBoxContainer/ResumeButton as Button
	var restart_button: Button = $VBoxContainer/RestartButton as Button
	var main_menu_button: Button = $VBoxContainer/BackToMenuButton as Button
	
	if resume_button:
		resume_button.pressed.connect(_on_resume)
	
	if restart_button:
		restart_button.pressed.connect(_on_restart)
	
	if main_menu_button:
		main_menu_button.pressed.connect(_on_main_menu)

func _on_resume():
	get_tree().paused = false
	visible = false

func _on_restart():
	get_tree().paused = false
	visible = false
	# Reload current level
	get_tree().reload_current_scene()

func _on_main_menu():
	get_tree().paused = false
	visible = false
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
