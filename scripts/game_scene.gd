extends Node
# GameScene - Scene controller for game.tscn
# Handles level generation, HUD wiring, UI buttons, and game state flow

@onready var world: Node3D = $World
@onready var hud: Control = $GameUI/HUD
@onready var level_complete: Control = $GameUI/LevelComplete
@onready var game_over: Control = $GameUI/GameOver
@onready var pause_menu: Control = $GameUI/PauseMenu
@onready var loading_screen: Control = $GameUI/LoadingScreen

@onready var next_btn: Button = $GameUI/LevelComplete/Panel/VBox/NextBtn
@onready var retry_btn: Button = $GameUI/GameOver/Panel2/VBox2/RetryBtn
@onready var ls_btn: Button = $GameUI/GameOver/Panel2/VBox2/LevelSelectBtn
@onready var mm_btn: Button = $GameUI/GameOver/Panel2/VBox2/MainMenuBtn
@onready var resume_btn: Button = $GameUI/PauseMenu/Panel3/VBox3/ResumeBtn
@onready var pause_ls_btn: Button = $GameUI/PauseMenu/Panel3/VBox3/PauseLevelSelectBtn
@onready var pause_mm_btn: Button = $GameUI/PauseMenu/Panel3/VBox3/PauseMainMenuBtn

@onready var final_score_label: Label = $GameUI/GameOver/Panel2/VBox2/FinalScore
@onready var time_bonus_label: Label = $GameUI/LevelComplete/Panel/VBox/Bonus

var _is_transitioning: bool = false

func _ready():
	# Hide all overlays initially
	level_complete.visible = false
	game_over.visible = false
	pause_menu.visible = false
	loading_screen.visible = false
	
	# Connect button signals
	if next_btn:
		next_btn.pressed.connect(_on_next_level)
	if retry_btn:
		retry_btn.pressed.connect(_on_retry)
	if ls_btn:
		ls_btn.pressed.connect(_on_level_select)
	if mm_btn:
		mm_btn.pressed.connect(_on_main_menu)
	if resume_btn:
		resume_btn.pressed.connect(_on_resume)
	if pause_ls_btn:
		pause_ls_btn.pressed.connect(_on_level_select)
	if pause_mm_btn:
		pause_mm_btn.pressed.connect(_on_main_menu)
	
	# Connect GameManager signals
	GameManager.level_completed.connect(_on_level_completed)
	GameManager.game_over.connect(_on_game_over)
	GameManager.game_completed.connect(_on_game_completed)
	
	# Wait for autoloads to be ready, then load the level
	await get_tree().process_frame
	_load_level()

func _process(delta):
	# Handle pause
	if Input.is_action_just_pressed("pause"):
		_toggle_pause()
	
	# Check level completion — player must reach the end of the ground
	if GameManager.get_state() == "playing" and world and not _is_transitioning:
		var player_node = world.get_node_or_null("Player")
		if player_node:
			# Ground extends to +150 in X; consider level complete at +140
			if player_node.global_position.x >= 140.0:
				_is_transitioning = true
				GameManager.complete_level()

func _load_level():
	# Show loading screen
	loading_screen.visible = true
	
	# Wait a frame for scene to settle
	await get_tree().process_frame
	
	# Generate the level through LevelManager
	LevelManager.load_level(GameManager.current_level)
	
	# Hide loading screen
	loading_screen.visible = false
	
	# Wire up player death signal
	_wire_player_death()
	
	# Start the game state
	GameManager.set_state("playing")

func _wire_player_death():
	var player = world.get_node_or_null("Player")
	if player and player.has_signal("player_died"):
		player.player_died.connect(_on_player_died)
	else:
		printerr("[GameScene] Player not found or has no player_died signal")

func _on_player_died():
	if GameManager.is_player_alive():
		GameManager.player_died()
	else:
		# Already game over from player_died()
		pass

func _on_level_completed():
	_is_transitioning = false
	# Calculate time bonus for display
	var elapsed: float = GameManager.get_current_time()
	var time_bonus: float = minf(elapsed * 10.0, 100.0)
	
	# Show the level complete screen with time bonus
	if level_complete.visible:
		pass  # Already shown by _process check
	else:
		level_complete.visible = true
	
	# Update time bonus label if we have a reference
	if time_bonus_label:
		time_bonus_label.text = "Time Bonus: " + str(int(time_bonus)) + " pts"

func _on_game_over():
	# Show game over screen with final score
	game_over.visible = true
	if final_score_label:
		final_score_label.text = "Final Score: " + str(GameManager.score)

func _on_game_completed():
	# All 35 levels complete! Go to end screen
	_is_transitioning = false
	get_tree().change_scene_to_file("res://scenes/end_screen.tscn")

func _on_next_level():
	if _is_transitioning:
		return
	_is_transitioning = true
	level_complete.visible = false
	
	var next_level = GameManager.current_level + 1
	if next_level <= 35:
		GameManager.current_level = next_level
		# Reload scene with new level
		get_tree().reload_current_scene()
	else:
		# Game complete - handled by game_completed signal
		pass

func _on_retry():
	game_over.visible = false
	get_tree().reload_current_scene()

func _on_level_select():
	game_over.visible = false
	level_complete.visible = false
	pause_menu.visible = false
	get_tree().change_scene_to_file("res://scenes/level_select.tscn")

func _on_main_menu():
	game_over.visible = false
	level_complete.visible = false
	pause_menu.visible = false
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")

func _on_resume():
	pause_menu.visible = false
	get_tree().paused = false

func _toggle_pause():
	if GameManager.get_state() == "playing":
		get_tree().paused = not get_tree().paused
		pause_menu.visible = get_tree().paused
