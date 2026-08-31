extends Node
# GameScene - Scene controller for game.tscn
# Handles level generation, HUD wiring, UI buttons, and game state flow
# Manages smooth transitions between level complete / game over / paused states

var _GameManager := preload("res://autoloads/game_manager.gd")
var _LevelManager := preload("res://autoloads/level_manager.gd")

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

# Animation tweens for transitions
var _transition_tween: Tween = null
var _is_transitioning: bool = false
var _is_paused: bool = false

func _ready():
	# Hide all overlays initially
	level_complete.visible = false
	level_complete.alpha = 0.0
	game_over.visible = false
	game_over.alpha = 0.0
	pause_menu.visible = false
	pause_menu.alpha = 0.0
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
	GameManager.game_paused.connect(_on_game_paused)
	GameManager.game_resumed.connect(_on_game_resumed)
	
	# Wait for autoloads to be ready, then load the level
	await get_tree().process_frame
	_load_level()

func _process(delta):
	# Handle pause toggle (only when playing)
	if not _is_transitioning and Input.is_action_just_pressed("pause"):
		_toggle_pause()
	
	# Check level completion — player must reach the end of the ground
	if GameManager.get_state() == "playing" and world and not _is_transitioning:
		var player_node = world.get_node_or_null("Player")
		if player_node:
			# Ground extends to +150 in X; use finish_x from level data
			if player_node.global_position.x >= LevelManager.finish_x:
				_trigger_level_complete()

func _trigger_level_complete():
	_is_transitioning = true
	# Stop player movement
	var player = world.get_node_or_null("Player")
	if player:
		player.set_physics_process(false)
		# Teleport player to finish line
		player.global_position.x = 140.0
		player.velocity = Vector3.ZERO
	
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
	
	# Show HUD
	if hud:
		hud.visible = true
	
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
		# Player has lives remaining — trigger death animation + respawn
		_handle_death()
	else:
		# No lives left — game over is handled by GameManager
		pass

func _handle_death():
	_is_transitioning = true
	
	# Stop player movement
	var player = world.get_node_or_null("Player")
	if player:
		player.set_physics_process(false)
		# Trigger death particles and SFX
		player.die()
		# Teleport player to center
		player.position = Vector3(0, 5, 0)
		player.velocity = Vector3.ZERO
	
	# After a brief delay, respawn
	await get_tree().create_timer(1.0).timeout
	
	if GameManager.lives > 0:
		# Respawn player
		LevelManager.respawn_player()
		var respawn_player = world.get_node_or_null("Player")
		if respawn_player:
			respawn_player.set_physics_process(true)
			respawn_player.reset()
	
	_is_transitioning = false

func _on_level_completed():
	# Hide HUD during transition
	if hud:
		hud.visible = false
	
	# Show level complete screen with animation
	level_complete.visible = true
	_show_overlay_with_animation(level_complete)
	
	# Calculate time bonus for display
	var elapsed: float = GameManager.get_current_time()
	var time_bonus: float = minf(elapsed * 10.0, 100.0)
	
	# Update time bonus label
	var time_bonus_label = level_complete.get_node_or_null("Panel/VBox/Bonus")
	if time_bonus_label:
		time_bonus_label.text = "Time Bonus: " + str(int(time_bonus)) + " pts"
	
	# Stop player movement and freeze time
	var player = world.get_node_or_null("Player")
	if player:
		player.set_physics_process(false)

func _show_overlay_with_animation(overlay: Control) -> void:
	# Start from transparent
	overlay.modulate = Color(1, 1, 1, 0)
	
	# Create fade-in tween
	if _transition_tween:
		_transition_tween.kill()
	_transition_tween = create_tween()
	_transition_tween.tween_property(overlay, "modulate:a", 1.0, 0.4)

func _hide_overlay_with_animation(overlay: Control, callback: Callable) -> void:
	if _transition_tween:
		_transition_tween.kill()
	_transition_tween = create_tween()
	_transition_tween.tween_property(overlay, "modulate:a", 0.0, 0.3)
	_transition_tween.tween_callback(callback)

func _on_game_over():
	# Hide HUD
	if hud:
		hud.visible = false
	
	# Stop all movement
	var player = world.get_node_or_null("Player")
	if player:
		player.set_physics_process(false)
	
	# Show game over screen
	game_over.visible = true
	_show_overlay_with_animation(game_over)
	
	# Update final score
	var final_score_label = game_over.get_node_or_null("Panel2/VBox2/FinalScore")
	if final_score_label:
		final_score_label.text = "Final Score: " + str(GameManager.score)

func _on_game_completed():
	# Hide HUD with animation
	_is_transitioning = true
	
	if _transition_tween:
		_transition_tween.kill()
	_transition_tween = create_tween()
	if hud:
		hud.visible = false
		_transition_tween.tween_property(hud, "modulate:a", 0.0, 0.5)
	
	await _transition_tween.finished
	
	# Stop player movement
	var player = world.get_node_or_null("Player")
	if player:
		player.set_physics_process(false)
	
	# Small delay for dramatic effect, then go to end screen
	await get_tree().create_timer(0.5).timeout
	get_tree().change_scene_to_file("res://scenes/end_screen.tscn")

func _on_game_paused():
	_is_paused = true

func _on_game_resumed():
	_is_paused = false

func _on_next_level():
	if _is_transitioning:
		return
	_is_transitioning = true
	
	# Hide level complete with animation
	_hide_overlay_with_animation(level_complete, func():
		level_complete.visible = false
	)
	
	# Reload scene with new level (await the reload)
	var next_level = GameManager.current_level + 1
	if next_level <= 35:
		# Small delay for transition animation to complete
		await get_tree().create_timer(0.4).timeout
		get_tree().reload_current_scene()
	else:
		# Game complete - handled by game_completed signal
		GameManager.complete_level()

func _on_retry():
	if _is_transitioning:
		return
	_is_transitioning = true
	
	# Hide game over
	_hide_overlay_with_animation(game_over, func():
		game_over.visible = false
	)
	
	await get_tree().create_timer(0.4).timeout
	get_tree().reload_current_scene()

func _on_level_select():
	if _is_transitioning:
		return
	_is_transitioning = true
	
	# Hide all overlays
	_is_transitioning = false
	var overlays = [game_over, level_complete, pause_menu]
	var tween = create_tween()
	for o in overlays:
		if o.visible:
			tween.parallel().tween_property(o, "modulate:a", 0.0, 0.3)
	await tween.finished
	
	for o in overlays:
		o.visible = false
		o.modulate = Color.WHITE
	
	get_tree().change_scene_to_file("res://scenes/level_select.tscn")

func _on_main_menu():
	if _is_transitioning:
		return
	_is_transitioning = true
	
	# Hide all overlays
	var overlays = [game_over, level_complete, pause_menu]
	var tween = create_tween()
	for o in overlays:
		if o.visible:
			tween.parallel().tween_property(o, "modulate:a", 0.0, 0.3)
	await tween.finished
	
	for o in overlays:
		o.visible = false
		o.modulate = Color.WHITE
	
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")

func _on_resume():
	if _is_paused:
		_toggle_pause()

func _toggle_pause():
	if GameManager.get_state() == "playing":
		get_tree().paused = not get_tree().paused
		pause_menu.visible = get_tree().paused
	elif GameManager.get_state() == "paused":
		get_tree().paused = false
		pause_menu.visible = false
