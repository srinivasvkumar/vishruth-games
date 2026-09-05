extends Control
# MainMenuUI - Main menu screen
# Provides Start Game, Level Select, Settings, Credits buttons

var _settings_open: bool = false
var _main_font: Font

func _ready():
	_setup_ui()
	_setup_visuals()

func _setup_visuals():
	# Use system font for all labels
	var system_font := ThemeDB.fallback_font
	if system_font:
		_main_font = system_font

	# Style the root menu control with a dark background
	var menu_style := StyleBoxFlat.new()
	menu_style.bg_color = Color(0.12, 0.12, 0.18, 1.0)
	menu_style.border_width_left = 4
	menu_style.border_width_top = 4
	menu_style.border_width_right = 4
	menu_style.border_width_bottom = 4
	menu_style.border_color = Color(0.3, 0.3, 0.5, 1.0)
	menu_style.corner_radius_top_left = 8
	menu_style.corner_radius_top_right = 8
	menu_style.corner_radius_bottom_right = 8
	menu_style.corner_radius_bottom_left = 8
	add_theme_stylebox_override("bg", menu_style)

	# Get the VBoxContainer - it might be inside CenterContainer now
	var vb: VBoxContainer = null
	if has_node("CenterContainer/VBoxContainer"):
		vb = get_node("CenterContainer/VBoxContainer")
	elif has_node("VBoxContainer"):
		vb = get_node("VBoxContainer")
	
	if vb:
		# Style all buttons in the VBoxContainer
		for child in vb.get_children():
			if child is Button:
				_style_button(child)

		# Style the title label
		var title_label := vb.get_child(0) as Label
		if title_label:
			_style_title(title_label)

	# Style settings panel
	if has_node("SettingsPanel"):
		_style_settings_panel()

	# Style pause menu
	if has_node("PauseMenu"):
		_style_pause_menu()

func _style_button(btn: Button):
	# Create visible button style
	var normal = StyleBoxFlat.new()
	normal.bg_color = Color(0.2, 0.3, 0.5, 0.9)
	normal.border_width_left = 2
	normal.border_width_top = 2
	normal.border_width_right = 2
	normal.border_width_bottom = 2
	normal.border_color = Color(0.4, 0.6, 0.9, 1.0)
	normal.corner_radius_top_left = 6
	normal.corner_radius_top_right = 6
	normal.corner_radius_bottom_right = 6
	normal.corner_radius_bottom_left = 6

	var hovered = StyleBoxFlat.new()
	hovered.bg_color = Color(0.3, 0.45, 0.7, 0.9)
	hovered.border_width_left = 2
	hovered.border_width_top = 2
	hovered.border_width_right = 2
	hovered.border_width_bottom = 2
	hovered.border_color = Color(0.5, 0.8, 1.0, 1.0)
	hovered.corner_radius_top_left = 6
	hovered.corner_radius_top_right = 6
	hovered.corner_radius_bottom_right = 6
	hovered.corner_radius_bottom_left = 6

	var pressed = StyleBoxFlat.new()
	pressed.bg_color = Color(0.15, 0.25, 0.45, 0.9)
	pressed.border_width_left = 2
	pressed.border_width_top = 2
	pressed.border_width_right = 2
	pressed.border_width_bottom = 2
	pressed.border_color = Color(0.3, 0.5, 0.8, 1.0)
	pressed.corner_radius_top_left = 6
	pressed.corner_radius_top_right = 6
	pressed.corner_radius_bottom_right = 6
	pressed.corner_radius_bottom_left = 6

	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hovered)
	btn.add_theme_stylebox_override("pressed", pressed)
	btn.add_theme_stylebox_override("focus", normal)

	# Make text visible
	btn.add_theme_color_override("font_color", Color.WHITE)
	btn.add_theme_color_override("font_color_hover", Color(1.0, 1.0, 0.9, 1.0))
	btn.add_theme_color_override("font_color_pressed", Color(0.9, 0.9, 0.9, 1.0))
	if _main_font:
		btn.add_theme_font_override("font", _main_font)

func _style_title(label: Label):
	label.add_theme_color_override("font_color", Color(0.9, 0.95, 1.0, 1.0))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	if _main_font:
		label.add_theme_font_override("font", _main_font)

