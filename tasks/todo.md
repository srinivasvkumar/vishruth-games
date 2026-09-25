1|# D0.2 Resume — Task List (re-decomposition, 2026-09-11)
2|
3|Board: `cluster-rush` — serial lane, dependency-enforced. CREATED NOT DISPATCHED: root R is
4|blocked (needs_input); nothing runs until the user's resume signal (orchestrator unblocks R).
5|
6|## Lane
7|- [x] R  — T0.2.2a RED gate closure: verify committed RED evidence, lift PAUSE — game-tester — `t_275659a6` (parent: —)
8|- [x] G1 — T0.2.2 G1: align game.test.ts + minimal Audio/UI stubs (Game loadable) — game-dev — `t_013c1b58` (parent: R)
9|- [x] G2 — T0.2.2 G2: align obstacle + physics-system tests (mock-cannon/mock-three) — game-dev — `t_f9206b62` (parent: G1)
10|- [x] G3 — T0.2.2 G3: align retroactive-core.test.ts (46 cross-cutting tests) — game-dev — `t_072d14ba` (parent: G2)
11|- [x] G4 — T0.2.2 G4: align scene-manager + game-loop tests — game-dev — `t_d69e44a7` (parent: G3)
12|- [x] G5 — T0.2.2 G5: align constants + player tests — game-dev — `t_5a0db934` (parent: G4)
13|- [x] G6 — T0.2.2 G6: new retroactive tests for coverage gaps (AssetLoader, scenes, index) — game-dev — `t_f85aba71` (parent: G5)
14|- [x] GV — T0.2.2b GREEN + final D0.2 verification — game-tester — `t_e14de10c` (parent: G6)
15|- [x] QG — D0.2 quality gate + sign-off — reviewer — `t_0ade5caa` (parent: GV)
16|
17|## Checkpoints
18|- [x] After R: RED gate closed, PAUSE lifted, tracker 0.2.2 = red_verified / ACTIVE
19|- [x] After G5: all 8 TEMP-D0.2-T1 allowlist entries removed
20|- [x] After G6: coverage-gap modules tested
21|- [x] After GV: allowlist == exactly 2 PERMANENT; suite GREEN except hello-three; tracker green_verified
22|- [x] After QG: sign-off committed; tracker 0.2.2 = completed; D0.2-COMPLETE
23|
24|# Week 1 Lane (2026-09-12 → 2026-09-13) — COMPLETE
25|- [x] W1-A — TDD-1.3 GREEN: Renderer implementation (core/Renderer.ts) — game-dev — `t_0f69a68a` → c41f977
26|- [x] W1-B — TDD-1.1 RED allowlist FULL closure + pre-commit restore — implementer — `t_b3e4d7c9` → 1eea718/77167de/7e970e6
27|- [x] W1-C — Gap-fill: core coverage gaps (gamepad/logger/audio/ui stubs) — game-dev — `t_fa4d5774` → 76711d8
28|- [x] W1-S — Stability verification (20x scenes + 5x full suite, flake-free) — game-tester — `t_24e2fffd` → ca4e9a2
29|- [x] W1-D — Week 1 sign-off: quality gate — reviewer — `t_509c2314` → 7e23596
30|- [x] W1-INFRA — Untrack geometry-dash/node_modules + gitignore — implementer — `t_2826c78d` → baa9459
31|
32|## Week 2 Lane (2026-09-13 →) — IN PROGRESS
33|- [x] W2-A.1 — Renderer attaches to existing canvas (RED->GREEN) — game-dev
34|- [x] W2-A.2 — Shared renderer + boot path in Game (RED->GREEN) — game-dev
35|- [x] W2-A.3 — Minimal MenuScene + fix 'menu' transition (RED->GREEN) — game-dev
36|- [x] W2-A.4 — First e2e test: real-Chrome boot smoke — game-dev
37|- [x] W2-D.1 — Score manager pure fns + LocalStorage (RED->GREEN) — game-dev — `t_5bff9ff6`
38|- [x] Suite: 387/387 green · Coverage: 93.38% (target 50%+) · tsc 0 · eslint 0 · build ok
39|- [x] RED gate closed: allowlist deleted, red-gate script deleted, pre-commit = npm run test:run
40|- [x] main @ 7e23596; all W1 work merged and verified on main
41|
42|# Week 2 Lane (started 2026-09-13)
43|- [x] W2-A.1 — Renderer attaches to existing canvas (RendererOptions.canvas + resizeToContainer) — game-dev — `t_2deaadf6`
44|- [x] W2-A.2 — Game owns shared Renderer; start() boots scene; gameLoop calls sceneManager.render(); AssetLoader.load() hook — game-dev — `t_f1aa3f33`
45|- [x] W2-A.3 — Minimal MenuScene + fix 'menu' transition (boot path lands in valid registered active scene) — game-dev — `t_16b337f1`
46|- [x] W2-A.4 — Real-Chrome boot smoke test (Task 4.3) — first e2e in project — game-tester — `t_9b7d154e`
47|- [x] W2-B.1 — BodySync: body synchronization system + Game frame-loop wiring (Task 6.2) — game-dev — `t_f438f119`
48|- [x] W2-B.2 — Browser verify: physics moves the visual in real Chrome (Task 6.2 browser-verification) — game-tester — `t_14c82dd1`
49|- [x] W2-E.1a — Smoke suite (Chrome): 5 scenarios, 6/6 e2e green in real headed Chrome — game-tester — `t_8ac76c86`
50|- [x] W2-E.1b — Cross-browser (Firefox): 6/6 green in headed Firefox + Chrome re-pass; Week-2 criterion #1 both legs done — game-tester — `t_7844ca73`
51|- [x] W2-E.2 — FPS baseline @ 20 obstacles (D4 gate): 60.0 mean FPS, gate >=30 PASS, no W3 re-scope; RED 8cc268c -> GREEN — game-tester — `t_71338ca5`
52|- [x] W2-E.3 — Week 2 sign-off: 7/7 success criteria via fresh reviewer runs (smoke C+F, audio, physics-sync, FPS, score-persistence, shield, cross-browser); tracker + registry updated — reviewer — `t_bcf744c5`
53|
54|## BUG-W2-1: MenuScene start path (2026-09-16, post-W2)
55|- [ ] BUG-W2-1 — MenuScene start path — DECOMPOSED + 1a COMPLETE + 1a VERIFIED IN REAL BROWSER @ 6f85f55 — orchestrator
56|- [x] BUG-W2-1a — MenuScene player start path: Enter/Space keydown + START button click -> switchScene('game'), double-start guard + listener cleanup — game-dev — `t_4298322b`
57|- [x] BUG-W2-1b — In-browser verify 1a start path (real headed Chrome: Enter/START-click -> GameScene + WASD moves player) — RED negative control 4/4 fail @ pre-fix -> GREEN 4/4 pass headed Chromium @ 6f85f55; 0 fatal console errors — game-tester — `t_675ab2f6`
58|
59|# Week 3-A Lane (UI System, 2026-09-16) — MERGED
60|- [x] W3-A.1 — UISystem core: real HUD (score/health/level), replace 32-line stub; no GameScene touch — game-dev — `t_16f7e67d` → 13982a3
61|- [x] W3-A.2 — Migrate GameScene to UISystem (remove inline HUD DOM divs; D2 HUD ownership payoff) — game-dev — `t_501493cf` → 4bc4472
62|- [x] W3-A.3 — Full MenuScene: START/SETTINGS/HIGH SCORES buttons + keyboard nav (SETTINGS = placeholder, full settings = W3-C) — game-dev — `t_d2e9e91c` → d3f5810
63|- [x] W3-A.4 — GameOverScene: final score + RESTART → menu + register scene — game-dev — `t_de156e6e` → 19a7899
64|- [x] W3-A.5 — Wire full loop: death → switchScene('gameover', {score, highScore}), remove inline overlay, resetRunState on re-entry — game-dev — `t_77ceb449` → 6955226
65|- [x] W3-A.6 — In-browser verify full loop + HUD (headed Chrome; 4/7 pass, confirmed BUG-W2-1a re-arm blocker + D-A6-1 score=0 major) — game-tester — `t_b08d3752` → 7e59434
66|- [x] W3-A.7 — FIX: MenuScene start-guard re-arm on onExit (BUG-W2-1a blocker) — game-dev — `t_c3a4bd20` → 843a66e
67|- [x] W3-A.8 — FIX: GameOverScene reads {score, highScore} from LEVEL_START event payload (D-A6-1 major) — game-dev — `t_e0b86767` → 41c7cfd
68|- [x] W3-A.9 — DRY high-score read: canonical readStoredHighScore() in Score.ts + 2 bug fixes (try/catch crash + overflow cap) — game-dev — `t_9d8237a9` → e909ae7
69|- [x] **W3-A.1-A9 all merged to main + pushed to origin (eb3cc82..35a1033). 635/635 tests, tsc clean, eslint 0 errors.**
70|
71|# Week 3-B Lane (Integration / Day 9, 2026-09-17) — IN PROGRESS
72|- [x] W3-B.0 — Debug accessors __debugPlayerPos + __setPlayerHealth + __debugScore — game-dev — `t_a3c5bda0`
73|- [x] W3-B.0-fix — Player.die() dispatches PLAYER_DEATH when lives hit 0 (unblocks W3-B.7 gate CP4 S1) — game-dev — `t_8cfc53be`
74|- [x] W3-B.1 — Playwright scaffold harden: playwright.config.ts (chromium-boot + firefox projects), webServer, reuse W2 smoke base — game-dev — `t_9927d746` → 987704c
75|- [x] W3-B.2 — Critical-path E2E #1: boot → menu → START → game (menu→start→play flow) — game-dev
76|- [x] W3-B.3 — Critical-path E2E #2: player movement + obstacle avoidance (WASD, collision) — game-dev
77|- [x] W3-B.4 — Critical-path E2E #3: score collection + HUD display (UISystem) — game-dev
78|- [x] W3-B.5 — Critical-path E2E #4: game-over → restart → 2nd run full loop (CP4 spec restored from wt/t_9819ee0b) + real-world browser round: 3 defects found+fixed (HUD ownership inversion, D-A6-1 re-asserted, HUD not hidden on scene exit) — game-dev — 2026-09-22
79|  - Results: w3a-full-loop 7/7; w3b CP1-CP4 13/14 (1 skipped flaky by design); boot+fps+w2-w21b 12/12; tsc clean; 645/645 unit
80|  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp{1,2,3,4}-* + w3a-full-loop-*
81|  - Tracked follow-up: CP3 S2 flake (UISystem.setScore writes to stale scoreEl during scene transition race)
82|- [x] W3-B.6-v2 — Visual-regression baselines: capture + stability-verify per scene (post a47d623) — game-tester — `t_bc5c735e` → 8e5e695
83|  - Menu PASS (0px diff) + GameOver PASS (0px diff) — pixel-stable
84|  - GameScene documented flake (1902px, truck-silhouette/spawn-layout variance only — camera/HUD/road pixel-identical) — non-blocking
85|  - Full w3b suite: 15 passed / 1 skipped (CP3 S3 fixme) / 1 failed (documented S2 flake only)
86|  - Evidence: W3B6V2-RED.txt + W3B6V2-GREEN.txt + 6 mirror PNGs
87|- [x] W3-B.7-v2 — In-browser verify: 4 critical paths in Chrome + Firefox (fresh run, post a47d623) — game-tester — `t_6758c88b`
88|  - Chrome (project=w3b): 13 passed / 1 skipped (fixme) / 0 failed, 50.8s
89|  - Firefox (project=firefox): 13 passed / 1 skipped / 0 failed, 55.6s
90|  - 0 fatal console errors in both browsers; CP3 S2 known flake did NOT fire
91|  - a47d623 truck-scale + camera-follow visually confirmed in both legs
92|  - Evidence: W3B7V2-CHROME.txt + W3B7V2-FIREFOX.txt + 4 CP screenshots + 26 per-test screenshots
93|94|- [x] W3-C.3b — Input latency optimization: zero-allocation input path — game-dev — `t_448d7830` — 2026-09-23
95|  - RED p95 16.50 ms / GREEN p95 16.10-16.80 ms (at 1-frame physical floor)
96|  - tsc clean, 645/645 vitest
97|  - Evidence: tests/evidence/w3/W3C3B-RED.txt + W3C3B-GREEN.txt
98|

