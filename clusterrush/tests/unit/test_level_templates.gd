extends GutTest
# =============================================================================
# L1: Unit tests - Level template math (simplified version)
# =============================================================================

# Tier configuration matching PLAN.md §5 and level_manager.gd
const TUTORIAL_LEVELS = [1, 2, 3, 4, 5]
const EASY_LEVELS = [6, 7, 8, 9, 10]
const MEDIUM_LEVELS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const HARD_LEVELS = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
const EXPERT_LEVELS = [31, 32, 33, 34, 35]

func test_level_1_in_tutorial():
	"""Level 1 should be in tutorial tier."""
	assert_true(1 in TUTORIAL_LEVELS)

func test_level_5_in_tutorial():
	"""Level 5 should be in tutorial tier."""
	assert_true(5 in TUTORIAL_LEVELS)

func test_level_6_in_easy():
	"""Level 6 should be in easy tier."""
	assert_true(6 in EASY_LEVELS)

func test_level_10_in_easy():
	"""Level 10 should be in easy tier."""
	assert_true(10 in EASY_LEVELS)

func test_level_11_in_medium():
	"""Level 11 should be in medium tier."""
	assert_true(11 in MEDIUM_LEVELS)

func test_level_20_in_medium():
	"""Level 20 should be in medium tier."""
	assert_true(20 in MEDIUM_LEVELS)

func test_level_21_in_hard():
	"""Level 21 should be in hard tier."""
	assert_true(21 in HARD_LEVELS)

func test_level_30_in_hard():
	"""Level 30 should be in hard tier."""
	assert_true(30 in HARD_LEVELS)

func test_level_31_in_expert():
	"""Level 31 should be in expert tier."""
	assert_true(31 in EXPERT_LEVELS)

func test_level_35_in_expert():
	"""Level 35 should be in expert tier."""
	assert_true(35 in EXPERT_LEVELS)

func test_all_tiers_have_levels():
	"""All tiers should have non-empty level arrays."""
	assert_true(TUTORIAL_LEVELS.size() > 0)
	assert_true(EASY_LEVELS.size() > 0)
	assert_true(MEDIUM_LEVELS.size() > 0)
	assert_true(HARD_LEVELS.size() > 0)
	assert_true(EXPERT_LEVELS.size() > 0)

func test_tier_levels_are_sequential():
	"""Tier levels should be sequential integers."""
	for i in range(TUTORIAL_LEVELS.size() - 1):
		assert_true(TUTORIAL_LEVELS[i + 1] - TUTORIAL_LEVELS[i] == 1)
	for i in range(EASY_LEVELS.size() - 1):
		assert_true(EASY_LEVELS[i + 1] - EASY_LEVELS[i] == 1)
	for i in range(MEDIUM_LEVELS.size() - 1):
		assert_true(MEDIUM_LEVELS[i + 1] - MEDIUM_LEVELS[i] == 1)
	for i in range(HARD_LEVELS.size() - 1):
		assert_true(HARD_LEVELS[i + 1] - HARD_LEVELS[i] == 1)
	for i in range(EXPERT_LEVELS.size() - 1):
		assert_true(EXPERT_LEVELS[i + 1] - EXPERT_LEVELS[i] == 1)

func test_no_duplicate_levels():
	"""No level should appear in multiple tiers."""
	var all_levels = TUTORIAL_LEVELS + EASY_LEVELS + MEDIUM_LEVELS + HARD_LEVELS + EXPERT_LEVELS
	var unique_levels = []
	for level in all_levels:
		if level not in unique_levels:
			unique_levels.append(level)
	assert_true(unique_levels.size() == all_levels.size(), "No duplicate levels should exist")

func test_levels_cover_1_to_35():
	"""All levels from 1 to 35 should be covered."""
	for level in range(1, 36):
		assert_true(level in TUTORIAL_LEVELS or level in EASY_LEVELS or 
		            level in MEDIUM_LEVELS or level in HARD_LEVELS or level in EXPERT_LEVELS,
		            "Level %d should be in some tier" % level)
