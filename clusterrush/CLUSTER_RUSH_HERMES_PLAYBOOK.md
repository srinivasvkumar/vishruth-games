# AUTHORITATIVE SINGLE DOCUMENT — CLUSTER RUSH HERMES BOSS EXECUTION PLAYBOOK

## Cluster Rush — Hermes Multi-Agent Execution Playbook

**Purpose:** an execution layer over the existing Cluster Rush PLAN.md and test-plan/task_plan.md. Boss Bot must use the named Hermes specialists, execute the existing plan in order, and reach a verified working game without scope drift.

---

### 1. Authoritative Source & Rules

The repository remains the source of truth. PLAN.md defines the M0–M5 milestones, team ownership, fixed Spec → Test → Code → Build → QA → Review pipeline, evidence requirements, and the authoritative level difficulty table. test-plan/task_plan.md defines 165 feature tests plus 75 cross-cutting tests (240 total), their execution order, evidence protocol, defect ledger, and exit criteria.

- Spec first; no feature code without a spec (P0 emergency fixes may carry a short spec comment).
- Test before code for L3-visible behavior.
- One feature In Progress per profile.
- GDScript only.
- Do not commit build artifacts outside the designated deployment output.
- Real tool output and evidence are required before completion.
- No milestone advances without a green gate and Reviewer sign-off.

### 2. Explicit Team Ownership

### 3. Non-Negotiable Boss Behavior

- Before substantive game work, Boss MUST test the communication/execution path for every required specialist. If an agent cannot execute, resolve the Hermes/profile issue; do not silently replace that agent.
- Boss must issue concrete assignments using Task ID, owner, milestone, objective, dependencies, files/areas, exact actions, expected output, evidence, and handoff condition.
- Boss must not perform a specialist's assigned work merely because it is faster.
- Parallel work is allowed only when file and dependency conflicts are absent.
- An Implementer never self-approves a behavioral fix. Game Tester verifies; Reviewer challenges.
- An agent's statement such as 'looks good', 'should work', or 'fixed' is not evidence.
- Blocked is not PASS. Unexecuted is not PASS.
- Unrelated improvements go into the backlog and do not derail the current milestone.
- Current milestone gates are mandatory. If a gate fails, stay in that milestone until dispositioned.
- READY — VERIFIED is forbidden until final acceptance criteria are met.

### 4. Phase 0 — Team Health Gate

Run these assignments first. This phase exists specifically to prevent Boss from working alone.

**Known repository blocker to re-check:** task_plan.md records reviewer as unstaffed because ~/.hermes/profiles/reviewer/config.yaml contains an invalid messaging toolset entry. Treat the live configuration as authoritative and repair it before relying on Reviewer.

### 5. Required Task Handoff Format

Every Boss assignment must contain:

```
TASK ID | OWNER | MILESTONE | OBJECTIVE | SOURCE OF TRUTH | DEPENDENCIES | FILES/AREAS | EXACT ACTIONS | DO NOT CHANGE | EXPECTED OUTPUT | REQUIRED EVIDENCE | HANDOFF CONDITION
```

Every agent response must contain: status (DONE/BLOCKED/FAILED), actions performed, files changed, commands run, exit codes, evidence paths, defects found, and recommended next owner.

### 6. M0 — Test Foundation

### 7. M1 — 35 Levels That Actually Load

### 8. M2 — Gameplay Core

### 9. M3 — Ship-Quality Build

### 10. M4 — Performance & Polish

### 11. M5 — 35-Level Content + Final QA

### 12. Cross-Cutting Test Ownership

### 13. Defect Routing

The current ledger D1–D19 must be handled as tracked defects, not informal observations. Examples include:
- Retry state reset
- Double-bound pause
- Inaccessible pause key
- Hazard transition race
- Star formula
- Start Game not calling start_level
- Auto-run momentum overwrite
- Audio stub
- HUD allocation churn
- Wall-clock timing
- Missing final score
- Credits trap
- And the listed P2 issues.

### 14. Exact Test Execution Order

**Phase 0:** R1–R8 smoke gate.

**Phase 1 P0 spine:** F001 → F002 → F003 → F004 → F005 → F007 → F010 → F011 → F012 → F013 → F014 → F016 → F019 → F026 → F027 → B-01…05 → E-01…04.

**Phase 2 P1:** F006, F008, F009, F015, F017, F018, F020, F023, F025 → B-06…09 → E-05…12 → P-01…06 → A-01…08 → X-01…08.

**Phase 3 P2 + soak:** F021, F022, F024 → P-07…10 → F025-04 → 30-minute soak.

After every fix: rerun the original failing test, then its related regression set before closing the defect.

### 15. Evidence Protocol

- Screenshot at every PASS/FAIL decision point where visual state matters, named F0XX-YY_state.png.
- Console capture for every state transition/runtime-error investigation.
- Network waterfall for F001.
