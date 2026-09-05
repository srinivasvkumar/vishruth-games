extends GutTest


# ===========================================================================
# L2: Integration tests — what works in headless Godot (no rendering server)
# ===========================================================================


func test_game_scene_loads():
	"""L2: game.tscn loads without script errors."""
	var scene = load("res://scenes/game.tscn")
	assert_not_null(scene, "game.tscn should load")
	assert_true(scene is PackedScene, "game.tscn should be a PackedScene")


func test_level_select_scene_loads():
	"""L2: level_select.tscn loads without script errors."""
	var scene = load("res://scenes/level_select.tscn")
	assert_not_null(scene, "level_select.tscn should load")
	assert_true(scene is PackedScene, "level_select.tscn should be a PackedScene")


func test_main_menu_scene_loads():
	"""L2: main_menu.tscn loads without script errors."""
	var scene = load("res://scenes/main_menu.tscn")
	assert_not_null(scene, "main_menu.tscn should load")
	assert_true(scene is PackedScene, "main_menu.tscn should be a PackedScene")


func test_level_manager_has_correct_template_structure():
	"""L2: LevelManager.level_templates has all 5 tiers."""
	var tiers := LevelManager.level_templates
	assert_true(tiers.has("tutorial"), "templates should have 'tutorial'")
	assert_true(tiers.has("easy"), "templates should have 'easy'")
	assert_true(tiers.has("medium"), "templates should have 'medium'")
	assert_true(tiers.has("hard"), "templates should have 'hard'")
	assert_true(tiers.has("expert"), "templates should have 'expert'")

	for tier_name in tiers:
		var tier = tiers[tier_name]
		assert_true(tier.has("levels"), "tier %s should have 'levels'" % tier_name)
		assert_true(tier.has("truck_count"), "tier %s should have 'truck_count'" % tier_name)
		assert_true(tier.has("speed"), "tier %s should have 'speed'" % tier_name)
		assert_true(tier.has("gap_size"), "tier %s should have 'gap_size'" % tier_name)
		assert_true(tier.has("hazard_count"), "tier %s should have 'hazard_count'" % tier_name)
		# levels must be an Array
		assert_true(tier["levels"] is PackedStringArray or tier["levels"] is Array,
			"tier %s levels should be Array" % tier_name)


func test_level_manager_get_template_for_level_returns_correct_tier():
	"""L2: get_template_for_level returns correct tier for every level."""
	# Sample across tiers
	var samples := {
		1: "tutorial",
		5: "tutorial",
		6: "easy",
		10: "easy",
		11: "medium",
		15: "medium",
		20: "medium",
		21: "hard",
		30: "hard",
		31: "expert",
		35: "expert"
	}
	for level in samples:
		var tier_name = samples[level]
		var template = LevelManager.get_template_for_level(level)
		assert_true(level in template["levels"],
			"Level %d should be in %s tier, got: %s" % [level, tier_name, template.keys()])


func test_level_manager_get_level_parameters_returns_valid_dict():
	"""L2: get_level_parameters returns a dict with all expected keys."""
	var required_keys := ["truck_count", "speed", "max_speed",
		"gap_size", "max_gap", "hazard_count"]
	for level in [1, 10, 20, 30, 35]:
		var params = LevelManager.get_level_parameters(level)
		assert_true(params is Dictionary, "L%d params should be Dictionary" % level)
		for key in required_keys:
			assert_true(params.has(key), "L%d params missing key: %s" % [level, key])


func test_level_manager_get_level_parameters_returns_correct_types():
	"""L2: Parameter values have correct types."""
	var params = LevelManager.get_level_parameters(1)
	assert_true(params["truck_count"] is int, "truck_count should be int")
	assert_true(params["hazard_count"] is int, "hazard_count should be int")
	assert_true(params["speed"] is float, "speed should be float")
	assert_true(params["gap_size"] is float, "gap_size should be float")
	assert_true(params["max_speed"] is float, "max_speed should be float")
	assert_true(params["max_gap"] is float, "max_gap should be float")


func test_level_select_ui_loads_with_level_manager():
	"""L2: level_select scene loads and LevelManager APIs are callable."""
	var scene = load("res://scenes/level_select.tscn")
	assert_not_null(scene)
	# Just verify the PackedScene loads; full instantiation is unreliable in headless
	# because of GridContainer parent-path issues. The unit test covers LevelManager API.
	assert_true(scene is PackedScene, "level_select.tscn should be a PackedScene")
	# Verify LevelManager APIs work without errors
	var unlocked := LevelManager.get_unlocked_levels()
	assert_true(unlocked >= 1, "Should have at least 1 unlocked level")
	var tier_color := LevelManager.get_tier_color(15)
	assert_true(tier_color.r > 0 or tier_color.g > 0,
		"get_tier_color(15) should return a valid Color")


func test_max_speed_formula():
	"""L2: max_speed == speed * 1.2 for every level."""
	for level in range(1, 36):
		var params = LevelManager.get_level_parameters(level)
		var expected: float = params["speed"] * 1.2
		var diff: float = abs(params["max_speed"] - expected)
		assert_true(diff < 0.01,
			"L%d: max_speed (%f) should be speed*1.2 (%f), diff=%f"
			% [level, params["max_speed"], expected, diff])


func test_max_gap_formula():
	"""L2: max_gap == gap_size * 1.3 for every level."""
	for level in range(1, 36):
		var params = LevelManager.get_level_parameters(level)
		var expected: float = params["gap_size"] * 1.3
		var diff: float = abs(params["max_gap"] - expected)
		assert_true(diff < 0.01,
			"L%d: max_gap (%f) should be gap*1.3 (%f), diff=%f"
			% [level, params["max_gap"], expected, diff])