func _style_settings_panel():
	var panel := $SettingsPanel as PanelContainer
	if panel:
		var panel_style = StyleBoxFlat.new()
		panel_style.bg_color = Color(0.1, 0.1, 0.15, 0.95)
		panel_style.border_width_left = 4
		panel_style.border_width_top = 4
		panel_style.border_width_right = 4
		panel_style.border_width_bottom = 4
		panel_style.border_color = Color(0.4, 0.5, 0.8, 1.0)
		panel_style.corner_radius_top_left = 10
		panel_style.corner_radius_top_right = 10
		panel_style.corner_radius_bottom_right = 10
		panel_style.corner_radius_bottom_left = 10
		panel.add_theme_stylebox_override("panel", panel_style)

		# Style sliders and buttons in settings
		var vb := panel.get_node("Panel/VBoxContainer") as VBoxContainer
		if vb:
			for child in vb.get_children():
				if child is Button:
					_style_button(child)
				if child is HSlider:
					child.add_theme_color_override("slider_color", Color(0.4, 0.7, 1.0, 1.0))
					child.add_theme_color_override("slider_bg_color", Color(0.3, 0.3, 0.4, 1.0))
				if child is Label:
					child.add_theme_color_override("font_color", Color.WHITE)
					if _main_font:
						child.add_theme_font_override("font", _main_font)

func _style_pause_menu():
	var menu := $PauseMenu as Control
	if menu:
		var panel := menu.get_node("Panel") as Panel
		if panel:
			var panel_style = StyleBoxFlat.new()
			panel_style.bg_color = Color(0.05, 0.05, 0.1, 0.85)
			panel_style.border_width_left = 3
			panel_style.border_width_top = 3
			panel_style.border_width_right = 3
			panel_style.border_width_bottom = 3
			panel_style.border_color = Color(0.3, 0.4, 0.7, 0.8)
			panel_style.corner_radius_top_left = 8
			panel_style.corner_radius_top_right = 8
			panel_style.corner_radius_bottom_right = 8
			panel_style.corner_radius_bottom_left = 8
			panel.add_theme_stylebox_override("fill", panel_style)

			# Style buttons in pause menu
			var vb := panel.get_node("VBoxContainer") as VBoxContainer
			if vb:
				for child in vb.get_children():
					if child is Button:
						_style_button(child)
					if child is Label:
						child.add_theme_color_override("font_color", Color.WHITE)
						if _main_font:
							child.add_theme_font_override("font", _main_font)

func _setup_ui():
	# Get UI elements - buttons are now inside CenterContainer/VBoxContainer
	var vb_container = null
	
	# Try the new structure first (with CenterContainer)
	if has_node("CenterContainer/VBoxContainer"):
		vb_container = get_node("CenterContainer/VBoxContainer")
	# Fall back to old structure (without CenterContainer)
	elif has_node("VBoxContainer"):
		vb_container = get_node("VBoxContainer")
	
	if vb_container:
		var start_button: Button = vb_container.get_node_or_null("StartButton") as Button
		var level_select_button: Button = vb_container.get_node_or_null("LevelSelectButton") as Button
		var settings_button: Button = vb_container.get_node_or_null("SettingsButton") as Button
		var credits_button: Button = vb_container.get_node_or_null("CreditsButton") as Button
		
		# Connect signals
		if start_button:
			start_button.pressed.connect(_on_start_game)
		
		if level_select_button:
			level_select_button.pressed.connect(_on_level_select)
		
		if settings_button:
			settings_button.pressed.connect(_on_settings)
		
		if credits_button:
			credits_button.pressed.connect(_on_credits)

func _process(delta: float) -> void:
	# Handle pause toggle
	if Input.is_action_just_pressed("pause"):
		_toggle_pause()

func _on_start_game():
	print("Starting new game")
	# Start from level 1
	var highest_level: int = get_node("/root/LevelManager").get_unlocked_levels()
	if highest_level <= 1:
		highest_level = 1
	# Change scene first, then let game.tscn generate the level
	get_tree().change_scene_to_file("res://scenes/game.tscn")

func _on_level_select():
	print("Opening level select")
	get_tree().change_scene_to_file("res://scenes/level_select.tscn")

func _on_settings():
	print("Opening settings")
	$SettingsPanel.visible = not $SettingsPanel.visible

func _on_credits():
	print("Showing credits")
	get_tree().change_scene_to_file("res://scenes/credits.tscn")

func _toggle_pause():
	var current_state: String = get_node("/root/GameManager").get_state()
	if current_state == "playing":
		get_tree().paused = true
		$PauseMenu.visible = true
	elif current_state == "paused":
		get_tree().paused = false
		$PauseMenu.visible = false

func show_pause_menu():
	$PauseMenu.visible = true

func hide_pause_menu():
	$PauseMenu.visible = false
