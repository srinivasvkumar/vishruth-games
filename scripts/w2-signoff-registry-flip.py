#!/usr/bin/env python3
"""W2-E.3: find + complete the Week-2 sign-off entry in task_registry.json."""
import json

NOW = "2026-09-14T08:45:00"
reg = json.load(open('tracker/task_registry.json'))

touched = []
for t in reg.get("tasks", []):
    blob = json.dumps(t).lower()
    is_w2 = "w2" in blob or "week 2" in blob or "week-2" in blob
    if not is_w2:
        continue
    label = t.get("name") or t.get("description") or t.get("id")
    print(f"W2 task: id={t.get('id')} status={t.get('status')} label={str(label)[:70]}")
    if "sign" in blob and "off" in blob.replace("signoff", "sign off"):
        t["status"] = "complete"
        t["completed_at"] = NOW
        t["completion_note"] = (
            "W2 sign-off verified by reviewer 2026-09-14: 7/7 Week-2 success criteria "
            "confirmed via fresh runs in .worktrees/t_bcf744c5-signoff. Evidence: "
            "tests/evidence/w2/W2-E3-verify-probe.txt, w2-e3-localstorage.txt, "
            "w2-e3-shield.txt, w2-signoff.md; tracker/tdd_tracker_config.json "
            "current_status.completion_notes."
        )
        touched.append(t.get("id"))

if touched:
    with open('tracker/task_registry.json', 'w') as f:
        json.dump(reg, f, indent=2, ensure_ascii=False)
        f.write('\n')
print("touched:", touched or "(no W2 sign-off entry needed flip; w2_signoff block already recorded)")
