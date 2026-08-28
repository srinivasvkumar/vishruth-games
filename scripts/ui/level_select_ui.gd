extends Control
# LevelSelectUI - Dynamically generates level buttons for levels 1-35
# Reads unlocked levels from GameManager.load_progress(), creates styled Button
# nodes in the GridContainer, and handles navigation to levels and the main menu.

const GRID_COLUMNS := 7
const TOTAL_LEVELS := 35

@onready var button_container: GridContainer = $VBoxContainer/LevelButtonsContainer
@onready var back_button: Button = $VBoxContainer/BackButton

var _unlock_threshold: int = 1


func _ready() -> void:
	_connect_back_button()
	_connect_restart_button()
	_setup_ui()


# ---------------------------------------------------------------------------
# Back / Restart navigation
# ---------------------------------------------------------------------------

func _connect_back_button() -> void:
	if back_button:
		back_button.pressed.connect(_on_back_to_menu)


func _on_back_to_menu() -> void:
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")


func _connect_restart_button() -> void:
	var restart_btn := $VBoxContainer/RestartButton as Button
	if restart_btn:
		restart_btn.pressed.connect(_on_restart)


func _on_restart() -> void:
	get_tree().reload_current_scene()


# ---------------------------------------------------------------------------
# UI initialisation
# ---------------------------------------------------------------------------

func _setup_ui() -> void:
	# Read highest unlocked level from LevelManager (reads user:// save file).
	# If no save exists yet, the fallback is 1 so only level 1 is unlocked.
	_unlock_threshold = LevelManager.get_unlocked_levels()
	_generate_buttons()


# ---------------------------------------------------------------------------
# Button generation
# ---------------------------------------------------------------------------

func _generate_buttons() -> void:
	# Clear any existing level-button children.
	for child in button_container.get_children():
		child.queue_free()

	for level_num in range(1, TOTAL_LEVELS + 1):
		var btn := _create_level_button(level_num)
		button_container.add_child(btn)


func _create_level_button(level_num: int) -> Button:
	var btn := Button.new()

	var unlocked := level_num <= _unlock_threshold

	btn.text = "Level %d" % level_num
	btn.disabled = not unlocked

	# Tooltip: show whether the level is available or locked.
	if unlocked:
		btn.tooltip_text = "Level %d - Tap to play" % level_num
	else:
		btn.tooltip_text = "Level %d - Complete earlier levels first" % level_num

	# Style the button according to unlock state.
	_apply_button_style(btn, unlocked)

	# Connect the pressed signal so tapping starts the level.
	btn.pressed.connect(_on_level_selected.bind(level_num))

	return btn


# ---------------------------------------------------------------------------
# Button styling — enabled vs. greyed-out
# ---------------------------------------------------------------------------

func _apply_button_style(btn: Button, unlocked: bool) -> void:
	if unlocked:
		# Enabled button: green accent to signal playable.
		btn.add_theme_color_override("font_color", Color(0.2, 0.7, 0.2))
		btn.add_theme_color_override("font_color_hover", Color(0.3, 0.85, 0.3))
		btn.add_theme_color_override("font_color_pressed", Color(0.1, 0.55, 0.1))
		btn.add_theme_color_override("font_color_hover_pressed", Color(0.15, 0.65, 0.15))
		btn.add_theme_color_override("font_color_disabled", Color(0.5, 0.75, 0.5))
		btn.add_theme_stylebox_override("normal", _enabled_stylebox())
		btn.add_theme_stylebox_override("hover", _enabled_stylebox_hover())
		btn.add_theme_stylebox_override("pressed", _enabled_stylebox_pressed())
		btn.add_theme_stylebox_override("focus", _enabled_stylebox())
	else:
		# Locked button: greyed out, non-interactive.
		btn.add_theme_color_override("font_color", Color(0.45, 0.45, 0.45))
		btn.add_theme_color_override("font_color_hover", Color(0.45, 0.45, 0.45))
		btn.add_theme_color_override("font_color_pressed", Color(0.4, 0.4, 0.4))
		btn.add_theme_color_override("font_color_hover_pressed", Color(0.45, 0.45, 0.45))
		btn.add_theme_stylebox_override("normal", _locked_stylebox())
		btn.add_theme_stylebox_override("hover", _locked_stylebox())
		btn.add_theme_stylebox_override("pressed", _locked_stylebox())
		btn.add_theme_stylebox_override("focus", _locked_stylebox())

	# Size & alignment — consistent grid cells.
	btn.custom_minimum_size = Vector2(80, 44)
	btn.alignment = HORIZONTAL_ALIGNMENT_CENTER


func _enabled_stylebox() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.92, 0.96, 0.92)
	sb.border_color = Color(0.3, 0.8, 0.3)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb


func _enabled_stylebox_hover() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.85, 0.98, 0.85)
	sb.border_color = Color(0.2, 0.9, 0.2)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb


func _enabled_stylebox_pressed() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.75, 0.93, 0.75)
	sb.border_color = Color(0.25, 0.82, 0.25)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb


func _locked_stylebox() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.85, 0.85, 0.85)
	sb.border_color = Color(0.6, 0.6, 0.6)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb


# ---------------------------------------------------------------------------
# Level selection — navigate to level or back to menu
# ---------------------------------------------------------------------------

func _on_level_selected(level_num: int) -> void:
	if level_num > _unlock_threshold:
		print("Level %d is locked. Complete earlier levels first." % level_num)
		return

	print("Starting level %d" % level_num)
	GameManager.start_level(level_num)
	get_tree().change_scene_to_file("res://scenes/game.tscn")


# ---------------------------------------------------------------------------
# Public API — call from another script when levels are unlocked mid-session.
# ---------------------------------------------------------------------------

func update_unlocked_count(count: int) -> void:
	"""Refresh the button grid when new levels become available."""
	_unlock_threshold = count
	_generate_buttons()
