extends Control
# LevelCompleteUI - Level completion screen
# Shows success, time bonus, and next level button
# Button signals are handled by game_scene.gd

var _time_bonus_label: Label

func _ready():
	_time_bonus_label = $Panel/VBox/TimeBonusLabel

func show(time_bonus: float):
	_time_bonus_label.text = "Time Bonus: " + str(int(time_bonus)) + " pts"
