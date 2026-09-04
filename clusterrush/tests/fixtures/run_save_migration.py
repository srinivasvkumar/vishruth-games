#!/usr/bin/env python3
"""M5 Task 4 driver — run each save-migration case in its own godot process,
count SCRIPT ERROR lines, and print a per-case verdict + overall summary."""
import subprocess
import sys
import os

CASES = [
    "fresh",
    "legacy_old_save",
    "empty_progress",
    "level_data_empty",
    "level_data_modern",
    "level_data_int_value",
    "level_data_string_value",
    "level_data_float_value",
    "level_data_corrupt",
    "highest_out_of_range",
]

SCRIPT = "tests/fixtures/m5_save_migration.gd"


def main() -> int:
    rows = []
    for case in CASES:
        env = dict(os.environ)
        env["M5_SAVE_CASE"] = case
        proc = subprocess.run(
            ["./bin/godot", "--headless", "--script", SCRIPT],
            capture_output=True,
            text=True,
            timeout=120,
            env=env,
        )
        out = proc.stdout + "\n" + proc.stderr
        script_errors = out.count("SCRIPT ERROR")
        verdict_line = ""
        for line in out.splitlines():
            if "M5SAVE" in line and "case" in line:
                verdict_line = line
        read_path_ok = "read-path ok" in verdict_line
        ok = script_errors == 0 and read_path_ok
        rows.append((case, script_errors, ok, verdict_line))
        print(f"{case:26s} script_errors={script_errors:<3} "
              f"{'PASS' if ok else 'FAIL'}   {verdict_line.strip()}")
    failed = [r for r in rows if not r[2]]
    print("=" * 70)
    if failed:
        print(f"SAVE MIGRATION: FAIL — {len(failed)}/{len(rows)} case(s) misbehave:")
        for case, se, _, v in failed:
            print(f"  - {case}: {se} script errors | {v}")
        return 1
    print(f"SAVE MIGRATION: PASS — all {len(rows)} legacy/degraded save "
          "formats loaded without SCRIPT ERROR")
    return 0


if __name__ == "__main__":
    sys.exit(main())
