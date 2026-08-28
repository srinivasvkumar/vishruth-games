extends Control
# GameScene - Main game screen controller
# Manages HUD overlay, level completion, game over screens
# Connects to GameManager signals and player events

signal level_completed
signal level_failed
signal game_over

var _hud: Control
var _level_complete: Control
var _game_over: Control
var _level_complete_ui: Control

func _ready():
	_setup_hud()
	_setup_level_complete()
	_setup_game_over()
	_setup_player_death()
	
	# Connect to GameManager signals
	GameManager.level_completed.connect(_on_level_completed)
	GameManager.level_failed.connect(_on_level_failed)
	GameManager.game_over.connect(_on_game_over)

func _process(delta: float):
	# Check for level completion: player reached end of level
	if GameManager.game_state == "playing":
		var player = _get_player()
		if player:
			_check_level_complete(player)

func _get_player() -> Node:
	var world = get_tree().root.get_node_or_null("World")
	if world:
		return world.get_node_or_null("Player")
	return null

func _setup_hud():
	if has_node("HUD"):
		_hud = get_node("HUD")

func _setup_level_complete():
	if has_node("LevelComplete"):
		_level_complete = get_node("LevelComplete")
		_level_complete_ui = get_node("LevelComplete/VBoxContainer")
		var next_btn: Button = _level_complete.get_node_or_null("VBoxContainer/NextButton")
		if next_btn:
			next_btn.pressed.connect(_on_next_level)

func _setup_game_over():
	if has_node("GameOver"):
		_game_over = get_node("GameOver")
		var retry_btn: Button = _game_over.get_node_or_null("VBoxContainer/RetryButton")
		if retry_btn:
			retry_btn.pressed.connect(_on_retry)
		var level_sel_btn: Button = _game_over.get_node_or_null("VBoxContainer/LevelSelectButton")
		if level_sel_btn:
			level_sel_btn.pressed.connect(_on_level_select)
		var menu_btn: Button = _game_over.get_node_or_null("VBoxContainer/MainMenuButton")
		if menu_btn:
			menu_btn.pressed.connect(_on_main_menu)

func _setup_player_death():
	# Connect player death signal to game manager
	var player = _get_player()
	if player and player.has_signal("player_died"):
		player.player_died.connect(_on_player_died)

func _check_level_complete(player: Node):
	if not player or not player.has_method("position"):
		return
	
	# Get level parameters to determine end position
	var params = LevelManager.get_level_parameters(LevelManager.current_level)
	var end_x = params["level_length"]
	
	if player.position.x >= end_x - 5.0:
		# Player has reached the end of the level
		GameManager.complete_level()

func _on_player_died():
	GameManager.player_died()

func _on_level_completed():
	if _level_complete:
		_level_complete.visible = true
	level_completed.emit()

func _on_level_failed():
	pass

func _on_game_over():
	if _game_over:
		_game_over.visible = true
	game_over.emit()

func _on_next_level():
	var next_level = GameManager.current_level + 1
	if next_level <= 35:
		GameManager.start_level(next_level)
		get_tree().reload_current_scene()
	else:
		get_tree().change_scene_to_file("res://scenes/end_screen.tscn")

func _on_retry():
	GameManager.start_level(GameManager.current_level)
	get_tree().reload_current_scene()

func _on_level_select():
	get_tree().change_scene_to_file("res://scenes/level_select.tscn")

func _on_main_menu():
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
