# T0.2.2a — RED Verification Analysis (pre-GREEN gate, Cluster Rush D0.2)

- **Task**: T0.2.2a — RED verification before any 0.2.2 GREEN work (kanban `t_c30cb0cb`)
- **Repo**: `/home/srinivasvkumar/vishruth/games/clusterrush`
- **Tree state at run**: `793ddb5` (T0.2.1, unpushed) + untracked T2 evidence. The user's
  pause commit `3cc636ae` (2026-09-10 21:56:55 AEST) landed AFTER this evidence run
  (21:41:42 AEST) and touched only `tracker/task_registry.json` +
  `tracker/tdd_tracker_config.json` — no tests/src/config changes, so this evidence is a
  faithful record of the T0.2.1 tree.
- **Command**: `CI=1 npm run test:run` (= `vitest run --config config/vite.config.ts`)
- **Environment**: vitest v1.6.1, node v22.22.2, happy-dom 20.14.0
- **Raw evidence**: `tests/evidence/d02/T2-red.txt` (full capture; run start 2026-09-10
  21:41:42 AEST). Supersedes the partial untracked `T2-red.txt` from the interrupted first
  attempt referenced in pause commit `3cc636ae` (that partial file was no longer in the tree
  when run 2 started; working tree was clean).

## 1. Collection verification (work item 1) — PASS

- vitest summary: `Test Files 9 failed | 4 passed (13)` — **all 13 test files are recognized
  by vitest and entered the run** (T2-red.txt:1318-1320).
