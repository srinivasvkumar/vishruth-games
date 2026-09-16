# D0.2 Resume — Task List (re-decomposition, 2026-09-11)

Board: `cluster-rush` — serial lane, dependency-enforced. CREATED NOT DISPATCHED: root R is
blocked (needs_input); nothing runs until the user's resume signal (orchestrator unblocks R).

## Lane
- [x] R  — T0.2.2a RED gate closure: verify committed RED evidence, lift PAUSE — game-tester — `t_275659a6` (parent: —)
- [x] G1 — T0.2.2 G1: align game.test.ts + minimal Audio/UI stubs (Game loadable) — game-dev — `t_013c1b58` (parent: R)
- [x] G2 — T0.2.2 G2: align obstacle + physics-system tests (mock-cannon/mock-three) — game-dev — `t_f9206b62` (parent: G1)
- [x] G3 — T0.2.2 G3: align retroactive-core.test.ts (46 cross-cutting tests) — game-dev — `t_072d14ba` (parent: G2)
- [x] G4 — T0.2.2 G4: align scene-manager + game-loop tests — game-dev — `t_d69e44a7` (parent: G3)
- [x] G5 — T0.2.2 G5: align constants + player tests — game-dev — `t_5a0db934` (parent: G4)
- [x] G6 — T0.2.2 G6: new retroactive tests for coverage gaps (AssetLoader, scenes, index) — game-dev — `t_f85aba71` (parent: G5)
- [x] GV — T0.2.2b GREEN + final D0.2 verification — game-tester — `t_e14de10c` (parent: G6)
- [x] QG — D0.2 quality gate + sign-off — reviewer — `t_0ade5caa` (parent: GV)

## Checkpoints
- [x] After R: RED gate closed, PAUSE lifted, tracker 0.2.2 = red_verified / ACTIVE
- [x] After G5: all 8 TEMP-D0.2-T1 allowlist entries removed
- [x] After G6: coverage-gap modules tested
- [x] After GV: allowlist == exactly 2 PERMANENT; suite GREEN except hello-three; tracker green_verified
- [x] After QG: sign-off committed; tracker 0.2.2 = completed; D0.2-COMPLETE

# Week 1 Lane (2026-09-12 → 2026-09-13) — COMPLETE
- [x] W1-A — TDD-1.3 GREEN: Renderer implementation (core/Renderer.ts) — game-dev — `t_0f69a68a` → c41f977
- [x] W1-B — TDD-1.1 RED allowlist FULL closure + pre-commit restore — implementer — `t_b3e4d7c9` → 1eea718/77167de/7e970e6
- [x] W1-C — Gap-fill: core coverage gaps (gamepad/logger/audio/ui stubs) — game-dev — `t_fa4d5774` → 76711d8
- [x] W1-S — Stability verification (20x scenes + 5x full suite, flake-free) — game-tester — `t_24e2fffd` → ca4e9a2
- [x] W1-D — Week 1 sign-off: quality gate — reviewer — `t_509c2314` → 7e23596
- [x] W1-INFRA — Untrack geometry-dash/node_modules + gitignore — implementer — `t_2826c78d` → baa9459

## Week 2 Lane (2026-09-13 →) — IN PROGRESS
- [x] W2-A.1 — Renderer attaches to existing canvas (RED->GREEN) — game-dev
- [x] W2-A.2 — Shared renderer + boot path in Game (RED->GREEN) — game-dev
- [x] W2-A.3 — Minimal MenuScene + fix 'menu' transition (RED->GREEN) — game-dev
- [x] W2-A.4 — First e2e test: real-Chrome boot smoke — game-dev
- [x] W2-D.1 — Score manager pure fns + LocalStorage (RED->GREEN) — game-dev — `t_5bff9ff6`
- [x] Suite: 387/387 green · Coverage: 93.38% (target 50%+) · tsc 0 · eslint 0 · build ok
- [x] RED gate closed: allowlist deleted, red-gate script deleted, pre-commit = npm run test:run
- [x] main @ 7e23596; all W1 work merged and verified on main

# Week 2 Lane (started 2026-09-13)
- [x] W2-A.1 — Renderer attaches to existing canvas (RendererOptions.canvas + resizeToContainer) — game-dev — `t_2deaadf6`
- [x] W2-A.2 — Game owns shared Renderer; start() boots scene; gameLoop calls sceneManager.render(); AssetLoader.load() hook — game-dev — `t_f1aa3f33`
- [x] W2-A.3 — Minimal MenuScene + fix 'menu' transition (boot path lands in valid registered active scene) — game-dev — `t_16b337f1`
- [x] W2-A.4 — Real-Chrome boot smoke test (Task 4.3) — first e2e in project — game-tester — `t_9b7d154e`
- [x] W2-B.1 — BodySync: body synchronization system + Game frame-loop wiring (Task 6.2) — game-dev — `t_f438f119`
- [x] W2-B.2 — Browser verify: physics moves the visual in real Chrome (Task 6.2 browser-verification) — game-tester — `t_14c82dd1`
- [x] W2-E.1a — Smoke suite (Chrome): 5 scenarios, 6/6 e2e green in real headed Chrome — game-tester — `t_8ac76c86`
- [x] W2-E.1b — Cross-browser (Firefox): 6/6 green in headed Firefox + Chrome re-pass; Week-2 criterion #1 both legs done — game-tester — `t_7844ca73`
- [x] W2-E.2 — FPS baseline @ 20 obstacles (D4 gate): 60.0 mean FPS, gate >=30 PASS, no W3 re-scope; RED 8cc268c -> GREEN — game-tester — `t_71338ca5`
- [x] W2-E.3 — Week 2 sign-off: 7/7 success criteria via fresh reviewer runs (smoke C+F, audio, physics-sync, FPS, score-persistence, shield, cross-browser); tracker + registry updated — reviewer — `t_bcf744c5`

## BUG-W2-1: MenuScene start path (2026-09-16, post-W2)
- [ ] BUG-W2-1 — MenuScene start path — DECOMPOSED + 1a COMPLETE + 1a VERIFIED IN REAL BROWSER @ 6f85f55 — orchestrator
- [x] BUG-W2-1a — MenuScene player start path: Enter/Space keydown + START button click -> switchScene('game'), double-start guard + listener cleanup — game-dev — `t_4298322b`
- [x] BUG-W2-1b — In-browser verify 1a start path (real headed Chrome: Enter/START-click -> GameScene + WASD moves player) — RED negative control 4/4 fail @ pre-fix -> GREEN 4/4 pass headed Chromium @ 6f85f55; 0 fatal console errors — game-tester — `t_675ab2f6`
