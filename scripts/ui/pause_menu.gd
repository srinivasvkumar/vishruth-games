extends Control
# PauseMenu - Pause menu overlay
# Button signals are handled by game_scene.gd
# Toggles visibility when escape/pause is pressed

func _ready():
	pass

func show_menu():
	visible = true

func hide_menu():
	visible = false
