extends GutTest


func test_main_menu_loads_and_instantiates():
	"""Instantiate main_menu.tscn, verify root node exists, free it."""
	var scene = load("res://scenes/main_menu.tscn")
	assert_not_null(scene, "main_menu.tscn should load")
	var instance = scene.instantiate()
	assert_is(instance, Node, "main_menu instance should be a Node")
	assert_is(instance, Control, "main_menu instance should be a Control")
	instance.free()


func test_credits_loads():
	"""Verify res://scenes/credits.tscn loads without error."""
	var scene = load("res://scenes/credits.tscn")
	assert_not_null(scene, "credits.tscn should load")
