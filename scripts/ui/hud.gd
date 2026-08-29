extends Control
# HUD - Heads-up display overlay
# Shows level, lives, score, timer at top of screen
# Uses white text, semi-transparent background, 24px font

@onready var score_label: Label = $ScoreLabel
@onready var lives_label: Label = $LivesLabel
@onready var level_label: Label = $LevelLabel
@onready var timer_label: Label = $TimeLabel
@onready var progress_bar: ProgressBar = $ProgressBar

var _update_timer: float = 0.0
var _hud_style: StyleBoxFlat
var _font: Font

func _ready() -> void:
	_setup_visuals()
	GameManager.lives_changed.connect(_on_lives_changed)

func _setup_visuals() -> void:
	# Semi-transparent dark background
	_hud_style = StyleBoxFlat.new()
	_hud_style.bg_color = Color(0, 0, 0, 0.6)
	_hud_style.set_corner_radius_all(4)
	_hud_style.set_border_width_left(2)
	_hud_style.border_color = Color(0.3, 0.6, 1.0, 0.5)
	add_theme_stylebox_override("panel", _hud_style)
	
	# Common font settings (24px)
	_font = ThemeDB.get_default_font()

func _process(delta: float) -> void:
	_update_timer += delta
	if _update_timer > 0.1:  # Update every 100ms for smooth timer
		_update_timer = 0.0
		updateHUD()

func updateHUD() -> void:
	if not GameManager:
		return
	
	# Level — "Level: 5"
	level_label.text = "Level: " + str(GameManager.current_level)
	_setup_label_font(level_label)
	
	# Lives — "Lives: [hearts]"
	var hearts: String = ""
	for i in range(GameManager.lives):
		hearts += "\u2764\uFE0F"  # Red heart emoji
	lives_label.text = "Lives: " + hearts
	_setup_label_font(lives_label)
	
	# Score — "Score: 150"
	score_label.text = "Score: " + str(GameManager.score)
	_setup_label_font(score_label)
	
	# Timer — "Time: 45s"
	var elapsed: float = GameManager.get_current_time()
	timer_label.text = "Time: " + str(int(elapsed)) + "s"
	_setup_label_font(timer_label)
	
	# Progress bar — based on player position
	_update_progress_bar()

func _update_progress_bar() -> void:
	if not progress_bar:
		return
	var player_node: CharacterBody3D = _find_player()
	if player_node:
		var progress: float = clampf(player_node.global_position.x / 140.0, 0.0, 1.0)
		progress_bar.value = progress
		# Apply style
		var pb_style: StyleBoxFlat = StyleBoxFlat.new()
		pb_style.bg_color = Color(0.2, 0.5, 0.9, 0.3)
		pb_style.set_corner_radius_all(4)
		progress_bar.add_theme_stylebox_override("finished", _bar_style())
		progress_bar.add_theme_stylebox_override("fill", _bar_style())
		progress_bar.add_theme_stylebox_override("bar", _bar_style())

func _bar_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.2, 0.7, 1.0)
	style.set_corner_radius_all(2)
	return style

func _setup_label_font(label: Label) -> void:
	# White text, centered alignment
	label.modulate = Color.WHITE
	if label.text.contains("Score"):
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	elif label.text.contains("Time"):
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

func _find_player() -> CharacterBody3D:
	var scene_root: Node = get_tree().get_current_scene()
	if scene_root:
		var world: Node = scene_root.get_node_or_null("World")
		if world:
			var p: Node = world.get_node_or_null("Player")
			if p is CharacterBody3D:
				return p as CharacterBody3D
	return null

func _on_lives_changed() -> void:
	# Flash effect when lives change
	if lives_label:
		lives_label.modulate = Color.YELLOW
		create_tween().tween_property(lives_label, "modulate", Color.WHITE, 0.3)

func showHUD() -> void:
	visible = true

func hideHUD() -> void:
	visible = false
