extends Node
# GameScene - Scene controller for game.tscn
# Handles level generation, HUD wiring, UI buttons, and game state flow
# Manages smooth transitions between level complete / game over / paused states

# TOP-LEVEL DEBUG: This prints when the script is PARSED (not just when _ready is called)
print("[TOP-LEVEL DEBUG] game_scene.gd is being PARSED by Godot!")

var _GameManager := preload("res://autoloads/game_manager.gd")
var _LevelManager := preload("res://autoloads/level_manager.gd")
var _ParticleEffects := preload("res://scripts/utilities/particle_effects.gd")
var _ScreenShake := preload("res://scripts/utilities/screen_shake.gd")

@onready var world: Node3D = $World
@onready var hud: Control = $GameUI/HUD
@onready var level_complete: Control = $GameUI/LevelComplete
@onready var game_over: Control = $GameUI/GameOver
@onready var pause_menu: Control = $GameUI/PauseMenu
@onready var loading_screen: Control = $GameUI/LoadingScreen

# Particle effects and screen shake
var _particle_effects: ParticleEffects
var _screen_shake: ScreenShake

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

# M5DBG telemetry (temporary QA instrumentation — remove before ship)
var _m5_debug_t: float = 0.0

func _m5_debug_tick() -> void:
	var p = world.get_node_or_null("Player") if world else null
	if p:
		var pos: Vector3 = p.global_position
		print("[M5DBG] t=%.1f state=%s lives=%d p=(%.1f,%.1f,%.1f) finish_x=%.0f" % [
			GameManager.get_current_time(), GameManager.get_state(),
			GameManager.lives, pos.x, pos.y, pos.z, LevelManager.finish_x])

func _ready():
	print("[DEBUG] game_scene.gd _ready() called!")
	
	# Initialize particle effects and screen shake
	_particle_effects = ParticleEffects.new()
	_particle_effects.name = "ParticleEffects"
	add_child(_particle_effects)
	print("[GameScene] ParticleEffects initialized")
	
	_screen_shake = ScreenShake.new()
	_screen_shake.name = "ScreenShake"
	add_child(_screen_shake)
	print("[GameScene] ScreenShake initialized")
	
	# Hide all overlays initially
	level_complete.visible = false
	level_complete.modulate.a = 0.0
	game_over.visible = false
	game_over.modulate.a = 0.0
	pause_menu.visible = false
	pause_menu.modulate.a = 0.0
	loading_screen.visible = false
	
	# Connect button signals
	if next_btn:
		next_btn.pressed.connect(_on_next_level)
	else:
		print("[DEBUG] next_btn not found!")
	if retry_btn:
		# Disconnect any existing signals to ensure clean connection
		# This fixes the case where the button might be connected to the wrong handler
		if retry_btn.pressed.is_connected(_on_credits):
			retry_btn.pressed.disconnect(_on_credits)
			print("[DEBUG] Disconnected wrong handler (_on_credits) from Retry button")
		retry_btn.pressed.connect(_on_retry)
		print("[DEBUG] Retry button connected to _on_retry")
	else:
		print("[DEBUG] retry_btn not found!")
	if ls_btn:
		ls_btn.pressed.connect(_on_level_select)
	else:
		print("[DEBUG] ls_btn not found!")
	if mm_btn:
		mm_btn.pressed.connect(_on_main_menu)
	else:
		print("[DEBUG] mm_btn not found!")
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
	# M5DBG telemetry (temporary QA instrumentation — remove before ship)
	_m5_debug_t += delta
	if _m5_debug_t >= 2.0:
		_m5_debug_t = 0.0
		_m5_debug_tick()

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
	print("[M5DBG] EVENT complete_triggered level=", GameManager.current_level, " lives=", GameManager.lives)
	# Stop player movement
	var player = world.get_node_or_null("Player")
	if player:
		player.set_physics_process(false)
		# Teleport player to finish line
		player.global_position.x = LevelManager.finish_x
		player.velocity = Vector3.ZERO
	
	GameManager.complete_level()

