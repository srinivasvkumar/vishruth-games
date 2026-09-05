extends SceneTree
# M5 QA — headless geometry probe (proper scene-change flow).
# Loads game.tscn as the current scene (so GameUI/World/Player wire correctly),
# then steps physics and samples the player's world position to verify the
# auto-run axis vs. the +X direction of play (finish at x=140).
#
# Verdict:
#  - P0-AUTO-RUN-WRONG-AXIS : player's Z runs past the 20-deep ground (z>10.5)
#  - OK-APPROACHES-FINISH   : max_x reaches finish_x-1
#  - REVIEW-ON-GROUND       : stays on ground but never reaches finish without D input
#
# Headless, no WebGL/browser. Exercises real autoloads + physics + level gen.

const TOTAL: int = 360        # 6s @60Hz physics frames
const SAMPLE_EVERY: int = 30  # every 0.5s
const GROUND_Z_MAX: float = 10.0
const FINISH_X: float = 140.0

func _initialize() -> void:
	# Autoloads are registered in project.godot; give them their deferred
	# scene-root creation a moment before we swap the main scene.
	for i in range(5):
		await process_frame

	# GameManager.current_level defaults to 1 at autoload init. Confirm/force it.
	var gm := root.get_node_or_null("GameManager")
	if gm:
		gm.current_level = 1

	# Properly load the game scene as the current scene.
	change_scene_to_file("res://scenes/game.tscn")

	# GameScene._ready() awaits one process_frame then _load_level(), which
	# itself awaits a frame and calls LevelManager.load_level. Give it margin.
	for i in range(40):
		await process_frame

	var cur: Node = get_current_scene()
	var world: Node = cur.get_node_or_null("World") if cur else null
	if not world:
		print("M5PROBE-FAIL no World under current scene (cur=", cur, ")")
		quit(1)
		return

	var player: Node = world.get_node_or_null("Player")
	if not player:
		print("M5PROBE-FAIL no Player under World")
		quit(1)
		return

	print("M5PROBE-START level=1 p0=", player.global_position, " finish_x=", FINISH_X)

	var max_x := -1e9
	var min_y := 1e9
	var max_z := -1e9
	var z_runoff := false
	var fell_to_death := false

	for i in range(TOTAL):
		await physics_frame
		var p: Vector3 = player.global_position
		max_x = maxf(max_x, p.x)
		min_y = minf(min_y, p.y)
		max_z = maxf(max_z, p.z)
		if p.z > GROUND_Z_MAX + 0.5:
			z_runoff = true
		if p.y < -5.0:
			fell_to_death = true
		if i % SAMPLE_EVERY == 0:
			print("M5PROBE t=%.2f p=(%.1f,%.1f,%.1f)" % [i / 60.0, p.x, p.y, p.z])

	print("M5PROBE-RESULT max_x=%.1f min_y=%.1f max_z=%.1f z_runoff=%s fell=%s" % [max_x, min_y, max_z, z_runoff, fell_to_death])

	if z_runoff:
		print("M5PROBE-VERDICT P0-AUTO-RUN-WRONG-AXIS: auto-run is +Z (perp to play), player leaves the 20-deep ground; never approaches finish_x=%d" % FINISH_X)
	elif max_x >= FINISH_X - 1.0:
		print("M5PROBE-VERDICT OK-APPROACHES-FINISH")
	else:
		print("M5PROBE-VERDICT REVIEW-ON-GROUND: max_x=%.1f < finish %.1f without D input" % [max_x, FINISH_X])

	quit()
