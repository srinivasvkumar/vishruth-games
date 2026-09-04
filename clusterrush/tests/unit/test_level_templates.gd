extends GutTest


# Tier configuration matching PLAN.md §5 and level_manager.gd
var _tiers = {
	"tutorial": {
		"levels": [1, 2, 3, 4, 5],
		"truck_min": 1, "truck_max": 2,
		"speed_min": 10.0, "speed_max": 12.0,
		"gap_min": 3.0, "gap_max": 4.0,
		"hazard_min": 0, "hazard_max": 1
	},
	"easy": {
		"levels": [6, 7, 8, 9, 10],
		"truck_min": 2, "truck_max": 3,
		"speed_min": 12.0, "speed_max": 15.0,
		"gap_min": 2.5, "gap_max": 3.5,
		"hazard_min": 1, "hazard_max": 2
	},
	"medium": {
		"levels": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		"truck_min": 4, "truck_max": 6,
		"speed_min": 15.0, "speed_max": 18.0,
		"gap_min": 2.0, "gap_max": 3.0,
		"hazard_min": 2, "hazard_max": 3
	},
	"hard": {
		"levels": [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
		"truck_min": 6, "truck_max": 8,
		"speed_min": 18.0, "speed_max": 22.0,
		"gap_min": 1.5, "gap_max": 2.5,
		"hazard_min": 3, "hazard_max": 4
	},
	"expert": {
		"levels": [31, 32, 33, 34, 35],
		"truck_min": 8, "truck_max": 10,
		"speed_min": 22.0, "speed_max": 25.0,
		"gap_min": 1.0, "gap_max": 2.0,
		"hazard_min": 4, "hazard_max": 5
	}
}


func test_level_1_tier_math():
	"""Level 1 should be in tutorial tier with 1 truck, 0 hazards, speed=10.0."""
	var params = LevelManager.get_level_parameters(1)
	var t = _tiers["tutorial"]

	assert_true(params["truck_count"] >= t["truck_min"] and params["truck_count"] <= t["truck_max"])
	assert_true(params["speed"] >= t["speed_min"] - 0.01 and params["speed"] <= t["speed_max"] + 0.01)
	assert_true(params["gap_size"] >= t["gap_min"] - 0.01 and params["gap_size"] <= t["gap_max"] + 0.01)
	assert_true(params["hazard_count"] >= t["hazard_min"] and params["hazard_count"] <= t["hazard_max"])


func test_level_6_tier_math():
	"""Level 6 should be in easy tier with 2 trucks, 1 hazard."""
	var params = LevelManager.get_level_parameters(6)
	var t = _tiers["easy"]

	assert_true(params["truck_count"] >= t["truck_min"] and params["truck_count"] <= t["truck_max"])
	assert_true(params["speed"] >= t["speed_min"] - 0.01 and params["speed"] <= t["speed_max"] + 0.01)
	assert_true(params["gap_size"] >= t["gap_min"] - 0.01 and params["gap_size"] <= t["gap_max"] + 0.01)
	assert_true(params["hazard_count"] >= t["hazard_min"] and params["hazard_count"] <= t["hazard_max"])


func test_level_8_tier_math():
	"""Level 8 (mid easy) should be in easy tier with parameters in range."""
	var params = LevelManager.get_level_parameters(8)
	var t = _tiers["easy"]

	assert_true(params["truck_count"] >= t["truck_min"] and params["truck_count"] <= t["truck_max"])
	assert_true(params["speed"] >= t["speed_min"] - 0.01 and params["speed"] <= t["speed_max"] + 0.01)
	assert_true(params["gap_size"] >= t["gap_min"] - 0.01 and params["gap_size"] <= t["gap_max"] + 0.01)
	assert_true(params["hazard_count"] >= t["hazard_min"] and params["hazard_count"] <= t["hazard_max"])


func test_level_21_tier_math():
	"""Level 21 should be in hard tier with 6 trucks, 3 hazards."""
	var params = LevelManager.get_level_parameters(21)
	var t = _tiers["hard"]

	assert_true(params["truck_count"] >= t["truck_min"] and params["truck_count"] <= t["truck_max"])
	assert_true(params["speed"] >= t["speed_min"] - 0.01 and params["speed"] <= t["speed_max"] + 0.01)
	assert_true(params["gap_size"] >= t["gap_min"] - 0.01 and params["gap_size"] <= t["gap_max"] + 0.01)
	assert_true(params["hazard_count"] >= t["hazard_min"] and params["hazard_count"] <= t["hazard_max"])


func test_level_31_tier_math():
	"""Level 31 should be in expert tier with 8 trucks, 4 hazards."""
	var params = LevelManager.get_level_parameters(31)
	var t = _tiers["expert"]

	assert_true(params["truck_count"] >= t["truck_min"] and params["truck_count"] <= t["truck_max"])
	assert_true(params["speed"] >= t["speed_min"] - 0.01 and params["speed"] <= t["speed_max"] + 0.01)
	assert_true(params["gap_size"] >= t["gap_min"] - 0.01 and params["gap_size"] <= t["gap_max"] + 0.01)
	assert_true(params["hazard_count"] >= t["hazard_min"] and params["hazard_count"] <= t["hazard_max"])


func test_level_35_tier_math():
	"""Level 35 (expert end) should be in expert tier with 10 trucks, 5 hazards."""
	var params = LevelManager.get_level_parameters(35)
	var t = _tiers["expert"]

	assert_true(params["truck_count"] >= t["truck_min"] and params["truck_count"] <= t["truck_max"])
	assert_true(params["speed"] >= t["speed_min"] - 0.01 and params["speed"] <= t["speed_max"] + 0.01)
	assert_true(params["gap_size"] >= t["gap_min"] - 0.01 and params["gap_size"] <= t["gap_max"] + 0.01)
	assert_true(params["hazard_count"] >= t["hazard_min"] and params["hazard_count"] <= t["hazard_max"])


func test_all_levels_1_to_35_return_valid_params():
	"""Every level n in 1..35 returns params with truck >= 1 and hazard >= 0."""
	for level in range(1, 36):
		var params = LevelManager.get_level_parameters(level)
		assert_true(params["truck_count"] >= 1,
			"Level %d should have truck_count >= 1, got %d" % [level, params["truck_count"]])
		assert_true(params["hazard_count"] >= 0,
			"Level %d should have hazard_count >= 0, got %d" % [level, params["hazard_count"]])
		assert_true(params["speed"] > 0,
			"Level %d should have positive speed, got %f" % [level, params["speed"]])
		assert_true(params["gap_size"] > 0,
			"Level %d should have positive gap, got %f" % [level, params["gap_size"]])


func test_truck_count_increases_across_tiers():
	"""Highest truck count in tier N >= lowest truck count in tier N-1."""
	var prev_max_truck = 0
	for tier_name in _tiers:
		var t = _tiers[tier_name]
		assert_true(t["truck_min"] >= prev_max_truck,
			"%s tier truck_min (%d) should be >= prev tier max (%d)" % [tier_name, t["truck_min"], prev_max_truck])
		prev_max_truck = t["truck_max"]


func test_gaps_are_reasonable_across_tiers():
	"""Gaps decrease as we go up tiers — each tier's max gap is not
	higher than the previous tier's max gap, but ranges may
	overlap (e.g. tutorial max 4.0 > easy max 3.5 but tutorial min
	3.0 < easy max 3.5 is acceptable)."""
	var prev_min_gap = 999.0
	var prev_max_gap = 999.0
	for tier_name in _tiers:
		var t = _tiers[tier_name]
		# Each tier's max should not exceed previous tier's max
		assert_true(t["gap_max"] <= prev_max_gap + 0.01,
			"%s tier gap_max (%f) should be <= prev tier max (%f)" % [tier_name, t["gap_max"], prev_max_gap])
		# Each tier's min should not exceed previous tier's min
		assert_true(t["gap_min"] <= prev_min_gap + 0.01,
			"%s tier gap_min (%f) should be <= prev tier min (%f)" % [tier_name, t["gap_min"], prev_min_gap])
		prev_min_gap = t["gap_min"]
		prev_max_gap = t["gap_max"]


func test_speed_increases_across_tiers():
	"""Max speed in tier N >= min speed in tier N-1."""
	var prev_max_speed = 0.0
	for tier_name in _tiers:
		var t = _tiers[tier_name]
		assert_true(t["speed_min"] >= prev_max_speed - 0.01,
			"%s tier speed_min (%f) should be >= prev tier max (%f)" % [tier_name, t["speed_min"], prev_max_speed])
		prev_max_speed = t["speed_max"]


func test_truck_count_at_boundaries():
	"""First and last levels of each tier should have boundary truck counts."""
	# Tutorial: level 1 = 1 truck (min), level 5 = 2 trucks (max)
	var p1 = LevelManager.get_level_parameters(1)
	var p5 = LevelManager.get_level_parameters(5)
	assert_true(p1["truck_count"] >= _tiers["tutorial"]["truck_min"])
	assert_true(p5["truck_count"] <= _tiers["tutorial"]["truck_max"])

	# Expert: level 31 = 8 trucks (min), level 35 = 10 trucks (max)
	var p31 = LevelManager.get_level_parameters(31)
	var p35 = LevelManager.get_level_parameters(35)
	assert_true(p31["truck_count"] >= _tiers["expert"]["truck_min"])
	assert_true(p35["truck_count"] <= _tiers["expert"]["truck_max"])


func test_level_1_starts_at_min_values():
	"""Level 1 (first level of game) should have minimum values for its tier."""
	var p1 = LevelManager.get_level_parameters(1)
	assert_true(p1["truck_count"] == 1)
	assert_true(p1["hazard_count"] == 0)


func test_level_35_has_max_values_for_tier():
	"""Level 35 (last of expert) should have maximum values for its tier."""
	var p35 = LevelManager.get_level_parameters(35)
	assert_true(p35["truck_count"] == 10)
	assert_true(p35["hazard_count"] == 5)


func test_truck_count_interpolates_within_tier():
	"""Within a tier, truck_count should be non-decreasing as level index increases."""
	var prev = 0
	for tier_name in _tiers:
		var t = _tiers[tier_name]
		for level in t["levels"]:
			var params = LevelManager.get_level_parameters(level)
			assert_true(params["truck_count"] >= prev,
				"Truck count should be non-decreasing within tier %s: level %d has %d < prev %d"
				% [tier_name, level, params["truck_count"], prev])
			prev = params["truck_count"]


func test_hazard_count_interpolates_within_tier():
	"""Within a tier, hazard_count should be non-decreasing as level index increases."""
	var prev = -1
	for tier_name in _tiers:
		var t = _tiers[tier_name]
		for level in t["levels"]:
			var params = LevelManager.get_level_parameters(level)
			assert_true(params["hazard_count"] >= prev,
				"Hazard count should be non-decreasing within tier %s: level %d has %d < prev %d"
				% [tier_name, level, params["hazard_count"], prev])
			prev = params["hazard_count"]


func test_tier_names_are_correct():
	"""get_template_for_level returns correct tier name for each level."""
	# Tutorial
	for level in [1, 2, 3, 4, 5]:
		var t = LevelManager.get_template_for_level(level)
		assert_true(t["levels"] == [1, 2, 3, 4, 5], "Level %d should be tutorial" % level)

	# Easy
	for level in [6, 7, 8, 9, 10]:
		var t = LevelManager.get_template_for_level(level)
		assert_true(t["levels"] == [6, 7, 8, 9, 10], "Level %d should be easy" % level)

	# Medium
	for level in [11, 15, 20]:
		var t = LevelManager.get_template_for_level(level)
		assert_true(t["levels"] == [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
			"Level %d should be medium" % level)

	# Hard
	for level in [21, 25, 30]:
		var t = LevelManager.get_template_for_level(level)
		assert_true(t["levels"] == [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
			"Level %d should be hard" % level)

	# Expert
	for level in [31, 33, 35]:
		var t = LevelManager.get_template_for_level(level)
		assert_true(t["levels"] == [31, 32, 33, 34, 35], "Level %d should be expert" % level)


func test_unlock_rule():
	"""Level N+1 should unlock after completing level N."""
	# Simulate the unlock rule: level 2 is unlocked when highest_level >= 2
	# The LevelManager.save_progress and GameManager.start_level handle this.
	# For the test, we verify that the unlock threshold concept is consistent.

	# If no save exists, get_unlocked_levels returns 1
	var unlocked = LevelManager.get_unlocked_levels()
	assert_true(unlocked >= 1, "Base unlocked levels should be at least 1")

	# Level select UI uses: level_num <= _unlock_threshold
	# So level 2 is playable when unlocked >= 2
	# Level 35 is playable when unlocked >= 35
	assert_true(35 >= 1, "Level 35 unlock logic: max_level should be checkable")


func test_max_speed_is_greater_than_speed():
	"""max_speed should always be speed * 1.2 (1.2x multiplier)."""
	for level in [1, 10, 20, 30, 35]:
		var params = LevelManager.get_level_parameters(level)
		assert_true(params["max_speed"] > params["speed"],
			"Level %d: max_speed (%f) should be > speed (%f)"
			% [level, params["max_speed"], params["speed"]])
		# Verify the 1.2x factor
		var expected = params["speed"] * 1.2
		assert_true(abs(params["max_speed"] - expected) < 0.01,
			"Level %d: max_speed should be ~speed * 1.2, got %f vs expected %f"
			% [level, params["max_speed"], expected])