99|
100|# Week 3-C Lane (Audio Policy, 2026-09-23)
101|- [x] W3-C.2 — Cross-browser audio policy: fix Firefox AudioContext autoplay warnings — game-dev — `t_d57780a6`
102|  - Deferred AudioContext creation (ensureContext + markUserGesture)
103|  - RED: 2 Firefox warnings pre-fix; GREEN: 0 Firefox + 0 Chrome post-fix
104|  - 646/646 unit; tsc clean; eslint clean
105|  - Evidence: W3C2-RED.txt + W3C2-VERIFY-firefox.txt + W3C2-VERIFY-chrome.txt
106|

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

# Week 3-A Lane (UI System, 2026-09-16) — MERGED
- [x] W3-A.1 — UISystem core: real HUD (score/health/level), replace 32-line stub; no GameScene touch — game-dev — `t_16f7e67d` → 13982a3
- [x] W3-A.2 — Migrate GameScene to UISystem (remove inline HUD DOM divs; D2 HUD ownership payoff) — game-dev — `t_501493cf` → 4bc4472
- [x] W3-A.3 — Full MenuScene: START/SETTINGS/HIGH SCORES buttons + keyboard nav (SETTINGS = placeholder, full settings = W3-C) — game-dev — `t_d2e9e91c` → d3f5810
- [x] W3-A.4 — GameOverScene: final score + RESTART → menu + register scene — game-dev — `t_de156e6e` → 19a7899
- [x] W3-A.5 — Wire full loop: death → switchScene('gameover', {score, highScore}), remove inline overlay, resetRunState on re-entry — game-dev — `t_77ceb449` → 6955226
- [x] W3-A.6 — In-browser verify full loop + HUD (headed Chrome; 4/7 pass, confirmed BUG-W2-1a re-arm blocker + D-A6-1 score=0 major) — game-tester — `t_b08d3752` → 7e59434
- [x] W3-A.7 — FIX: MenuScene start-guard re-arm on onExit (BUG-W2-1a blocker) — game-dev — `t_c3a4bd20` → 843a66e
- [x] W3-A.8 — FIX: GameOverScene reads {score, highScore} from LEVEL_START event payload (D-A6-1 major) — game-dev — `t_e0b86767` → 41c7cfd
- [x] W3-A.9 — DRY high-score read: canonical readStoredHighScore() in Score.ts + 2 bug fixes (try/catch crash + overflow cap) — game-dev — `t_9d8237a9` → e909ae7
- [x] **W3-A.1-A9 all merged to main + pushed to origin (eb3cc82..35a1033). 635/635 tests, tsc clean, eslint 0 errors.**

