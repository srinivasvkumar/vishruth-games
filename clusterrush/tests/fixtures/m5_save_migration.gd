extends SceneTree
# M5 QA — Task 4: save-file migration test (one case per process).
#
# Run: godot --headless --script tests/fixtures/m5_save_migration.gd -case=<name>
#
# Writes ONE legacy/degraded save file to user://cluster_rush_save.dat, loads
# the real autoloads, and exercises the full read path:
#   GameManager.load_progress()
#   LevelManager.get_level_stars(l)   for l in [1,2,3,10,18,27,35]
#   LevelManager.has_completed_level(l)
# then re-saves through the current writer (_save_progress_with_stars) and
# reloads. Each case runs in its OWN godot process so a SCRIPT ERROR is
# attributable to exactly one save format. PASS = zero SCRIPT ERROR lines and
# a valid int back from get_level_stars.
#
# Reader under test (LevelManager lines 711-729):
#   data[str(level)].get("stars", 0)
#   data[str(level)].get("completed", false)
# A `level_data` value that is NOT a Dictionary makes `.get()` throw a
# "Nonexistent function 'get'" script error — the exact crash a legacy save
# (e.g. bare star counts) would trigger on the level-select screen.
#
# Legacy "old save format" (pre-M3 save_progress(level)): ConfigFile with
# only `progress/highest_level` and NO `level_data` key.

var _save_path := "user://cluster_rush_save.dat"
var _case_name := ""
var _fatal := false


func _initialize() -> void:
	# Case name via env var (godot's arg parser swallows -case=; env is robust).
	_case_name = OS.get_environment("M5_SAVE_CASE")
	if _case_name == "":
		push_error("M5SAVE: M5_SAVE_CASE not set; valid: " + str(CASES.keys()))
		quit(1)
		return
	# Defer one frame so autoloads are attached to root.
	process_frame.connect(_run, CONNECT_ONE_SHOT)


const CASES := {
	"fresh": {},
	"legacy_old_save": {"progress": {"highest_level": 7}},
	"empty_progress": {"progress": {}},
	"level_data_empty": {"progress": {"highest_level": 3, "level_data": "{}"}},
	"level_data_modern": {"progress": {"highest_level": 5, "level_data":
		'{"1":{"stars":3,"completed":true},"2":{"stars":1,"completed":true}}'}},
	"level_data_int_value": {"progress": {"highest_level": 5, "level_data":
		'{"1":3,"2":1}'}},
	"level_data_string_value": {"progress": {"highest_level": 5, "level_data":
		'{"1":"three"}'}},
	"level_data_float_value": {"progress": {"highest_level": 5, "level_data":
		'{"1":2.5}'}},
	"level_data_corrupt": {"progress": {"highest_level": 5, "level_data": "not-json{{"}},
	"highest_out_of_range": {"progress": {"highest_level": 999, "level_data": "{}"}},
}


func _run() -> void:
	_remove_save()
	if _case_name in CASES:
		_write_cfg(CASES[_case_name])

	var gm := get_root().get_node_or_null("GameManager")
	var lm := get_root().get_node_or_null("LevelManager")
	if gm == null or lm == null:
		_fatal = true
		print("[M5SAVE] case '%s': FAIL (autoloads missing)" % _case_name)
		_finish()
		return

	# 1. Legacy reader entry point — must not throw.
	gm.call("load_progress")
	var lvl: int = int(gm.get("current_level"))

	# 2. Crash-prone star/completion readers across all sample levels.
	var bad_return := false
	for l in [1, 2, 3, 10, 18, 27, 35]:
		var stars = lm.call("get_level_stars", l)
		if not (stars is int or stars is float):
			bad_return = true
		var completed = lm.call("has_completed_level", l)
		if not (completed is bool):
			bad_return = true

	# 3. Re-save through the CURRENT writer, then reload — a save round-trip
	#    over the legacy file must not corrupt or crash.
	if gm.has_method("_save_progress_with_stars"):
		gm.call("_save_progress_with_stars", lvl if lvl > 0 else 2, 1, 1)
		gm.call("load_progress")

	if _fatal or bad_return:
		print("[M5SAVE] case '%s': FAIL (bad reader return)" % _case_name)
	else:
		print("[M5SAVE] case '%s': read-path ok (current_level=%d)" % [_case_name, lvl])
	_finish()


func _finish() -> void:
	_remove_save()
	# SCRIPT ERROR lines are printed by the engine independently of these
	# prints; the shell harness greps them. This print is the in-case verdict.
	if not (_fatal or false):
		pass
	quit()


func _write_cfg(values: Dictionary) -> void:
	var config := ConfigFile.new()
	for section in values:
		var vals: Dictionary = values[section]
		for key in vals:
			config.set_value(str(section), str(key), vals[key])
	config.save(_save_path)


func _remove_save() -> void:
	if FileAccess.file_exists(_save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(_save_path))
