extends SceneTree
# =============================================================================
# M5 QA — Task 4: save-file migration test.
#
# Verifies the CURRENT load path handles the OLD (legacy) save format — the
# ConfigFile that pre-M3 `save_progress(level)` wrote, which contains ONLY
# `progress/highest_level` and NO `progress/level_data` key — WITHOUT crashing.
#
# Also probes degraded / corrupted `level_data` shapes (missing key, empty
# JSON, a non-dict value, corrupt JSON) to document robustness. These use the
# real LevelManager / GameManager autoloads, so any runtime type error is
# caught by Godot's SCRIPT ERROR reporting (counted in the shell wrapper).
#
# Run headless (one case set per process):
#   ./bin/godot --headless --script tests/integration/test_save_migration.gd
#
# The test writes the save to `user://cluster_rush_save.dat` (the real save
# path used by the autoloads) and cleans up after itself.
# =============================================================================

const SAVE_PATH := "user://cluster_rush_save.dat"
const L := "[MIGRATE]"

func _initialize() -> void:
	# Defer to the first processed frame so all autoloads are attached.
	process_frame.connect(_run, CONNECT_ONE_SHOT)


func _run() -> void:
	print("%s === save-file migration test start ===" % L)
	var lvl_mgr: Node = _autoload("LevelManager")
	var gm: Node = _autoload("GameManager")
	if lvl_mgr == null or gm == null:
		push_error(L + " FAIL: LevelManager or GameManager autoload missing")
		print("%s RESULT: ABORT (autoloads unavailable)" % L)
		quit(1)
		return

	# Delete any pre-existing save first so each case is deterministic.
	_delete_save()

	# ---- Case 1: LEGACY OLD SAVE FORMAT (the task's core requirement) ----
	# Pre-M3 `save_progress(level)` wrote only:  [progress] highest_level=N
	_write_save({"highest_level": 7})
	var c1_unlocked: int = lvl_mgr.call("get_unlocked_levels")
	var c1_completed_1: bool = lvl_mgr.call("has_completed_level", 1)
	var c1_stars_1: int = lvl_mgr.call("get_level_stars", 1)
	var c1_highest_loaded: int = gm.get("current_level")
	print("%s CASE1 legacy_old_save: unlocked=%d completed(1)=%s stars(1)=%d gm.current_level=%d" % [
		L, c1_unlocked, str(c1_completed_1), c1_stars_1, c1_highest_loaded])
	# Expected: loads, unlocked=7, no star/completion data (0/false), no crash.
	var c1_ok = (c1_unlocked == 7) and (c1_stars_1 == 0) and (c1_completed_1 == false)
	print("%s CASE1 verdict: %s (unlocked==7 and no level_data => 0 stars/false)" % [L, "PASS" if c1_ok else "FAIL"])

	# ---- Case 2: MODERN SAVE FORMAT (highest_level + level_data JSON dict) ----
	_write_save({"highest_level": 7, "level_data": "{\"1\":{\"stars\":3,\"completed\":true},\"2\":{\"stars\":1,\"completed\":true}}"}, true)
	var c2_unlocked: int = lvl_mgr.call("get_unlocked_levels")
	var c2_stars_1: int = lvl_mgr.call("get_level_stars", 1)
	var c2_completed_2: bool = lvl_mgr.call("has_completed_level", 2)
	print("%s CASE2 modern: unlocked=%d stars(1)=%d completed(2)=%s" % [
		L, c2_unlocked, c2_stars_1, str(c2_completed_2)])
	var c2_ok = (c2_unlocked == 7) and (c2_stars_1 == 3) and (c2_completed_2 == true)
	print("%s CASE2 verdict: %s" % [L, "PASS" if c2_ok else "FAIL"])

	# ---- Case 3: EMPTY SAVE FILE ----
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	f.close()
	f = null
	var c3_unlocked: int = lvl_mgr.call("get_unlocked_levels")
	print("%s CASE3 empty_file: unlocked=%d" % [L, c3_unlocked])
	var c3_ok = (c3_unlocked == 1)
	print("%s CASE3 verdict: %s" % [L, "PASS" if c3_ok else "FAIL"])

	# ---- Case 4: level_data = "{}" (no keys) ----
	_write_save({"highest_level": 3, "level_data": "{}"}, true)
	var c4_unlocked: int = lvl_mgr.call("get_unlocked_levels")
	var c4_stars_1: int = lvl_mgr.call("get_level_stars", 1)
	print("%s CASE4 level_data_empty: unlocked=%d stars(1)=%d" % [L, c4_unlocked, c4_stars_1])
	var c4_ok = (c4_unlocked == 3) and (c4_stars_1 == 0)
	print("%s CASE4 verdict: %s" % [L, "PASS" if c4_ok else "FAIL"])

	# ---- Case 5: level_data value is a non-dict (int) — robustness probe ----
	_write_save({"highest_level": 3, "level_data": "{\"1\":2}"}, true)
	var c5_stars_1: int = lvl_mgr.call("get_level_stars", 1)
	var c5_completed_1: bool = lvl_mgr.call("has_completed_level", 1)
	print("%s CASE5 level_data_int_value: stars(1)=%d completed(1)=%s  [non-dict value => likely SCRIPT ERROR]" % [
		L, c5_stars_1, str(c5_completed_1)])

	# ---- Case 6: level_data value is a string — robustness probe ----
	_write_save({"highest_level": 3, "level_data": "{\"1\":\"abc\"}"}, true)
	var c6_stars_1: int = lvl_mgr.call("get_level_stars", 1)
	print("%s CASE6 level_data_string_value: stars(1)=%d  [non-dict value => likely SCRIPT ERROR]" % [L, c6_stars_1])

	# ---- Case 7: level_data is corrupt JSON (unparseable) ----
	_write_save({"highest_level": 3, "level_data": "{not valid json"}, true)
	var c7_unlocked: int = lvl_mgr.call("get_unlocked_levels")
	var c7_stars_1: int = lvl_mgr.call("get_level_stars", 1)
	print("%s CASE7 level_data_corrupt_json: unlocked=%d stars(1)=%d  [unparseable => {} fallback]" % [
		L, c7_unlocked, c7_stars_1])
	var c7_ok = (c7_unlocked == 3) and (c7_stars_1 == 0)
	print("%s CASE7 verdict: %s" % [L, "PASS" if c7_ok else "FAIL"])

	# ---- cleanup ----
	_delete_save()

	print("%s === save-file migration test complete ===" % L)
	quit(0)


# =============================================================================
# Helpers
# =============================================================================
func _autoload(name: String) -> Node:
	var r := self.root
	if r == null:
		return null
	var n := r.get_node_or_null(NodePath("/root/" + name))
	return n


func _write_save(values: Dictionary, with_level_data_key: bool = false) -> void:
	# ConfigFile.set_value(section, key, value) — no set_section in Godot 4.
	var config := ConfigFile.new()
	for k in values:
		config.set_value("progress", k, values[k])
	var err := config.save(SAVE_PATH)
	if err != OK:
		push_error(L + " _write_save failed: " + str(err))


func _delete_save() -> void:
	# DirAccess.delete() needs an absolute path (user:// not accepted).
	var abs := ProjectSettings.globalize_path(SAVE_PATH)
	if FileAccess.file_exists(abs):
		var dir := DirAccess.open(abs.get_base_dir())
		if dir:
			var derr: int = dir.delete(abs)
			if derr != OK:
				push_error(L + " _delete_save failed: " + str(derr))
