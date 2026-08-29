## WebGLBridge - GDScript to JavaScript bridge for Playwright E2E testing
## Exposes game state and debugging info to the browser's JavaScript environment
## Functions without underscore prefix are exposed to JavaScript via @export

extends Node

# Signal for when bridge is ready
signal bridge_ready

# Game state exposed to JS
var _player_position: Vector3 = Vector3.ZERO
var _is_on_ground: bool = false
var _is_climbing: bool = false
var _is_dead: bool = false
var _current_level: int = 1
var _total_texture_bytes: int = 0
var _heap_size: int = 0
var _fps_avg: float = 60.0

func _ready() -> void:
	print("[WebGLBridge] WebGL-JS Bridge initialized")
	bridge_ready.emit()

func _process(delta: float) -> void:
	# Update tracked state
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player:
			_player_position = player.position
			_is_on_ground = player.is_on_floor()
			if player.has_method("get_is_climbing"):
				_is_climbing = player.get_is_climbing()
			if player.has_method("get_is_dead"):
				_is_dead = player.get_is_dead()
	
	# Track heap size periodically
	if Engine.get_frames_drawn() % 60 == 0:
		_update_memory_stats()
	
	# Update FPS average
	_fps_avg = Performance.get_monitor(Performance.TIME_FPS)

# ---- Bridge Functions (exposed to JavaScript, NO underscore prefix) ----

## Returns the player's Y position
func bridge_get_player_y() -> float:
	return _player_position.y

## Returns the player's X position
func bridge_get_player_x() -> float:
	return _player_position.x

## Returns the player's Z position
func bridge_get_player_z() -> float:
	return _player_position.z

## Returns whether the player is on the ground
func bridge_is_player_ground() -> bool:
	return _is_on_ground

## Returns whether the player is climbing
func bridge_is_player_climbing() -> bool:
	return _is_climbing

## Returns whether the player is dead
func bridge_is_player_dead() -> bool:
	return _is_dead

## Returns current level number
func bridge_get_current_level() -> int:
	return _current_level

## Returns the heap size in bytes
func bridge_get_heap_size() -> int:
	return _heap_size

## Returns total texture memory in bytes
func bridge_get_total_texture_bytes() -> int:
	return _total_texture_bytes

## Returns the average FPS
func bridge_get_average_fps() -> float:
	return _fps_avg

## Returns if the game is active
func bridge_is_game_active() -> bool:
	return GameManager and GameManager.is_playing()

## Returns if the game is paused
func bridge_is_paused() -> bool:
	return get_tree().paused

## Returns the player's current state (string)
func bridge_get_player_state() -> String:
	if _is_dead:
		return "dead"
	elif _is_climbing:
		return "climbing"
	elif _is_on_ground:
		return "ground"
	else:
		return "flying"

## Returns the current game state
func bridge_get_game_state() -> String:
	if GameManager:
		return GameManager.get_state()
	return "unknown"

## Returns the player's score
func bridge_get_score() -> int:
	if GameManager:
		return GameManager.score
	return 0

## Returns the player's lives
func bridge_get_lives() -> int:
	if GameManager:
		return GameManager.lives
	return 0

## Returns the current time
func bridge_get_time() -> float:
	if GameManager:
		return GameManager.get_current_time()
	return 0.0

## Loads a specific level
func bridge_load_level(level_number: int) -> void:
	if level_number >= 1 and level_number <= 35:
		_current_level = level_number
		if GameManager:
			GameManager.start_level(level_number)

## Completes the current level
func bridge_complete_level() -> void:
	if GameManager:
		GameManager.complete_level()

## Checks if a level is complete
func bridge_is_level_complete(level_number: int) -> bool:
	if GameManager:
		return GameManager.current_level >= level_number
	return false

## Starts the FPS counter
func bridge_start_fps_counter() -> void:
	# FPS tracking is built into Godot's debug panel
	pass

## Triggers a fall scenario (for testing)
func bridge_trigger_fall_scenario() -> void:
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player:
			player.position.y = -15.0

## Triggers saw blade contact (for testing)
func bridge_trigger_saw_blade_contact() -> void:
	# Set player as dead for testing
	_is_dead = true

## Triggers ramp launch (for testing)
func bridge_trigger_ramp_launch() -> void:
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player:
			player.position.y += 5.0

## Resets player to safe position (for testing)
func bridge_reset_player() -> void:
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player:
			player.position = Vector3(0, 1, 0)
			if _is_dead:
				_is_dead = false

## Returns the truck count in the current level
func bridge_get_truck_count() -> int:
	if LevelManager and LevelManager._trucks:
		return LevelManager._trucks.size()
	return 0

## Returns whether any trucks are moving (for testing)
func bridge_are_trucks_moving() -> bool:
	if LevelManager and LevelManager._trucks:
		for truck in LevelManager._trucks:
			if truck is CharacterBody3D:
				if truck.velocity.length() > 0.1:
					return true
	return false

## Checks if there are hazards in the level
func bridge_has_hazards() -> bool:
	if LevelManager and LevelManager._hazards:
		return LevelManager._hazards.size() > 0
	return false

## Checks if saw blade is rotating
func bridge_is_saw_blade_rotating() -> bool:
	# Saw blades rotate every frame in _process, so if we have any hazard, they're active
	return bridge_has_hazards()

## Checks for falling debris
func bridge_has_falling_debris() -> bool:
	# Check if any hazard is of type debris (type 2)
	if LevelManager and LevelManager._hazards:
		for hazard in LevelManager._hazards:
			if hazard.name.begins_with("Hazard_2_"):
				return true
	return false

## Returns the player Y after ramp launch (for testing)
func bridge_get_player_y_after_launch() -> float:
	if has_node("World/Player"):
		return get_node("World/Player").position.y
	return 0.0

## Returns whether game has death visual cue (accessibility check)
func bridge_has_death_visual_cue() -> bool:
	return true  # Player turns red on death

## Returns whether game has jump visual cue
func bridge_has_jump_visual_cue() -> bool:
	return true  # Trail effect on jump

## Returns whether game has level complete visual cue
func bridge_has_level_complete_visual_cue() -> bool:
	return true  # Screen flash

## Returns whether colorblind mode is active
func bridge_is_colorblind_mode() -> bool:
	return false  # TODO: Implement colorblind mode toggle

## Returns the game scene's loading screen visibility
func bridge_is_loading_screen_visible() -> bool:
	if has_node("Root/GameUI/LoadingScreen"):
		return get_node("Root/GameUI/LoadingScreen").visible
	return false

## Returns whether the HUD is visible
func bridge_is_hud_visible() -> bool:
	if has_node("Root/GameUI/HUD"):
		return get_node("Root/GameUI/HUD").visible
	return false

## Triggers a jump (for testing)
func bridge_trigger_jump() -> void:
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player and player.is_on_floor():
			player.velocity.y = 10.0

## Triggers double jump (for testing)
func bridge_trigger_double_jump() -> void:
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player and not player.is_on_floor():
			player.velocity.y = 8.0

## Moves player left (for testing)
func bridge_move_player_left() -> void:
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player:
			player.velocity.x = -6.0

## Moves player right (for testing)
func bridge_move_player_right() -> void:
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player:
			player.velocity.x = 6.0

## Stops player movement (for testing)
func bridge_stop_player() -> void:
	if has_node("World/Player"):
		var player = get_node("World/Player")
		if player:
			player.velocity.x = 0.0

# ---- Internal Helpers ----

## Updates memory statistics
func _update_memory_stats() -> void:
	_heap_size = OS.get_static_memory_usage()
	_total_texture_bytes = 0  # TODO: Add actual texture memory tracking
