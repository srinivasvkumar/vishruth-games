extends Control
# GameOverUI - Game over screen
# Shows final score and navigation buttons
# Button signals are handled by game_scene.gd

var _final_score_label: Label

func _ready():
	_final_score_label = $Panel2/VBox2/FinalScore

func show(score: int):
	if _final_score_label:
		_final_score_label.text = "Final Score: " + str(score)
