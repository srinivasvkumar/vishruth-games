extends Node
# GameManager - Central game state management
# Manages lives, score, current level, game state (menu/playing/paused/completed/gameover)
# Saves progress via Godot's ConfigFile (compatible with WebGL)

signal lives_changed
signal level_completed
signal level_failed
signal game_paused
signal game_resumed
signal game_over
signal game_completed
signal level_started

var current_level: int = 1
var lives: int = 3
var score: int = 0
var game_state: String = "menu"
var level_start_time: float = 0.0
var level_time_bonus: float = 0.0

# FIX D5/D6: Track starting lives for accurate star calculation
var _starting_lives: int = 0

# FIX D8: Pause-aware timer tracking
var _pause_start_time: float = 0.0
var _total_pause_time: float = 0.0

# FIX D14: Prevent double-respawn
var _is_responding_to_death: bool = false

var _save_path: String = "user://cluster_rush_save.dat"

func _ready():
	load_progress()
	set_state("menu")

func set_state(new_state: String):
	var old_state = game_state
	game_state = new_state
	if new_state == "playing":
		# FIX D8: If resuming from pause, stop tracking pause time
		if old_state == "paused":
			_total_pause_time += Time.get_ticks_msec() / 1000.0 - _pause_start_time
			game_resumed.emit()
		# Set or reset level start time (when starting fresh, not when resuming)
		if old_state != "paused":
			level_start_time = Time.get_ticks_msec() / 1000.0
			_total_pause_time = 0.0
	elif new_state == "paused":
		# FIX D8: Start tracking pause time
		_pause_start_time = Time.get_ticks_msec() / 1000.0
		game_paused.emit()
	elif new_state == "gameover":
		game_over.emit()
	elif new_state == "completed":
		game_completed.emit()

func start_level(level_num: int):
	current_level = level_num
	lives = 3 if level_num <= 5 else 2
	# FIX D5/D6: Track starting lives for accurate star calculation
	_starting_lives = lives
	score = 0
	level_started.emit(level_num)

func player_died():
	# FIX D14: Prevent double-respawn by checking if we're already handling death
	if _is_responding_to_death:
		print("[D14 FIX] Death already being handled, ignoring duplicate call")
		return
	
	_is_responding_to_death = true
	lives -= 1
	lives_changed.emit()
	
	if lives <= 0:
		set_state("gameover")
		_is_responding_to_death = false
	else:
		get_node("/root/LevelManager").respawn_player()
		# Reset the flag after respawn is triggered
		# The actual respawn will complete, then we can allow another death
		_is_responding_to_death = false

func complete_level():
	# FIX D4: Check if we're already in a transition state to prevent race conditions
	if game_state != "playing":
		print("[D4 FIX] Level complete blocked - state is: ", game_state)
		return
	
	# FIX D8: Use pause-aware time calculation
	var elapsed: float = get_current_time()
	var time_bonus: float = minf(elapsed * 10.0, 100.0)
	level_time_bonus = time_bonus
	score += 100 + time_bonus
	
	# FIX D5/D6: Calculate star rating based on lives remaining vs starting lives
	# This prevents off-by-one errors and ensures fair star allocation across all levels
	var lives_lost = _starting_lives - lives
	var stars := 1
	if lives_lost == 0:
		# No lives lost - potential for 3 stars
		if time_bonus >= 50:
			stars = 3
		else:
			stars = 2
	elif lives_lost == 1:
		# Lost 1 life - 2 stars
		stars = 2
	else:
		# Lost 2+ lives - 1 star
		stars = 1
	
	print("[D5/D6 FIX] Level ", current_level, " - Starting lives: ", _starting_lives, 
	      ", Remaining: ", lives, ", Lost: ", lives_lost, ", Stars: ", stars)
	
	level_completed.emit()
	
	# Save progress immediately (single writer — no get_node("/root/LevelManager").save_level_completion)
	_save_progress_with_stars(current_level + 1, current_level, stars)
	
	if current_level >= 35:
		set_state("completed")
	else:
		set_state("levelcomplete")

# Single save writer: combines highest_level + level_data (stars) in one ConfigFile write
func _save_progress_with_stars(highest_level: int, completed_level: int, stars: int):
	var config := ConfigFile.new()
	var err := config.load(_save_path)
	var json_str := "{}"
	if err == OK:
		json_str = config.get_value("progress", "level_data", "{}")
	
	var data := JSON.parse_string(json_str) as Dictionary
	if data == null:
		data = {}
	
	var level_info := {"stars": stars, "completed": true}
	data[str(completed_level)] = level_info
	
	var json := JSON.new()
	config.set_value("progress", "level_data", json.stringify(data))
	config.set_value("progress", "highest_level", highest_level)
	config.save(_save_path)
	
	print("[GameManager] Saved progress: level ", highest_level, ", level ", completed_level, " with ", stars, " stars")
	print("[M5DBG] UNLOCK highest_level=", highest_level, " completed=", completed_level, " stars=", stars)

func fail_level():
	level_failed.emit()
	player_died()

func get_current_time() -> float:
	if game_state == "playing":
		# FIX D8: Subtract total pause time to get actual gameplay time
		var current_time = Time.get_ticks_msec() / 1000.0
		var elapsed = current_time - level_start_time
		# If currently paused, don't include current pause duration
		if game_state == "paused":
			elapsed -= (current_time - _pause_start_time)
		# Subtract all previous pause time
		elapsed -= _total_pause_time
		return elapsed
	return 0.0

func get_state() -> String:
	return game_state

func is_player_alive() -> bool:
	return game_state == "playing" and lives > 0

func is_playing() -> bool:
	return game_state == "playing"

func is_paused() -> bool:
	return game_state == "paused"

func on_level_complete() -> void:
	complete_level()

func get_level_time_bonus() -> float:
	return level_time_bonus

func set_level_time_bonus(bonus: float):
	level_time_bonus = bonus

func load_progress():
	var config: ConfigFile = ConfigFile.new()
	var err: int = config.load(_save_path)
	if err == OK:
		current_level = config.get_value("progress", "highest_level", 1)
		print("Loaded save: level ", current_level)
	else:
		print("No save data found, starting fresh")