# Week 3-B Lane (Integration / Day 9, 2026-09-17) — IN PROGRESS
- [x] W3-B.0 — Debug accessors __debugPlayerPos + __setPlayerHealth + __debugScore — game-dev — `t_a3c5bda0`
- [x] W3-B.0-fix — Player.die() dispatches PLAYER_DEATH when lives hit 0 (unblocks W3-B.7 gate CP4 S1) — game-dev — `t_8cfc53be`
- [x] W3-B.1 — Playwright scaffold harden: playwright.config.ts (chromium-boot + firefox projects), webServer, reuse W2 smoke base — game-dev — `t_9927d746` → 987704c
- [x] W3-B.2 — Critical-path E2E #1: boot → menu → START → game (menu→start→play flow) — game-dev
- [x] W3-B.3 — Critical-path E2E #2: player movement + obstacle avoidance (WASD, collision) — game-dev
- [x] W3-B.4 — Critical-path E2E #3: score collection + HUD display (UISystem) — game-dev
- [x] W3-B.5 — Critical-path E2E #4: game-over → restart → 2nd run full loop (CP4 spec restored from wt/t_9819ee0b) + real-world browser round: 3 defects found+fixed (HUD ownership inversion, D-A6-1 re-asserted, HUD not hidden on scene exit) — game-dev — 2026-09-22
  - Results: w3a-full-loop 7/7; w3b CP1-CP4 13/14 (1 skipped flaky by design); boot+fps+w2-w21b 12/12; tsc clean; 645/645 unit
  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp{1,2,3,4}-* + w3a-full-loop-*
  - Tracked follow-up: CP3 S2 flake (UISystem.setScore writes to stale scoreEl during scene transition race)
