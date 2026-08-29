extends Node
# InputManager - Centralized input handling
# Maps Godot input actions to game events
# Provides input buffering and remapping support

signal jump_requested
signal jump_cancelled
signal strafe_left_requested
signal strafe_right_requested
signal climb_requested
signal climb_released
signal pause_requested

const INPUT_BUFFER_TIME: float = 0.1  # seconds
const COYOTE_TIME: float = 0.15  # seconds

var _input_buffer: Array = []
var _last_ground_contact: float = -999.0
var _input_queue: Dictionary = {}

func _ready():
	_init_input_actions()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_pressed():
		# Check for pause
		if Input.is_action_just_pressed("pause"):
			pause_requested.emit()
			get_tree().paused = not get_tree().paused
			return
		
		# Buffer jump input for forgiving controls
		if Input.is_action_just_pressed("jump"):
			_buffer_input("jump")
			jump_requested.emit()

func _process(delta: float) -> void:
	# Track grounded state for coyote time
	var player_node = get_node_or_null("/root/World/Player")
	if player_node:
		if player_node.is_on_floor():
			_last_ground_contact = Time.get_ticks_msec() / 1000.0
	
	# Process buffered inputs
	_process_buffer()

func _buffer_input(action: String) -> void:
	var timestamp: float = Time.get_ticks_msec() / 1000.0
	_input_queue[action] = timestamp

func _process_buffer():
	# Remove expired buffered inputs
	var now: float = Time.get_ticks_msec() / 1000.0
	var keys_to_remove: Array = []
	for key in _input_queue:
		if now - _input_queue[key] > INPUT_BUFFER_TIME:
			keys_to_remove.append(key)
	for key in keys_to_remove:
		_input_queue.erase(key)

func can_jump() -> bool:
	var time_since_ground: float = Time.get_ticks_msec() / 1000.0 - _last_ground_contact
	var jump_buffered: bool = "jump" in _input_queue
	
	return time_since_ground <= COYOTE_TIME or jump_buffered

func get_strafe_input() -> float:
	var left: float = Input.get_axis("strafe_left", "strafe_right")
	return left

func is_climbing() -> bool:
	return Input.is_action_pressed("climb")

func remap_action(old_action: String, new_action: String):
	var actions: PackedStringArray = InputMap.get_actions()
	for action_name in actions:
		if action_name == old_action:
			var events: Array = InputMap.action_get_events(old_action)
			InputMap.action_erase_events(old_action)
			for event in events:
				_input_queue[new_action] = _input_queue.get(old_action, 0.0)
			break

func clear_buffer():
	_input_queue.clear()

func _init_input_actions():
	# Register input actions if they don't exist
	var existing_actions = InputMap.get_actions()
	if not "jump" in existing_actions:
		InputMap.add_action("jump")
	if not "strafe_left" in existing_actions:
		InputMap.add_action("strafe_left")
	if not "strafe_right" in existing_actions:
		InputMap.add_action("strafe_right")
	if not "climb" in existing_actions:
		InputMap.add_action("climb")
	if not "pause" in existing_actions:
		InputMap.add_action("pause")
