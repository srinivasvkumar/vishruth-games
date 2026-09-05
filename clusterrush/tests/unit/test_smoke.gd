extends GutTest

func test_true_is_true():
	"""Trivial smoke test — confirms GUT harness works."""
	assert_true(true, "GUT harness is functional")


func test_main_menu_loads():
	"""Verify res://scenes/main_menu.tscn loads without error."""
	var scene = load("res://scenes/main_menu.tscn")
	assert_not_null(scene, "main_menu.tscn should load")


func test_level_select_loads():
	"""Verify res://scenes/level_select.tscn loads without error."""
	var scene = load("res://scenes/level_select.tscn")
	assert_not_null(scene, "level_select.tscn should load")
