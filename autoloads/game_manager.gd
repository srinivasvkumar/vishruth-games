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

var _save_path: String = "user://cluster_rush_save.dat"

func _ready():
	load_progress()
	set_state("menu")

func set_state(new_state: String):
	game_state = new_state
	if new_state == "playing":
		level_start_time = Time.get_ticks_msec() / 1000.0
	elif new_state == "paused":
		game_paused.emit()
	elif new_state == "gameover":
		game_over.emit()
	elif new_state == "completed":
		game_completed.emit()

func start_level(level_num: int):
	current_level = level_num
	lives = 3 if level_num <= 5 else 2
	score = 0
	level_started.emit(level_num)

func player_died():
	lives -= 1
	lives_changed.emit()
	
	if lives <= 0:
		set_state("gameover")
	else:
		LevelManager.respawn_player()

func complete_level():
	if game_state != "playing":
		return
	
	var elapsed: float = Time.get_ticks_msec() / 1000.0 - level_start_time
	var time_bonus: float = minf(elapsed * 10.0, 100.0)
	level_time_bonus = time_bonus
	score += 100 + time_bonus
	
	level_completed.emit()
	
	# Save progress immediately
	save_progress(current_level + 1)
	
	if current_level >= 35:
		set_state("completed")

func fail_level():
	level_failed.emit()
	player_died()

func get_current_time() -> float:
	if game_state == "playing":
		return Time.get_ticks_msec() / 1000.0 - level_start_time
	return 0.0

func get_state() -> String:
	return game_state

func is_player_alive() -> bool:
	return game_state == "playing" and lives > 0

func get_level_time_bonus() -> float:
	return level_time_bonus

func set_level_time_bonus(bonus: float):
	level_time_bonus = bonus

func save_progress(level: int):
	var config: ConfigFile = ConfigFile.new()
	config.set_value("progress", "highest_level", level)
	config.save(_save_path)

func load_progress():
	var config: ConfigFile = ConfigFile.new()
	var err: int = config.load(_save_path)
	if err == OK:
		current_level = config.get_value("progress", "highest_level", 1)
		print("Loaded save: level ", current_level)
	else:
		print("No save data found, starting fresh")
