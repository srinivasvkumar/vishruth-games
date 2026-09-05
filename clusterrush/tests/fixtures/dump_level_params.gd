extends SceneTree
# M5 QA: deterministic dump of generated level parameters for sampled levels.
# Writes tests/fixtures/generated_levels.json and prints it to the console.
# Uses LevelManager.get_level_parameters() — the exact params the generator
# consumes in _generate_level(), so this is the source of truth for
# tier-table compliance (PLAN.md §5).

const SAMPLE_LEVELS: Array[int] = [1, 10, 18, 27, 35]

func r3(v: Variant) -> float:
	return round(float(v) * 1000.0) / 1000.0

func _initialize() -> void:
	var lm_script := load("res://autoloads/level_manager.gd")
	var lm := Node.new()
	lm.set_script(lm_script)
	root.add_child(lm)
	# Let the deferred _find_or_create_scene_root run so nothing surprises us.
	await process_frame
	await process_frame

	var out := {}
	for lv in SAMPLE_LEVELS:
		var tier_name := ""
		for tn in lm.level_templates:
			if lv in lm.level_templates[tn]["levels"]:
				tier_name = str(tn)
				break
		var p: Dictionary = lm.get_level_parameters(lv)
		out["level_%d" % lv] = {
			"tier": tier_name,
			"truck_count": int(p["truck_count"]),
			"speed": r3(float(p["speed"])),
			"max_speed": r3(float(p["max_speed"])),
			"gap_size": r3(float(p["gap_size"])),
			"max_gap": r3(float(p["max_gap"])),
			"hazard_count": int(p["hazard_count"]),
		}

	var text := JSON.stringify(out, "	")
	var f := FileAccess.open("res://tests/fixtures/generated_levels.json", FileAccess.WRITE)
	f.store_string(text)
	f.close()
	print("M5-LEVELPARAMS-BEGIN")
	print(text)
	print("M5-LEVELPARAMS-END")
	quit()
