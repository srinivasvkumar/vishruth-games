extends Control
# CreditsScreen - Displays game credits with exit functionality
# FIX D10/D12: Added exit button and script to allow leaving credits screen

@onready var back_button: Button = $VBoxContainer/BackButton

func _ready() -> void:
	_setup_visuals()
	_connect_buttons()

func _setup_visuals() -> void:
	# Dark background
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.05, 0.05, 0.12, 1.0)
	add_theme_stylebox_override("bg", bg)
	
	# Style title
	var title = $VBoxContainer/Label as Label
	if title:
		title.add_theme_color_override("font_color", Color(0.95, 0.85, 0.15, 1.0))
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		title.add_theme_font_size_override("font_size", 48)
	
	# Style credits text
	var text = $VBoxContainer/Text as RichTextLabel
	if text:
		text.add_theme_color_override("font_color", Color.WHITE)
		text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	# Style back button
	if back_button:
		var btn_style := StyleBoxFlat.new()
		btn_style.bg_color = Color(0.2, 0.5, 0.2, 0.9)
		btn_style.border_width_left = 2
		btn_style.border_width_top = 2
		btn_style.border_width_right = 2
		btn_style.border_width_bottom = 2
		btn_style.border_color = Color(0.4, 0.8, 0.4, 1.0)
		btn_style.corner_radius_top_left = 8
		btn_style.corner_radius_top_right = 8
		btn_style.corner_radius_bottom_right = 8
		btn_style.corner_radius_bottom_left = 8
		back_button.add_theme_stylebox_override("normal", btn_style)
		back_button.add_theme_color_override("font_color", Color.WHITE)
		back_button.add_theme_color_override("font_color_hover", Color(0.9, 1.0, 0.9, 1.0))

func _connect_buttons() -> void:
	if back_button:
		back_button.pressed.connect(_on_back_to_menu)

func _on_back_to_menu() -> void:
	print("[CreditsScreen] Returning to main menu")
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
