extends Control
# LevelSelectUI - Dynamically generates level buttons for levels 1-35
# Reads unlocked levels from get_node("/root/GameManager").load_progress(), creates styled Button
# nodes in the GridContainer, and handles navigation to levels and the main menu.
#
# P1 Visual Polish (2026-08-29):
# - Tier color-coding: green=1-5, blue=6-10, yellow=11-20, orange=21-30, red=31-35
# - ScrollContainer wrapping the grid for small viewports
# - Star labels (1-3) below level numbers for completed levels
# - Completed indicator (filled circle) for levels already beaten

const GRID_COLUMNS := 7
const TOTAL_LEVELS := 35
const STAR_SYMBOLS := ["", "★", "★★", "★★★"]

@onready var button_container: GridContainer = $VBoxContainer/LevelButtonsScroll/LevelButtonsContainer
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
	_unlock_threshold = get_node("/root/LevelManager").get_unlocked_levels()
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
	var completed: bool = get_node("/root/LevelManager").has_completed_level(level_num)
	var stars: int = get_node("/root/LevelManager").get_level_stars(level_num)

	# Button text includes level number and star display
	if completed:
		btn.text = "L%d %s" % [level_num, STAR_SYMBOLS[stars]]
	else:
		btn.text = "L%d" % level_num

	btn.disabled = not unlocked

	# Tooltip: show whether the level is available or locked, plus stars if completed
	if unlocked:
		if completed:
			btn.tooltip_text = "Level %d - Completed! %s" % [level_num, STAR_SYMBOLS[stars]]
		else:
			btn.tooltip_text = "Level %d - Tap to play" % level_num
	else:
		btn.tooltip_text = "Level %d - Complete earlier levels first" % level_num

	# Apply tier color + unlock state styling
	_apply_button_style(btn, unlocked, completed, stars)

	# Connect the pressed signal so tapping starts the level.
	btn.pressed.connect(_on_level_selected.bind(level_num))

	return btn


# ---------------------------------------------------------------------------
# Button styling — tier colors + unlock state + completion indicators
# ---------------------------------------------------------------------------

func _apply_button_style(btn: Button, unlocked: bool, completed: bool, stars: int) -> void:
	# Get tier color for this level
	var tier_color: Color = get_node("/root/LevelManager").get_tier_color(btn.text.strip_edges().replace("L", "").to_int())

	if unlocked:
		# Enabled button: colored border matching tier, light background
		btn.add_theme_color_override("font_color", Color(0.1, 0.1, 0.1))
		btn.add_theme_color_override("font_color_hover", Color(0.0, 0.0, 0.0))
		btn.add_theme_color_override("font_color_pressed", Color(0.0, 0.0, 0.0))
		btn.add_theme_color_override("font_color_hover_pressed", Color(0.0, 0.0, 0.0))
		btn.add_theme_color_override("font_color_disabled", Color(0.4, 0.4, 0.4))

		btn.add_theme_stylebox_override("normal", _enabled_stylebox(tier_color, completed))
		btn.add_theme_stylebox_override("hover", _enabled_stylebox_hover(tier_color, completed))
		btn.add_theme_stylebox_override("pressed", _enabled_stylebox_pressed(tier_color, completed))
		btn.add_theme_stylebox_override("focus", _enabled_stylebox(tier_color, completed))

		# Completed levels get a subtle green tint overlay
		if completed:
			btn.add_theme_constant_override("separation", 4)
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
	btn.custom_minimum_size = Vector2(80, 50)
	btn.alignment = HORIZONTAL_ALIGNMENT_CENTER
	btn.clip_text = true
	btn.autowrap_mode = TextServer.AUTOWRAP_WORD


# ---------------------------------------------------------------------------
# StyleBox helpers — color-coded by tier + completion state
# ---------------------------------------------------------------------------

func _enabled_stylebox(tier_color: Color, completed: bool) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	# Light tint of tier color as background
	sb.bg_color = tier_color.linear_to_srgb() * 0.12 + Color.WHITE * 0.88
	sb.border_color = tier_color
	sb.set_border_width_all(2)
	if completed:
		sb.set_border_width_top(3)  # Thicker top border for completed levels
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 4
	sb.content_margin_right = 4
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	return sb


func _enabled_stylebox_hover(tier_color: Color, completed: bool) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = tier_color.linear_to_srgb() * 0.18 + Color.WHITE * 0.82
	sb.border_color = tier_color.darkened(0.2)
	sb.set_border_width_all(2)
	if completed:
		sb.set_border_width_top(3)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 4
	sb.content_margin_right = 4
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	return sb


func _enabled_stylebox_pressed(tier_color: Color, completed: bool) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = tier_color.linear_to_srgb() * 0.25 + Color.WHITE * 0.75
	sb.border_color = tier_color.darkened(0.1)
	sb.set_border_width_all(2)
	if completed:
		sb.set_border_width_top(3)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 4
	sb.content_margin_right = 4
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	return sb


func _locked_stylebox() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.9, 0.9, 0.9)
	sb.border_color = Color(0.7, 0.7, 0.7)
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
	get_node("/root/GameManager").start_level(level_num)
	get_tree().change_scene_to_file("res://scenes/game.tscn")


# ---------------------------------------------------------------------------
# Public API — call from another script when levels are unlocked mid-session.
# ---------------------------------------------------------------------------

func update_unlocked_count(count: int) -> void:
	"""Refresh the button grid when new levels become available."""
	_unlock_threshold = count
	_generate_buttons()
