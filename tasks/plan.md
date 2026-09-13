# Implementation Plan: Cluster Rush D0.2 Resume — task 0.2.2 re-decomposition

## Overview
Week 0, Day 0.2: 0.2.1 is COMPLETE (commit 793ddb5 — alias fix, INVENTORY.md rebuilt, D0.2 RED-allowlist pre-commit gate).
0.2.2's RED evidence is committed at 4edf450 (full 325-line T2-red-analysis.md; gate was NOT formally closed;
tracker PAUSED by user 2026-09-10 21:53 AEST). This plan re-decomposes the remaining D0.2 work from ground
truth per TDD_PLAN.md "TASK DECOMPOSITION PRINCIPLES (NEW)": 9 tasks, all S/M sized (<=5 files each),
one deterministic serial lane. No monoliths. Created 2026-09-11 by orchestrator (boss NEW ORDER).

## Ground truth (verified 2026-09-11)
- Git HEAD: 4edf450 (T2 RED evidence + analysis, committed by game-tester AFTER the pause commit 3cc636a).
- Working tree: `M TDD_PLAN.md` only — the uncommitted "TASK DECOMPOSITION PRINCIPLES (NEW)" section
  left by game-dev's T1 session (preserve, do not rewrite).
- RED state (T2-red.txt, committed): 13/13 files in run; 0 alias-class collection errors;
  267 tests = 173 pass / 90 fail / 4 skip; 1 documented file-level RED: tests/unit/game.test.ts
  (imports missing @/systems/Audio + @/systems/UI; src/core/Game.ts:4-5 import the same).
- Allowlist (.husky/red-allowlist.txt): 2 PERMANENT (hello-three, mock-strategy) + 8 TEMP-D0.2-T1
  (constants, game-loop, game, obstacle, physics-system, player, retroactive-core, scene-manager).
  T2 classification: all 8 TEMP files owned by 0.2.2 GREEN; mock-strategy currently GREEN (entry inert).
- Auto-decomposer incident: 17 non-orchestrator tasks (created_by=auto-decomposer, implementer/reviewer/
  researcher) were auto-spawned over this board and archived at user approval. Not part of this plan.

## Architecture decisions
- D1: Serial lane R -> G1 -> G2 -> G3 -> G4 -> G5 -> G6 -> GV -> QG. G2 edits shared mocks
  (mock-cannon/mock-three) used by G3-G5, so a parallel tail is unsafe; same-assignee tasks are
  serialized by the profile concurrency limit anyway.
- D2: G1 creates minimal src/systems/Audio.ts + UI.ts stubs — the ONLY production change in 0.2.2,
  justified by pre-existing RED in game.test.ts (TDD-legitimate GREEN). Flagged to boss for sanity-check.
- D3: Each GREEN task removes exactly the TEMP allowlist entries for the files it fixes; GV asserts the
  allowlist == exactly the 2 PERMANENT entries. NO new TEMP entries (boss ruling). No --no-verify, ever.
- D4: RED gate (R, game-tester) completes BEFORE any GREEN task becomes ready (dependency-enforced).
- D5: CREATE-DO-NOT-DISPATCH: all tasks created in todo/blocked; nothing runs until the user's resume
  signal (orchestrator unblocks R).

## Task list
- [ ] R: T0.2.2a RED gate closure — verify committed RED evidence, lift PAUSE (game-tester) — parent: none
- [ ] G1: Align game.test.ts + minimal Audio/UI stubs (make src/core/Game loadable) (game-dev) — parent R
- [ ] G2: Align obstacle + physics-system tests (mock-cannon/mock-three divergence) (game-dev) — parent G1
- [ ] G3: Align retroactive-core.test.ts (46 cross-cutting tests) (game-dev) — parent G2
- [ ] G4: Align scene-manager + game-loop tests (game-dev) — parent G3
- [ ] G5: Align constants + player tests (game-dev) — parent G4
- [ ] G6: New retroactive tests for coverage gaps (AssetLoader, scenes, index) (game-dev) — parent G5
- [ ] GV: T0.2.2b GREEN + final D0.2 verification (game-tester) — parent G6
- [ ] QG: D0.2 quality gate + sign-off (reviewer) — parent GV

## Checkpoints
- After R: RED gate closed (GATE DECISION appended), PAUSE lifted, tracker 0.2.2 = red_verified / ACTIVE.
- After G1-G5: every TEMP allowlist entry removed (G1:game, G2:obstacle+physics, G3:retroactive-core,
  G4:scene-manager+game-loop, G5:constants+player); each task commits scoped GREEN + allowlist diff.
- After G6: coverage gaps (AssetLoader, Scene/BootScene/GameScene, index) have passing tests.
- After GV: allowlist invariant (exactly 2 PERMANENT), full suite GREEN except hello-three (1 intentional
  RED), coverage recorded, RED->GREEN delta documented, tracker green_verified.
- After QG: D0.2 sign-off committed, tracker 0.2.2 = completed, current_status = D0.2-COMPLETE.

## Risks and mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| G1 stubs grow into feature work | High | G1 limited to API surface Game.ts imports; escalation rule on scope creep |
| G2 mock edits ripple into other tests | Med | G2 runs before G3-G5; each GREEN task does a full-run delta check |
| Pre-commit hook blocks a GREEN commit | Med | Task removes its own TEMP entries; escalate on block, never --no-verify |
| Unclassified failure surfaces at GV | Med | GV hard criteria + STOP-escalate rule (no tester-side test edits) |
| Resume auto-dispatch | High | R created then immediately block --kind needs_input; verify 0 ready/running |

## Open questions
- Boss sanity-check on D2 (G1 src stubs) — flagged in the 2026-09-11 plan report.

---
# Week 1 Lane — COMPLETE (2026-09-13, sign-off 7e23596)

## Lane
W1-A (Renderer TDD-1.3) → W1-B (allowlist closure, requires A) ∥ W1-C (gap-fill) ∥ W1-S (stability) → W1-D (sign-off, requires B+C+S)
Plus W1-INFRA (node_modules untrack) inserted mid-lane per boss ruling.

## Outcome
- Coverage 93.38% (target 50%+) · 387/387 tests green · flake-free (20x+5x verified)
- RED allowlist fully closed; pre-commit gate restored to full-suite (npm run test:run)
- Known issues carried to W2: KI-1 (Renderer 0% in sign-off run — since resolved, now 100%),
  KI-4 (barrel/type-only files at 0% — accepted), KI-5 (duplicate commit subjects — cosmetic)

## Tracker maintenance
Per boss rule 2026-09-13: every completed task MUST update the trackers
(tracker/task_registry.json, tracker/tdd_tracker_config.json, tasks/plan.md, tasks/todo.md)
in the same commit as its evidence. W1-D's late scope addendum was superseded by this rule.
