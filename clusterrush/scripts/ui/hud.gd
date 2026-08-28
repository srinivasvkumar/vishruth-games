extends Control
# HUD - Heads-up display showing level, lives, time, score

var _level_label: Label
var _lives_label: Label
var _time_label: Label
var _score_label: Label

func _ready():
	_setup_hud()
	GameManager.lives_changed.connect(_on_lives_changed)

func _setup_hud():
	_level_label = $LevelLabel as Label
	_lives_label = $LivesLabel as Label
	_time_label = $TimeLabel as Label
	_score_label = $ScoreLabel as Label

func _process(delta: float):
	# Update display
	if _level_label:
		_level_label.text = "Level: " + str(GameManager.current_level) + " / 35"
	
	if _lives_label:
		_lives_label.text = "Lives: " + str(GameManager.lives)
	
	if _time_label:
		var time := GameManager.get_current_time()
		_time_label.text = "Time: " + _format_time(time)
	
	if _score_label:
		_score_label.text = "Score: " + str(GameManager.score)

func _format_time(seconds: float) -> String:
	var minutes := int(seconds / 60.0)
	var remaining := seconds - minutes * 60.0
	return "%02d:%05.2f" % [minutes, remaining]

func _on_lives_changed():
	# Flash the lives indicator
	if _lives_label:
		_lives_label.modulate = Color.YELLOW
		create_tween().tween_property(_lives_label, "modulate", Color.WHITE, 0.3)
