extends Control
# EndScreenUI - Game completion screen
# Shows final score, "All Levels Complete" message
# Button navigates back to main menu

@onready var score_label: Label = $VBoxContainer/ScoreLabel
@onready var menu_button: Button = $VBoxContainer/MainMenuButton

func _ready() -> void:
	_setup_visuals()
	_connect_buttons()

func _setup_visuals() -> void:
	# Dark background
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.05, 0.05, 0.12, 1.0)
	add_theme_stylebox_override("bg", bg)
	
	# Style title label
	var title := $VBoxContainer/Label as Label
	if title:
		title.add_theme_color_override("font_color", Color(0.95, 0.85, 0.15, 1.0))
		title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	# Style score label
	if score_label:
		score_label.add_theme_color_override("font_color", Color.WHITE)
		score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	# Style button
	if menu_button:
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
		menu_button.add_theme_stylebox_override("normal", btn_style)
		menu_button.add_theme_color_override("font_color", Color.WHITE)
		menu_button.add_theme_color_override("font_color_hover", Color(0.9, 1.0, 0.9, 1.0))

func _connect_buttons() -> void:
	if menu_button:
		menu_button.pressed.connect(_on_main_menu)

func _on_main_menu() -> void:
	print("[EndScreenUI] Returning to main menu")
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")

func show(score: int) -> void:
	if score_label:
		score_label.text = "Final Score: " + str(score)
