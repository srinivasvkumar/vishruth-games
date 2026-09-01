#!/usr/bin/env python3
"""Capture exact SCRIPT ERROR lines for the 4 malformed save cases."""
import subprocess
import os

CASES = [
    "level_data_int_value",
    "level_data_string_value",
    "level_data_float_value",
    "level_data_corrupt",
]
SCRIPT = "tests/fixtures/m5_save_migration.gd"

for case in CASES:
    env = dict(os.environ)
    env["M5_SAVE_CASE"] = case
    proc = subprocess.run(
        ["./bin/godot", "--headless", "--script", SCRIPT],
        capture_output=True, text=True, timeout=120, env=env,
    )
    out = proc.stdout + "\n" + proc.stderr
    print(f"=== {case} ===")
    seen = set()
    for line in out.splitlines():
        if "SCRIPT ERROR" in line or "ERROR: Parse JSON" in line:
            if line not in seen:
                seen.add(line)
                print("  ", line.strip())
    print()
