extends Control
# LevelCompleteUI - Level completion screen
# Shows success, time bonus, and next level button

func _ready():
	var next_button: Button = $VBoxContainer/NextButton as Button
	if next_button:
		next_button.pressed.connect(_on_next_level)

func _on_next_level():
	var next_level := GameManager.current_level + 1
	if next_level <= 35:
		GameManager.start_level(next_level)
		get_tree().change_scene_to_file("res://scenes/game.tscn")
	else:
		# All levels complete!
		get_tree().change_scene_to_file("res://scenes/end_screen.tscn")

func show(time_bonus: float):
	$TimeBonusLabel.text = "Time Bonus: " + str(int(time_bonus)) + " pts"