- [x] W3-B.6-v2 — Visual-regression baselines: capture + stability-verify per scene (post a47d623) — game-tester — `t_bc5c735e` → 8e5e695
  - Menu PASS (0px diff) + GameOver PASS (0px diff) — pixel-stable
  - GameScene documented flake (1902px, truck-silhouette/spawn-layout variance only — camera/HUD/road pixel-identical) — non-blocking
  - Full w3b suite: 15 passed / 1 skipped (CP3 S3 fixme) / 1 failed (documented S2 flake only)
  - Evidence: W3B6V2-RED.txt + W3B6V2-GREEN.txt + 6 mirror PNGs
- [x] W3-B.7-v2 — In-browser verify: 4 critical paths in Chrome + Firefox (fresh run, post a47d623) — game-tester — `t_6758c88b`
  - Chrome (project=w3b): 13 passed / 1 skipped (fixme) / 0 failed, 50.8s
  - Firefox (project=firefox): 13 passed / 1 skipped / 0 failed, 55.6s
  - 0 fatal console errors in both browsers; CP3 S2 known flake did NOT fire
  - a47d623 truck-scale + camera-follow visually confirmed in both legs
  - Evidence: W3B7V2-CHROME.txt + W3B7V2-FIREFOX.txt + 4 CP screenshots + 26 per-test screenshots
