# Cluster Rush - Code Inventory

## Overview
- **Generated**: 2026-09-10 (T0.2.1 refresh — replaces 2026-09-08 stale version)
- **Total Source Files**: 18 (.ts under src/)
- **Total Test Files**: 16 (tests/unit/*.test.ts) + 2 setup files (tests/setup/)
- **T1 evidence run**: `npm run test:run` @ 2026-09-10T20:48 AEST — 13/13 test files collected, **zero "Failed to load url" collection errors**, 267 tests: 173 pass / 90 fail / 4 skip (RED-phase expected failures; evidence: `tests/evidence/d02/T1-green.txt` — this run is the derivation source for the TEMP-D0.2-T1 allowlist entries). **D0.2 QG rerun**: 2026-09-11T21:57 AEST — 16/16 collected, 353 tests: 348 pass / 1 fail (intentional RED) / 4 skip (evidence: `tests/evidence/d02/QG-rerun.txt`)

## Technology Stack
- **Language**: TypeScript
- **Build Tool**: Vite
- **Testing Framework**: Vitest (config: `config/vite.config.ts`)
- **3D Engine**: Three.js v0.162.0
- **Physics Engine**: Cannon-es v0.20.0
- **Test Environment**: happy-dom
- **E2E**: Playwright 1.62.0 (`tests/e2e/`: boot.smoke.spec.ts, physics-sync.spec.ts, audio.spec.ts, smoke.spec.ts — 4 spec files, 9 tests total)

## Files by Category
| Category | Count |
|----------|-------|
| core | 4 |
| entities | 2 |
| other (src root) | 1 |
| scenes | 3 |
| systems | 2 |
| types | 1 |
| utils | 3 |

## Source Files (verified against disk 2026-09-10)

| File | Role |
|------|------|
| `src/core/Game.ts` | `Game` class — main orchestrator: owns SceneManager/Input/Physics/Audio/UI systems, game-loop start/pause/resume/stop, event emission via CustomEvent. NOTE: imports `@/systems/Audio` and `@/systems/UI` which DO NOT EXIST on disk (pre-existing gap). |
| `src/core/GameLoop.ts` | `GameLoop` class — fixed-timestep (60 FPS default) update/render scheduler via requestAnimationFrame, time accumulation, setFrameRate(). |
| `src/core/SceneManager.ts` | `SceneManager` class — scene registry (register/unregister), async loadScene with queue + fallback to previous scene, update/render current scene, cleanup. Emits GameEvents.LEVEL_START. |
| `src/core/index.ts` | Barrel re-exports: Game, GameLoop, SceneManager. |
| `src/entities/Obstacle.ts` | `Obstacle` class — typed obstacle entity (block/spike/moving/rotating/breakable) with per-type damage, sin-based movement, Y-rotation, activate/deactivate. Exports `ObstacleType`. |
| `src/entities/Player.ts` | `Player` class — WASD/arrow movement, jump, gravity, ground clamp, damage/heal/score/power-ups, death+respawn, health/lives state. |
| `src/index.ts` | App bootstrap — default GameConfig, initGame(), window resize/visibility/beforeunload handlers, error screen, ?debug=true logging level. |
| `src/scenes/Scene.ts` | Abstract `Scene` base class — THREE.Scene/camera/renderer ownership, load/enter/update/exit/cleanup/render lifecycle, protected abstract hooks. |
| `src/scenes/BootScene.ts` | `BootScene` — loading UI (progress bar divs), THREE.LoadingManager wiring, auto-transition to 'menu' scene. |
| `src/scenes/GameScene.ts` | `GameScene` — main gameplay scene: ground/lights setup, Player + Obstacle spawning, distance-based collision, DOM HUD (score/health/level), game-over overlay. |
| `src/systems/Input.ts` | `InputSystem` class — keyboard/mouse/gamepad listeners, isKeyPressed/isMouseButtonPressed/getMousePosition/gamepad polling (16 ms throttle), getInputState(), clear(). NOTE: references `InputConstants.GAMEPAD_DEADZONE` which is not defined on InputConstants (see Discrepancies). |
| `src/systems/Physics.ts` | `PhysicsSystem` class — CANNON.World wrapper: gravity, contact material, body registry, createBox/createSphere/createGround, force/impulse, step update. |
| `src/types/GameTypes.ts` | Type-only module: GameConfig, PhysicsConfig, AudioConfig, UIConfig, DebugConfig, Entity, PlayerState, GameState, InputState interfaces. |
| `src/utils/AssetLoader.ts` | Static `AssetLoader` — cached loader for texture/model/audio/font/json via THREE loaders + fetch, preload(), clearCache(), getCacheStats(). |
| `src/utils/Constants.ts` | `GameConstants`, `InputConstants`, `CollisionLayers`, `GameEvents` const objects. NOTE: `GAMEPAD_DEADZONE` lives here on `GameConstants`, not `InputConstants` (see Discrepancies). |
| `src/utils/Logger.ts` | Static `Logger` — level-gated console logging (debug/info/warn/error), measure(), group()/groupEnd(). |

Empty directories on disk: `src/game/` (no files — vestigial).

## Test Files (verified against disk 2026-09-10)

### tests/unit/ — 13 test files (all collected by vitest)
| File | Tests | Result (2026-09-10 run) | Target |
|------|-------|--------------------------|--------|
| `tests/unit/cicd-pipeline.test.ts` | 16 | 16 pass | CI/CD pipeline files (fs checks of .github/workflows) |
| `tests/unit/constants.test.ts` | 12 | 8 pass / 4 fail | `@/utils/Constants` (4 expected-behavior failures) |
| `tests/unit/game-loop.test.ts` | 13 | 5 pass / 8 fail | `@/core/GameLoop` |
| `tests/unit/game.test.ts` | 0 | **FAILS TO LOAD** | `@/core/Game` — imports/vi.mocks `@/systems/Audio` + `@/systems/UI`, which do not exist in src/ (see Collection Status) |
| `tests/unit/hello-three.test.ts` | 11 | 7 pass / 1 fail / 4 skip | Three.js integration smoke (TDD-1.3 RED placeholder) |
| `tests/unit/input-system.test.ts` | 9 | 9 pass | `src/systems/Input` |
| `tests/unit/logger.test.ts` | 10 | 10 pass | `@/utils/Logger` |
| `tests/unit/mock-strategy.test.ts` | 54 | 54 pass | tests/setup mock behavior (three/cannon/audio) |
| `tests/unit/obstacle.test.ts` | 19 | 19 fail | `@/entities/Obstacle` (spec/impl mismatch — RED) |
| `tests/unit/physics-system.test.ts` | 12 | 12 fail | `@/systems/Physics` (mock/impl mismatch — RED) |
| `tests/unit/player.test.ts` | 45 | 42 pass / 3 fail | `@/entities/Player` |
| `tests/unit/retroactive-core.test.ts` | 46 | 9 pass / 37 fail | Cross-cutting: constants values, class structure, three/cannon integration, file-existence checks |
| `tests/unit/scene-manager.test.ts` | 20 | 14 pass / 6 fail | `@/core/SceneManager` |

**Totals: 267 tests — 173 pass, 90 fail, 4 skip. 4 test files fully green, 9 with expected-behavior failures, 1 (game.test.ts) failing at load.**

### tests/setup/ — 2 files
- `tests/setup/mock-three.ts` — Vitest mock for `three` (Vector3, Scene, Camera, Renderer, Mesh, Geometry, Material, lights, loaders, etc.); loaded via setupFiles.
- `tests/setup/mock-cannon.ts` — Vitest mock for `cannon-es` (World, Body, Vec3, shapes, events); loaded via setupFiles.

### tests/baseline/
- `tests/baseline/INVENTORY.md` — this file.

### tests/evidence/
- `tests/evidence/d02/T1-green.txt` — T1 evidence: full `npm run test:run` output @ 2026-09-10T20:48 AEST (post-fix verification: 0 collection errors, 13/13 files). Derivation source for the TEMP-D0.2-T1 entries in `.husky/red-allowlist.txt` (boss pre-ruling 2026-09-10 20:35 AEST).
- `tests/evidence/d02/T1-nested-tree-check.txt` — pre-exclude run proving the nested `clusterrush/tests/` tree is NOT collected by the root-anchored include pattern.
- `tests/evidence/d02/T1-hook-error.txt` — NOT generated: the task's contingency (T1 commit blocked by the pre-commit gate) was superseded by the boss pre-ruling (TEMP-D0.2-T1 allowlist entries), so the T1 commit passed the gate instead of being blocked.

### tests/e2e/ — 4 spec files (Playwright, real headed Chrome via `chromium-boot` project + Firefox via `firefox` project)
- `tests/e2e/boot.smoke.spec.ts` — W2-A.4: first e2e test; asserts WebGL context, loading cleared, menu visible, no THREE/CORS/uncaught errors. 1 test.
- `tests/e2e/physics-sync.spec.ts` — W2-B.2: drives the RUNNING frame loop in real Chrome; proves BodySync moves the visual (teleport proof + 30-frame drift trace). 1 test.
- `tests/e2e/audio.spec.ts` — W2-C.2: AudioContext running in real Chrome, AudioSystem available, pause/resume without errors. 1 test.
- `tests/e2e/smoke/smoke.spec.ts` — W2-E.1a/W2-E.1b: 5-scenario smoke suite run per-browser (Week-2 criterion #1, BOTH legs): (1) boot→menu→game, WebGL live, window.game running, HUD visible, 0 fatal console errors; (2) WASD movement (D→+x, A→-x, W→-z, all >0.1 delta); (3) jump (space→y>0.5, lands back); (4) score increment (player:score +50→HUD updated); (5) game-over→restart (player:death→GAME OVER overlay→reload→clean state). 6 tests total, green in Chrome (chromium-boot) AND Firefox (firefox project, added W2-E.1b). Per-browser evidence via `BROWSER` env: `tests/evidence/w2/w2-e1a-smoke-{1..5}-*-{chrome|firefox}.png` + `w2-e1a-smoke-console-{chrome|firefox}.txt`. Chrome leg: `W2-E1a-GREEN.txt`; Firefox leg + Chrome-vs-Firefox diff table: `W2-E1b-GREEN.txt`. Known cross-browser diff (documented, not fixed): Firefox-only 2x non-fatal "AudioContext prevented from starting automatically" boot warnings.

### tests/fixtures/, tests/integration/
- Both directories exist and are EMPTY on disk. Reserved for fixtures and integration tests (future work).

## Coverage Gaps — public methods without (passing) tests

| Module / class | Public API without passing test coverage | Notes |
|----------------|------------------------------------------|-------|
| `Game` (src/core/Game.ts) | ALL public methods: start, pause, resume, stop, switchScene, getSceneManager, getInputSystem, getPhysicsSystem, getAudioSystem, getUISystem, isGameRunning | game.test.ts (13 `it`s) exists but fails to load — imports non-existent `src/systems/Audio.ts` + `src/systems/UI.ts` |
| `GameLoop` | start, stop, fixed-timestep accumulation, update/render callback invocation | 8 of 13 tests failing (lifecycle + timestep + callbacks); passing: construction, stop-if-not-running, setFrameRate ×2 |
| `SceneManager` | loadScene happy path (load/queue/fallback data), update(), render() | 6 of 20 failing — happy-dom `CustomEvent` dispatch + mock gaps in emit() path; registration/unregistration/cleanup/getters pass |
| `InputSystem` | isK*** (just-pressed), getGamepadState, isGamepadButtonPressed, getGamepadAxis (gamepad path incl. deadzone — which references the misplaced constant) | 9 keyboard/mouse/state tests pass; gamepad branches untested |
| `PhysicsSystem` | ALL public methods: update, addBody, removeBody, createBox, createSphere, createGround, applyForce, applyImpulse, getBody, getAllBodies, cleanup | All 12 tests failing (mock-cannon divergence; tests also expect a `raycast` API that PhysicsSystem does not expose) |
| `Player` | jump "already jumping" guard, respawn health restore + position variants | 3 of 45 failing; rest of movement/jump/damage/heal/score/power-up/respawn/getters pass |
| `Obstacle` | ALL public methods: update, deactivate, reactivate, getMesh, getType, getDamage, isObstacleActive | All 19 failing — tests expect API that does not exist on the class ("static" type, getPosition, destroy(), collision methods) |
| `Scene` (abstract, src/scenes/Scene.ts) | load/enter/exit/cleanup/render + getters — no dedicated test file | Exercised only indirectly via scene-manager.test.ts concrete subclasses |
| `BootScene`, `GameScene` | Scene-lifecycle overrides (onLoad/onEnter/onUpdate/onExit/onCleanup) + spawning/collision/HUD logic — no test files at all | Largest untested surface in the codebase |
| `AssetLoader` | load (all 5 type branches), preload, clearCache, getCacheStats — no test file at all | Untested |
| `Logger` | setLevel, measure, group, groupEnd | info/warn/error/debug + level behavior pass; the remaining statics untested |
| `src/index.ts` bootstrap | initGame, setupWindowEvents, showErrorScreen, bootstrap | Untested (browser bootstrap) |
| `types/GameTypes.ts`, `core/index.ts` | — | Type-only / re-export barrel; no runtime behavior to test |

### Known spec-vs-implementation discrepancies driving RED failures
1. `GameEvents.PLAYER_DIED` / `GameEvents.SCORE_CHANGED` — expected by constants.test.ts + retroactive-core.test.ts; implementation defines `PLAYER_DEATH` / `PLAYER_SCORE` instead.
2. `InputConstants.GAMEPAD_DEADZONE` — expected by constants.test.ts and referenced by src/systems/Input.ts:139, but the constant is defined on `GameConstants` (src/utils/Constants.ts:36), not `InputConstants`. Either the constant or its consumers are in the wrong place.
3. `Obstacle` API surface — tests expect "static" type, position getter, destroy(), and collision predicates; class exposes block/spike/moving/rotating/breakable + getMesh/getType/getDamage.
4. `PhysicsSystem` — tests expect raycast + collision-event APIs and mock behavior that diverges from tests/setup/mock-cannon.ts.
5. `game.test.ts` load failure — `src/systems/Audio.ts` and `src/systems/UI.ts` are imported by src/core/Game.ts and tests/unit/game.test.ts but do not exist in src/systems/ (only Input.ts, Physics.ts exist).

## Nested `clusterrush/` Tree — OUT OF SCOPE (explicit decision, T0.2.1)

`<repo>/clusterrush/` is a **duplicate copy** of the root tree (its own `src/`, `tests/`, `tracker/`, `package.json`, `.github/`, docs — a second, stale copy of the same project). It contains 15 src .ts files, 1 test file (`clusterrush/tests/unit/hello-three.test.ts`), and its own tracker JSONs.

**Decision**: the nested tree is treated as an **out-of-scope duplicate** — no inventory, no tests, no maintenance in this project phase.

**Vitest handling**:
- Empirical check (evidence: `tests/evidence/d02/T1-nested-tree-check.txt`): the root-anchored include pattern `tests/**/*.test.ts` does **NOT** collect `clusterrush/tests/**` — only 13 root-level test files were collected in a full run with no exclude present.
- Regardless of that outcome, `clusterrush/**` was added to `test.exclude` in `config/vite.config.ts` as an explicit guard, so a future include-pattern change cannot silently pick up the duplicate tree.

## Collection Status (T0.2.1 VERIFY result)

- **Before fix**: 9 of 13 test files failed at collection with `Failed to load url @/utils/Constants (resolved id: @/utils/Constants). Does the file exist?` — all 7 aliases in `config/vite.config.ts` resolved into `<repo>/config/` because `__dirname` in that file is `config/`.
- **After fix**: all 7 aliases point at the repo root (`../src`, `../src/core`, …, `../public/assets`). `npm run test:run` → **0 collection errors of that class; 13/13 test files collected** (evidence: `tests/evidence/d02/T1-green.txt`).
- **Remaining load error (pre-existing, out of scope — no src/ changes allowed in T0.2.1)**: `tests/unit/game.test.ts` fails to load with `Failed to resolve import "@/systems/Audio" from "tests/unit/game.test.ts"` because `src/systems/Audio.ts` and `src/systems/UI.ts` do not exist. This is a missing-source gap to be resolved in later TDD work (RED phase), not a test-infrastructure defect.

## D0.2 RED Allowlist (pre-commit gate) — mechanism + removal procedure

Added in T0.2.1 per boss ruling (option (b), 2026-09-10 20:28 AEST) + T1 commit pre-ruling (2026-09-10 20:35 AEST, approved with guardrails). Files: `.husky/red-allowlist.txt` (the list) + `scripts/red-gate-check.mjs` (the gate, wired into `.husky/pre-commit` in place of the plain `npx lint-staged` for D0.2).

**Mechanism**

- Every commit runs the FULL vitest suite (no tests skipped — allowlisted files still execute) plus the lint stage.
- Exit criterion: the commit is blocked ONLY if a failing test file is not in `.husky/red-allowlist.txt`. Fail-safe: unparseable suite output → commit blocked.
- Lint stage: runs `npm run lint` and reports, but is NOT a commit-gate during D0.2 — see "Known infrastructure defects" below.
- Allowlist content at the T1 commit: 2 PERMANENT entries (`tests/unit/hello-three.test.ts`, `tests/unit/mock-strategy.test.ts`) + 8 TEMP entries tagged `TEMP-D0.2-T1` (exactly the other 8 files failing in the T1 evidence run `tests/evidence/d02/T1-green.txt`). No wildcards, no globs (pre-ruling guardrail 1).
- This ruling covers the T1 commit ONLY: no new TEMP entries after T1 without an explicit per-commit boss ruling (guardrail 5).

**Removal procedure**

1. T3 (task 0.2.2 "Retroactive Tests for Existing Code") aligns the RED assertions so every TEMP-listed file passes; T3's commit then removes ALL TEMP entries from `.husky/red-allowlist.txt`. If any TEMP entry would survive T3's commit, T3 does NOT commit — it escalates to boss with evidence (see T3 task comment; guardrail 3).
2. PERMANENT entries are deleted as their Week 1 tasks turn them green: `hello-three.test.ts` → TDD-1.3 "Three.js rendering test" (Week 1 day 1); `mock-strategy.test.ts` → re-validated by TDD-1.1 "Initialize project with testing infrastructure" (Week 1 day 1). Each removal is recorded in the tracker.
3. When the entry list is empty: restore `.husky/pre-commit` to its plain form (`npx lint-staged`), delete `.husky/red-allowlist.txt` and `scripts/red-gate-check.mjs`, and record the restoration in the tracker.
4. T4 (D0.2 final verification) must assert `.husky/red-allowlist.txt` lists EXACTLY the 2 PERMANENT files. Any deviation = failed gate, no sign-off (guardrail 4). Invariant: at D0.2 end the list has demonstrably shrank from (2 + 8 TEMP) to exactly 2, and `retroactive-core.test.ts` passes the hook.

## Known infrastructure defects (flagged to orchestrator — outside T0.2.1 scope)

- `npm run lint` is broken at baseline (HEAD bfbdaa3): ESLint 8.57.1 cannot load `config/eslint.config.js` (flat-config format) via `--config` — "Unexpected top-level property __esModule" (config/eslint.config.js:1). Pre-existing: the lint stage crashes before linting any file, so the original `npx lint-staged` hook could never have completed its lint stage on this tree. T0.2.1 decision: the D0.2 gate runs + reports lint but does not block on it (boss spec's exit criterion is test-file failures only). Fix = upgrade to ESLint 9 (or reformat the config for eslintrc) — needs a boss/orchestrator task decision.