- **0 occurrences of `Failed to load url`** — the T0.2.1 alias-bug collection-error class
  (`Failed to load url @/utils/Constants (resolved id: @/utils/Constants). Does the file
  exist?`, 9 of 13 files before the fix; see `tests/baseline/INVENTORY.md` "Collection
  Status").
- Per-file collection status:

| # | File | Collected | Tests | Status (T2 run) |
|---|------|-----------|-------|-----------------|
| 1 | tests/unit/game.test.ts | file only | 0 | FAILS TO LOAD (documented, see below) |
| 2 | tests/unit/hello-three.test.ts | yes | 11 (1 fail, 4 skip) | FAIL (intentional RED) |
| 3 | tests/unit/mock-strategy.test.ts | yes | 54 | PASS |
| 4 | tests/unit/cicd-pipeline.test.ts | yes | 16 | PASS |
| 5 | tests/unit/input-system.test.ts | yes | 9 | PASS |
| 6 | tests/unit/constants.test.ts | yes | 12 (4 fail) | FAIL |
| 7 | tests/unit/physics-system.test.ts | yes | 12 (12 fail) | FAIL |
| 8 | tests/unit/logger.test.ts | yes | 10 | PASS |
| 9 | tests/unit/scene-manager.test.ts | yes | 20 (6 fail) | FAIL |
| 10 | tests/unit/retroactive-core.test.ts | yes | 46 (37 fail) | FAIL |
| 11 | tests/unit/game-loop.test.ts | yes | 13 (8 fail) | FAIL |
| 12 | tests/unit/obstacle.test.ts | yes | 19 (19 fail) | FAIL |
| 13 | tests/unit/player.test.ts | yes | 45 (3 fail) | FAIL |

- **Documented nuance — `game.test.ts` (0 tests)**: the file is collected as a test file and
  appears in the summary, but 0 of its tests collect because its import chain fails:
  `tests/unit/game.test.ts` line 6-7 imports `@/systems/Audio` and `@/systems/UI` (and
  `@/core/Game` does the same, src/core/Game.ts:4-5), and `src/systems/` contains only
  `Input.ts` and `Physics.ts`. Vitest reports it as a file-level FAIL:
  `Error: Failed to resolve import "@/systems/Audio" from "tests/unit/game.test.ts". Does
  the file exist?` (T2-red.txt:323). This is a **missing source module**, not an alias/
  collection error of the T0.2.1 bug class: the identical error exists at the identical
  position in the T1 evidence (`tests/evidence/d02/T1-green.txt:322-323`), is documented in
  `INVENTORY.md` ("FAILS TO LOAD … `@/systems/Audio` + `@/systems/UI`, which do not exist in
  src/ … pre-existing, out of scope"), and is explicitly tolerated as a `TEMP-D0.2-T1`
  allowlist entry with removal owner T3 (task 0.2.2). It is an expected RED-phase condition
  for the target architecture — **not a work-item-1 block condition**, consistent with the
  T0.2.1 completion claim ("13/13 files collected, 0 collection errors").
- **Verdict**: ZERO collection errors of the T0.2.1 class; 13/13 files in the run; **no
  BLOCK** (no `T2-blocked-collection.txt` required).

## 2. Totals and per-file status (work item 2)

- **Test Files: 9 failed | 4 passed (13)**
- **Tests: 90 failed | 173 passed | 4 skipped (267)**
- **Unhandled errors: 2** — both `TypeError: Failed to execute 'dispatchEvent' on
  'EventTarget': parameter 1 is not of type 'Event'` from `SceneManager.emit`
  (src/core/SceneManager.ts:191, `new CustomEvent(...)` under happy-dom) while running
  `tests/unit/scene-manager.test.ts`. Same condition as the 4 scene-manager test failures in
  §3; not independent failures.
- FAIL blocks in the detailed section: 103 = 90 failing tests + 12 physics-system afterEach
  hook failures + 1 file-level (game.test.ts).

| File | Tests | Passed | Failed | Skipped |
|------|-------|--------|--------|---------|
| constants.test.ts | 12 | 8 | 4 | 0 |
| game-loop.test.ts | 13 | 5 | 8 | 0 |
| game.test.ts | 0 | 0 | 0 (file-level FAIL) | 0 |
| hello-three.test.ts | 11 | 6 | 1 | 4 |
| mock-strategy.test.ts | 54 | 54 | 0 | 0 |
| obstacle.test.ts | 19 | 0 | 19 | 0 |
| physics-system.test.ts | 12 | 0 | 12 | 0 |
| player.test.ts | 45 | 42 | 3 | 0 |
| retroactive-core.test.ts | 46 | 9 | 37 | 0 |
| scene-manager.test.ts | 20 | 14 | 6 | 0 |
| cicd-pipeline.test.ts | 16 | 16 | 0 | 0 |
| input-system.test.ts | 9 | 9 | 0 | 0 |
| logger.test.ts | 10 | 10 | 0 | 0 |
| **Total** | **267** | **173** | **90** | **4** |

- **T1↔T2 consistency**: identical summary (13 files; 90/173/4; 2 unhandled errors; 103 FAIL
  blocks in both captures). `diff tests/evidence/d02/T1-green.txt tests/evidence/d02/T2-red.txt`
  shows only: ANSI color codes (T1 capture uncolored), parallel output ordering, per-file
  timings, and the Start/Duration timestamps. **No flakiness or drift between T1 and T2.**

## 3. RED classification (work item 3)

Legend — **(a)** retroactive desired-behavior failure: expected RED for task **0.2.2
"Retroactive Tests for Existing Code"** (T3; TEMP-D0.2-T1 allowlist entry, removal owner T3).
**(b)** intentional RED: boss-approved PERMANENT allowlist entry owned by a **Week 1** TDD
task (document, do NOT fix in D0.2). **(c)** unexpected failure: flag for orchestrator
review.

### 3.1 File-level classification

| File | Failing (T2) | Class | Owning TDD task | One-line reason |
|------|--------------|-------|-----------------|-----------------|
| tests/unit/constants.test.ts | 4/12 | a | T3 (0.2.2) | Expects `GameEvents.PLAYER_DIED`/`SCORE_CHANGED` + `InputConstants.GAMEPAD_DEADZONE`; impl has `PLAYER_DEATH`/`PLAYER_SCORE`, deadzone on `GameConstants` |
| tests/unit/game-loop.test.ts | 8/13 | a | T3 (0.2.2) | GameLoop lifecycle, fixed-timestep accumulation, update/render callback expectations diverge from implementation |
| tests/unit/game.test.ts | file-level, 0 tests | a | T3 (0.2.2) | Imports missing `src/systems/{Audio,UI}.ts` (itself + via `@/core/Game`) → file-level load failure; expected until target modules exist |
| tests/unit/obstacle.test.ts | 19/19 | a | T3 (0.2.2) | Tests expect an API surface (`position.clone`, static type, getters, destroy, collision) the `Obstacle` class does not expose |
| tests/unit/physics-system.test.ts | 12/12 + 12 afterEach hook fails | a | T3 (0.2.2) | tests/setup mock-cannon divergence; tests expect raycast/collision-event API not on `PhysicsSystem`; afterEach `cleanup()` fails on the same never-created instance |
| tests/unit/player.test.ts | 3/45 | a | T3 (0.2.2) | jump-while-jumping guard, respawn position, health restore on respawn not implemented |
| tests/unit/retroactive-core.test.ts | 37/46 | a | T3 (0.2.2) | Cross-cutting RED assertions: class structure, constants values, `require()` module-existence, three/cannon integration |
| tests/unit/scene-manager.test.ts | 6/20 | a | T3 (0.2.2) | happy-dom `CustomEvent` dispatch throws in `emit()` + update/render spy expectations |
| tests/unit/hello-three.test.ts | 1/11 (+4 skip) | b | **TDD-1.3** "Three.js rendering test" (Week 1, day 1) | Intentional RED placeholder `expect(false).toBe(true)` "should create a WebGL renderer (RED phase)"; PERMANENT allowlist entry |
| tests/unit/mock-strategy.test.ts | 0/54 (all pass) | b | **TDD-1.1** "Initialize project with testing infrastructure" (Week 1, day 1) | Intentional-RED file per boss spec; currently GREEN — entry inert, re-validated at TDD-1.1 |

### 3.2 All 90 failing tests (suite > test), by file

**tests/unit/constants.test.ts (4) — class a, T3 (0.2.2)**
| Test | One-line reason |
|------|-----------------|
| InputConstants > should have GAMEPAD_DEADZONE defined | `InputConstants.GAMEPAD_DEADZONE` undefined (deadzone lives on `GameConstants`) |
| InputConstants > should have valid deadzone value | deadzone undefined → `expected number/bigint, received undefined` |
| GameEvents > should have PLAYER_DIED event defined | impl exports `PLAYER_DEATH`, test expects `PLAYER_DIED` |
| GameEvents > should have SCORE_CHANGED event defined | impl exports `PLAYER_SCORE`, test expects `SCORE_CHANGED` |

**tests/unit/game-loop.test.ts (8) — class a, T3 (0.2.2)**
| Test | One-line reason |
|------|-----------------|
| Fixed Time Step > should accumulate time for fixed updates | accumulator behavior diverges from implementation |
| Fixed Time Step > should use 60 FPS as default | default step/FPS expectation not met |
| Lifecycle > should not start if already running | guard behavior not implemented |
| Lifecycle > should start the loop | start() side-effects expectation not met |
| Lifecycle > should stop the loop | stop() expectation not met |
| Update and Render Callbacks > should call render callback each frame | render callback not invoked as expected |
| Update and Render Callbacks > should call update callback with deltaTime | update(deltaTime) not invoked as expected |
| Update and Render Callbacks > should pass deltaTime to update | deltaTime passthrough expectation not met |

**tests/unit/game.test.ts (file-level; 0 tests) — class a, T3 (0.2.2)**
| Item | One-line reason |
|------|-----------------|
| file-level FAIL (load) | `Failed to resolve import "@/systems/Audio"` (+ `@/systems/UI`) — modules absent from src/ by design at this phase |

**tests/unit/hello-three.test.ts (1, +4 skipped) — class b, TDD-1.3**
| Test | One-line reason |
|------|-----------------|
| Three.js Integration - TDD Setup Verification > should create a WebGL renderer (RED phase) | Intentional `expect(false).toBe(true)` placeholder; turns green with real renderer integration in TDD-1.3 |

**tests/unit/obstacle.test.ts (19) — class a, T3 (0.2.2)**
| Test | One-line reason |
|------|-----------------|
| Initialization > should create Obstacle instance | `position.clone is not a function` — ctor API mismatch |
| Initialization > should create obstacle at specified position | ctor API mismatch |
| Initialization > should set obstacle type | type API not exposed |
| Initialization > should be active by default | active-flag API not exposed |
| Obstacle Types > should support static type | `position.clone` ctor failure (all type tests) |
| Obstacle Types > should support moving type | ctor failure |
| Obstacle Types > should support rotating type | ctor failure |
| Obstacle Types > should support breakable type | ctor failure |
| Obstacle Types > should support spike type | ctor failure |
| Movement > should update position | movement API mismatch |
| Movement > should handle different movement patterns | movement API mismatch |
| Collision > should detect collision | collision API mismatch |
| Collision > should return true for close positions | collision API mismatch |
| Getters > should provide position | `getPosition`-style getter not exposed |
| Getters > should provide type | getter not exposed |
| Getters > should provide mesh access | getter not exposed |
| State Management > should activate obstacle | activate API not exposed |
| State Management > should deactivate obstacle | deactivate API not exposed |
| State Management > should destroy obstacle | destroy API not exposed |

**tests/unit/physics-system.test.ts (12) — class a, T3 (0.2.2)**
| Test | One-line reason |
|------|-----------------|
| Initialization > should create PhysicsSystem instance | `Cannot read properties of undefined (reading 'set')` — mock/setup divergence, instance never created |
| Initialization > should initialize physics world | same undefined-instance divergence |
| Initialization > should set gravity | same |
| Body Management > should add body to world | same |
| Body Management > should remove body from world | same |
| Physics Updates > should update physics with deltaTime | same |
| Physics Updates > should handle multiple updates | same |
| Physics Updates > should handle variable deltaTime | same |
| Raycasting > should perform raycast | raycast API not on PhysicsSystem |
| Collision Detection > should handle collision events | collision-event API not on PhysicsSystem |
| Cleanup > should cleanup physics world | same |
| Cleanup > should remove all bodies on cleanup | same |
| *(+ 12 afterEach hook failures)* | afterEach `cleanup()` throws `reading 'cleanup'` on the same undefined instance — same RED condition, counted in the 103 FAIL blocks, not the 90 test failures |

**tests/unit/player.test.ts (3) — class a, T3 (0.2.2)**
| Test | One-line reason |
|------|-----------------|
| Jump Mechanics > should not jump when already jumping | jump-while-jumping guard not implemented |
| Respawn > should respawn at specified position | respawn-position behavior not implemented |
| Respawn > should restore health on respawn | health-restore-on-respawn not implemented |

**tests/unit/retroactive-core.test.ts (37) — class a, T3 (0.2.2)**
| Test | One-line reason |
|------|-----------------|
| Game Core Architecture > should have Game class structure | expected structure/exports not present |
| Game Core Architecture > should have GameLoop class structure | expected structure not present |
| Game Core Architecture > should have SceneManager class structure | expected structure not present |
| Game Core Architecture > should have InputSystem class structure | expected structure not present |
| Game Core Architecture > should have PhysicsSystem class structure | expected structure not present |
| Game Core Architecture > should have Player class structure | expected structure not present |
| Game Core Architecture > should have Obstacle class structure | expected structure not present |
| Game Core Architecture > should have Constants module | expected module shape not present |
| Game Core Architecture > should have Logger module | expected module shape not present |
| GameConstants Values > should have PLAYER_HEALTH constant | constant value/shape mismatch |
| GameConstants Values > should have PLAYER_LIVES constant | same |
| GameConstants Values > should have PLAYER_SPEED constant | same |
| GameConstants Values > should have JUMP_FORCE constant | same |
| GameConstants Values > should have GRAVITY constant | same |
| GameConstants Values > should have OBSTACLE_TYPES array | same |
| GameEvents Values > should have LEVEL_START event | event naming/shape mismatch |
| GameEvents Values > should have PLAYER_DIED event | `PLAYER_DEATH` vs `PLAYER_DIED` |
| GameEvents Values > should have SCORE_CHANGED event | `PLAYER_SCORE` vs `SCORE_CHANGED` |
| InputConstants Values > should have GAMEPAD_DEADZONE constant | deadzone on `GameConstants`, not `InputConstants` |
| Logger Functionality > should have info method | `require('../../src/utils/Logger')` — module path/shape not found as expected |
| Logger Functionality > should have warn method | same |
| Logger Functionality > should have error method | same |
| Logger Functionality > should have debug method | same |
| Logger Functionality > should accept message and optional data | same |
| Three.js Integration > should create WebGLRenderer | three integration assertion fails under happy-dom |
| Cannon-es Integration > should create Box shape | cannon `new Box(...)` argument/expectation mismatch |
| Game Architecture Patterns > should follow component-based architecture | `require('../../src/core/Game')` MODULE_NOT_FOUND |
| Game Architecture Patterns > should have proper module separation | `require('../../src/core/Game')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify Game.ts exists and is importable | `require('../../src/core/Game')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify GameLoop.ts exists and is importable | `require('../../src/core/GameLoop')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify SceneManager.ts exists and is importable | `require('../../src/core/SceneManager')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify Input.ts exists and is importable | `require('../../src/systems/Input')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify Physics.ts exists and is importable | `require('../../src/systems/Physics')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify Player.ts exists and is importable | `require('../../src/entities/Player')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify Obstacle.ts exists and is importable | `require('../../src/entities/Obstacle')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify Constants.ts exists and exports all constants | `require('../../src/utils/Constants')` MODULE_NOT_FOUND |
| Retroactive Test Coverage Verification > should verify Logger.ts exists and exports Logger | `require('../../src/utils/Logger')` MODULE_NOT_FOUND |

**tests/unit/scene-manager.test.ts (6, +2 unhandled rejections) — class a, T3 (0.2.2)**
| Test | One-line reason |
|------|-----------------|
| Scene Loading > should load a registered scene | happy-dom: `CustomEvent` not accepted by `dispatchEvent` in `SceneManager.emit` |
| Scene Loading > should pass data to scene load | same |
| Scene Loading > should exit current scene before loading new one | same |
| Scene Loading > should set previous scene when loading new scene | same |
| Scene Updates > should update current scene | `update(0.016)` spy not called (mock wiring) |
| Scene Rendering > should render current scene | `render()` spy not called (mock wiring) |
| *(+ 2 unhandled rejections)* | same `dispatchEvent`/`CustomEvent` happy-dom condition, attributed to this file by vitest |

### 3.3 Class (c) — unexpected failures

**NONE.** Every failing file (9) is on the D0.2 RED allowlist: 8 as `TEMP-D0.2-T1`
(constants, game-loop, game, obstacle, physics-system, player, retroactive-core,
scene-manager) + 1 as PERMANENT (hello-three). No failing file outside the allowlist; no
failure new relative to T1 (T1 ≡ T2, §2). Nothing flagged for orchestrator review as a
possible genuine bug; no fixes attempted (constraint: verification only).

## 4. D0.2 RED allowlist verification (spec addendum, boss ruling (b))

**(a) Allowlist file — PASS.** `.husky/red-allowlist.txt` exists, is version-controlled
(`git ls-files` confirms tracked, committed in `793ddb5`), and lists **exactly** the 2
intentional-RED files as PERMANENT entries — `tests/unit/hello-three.test.ts`,
`tests/unit/mock-strategy.test.ts` — plus the 8 boss-approved TEMP entries, each explicitly
marked `TEMP-D0.2-T1` and carrying a removal instruction ("removal owner: T3"):
constants (4/12 failing at T1), game-loop (8/13), game (0 tests — load failure), obstacle
(19/19), physics-system (12/12), player (3/45), retroactive-core (37/46), scene-manager
(6/20). No wildcards/globs — the gate checker enforces `^tests/[\w.-]+/[\w.-]+\.test\.ts$`
per line and blocks on any malformed entry.

**(b) Header comments on allowlisted files — PASS.** Both PERMANENT files carry a
`RED-ALLOWLISTED` header (added in `793ddb5`): `hello-three.test.ts` states why RED
(intentional `expect(false)` placeholder + 4 skipped stubs) and which Week 1 task turns it
green (TDD-1.3 "Three.js rendering test", Week 1 day 1); `mock-strategy.test.ts` states why
listed (boss-spec safety net; all 54 green at T1, entry currently inert) and which Week 1
task re-validates/turns it green (TDD-1.1 "Initialize project with testing infrastructure",
Week 1 day 1). Both also point at the allowlist file, INVENTORY.md, and the tracker.

**(c) retroactive-core.test.ts not a permanent entry — PASS.** It appears ONLY in the TEMP
section as `TEMP-D0.2-T1: 37/46 failing at T1 — cross-cutting RED assertions …; removal
owner: T3`. The PERMANENT section contains only the 2 intentional-RED files.

**(d) .husky/pre-commit runs full suite + lint — PASS (with documented D0.2 carve-out).**
`.husky/pre-commit` = `node scripts/red-gate-check.mjs`, which: (1) runs the **FULL vitest
suite** (`npx vitest run --config config/vite.config.ts`) — allowlisted files are still RUN,
their failures merely tolerated; (2) runs the **lint stage** (`npm run lint`) — reported but
**NOT a commit-gate during D0.2** due to a pre-existing defect (ESLint 8.57.1 cannot load the
flat-format `config/eslint.config.js` via `--config`; flagged by T0.2.1, needs a boss infra
decision — see §5); (3) blocks the commit ONLY if a failing test file is not allowlisted,
with fail-safe parse checks (unparseable summary → block; parsed failing-file count <
summary count → block). This replaces the plain `npx lint-staged` for D0.2 only; the
lint-staged config in package.json (`*.ts` → `test:run` + `lint`) remains, so full-suite +
lint coverage is unchanged (the gate's full-suite run is in fact broader than lint-staged's
staged-file scope). Restoration procedure is documented in the allowlist header: when the
entry list is empty, restore `npx lint-staged`, delete the allowlist + gate script, record
in the tracker. T4 must assert the list == exactly the 2 PERMANENT files.
- Standalone gate check at run time: `node scripts/red-gate-check.mjs` → **exit 0, PASS** —
  "suite result: 9 failing file(s) | allowlisted (tolerated): 9 | not allowlisted
  (blocking): 0 … Commit allowed." (lint stage crashed as expected, reported, non-gating).
  The pre-commit hook re-runs the same gate on the T2 evidence commit (work item 5).

## 5. Flags to orchestrator

1. **Lint infra defect (pre-existing, unchanged since T1)**: `npm run lint` crashes
   (ESLint 8.57.1 vs flat config). Gate reports but does not gate during D0.2. Needs a boss
   infra decision (ESLint 9 upgrade or eslintrc reformat).
2. **Pause context**: the user paused D0.2 at 21:53–21:56 AEST (tracker-only commit
   `3cc636ae`: "resume decision 2026-09-11"). This T2 run (run 2) was dispatched before that
   commit and the task was not re-blocked on the board; remaining D0.2 kanban tasks
   (`t_4d56647c` — child of this task, `t_e79a4a24`, `t_7827b26c`) remain held in triage per
   that commit. This evidence predates and is unaffected by the pause commit (tracker-only
   diff).
3. **No class-(c) unexpected failures**; no flakiness observed (T1 ≡ T2).

## 6. Verdict (work items 1–4)

- **W1 (collection)**: PASS — 0 `Failed to load url` errors, 13/13 files in run;
  `game.test.ts` 0-test state documented as expected/allowlisted RED (owner T3), not a
  collection error. No BLOCK.
- **W2 (counts)**: 267 tests = 173 pass / 90 fail / 4 skip; 9 files failed | 4 passed (13);
  2 unhandled errors (scene-manager).
- **W3 (classification)**: (a) 89 test failures + game.test.ts file-level load + 12
  physics-system afterEach hook fails + 2 scene-manager unhandled rejections — all owned by
  T3 (task 0.2.2); (b) hello-three 1 test (+4 skip), owner TDD-1.3, and mock-strategy
  0 failing (54 green, entry inert), owner TDD-1.1; (c) 0.
- **W4 (evidence)**: this file + `tests/evidence/d02/T2-red.txt`.
- **W5 (commit)**: committed with this evidence (pre-commit gate re-run on commit; standalone
  pre-check exit 0 — §4(d)).

## 4. GATE DECISION (2026-09-11 resume)

**RED gate = PASS** — 0 alias-class collection errors; 13/13 files in the run; 1 documented
file-level RED (game.test.ts: missing src/systems/{Audio,UI}.ts, also imported by
src/core/Game.ts:4-5 — owned by G1); all 90 failing tests classified (8 files class-a owned
by 0.2.2 GREEN tasks G1-G5; hello-three class-b PERMANENT; mock-strategy class-b, currently
GREEN/inert); no BLOCK. GREEN tasks G1-G6 may proceed.

Re-verification for this closure (task R, kanban `t_275659a6`, game-tester, 2026-09-11 09:47
AEST, tree HEAD `4edf450`):
- `CI=1 npm run test:run > tests/evidence/d02/T2-red-reverify.txt 2>&1`
- Summary identical to T2-red.txt: `Test Files 9 failed | 4 passed (13)`;
  `Tests 90 failed | 173 passed | 4 skipped (267)`; `Errors 2 errors`.
- Programmatic diff (ANSI-stripped): all 13 per-file report lines match; the 90-test FAIL set
  is identical; 2 unhandled rejections (scene-manager, same condition); 0 `Failed to load
  url`; the documented game.test.ts `@/systems/Audio` load failure present in both captures.
- Tolerated diffs only: ANSI coloring, parallel output ordering, per-file timings,
  Start/Duration timestamps.
- BLOCK condition (alias-class collection error) NOT triggered — no T2-blocked-collection.txt
  written.