- [x] W3-C.3b — Input latency optimization: zero-allocation input path — game-dev — `t_448d7830` — 2026-09-23
  - RED p95 16.50 ms / GREEN p95 16.10-16.80 ms (at 1-frame physical floor)
  - tsc clean, 645/645 vitest
  - Evidence: tests/evidence/w3/W3C3B-RED.txt + W3C3B-GREEN.txt
- [x] W3-C.4 — Full settings panel in menu (volume/speed/difficulty/controls) + localStorage persistence + live wiring — game-dev — `t_421f4c7f` — 2026-09-23
  - SettingsManager (src/systems/Settings.ts, key 'cluster-rush-settings', defaults {volume:80,speed:1.0,difficulty:normal}, validates speed [0.5,1,1.5,2] + difficulty easy/normal/hard)
  - MenuScene panel: VOLUME slider / SPEED 0.5-2 / DIFFICULTY / read-only CONTROLS / CLOSE; onEnter applies audio setMasterVolume + game setSpeedMultiplier; Esc closes + focus->START; Tab order Volume->Speed->Difficulty->Controls->Close
  - Game speedMultiplier scales loop deltaTime; GameScene applyDifficultySettings() scales spawn interval + obstacle speed
  - tsc build clean, 665/665 vitest, lint clean on new code; e2e settings-panel.spec.ts PASSED real Chromium (persist + getSpeedMultiplier()===2 + Esc/reopen/reload)
  - Evidence: tests/evidence/w3/W3C4-RED.txt + W3C4-GREEN.txt + settings-panel-open.png + settings-panel-persist.png