func _load_level():
	# Show loading screen
	loading_screen.visible = true
	
	# Wait a frame for scene to settle
	await get_tree().process_frame
	
	# FIX D11: Initialize game state before loading the level
	# This ensures lives, score, and level are properly set when starting from main menu
	print("[D11 FIX] Calling GameManager.start_level with level=", GameManager.current_level)
	GameManager.start_level(GameManager.current_level)
	print("[D11 FIX] After start_level, lives=", GameManager.lives, " score=", GameManager.score)
	
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
	# FIX D4: Check transition lockout to prevent race conditions at finish line
	if _is_transitioning:
		print("[D4 FIX] Death blocked - already transitioning")
		return
	
	# Tell GameManager that player died (decrements lives, may trigger game over)
	GameManager.player_died()
	
	# Check if player still has lives
	if GameManager.is_player_alive():
		# Player has lives remaining — trigger death animation + respawn
		_handle_death()
	else:
		# No lives left - GameManager already set state to "gameover" and emitted signal
		print("[D4 FIX] Player out of lives - game over will be handled by signal")

func _handle_death():
	_is_transitioning = true
	
	# Stop player movement
	var player = world.get_node_or_null("Player")
	if player:
		player.set_physics_process(false)
		# Trigger death particles and SFX
		player.die()
		
		# M4-03: Spawn death particles
		_particle_effects.spawn_death_particles(player.global_position)
		
		# M4-03: Trigger strong screen shake
		_screen_shake.shake_strong()
		
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
	# FIX D4: Check transition lockout to prevent race conditions with death
	if _is_transitioning:
		print("[D4 FIX] Level complete blocked - already transitioning (possible death race)")
		return
	
	# Hide HUD during transition
	if hud:
		hud.visible = false
	
	# M4-03: Spawn completion particles
	var player = world.get_node_or_null("Player")
	if player:
		_particle_effects.spawn_complete_particles(player.global_position)
		# Medium shake for level completion
		_screen_shake.shake_medium()
	
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
	print("[M5DBG] EVENT game_over level=", GameManager.current_level, " score=", GameManager.score)
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
	# FIX D9: Set final score on end screen
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
	
	# Small delay for dramatic effect
	await get_tree().create_timer(0.5).timeout
	
	# FIX D9: Change to end screen and set the score
	# Use call_deferred to ensure the scene change completes first
	get_tree().change_scene_to_file("res://scenes/end_screen.tscn")
	
	# The end screen will need to get the score from GameManager on its own
	# We'll add that logic to the end_screen_ui.gd
	print("[D9 FIX] Changed to end screen - score will be loaded from GameManager")

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
	print("[DEBUG] _on_retry() CALLED!")
	print("[DEBUG] GameManager.current_level = ", GameManager.current_level)
	print("[DEBUG] GameManager.lives before = ", GameManager.lives)
	
	if _is_transitioning:
		return
	_is_transitioning = true
	
	# Hide game over
	_hide_overlay_with_animation(game_over, func():
		game_over.visible = false
	)
	
	await get_tree().create_timer(0.4).timeout
	
	# FIX D1: Reset game state properly without reloading scene
	# Reloading the scene would reset everything including GameManager state
	# Instead, we reset the game state and re-initialize the level
	print("[D1 FIX] Resetting game state for retry...")
	
	# Reset game state
	GameManager.set_state("idle")
	GameManager.start_level(GameManager.current_level)
	print("[D1 FIX] After start_level, lives=", GameManager.lives, " score=", GameManager.score)
	
	# Reset player position using LevelManager's respawn
	LevelManager.respawn_player()
	print("[D1 FIX] Player respawned")
	
	# Reset level
	LevelManager.load_level(GameManager.current_level)
	
	# Re-wire player death
	_wire_player_death()
	
	# Set game to playing state
	GameManager.set_state("playing")
	
	_is_transitioning = false
	print("[D1 FIX] Retry complete - game ready to play")

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
	var current_state = GameManager.get_state()
	
	if current_state == "playing":
		# Pause the game
		get_tree().paused = true
		GameManager.set_state("paused")
		pause_menu.visible = true
		print("[PAUSE DEBUG] Game paused - state set to 'paused'")
		
	elif current_state == "paused":
		# Unpause the game
		get_tree().paused = false
		GameManager.set_state("playing")
		pause_menu.visible = false
		print("[PAUSE DEBUG] Game unpaused - state set to 'playing'")
		
	else:
		# Cannot pause if not in playing state
		print("[PAUSE DEBUG] Cannot toggle pause in state: ", current_state)