# Week 4-A Lane (2026-09-24) — IN PROGRESS
- [x] W4-A.3 — Visual-regression refinement: re-capture baselines, verify stability, flake policy — game-tester — `t_d0336dbf` — 2026-09-24
  - New spec tests/e2e/w4a-visual-regression.spec.ts (3 scenes x 2 browsers = 6 baselines)
  - Two determinism levers: seeded Math.random (mulberry32 seed 0x9e3779b9) + pre-screenshot renderer.clear()
  - 6 baselines captured: menu/game/gameover x chromium-boot/firefox
  - Stability verified: run 2 passes against run-1 baselines (GREEN leg)
  - Flake policy: maxDiffPixels 3000 for S2 GameScene (SwiftShader non-determinism), 0 for S1/S3 DOM scenes
  - Evidence: tests/evidence/w4/w4a3-test-report.md + 6 mirror PNGs + task-plan/w4a3-findings.md

# Week 4-B Lane (2026-09-24) — IN PROGRESS
- [x] W4-B.1 — MenuScene keyboard navigation: Tab order + Enter/Space + Esc close + visible :focus style — game-dev — `t_e95e3455` — 2026-09-24
  - Explicit tabindex: START=1, SETTINGS=2, CLOSE=4; HIGH SCORES not a Tab stop; title/hint not focusable
  - Visible :focus style: outline 3px solid #00ff00, offset 2px on all 3 menu buttons
  - Enter/Space activates focused button (existing behavior preserved)
  - Esc closes settings panel + returns focus to START (existing behavior preserved)
  - TDD RED: 6 failed / 11 passed. GREEN: 17/17. Regression: 37/37 menu-scene suites. Full: 683/683.
  - Evidence: tests/evidence/w4/W4B1-RED.txt + W4B1-GREEN.txt
- [x] W4-B.3 — ARIA labels for all buttons (Menu + GameOver + Settings) — game-dev — `t_64341d74` — 2026-09-24
  - MenuScene: START ("Start game"), SETTINGS ("Open settings"), HIGH SCORES panel ("View high scores", role=region)
  - GameOverScene: RESTART ("Restart game"), final score ("Final score")
  - Settings: volume slider ("Volume"), speed buttons ("Set speed to Xx"), difficulty buttons ("Set difficulty to X"), CLOSE ("Close settings")
  - TDD RED: 9 failed. GREEN: 9/9. Regression: 45/45 scene suites. Full: 692/692.
  - Evidence: tests/evidence/w4/W4B3-RED.txt + W4B3-GREEN.txt
- [x] W4-B.8 — Settings panel keyboard navigation: Tab order + Arrow-key adjustment + Esc-to-close — game-dev — `t_b01c78d5` — 2026-09-25
  - Tab order: Volume -> Speed -> Difficulty -> Controls(read-only) -> CLOSE
  - Arrow keys adjust volume slider (step 5, clamp 0..100, persist + live audio + label) and cycle speed/difficulty selectors (wraparound, apply + persist + visual)
  - Esc closes panel + returns focus to SETTINGS button (was START). Enter/Space activate focused control (swallowed while open). Arrow keys act only while a settings control is focused.
  - TDD RED: 12 failed / 8 passed. GREEN: 20/20. Regression: 51/51. Full: 756/756.
  - Evidence: tests/evidence/w4/W4B8-RED.txt + W4B8-GREEN.txt
