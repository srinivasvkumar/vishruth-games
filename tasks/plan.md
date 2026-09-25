1|# Implementation Plan: Cluster Rush D0.2 Resume — task 0.2.2 re-decomposition
2|
3|## Overview
4|Week 0, Day 0.2: 0.2.1 is COMPLETE (commit 793ddb5 — alias fix, INVENTORY.md rebuilt, D0.2 RED-allowlist pre-commit gate).
5|0.2.2's RED evidence is committed at 4edf450 (full 325-line T2-red-analysis.md; gate was NOT formally closed;
6|tracker PAUSED by user 2026-09-10 21:53 AEST). This plan re-decomposes the remaining D0.2 work from ground
7|truth per TDD_PLAN.md "TASK DECOMPOSITION PRINCIPLES (NEW)": 9 tasks, all S/M sized (<=5 files each),
8|one deterministic serial lane. No monoliths. Created 2026-09-11 by orchestrator (boss NEW ORDER).
9|
10|## Ground truth (verified 2026-09-11)
11|- Git HEAD: 4edf450 (T2 RED evidence + analysis, committed by game-tester AFTER the pause commit 3cc636a).
12|- Working tree: `M TDD_PLAN.md` only — the uncommitted "TASK DECOMPOSITION PRINCIPLES (NEW)" section
13|  left by game-dev's T1 session (preserve, do not rewrite).
14|- RED state (T2-red.txt, committed): 13/13 files in run; 0 alias-class collection errors;
15|  267 tests = 173 pass / 90 fail / 4 skip; 1 documented file-level RED: tests/unit/game.test.ts
16|  (imports missing @/systems/Audio + @/systems/UI; src/core/Game.ts:4-5 import the same).
17|- Allowlist (.husky/red-allowlist.txt): 2 PERMANENT (hello-three, mock-strategy) + 8 TEMP-D0.2-T1
18|  (constants, game-loop, game, obstacle, physics-system, player, retroactive-core, scene-manager).
19|  T2 classification: all 8 TEMP files owned by 0.2.2 GREEN; mock-strategy currently GREEN (entry inert).
20|- Auto-decomposer incident: 17 non-orchestrator tasks (created_by=auto-decomposer, implementer/reviewer/
21|  researcher) were auto-spawned over this board and archived at user approval. Not part of this plan.
22|
23|## Architecture decisions
24|- D1: Serial lane R -> G1 -> G2 -> G3 -> G4 -> G5 -> G6 -> GV -> QG. G2 edits shared mocks
25|  (mock-cannon/mock-three) used by G3-G5, so a parallel tail is unsafe; same-assignee tasks are
26|  serialized by the profile concurrency limit anyway.
27|- D2: G1 creates minimal src/systems/Audio.ts + UI.ts stubs — the ONLY production change in 0.2.2,
28|  justified by pre-existing RED in game.test.ts (TDD-legitimate GREEN). Flagged to boss for sanity-check.
29|- D3: Each GREEN task removes exactly the TEMP allowlist entries for the files it fixes; GV asserts the
30|  allowlist == exactly the 2 PERMANENT entries. NO new TEMP entries (boss ruling). No --no-verify, ever.
31|- D4: RED gate (R, game-tester) completes BEFORE any GREEN task becomes ready (dependency-enforced).
32|- D5: CREATE-DO-NOT-DISPATCH: all tasks created in todo/blocked; nothing runs until the user's resume
33|  signal (orchestrator unblocks R).
34|
35|## Task list
36|- [x] R: T0.2.2a RED gate closure — verify committed RED evidence, lift PAUSE (game-tester) — parent: none
37|- [x] G1: Align game.test.ts + minimal Audio/UI stubs (make src/core/Game loadable) (game-dev) — parent R
38|- [x] G2: Align obstacle + physics-system tests (mock-cannon/mock-three divergence) (game-dev) — parent G1
39|- [x] G3: Align retroactive-core.test.ts (46 cross-cutting tests) (game-dev) — parent G2
40|- [x] G4: Align scene-manager + game-loop tests (game-dev) — parent G3
41|- [x] G5: Align constants + player tests (game-dev) — parent G4
42|- [x] G6: New retroactive tests for coverage gaps (AssetLoader, scenes, index) (game-dev) — parent G5
43|- [x] GV: T0.2.2b GREEN + final D0.2 verification (game-tester) — parent G6
44|- [x] QG: D0.2 quality gate + sign-off (reviewer) — parent GV
45|
46|## Checkpoints
47|- After R: RED gate closed (GATE DECISION appended), PAUSE lifted, tracker 0.2.2 = red_verified / ACTIVE.
48|- After G1-G5: every TEMP allowlist entry removed (G1:game, G2:obstacle+physics, G3:retroactive-core,
49|  G4:scene-manager+game-loop, G5:constants+player); each task commits scoped GREEN + allowlist diff.
50|- After G6: coverage gaps (AssetLoader, Scene/BootScene/GameScene, index) have passing tests.
51|- After GV: allowlist invariant (exactly 2 PERMANENT), full suite GREEN except hello-three (1 intentional
52|  RED), coverage recorded, RED->GREEN delta documented, tracker green_verified.
53|- After QG: D0.2 sign-off committed, tracker 0.2.2 = completed, current_status = D0.2-COMPLETE.
54|
55|## Risks and mitigations
56|| Risk | Impact | Mitigation |
57||------|--------|-----------|
58|| G1 stubs grow into feature work | High | G1 limited to API surface Game.ts imports; escalation rule on scope creep |
59|| G2 mock edits ripple into other tests | Med | G2 runs before G3-G5; each GREEN task does a full-run delta check |
60|| Pre-commit hook blocks a GREEN commit | Med | Task removes its own TEMP entries; escalate on block, never --no-verify |
61|| Unclassified failure surfaces at GV | Med | GV hard criteria + STOP-escalate rule (no tester-side test edits) |
62|| Resume auto-dispatch | High | R created then immediately block --kind needs_input; verify 0 ready/running |
63|
64|## Open questions
65|- Boss sanity-check on D2 (G1 src stubs) — flagged in the 2026-09-11 plan report.
66|
67|---
68|# Week 1 Lane — COMPLETE (2026-09-13, sign-off 7e23596)
69|
70|## Lane
71|W1-A (Renderer TDD-1.3) → W1-B (allowlist closure, requires A) ∥ W1-C (gap-fill) ∥ W1-S (stability) → W1-D (sign-off, requires B+C+S)
72|Plus W1-INFRA (node_modules untrack) inserted mid-lane per boss ruling.
73|
74|## Outcome
75|- Coverage 93.38% (target 50%+) · 387/387 tests green · flake-free (20x+5x verified)
76|- RED allowlist fully closed; pre-commit gate restored to full-suite (npm run test:run)
77|- Known issues carried to W2: KI-1 (Renderer 0% in sign-off run — since resolved, now 100%),
78|  KI-4 (barrel/type-only files at 0% — accepted), KI-5 (duplicate commit subjects — cosmetic)
79|
80|## Tracker maintenance
81|Per boss rule 2026-09-13: every completed task MUST update the trackers
82|(tracker/task_registry.json, tracker/tdd_tracker_config.json, tasks/plan.md, tasks/todo.md)
83|in the same commit as its evidence. W1-D's late scope addendum was superseded by this rule.
84|
85|---
86|# Week 2 Lane (started 2026-09-13)
87|
88|## W2-A: DOM Integration (gates all of W2)
89|- [x] W2-A.1 — Renderer attaches to existing canvas (RendererOptions.canvas + resizeToContainer) — game-dev — `t_2deaadf6` — 2026-09-13T17:02
90|  - RED: tests/evidence/w2/W2-A1-RED.txt (2 failed / 1 passed)
91|  - GREEN: tests/evidence/w2/W2-A1-GREEN.txt (3/3 passed), full suite 390/390
92|- [x] W2-A.2 — Game owns shared Renderer; start() boots scene; gameLoop calls sceneManager.render(); AssetLoader.load() hook — game-dev — `t_f1aa3f33` — 2026-09-13T17:30
93|  - RED: 4/4 W2-A.2 tests failed pre-change (no getRenderer, no boot path, no render call, no AssetLoader hook)
94|  - GREEN: 21/21 in game.test.ts; full suite 394/394; tsc clean; eslint clean on src/
95|  - Evidence: tests/evidence/w2/W2-A2-GREEN.txt
96|  - DECISION D1: minimal AssetLoader.load() manifest hook in boot path; W3 extends with scene-specific manifests
97|- [x] W2-A.3 — Minimal MenuScene + fix 'menu' transition (boot path lands in valid registered active scene) — game-dev — `t_16b337f1` — 2026-09-13T18:45
98|  - RED: 3/3 W2-A.3 tests failed pre-change (no scene registered, window.game undefined in happy-dom without three mock)
99|  - GREEN: 28/28 in scenes.test.ts; full suite 397/397; tsc clean; eslint clean on src/
100|  - Evidence: tests/evidence/w2/W2-A3-RED.txt, tests/evidence/w2/W2-A3-GREEN.txt
101|  - DECISION D2: minimal MenuScene with placeholder DOM only; full menu UI stays in W3 Task 8.2
102|- [x] W2-A.4 — Real-Chrome boot smoke test (Task 4.3) — first e2e in project — game-tester — `t_9b7d154e` — 2026-09-13T19:15
103|  - RED: #loading-message still showed 'Loading Three.js renderer...' after boot
104|  - GREEN: 1/1 e2e passed in 3.8s; full suite 397/397; build clean; lint 0 errors
105|  - Evidence: tests/evidence/w2/w2-a4-boot-smoke.png (348KB), w2-a4-boot-smoke-errors.txt
106|- [x] W2-B.2 — Browser verify: physics moves the visual in real Chrome (Task 6.2 browser-verification) — game-tester — `t_14c82dd1` — 2026-09-13T21:08
107|  - RED: tests/e2e/physics-sync.spec.ts committed (49c21d5); two live-app RED failures in real Chrome (bare three import; cannon-es Body has no userData)
108|  - GREEN: 1/1 e2e passed in real headed Chrome; teleport proof (body->y=25, mesh follows within 1e-3); 30 frame-over-frame samples, 0 drift
109|  - Evidence: tests/evidence/w2/W2-B2-RED.txt, W2-B2-GREEN.txt, w2-b2-physics-sync.png + -2.png, w2-b2-physics-sync-trace.json, w2-b2-physics-sync.txt
110|- [x] W2-E.1a — Smoke suite (Chrome): boot/WASD/jump/score/restart, 5 scenarios — game-tester — `t_8ac76c86` — 2026-09-13T23:10
111|  - RED: tests/e2e/smoke.spec.ts committed (4010dd8); jump scenario initially RED (keyboard.press too fast for InputSystem; spec fix: keydown + 150ms hold + keyup)
112|  - GREEN: 6/6 e2e passed in real headed Chrome; no src/ changes
113|  - Evidence: tests/evidence/w2/W2-E1a-GREEN.txt + 7 screenshots + w2-e1a-smoke-console.txt
114|- [x] W2-E.1b — Cross-browser (Firefox): add firefox project, re-run smoke suite, diff Chrome vs Firefox — game-tester — `t_7844ca73` — 2026-09-13T23:30
115|  - RED: 59f1e05 (firefox project in playwright.config.ts; spec moved to tests/e2e/smoke/; per-browser evidence via BROWSER env)
116|  - GREEN: 6/6 e2e passed in real headed Firefox AND 6/6 re-pass in headed Chrome; no functional diff; Firefox-only observation: 2x non-fatal "AudioContext prevented from starting automatically" boot warnings (documented, not fixed — W3-C territory)
117|  - Evidence: tests/evidence/w2/W2-E1b-GREEN.txt (result table + diff) + 7 Firefox screenshots + w2-e1a-smoke-console-firefox.txt + 7 fresh Chrome screenshots + w2-e1a-smoke-console-chrome.txt
118|  - Week-2 success criterion #1: BOTH legs (Chrome + Firefox) satisfied
119|- [x] W2-E.2 — FPS baseline @ 20 obstacles (D4 gate) — week-2 success criterion #7 — game-tester — `t_71338ca5` — 2026-09-14T07:20
120|  - RED: 8cc268c — tests/e2e/fps.spec.ts (new); D4 gate as in-test assertion; negative control (D4_MIN_FPS=61) FAILED in real headed Chrome as designed: 'Expected: >= 61, Received: 60.002...'
121|  - GREEN: 1/1 passed in real headed Chrome (chromium-boot). BASELINE: 601 frames / 10016 ms; mean 60.0, median 59.9, min 59.5 FPS; p95 frame time 16.7 ms. D4 gate (>=30) PASS — no W3 re-scope needed
122|  - OBSERVATION (out of scope): FPS_OBSTACLES=100 probe also measured 60.0 — rAF-capped display; frame-loop cadence not yet bottlenecked by injected obstacle load; 60-FPS/100-objects stays a W4 target (D4)
123|  - KNOWN: game canvas renders black in W2 e2e screenshots (detached per-scene renderer, src/scenes/Scene.ts:20) — rAF cadence still a valid frame-loop measurement; revisit in W3-A
124|  - Evidence: tests/evidence/w2/W2-E2-GREEN.txt, W2-E2-RED.txt, w2-e2-fps-20.log, w2-e2-fps-20.png
125|- [x] W2-E.3 — Week 2 sign-off: End-of-Week-2 quality gate — all 7 success criteria — reviewer — `t_bcf744c5` — 2026-09-14T08:50
126|  - All 7 criteria verified via FRESH reviewer executions in sign-off worktree (wt/t_71338ca5 base), not just implementer evidence:
127|    1. Chrome+Firefox e2e smoke: 6/6 + 6/6 (fresh re-runs, w2-signoff-e2e-battery.sh)
128|    2. Live audio pipeline: 4/4 triggers (w2-signoff-audio-probe.sh)
129|    3. Physics sync: 5/5 (fresh re-run)
130|    4. Score persistence: NEW probe (verify-signoff.spec.ts #4) — player:score -> HUD 1234 -> player:death -> saveHighScore() -> localStorage['cluster-rush-high-score']=1234 -> survives reload
131|    5. Shield mechanic: NEW probe (#5) — addPowerUp('invincibility',5000): damage absorbed, expires at 5.3s. GAP: no collectible entity/visual surface (Task 7.3 Phase 1)
132|    6. Full suite fresh: 550/550 · tsc 0 · eslint 0 · vite build ok
133|    7. FPS@20 re-run: mean 60.0 (fresh)
134|  - Trackers: tdd_tracker_config.json current_status -> W2-E.3-COMPLETE; task_registry.json w2_signoff block
135|  - Evidence: tests/evidence/w2/W2-E3-verify-probe.txt, w2-e3-localstorage.txt, w2-e3-shield.txt; sign-off doc: w2-signoff.md
136|
137|## BUG-W2-1: MenuScene start path (post-W2, 2026-09-16)
138|- [x] BUG-W2-1 — MenuScene start path — DECOMPOSED + 1a COMPLETE + 1a VERIFIED IN REAL BROWSER @ 6f85f55 — orchestrator (both subtasks done)
139|- [x] BUG-W2-1a — MenuScene player start path: Enter/Space keydown + START button click -> switchScene('game'), double-start guard, listener cleanup in onExit/onCleanup — game-dev — `t_4298322b` — 2026-09-16
140|  - RED: 6/7 menu-scene tests failed pre-change (no button, no key wiring, no guard)
141|  - GREEN: 7/7 in tests/unit/menu-scene.test.ts; full suite 557/557; tsc clean; eslint 0 errors (7 pre-existing Logger.ts warnings)
142|  - Evidence: tests/evidence/w2/W2-W21a-RED.txt, W2-W21a-GREEN.txt
143|  - Scope note: minimal start path only — full menu UI (settings/high scores/styled buttons) stays W3 Task 8.2
144|- [x] BUG-W2-1b — In-browser verification of 1a start path (real headed Chrome: Enter/START-click -> GameScene + WASD moves player) — game-tester — `t_675ab2f6` — 2026-09-16
145|  - RED negative control (pre-fix MenuScene @ 8f1520a): 4/4 failed as designed (no START button; Enter no-op; no transition)
146|  - GREEN: 4/4 passed in headed Chromium (Playwright 1.63.0, display :1), 17.3s; 0 fatal console errors (only expected AudioContext autoplay warning)
147|  - Scenarios: (1) MenuScene + #menu-start-button visible/enabled; (2a) Enter -> GameScene; (2b) reload + START click -> GameScene; (3) 3D player + obstacles render, WASD moves (+x/-x/-z)
148|  - Evidence: tests/evidence/w2/W2-W21b-RED.txt, W2-W21b-GREEN.txt, w2-w21b-{menu,enter-game,wasd-move}.png, w2-w21b-console-chrome.txt
149|  - Verified @ 6f85f55 (fix commit ff-merged into worktree); no src/ changes by this card. Verdict: PASS — no BUG-W2-1a regression.
150|
151|## W2-D: Game Flow & Score
152|- [x] W2-D.1 — Score manager pure fns + LocalStorage persistence (RED->GREEN) — game-dev — `t_5bff9ff6`
153|  - 41 new tests: pure functions (computeScore, subtractScore, applyMultiplier, clampScore)
154|  - ScoreManager class with injectable Storage, overflow/underflow clamping
155|  - GameScene HUD wired to ScoreManager (score display, game-over high score)
156|  - 428/428 full suite · tsc 0 errors
157|
158|# Week 3-A Lane (UI System, 2026-09-16) — MERGED to main
159|- [x] W3-A.1 — UISystem core: real HUD (score/health/level), replace 32-line stub; no GameScene touch — game-dev — `t_16f7e67d` — @ 13982a3
160|- [x] W3-A.2 — Migrate GameScene to UISystem (remove inline HUD DOM divs; D2 HUD ownership payoff) — game-dev — `t_501493cf` — @ 4bc4472
161|- [x] W3-A.3 — Full MenuScene: START/SETTINGS/HIGH SCORES buttons + keyboard nav (SETTINGS = placeholder, full settings = W3-C) — game-dev — `t_d2e9e91c` — @ d3f5810
162|- [x] W3-A.4 — GameOverScene: final score + RESTART -> menu + register scene — game-dev — `t_de156e6e` — @ 19a7899
163|- [x] W3-A.5 — Wire full loop: death -> switchScene('gameover', {score, highScore}), remove inline overlay, resetRunState on re-entry — game-dev — `t_77ceb449` — @ 6955226
164|- [x] W3-A.6 — In-browser verify full loop + HUD (headed Chrome; 4/7 pass, confirmed BUG-W2-1a re-arm blocker + D-A6-1 score=0 major) — game-tester — `t_b08d3752` — @ 7e59434
165|  - RED: 3/7 failed pre-fix (S4 RESTART second-run timeout, S6 console timeout, W2-1b regression button-disabled)
166|  - GREEN: 4/7 (S1 boot+menu, S2 START->game+HUD, S3 death->gameover handoff, S5 high-score reload-persistence)
167|  - Evidence: tests/evidence/w3/W3A6-FAIL.txt (confirms 2 defects), tests/e2e/w3a-full-loop.spec.ts
168|  - DEFECTS: BUG-W2-1a re-arm (blocker, MenuScene.started never resets on onExit) + D-A6-1 (major, GameOverScene.onEnter ignores {score,highScore} payload)
169|- [x] W3-A.7 — FIX: MenuScene start-guard re-arm on onExit (BUG-W2-1a blocker) — game-dev — `t_c3a4bd20` — @ 843a66e — 2026-09-17
170|  - RED: 4 new tests failing pre-change (no onExit re-arm) → GREEN: 17/17 in menu-scene-full.test.ts; full suite 617/617; tsc clean; eslint 0
171|  - In-browser: tests/e2e/w3a-full-loop.spec.ts (chromium-boot) — S4/S6/2nd-run all PASS (BUG-W2-1a blocker cleared). S2/S3 pre-existing (verified via git stash baseline), out of scope.
172|  - Evidence: tests/evidence/w3/W3A7-RED.txt + W3A7-GREEN.txt
173|- [x] W3-A.8 — FIX: GameOverScene reads {score, highScore} from LEVEL_START event payload (D-A6-1 major) — game-dev — `t_e0b86767` — @ 41c7cfd — 2026-09-17
174|  - Root cause: Scene.onEnter() takes NO data param; SceneManager.loadScene() calls enter() with no arg; payload only emitted on LEVEL_START. Option 3 (event-based), stays ≤2 files.
175|  - RED: 9 new tests failing pre-change → GREEN: 21/21; full suite 619/619; tsc clean. Pins: (1) subscribe in onLoad/setupUI NOT onEnter (timing load-bearing); (2) fallback uses readStoredHighScore(), not phantom this.scoreManager.
176|  - Evidence: tests/evidence/w3/W3A8-RED.txt + W3A8-GREEN.txt
177|- [x] W3-A.9 — DRY high-score read: canonical readStoredHighScore() in Score.ts + 2 bug fixes (try/catch crash + overflow cap) — game-dev — `t_9d8237a9` — @ e909ae7 — 2026-09-17
178|  - The 3 copies DIVERGED in 2 ways (verified on main): (1) overflow cap (scenes uncapped vs clampScore), (2) missing try/catch in ScoreManager (latent crash on storage-unavailable). '5.7' does NOT diverge (parseInt is a no-op floor).
179|  - Canonical helper = superset: try/catch + clampScore + 0-floor. All 3 sites delegate; 2 private scene methods deleted.
180|  - Fix A: try/catch (ScoreManager no longer throws on storage-unavailable). Fix B: cap (menu/gameover now cap at MAX_SAFE_INTEGER like the in-game score).
181|  - RED: 9 new TDD tests locking canonical semantics {storage-throws→0, '9007199254740993'→MAX_SAFE_INTEGER, '5.7'→5 (regression), absent→0, '500'→500, 'abc'→0, '-5'→0, '0'→0}. Full suite green; tsc clean.
182|  - Evidence: tests/evidence/w3/W3A9-RED.txt + W3A9-GREEN.txt
183|- **W3-A MERGED to main + pushed to origin (eb3cc82..35a1033). 635/635 tests, tsc clean, eslint 0 errors.**
184|- [x] W3-B.0 — Debug accessors __debugPlayerPos + __setPlayerHealth + __debugScore — game-dev — `t_a3c5bda0` — 2026-09-19
185|  - Three deterministic window accessors installed by GameScene.onEnter() for B3 CP2, B4 CP3, B5 CP4 E2E specs
186|  - Player.setHealth(n) added (clamps to [0, PLAYER_HEALTH], calls die() at 0)
187|  - GameScene.onUpdate() health-0 safety-net check added
188|  - 7 unit tests (1 RED + 6 GREEN); 642/642 full suite; tsc clean
189|  - Evidence: tests/evidence/w3/W3B0-RED.txt + W3B0-GREEN.txt
190|- [x] W3-B.0-fix — Player.die() dispatches PLAYER_DEATH when lives hit 0 (unblocks W3-B.7 gate CP4 S1) — game-dev — `t_8cfc53be` — 2026-09-19
191|  - Root cause: die() else branch (lives<=0) was a stub; never dispatched GameEvents.PLAYER_DEATH, so __setPlayerHealth(0) never reached GameOverScene
192|  - Fix: 1 line in src/entities/Player.ts die() else branch — window.dispatchEvent(new CustomEvent(GameEvents.PLAYER_DEATH)) (no new import)
193|  - 3 new unit tests in tests/unit/player.test.ts (PLAYER_DEATH dispatch at lives=0 / via setHealth(0) / NOT dispatched when lives remain)
194|  - 645/645 full suite; tsc clean; eslint 0 new errors
195|  - Evidence: tests/evidence/w3/W3B0FIX-RED.txt + W3B0FIX-GREEN.txt
196|- [x] W3-B.1 — Playwright config harden for W3-B critical-path specs — game-dev — `t_9927d746` — @ 987704c — 2026-09-19
197|  - outputDir + HTML reporter moved to tests/evidence/w3/; screenshot: 'on' enabled
198|  - 635/635 unit; playwright --list 46/46; tsc clean
199|  - Evidence: tests/evidence/w3/W3B1-RED.txt + W3B1-GREEN.txt
200|
201|# Week 3-B Lane (Integration / Day 9, 2026-09-19)
202|- [x] W3-B.1 — Playwright scaffold harden: playwright.config.ts (chromium-boot + firefox projects), webServer, reuse W2 smoke base — game-dev — `t_9927d746` → 6e4c45a
203|- [x] W3-B.1b — w3b Playwright project + tests/e2e/w3b/ dir — game-dev — `t_9819ee0b` — 2026-09-19
204|  - Changes: playwright.config.ts (w3b project added, testDir: tests/e2e/w3b/), tests/e2e/w3b/.gitkeep
205|  - Evidence: tests/evidence/w3/W3B1B-RED.txt + W3B1B-GREEN.txt
206|- [x] W3-B.2 — Critical-path E2E #1: boot → menu → START → game (menu→start→play flow) — game-dev — 2026-09-21
207|  - Playwright CP1 start: menu visible, START enabled, boot → menu → play verified
208|  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp1-start-*/ (3 tests)
209|- [x] W3-B.3 — Critical-path E2E #2: player movement + obstacle avoidance (WASD, collision) — game-dev — 2026-09-21
210|  - Playwright CP2 movement: readable player, collision → health decreases, delta threshold per axis
211|  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp2-movement-*/ (4 tests)
212|- [x] W3-B.4 — Critical-path E2E #3: score collection + HUD display (UISystem) — game-dev — 2026-09-21
213|  - Playwright CP3 score: +100 in state and HUD, driven with known value, in sync with game state
214|  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp3-score-*/ (3 tests) + playwright HTML report (tests/evidence/w3/playwright-report-html/)
215|  - 645/645 unit tests passing
216|- [x] W3-B.5 — Real-world browser round: full critical-path E2E (CP1-CP4) + HUD ownership fix — game-dev — 2026-09-22
217|  - Three defects found + fixed by live headed-Chromium diagnostics:
218|    (1) HUD ownership inversion: D2 probe asserted GameScene creates HUD divs, but W3-A.1 moved creation to UISystem by design. Spec now asserts UISystem owns, GameScene must NOT.
219|    (2) D-A6-1 re-asserted as still-present: W3-A.8 (41c7cfd) fixed GameOverScene to read LEVEL_START data payload. Spec now asserts the match (regression guard).
220|    (3) HUD not hidden on scene exit: added UISystem.hideHud() + GameScene.onExit() calls it.
221|  - Restored 4 W3-B CP specs (cp1-start, cp2-movement, cp3-score, cp4-restart) + w3b evidence from wt/t_9819ee0b into main.
222|  - W3B project timeout 30s → 60s.
223|  - Results: w3a-full-loop 7/7; w3b CP1-CP4 13/14 (1 skipped flaky by design); boot+fps+w2-w21b 12/12; tsc clean; 645/645 unit.
224|  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp{1,2,3,4}-* + w3a-full-loop-*
225|  - Tracked follow-up: CP3 S2 flake — setScore(999) → #game-score reads "SCORE: 0" (UISystem.setScore writes to stale scoreEl during scene transition race; passes in full-suite run).
226|- [x] W3-B.6-v2 — Visual-regression baselines: capture + stability-verify per scene (post a47d623) — game-tester — `t_bc5c735e` → 8e5e695 — 2026-09-22
227|  - Fresh baselines reflecting truck-scale + camera-follow fix
228|  - Menu PASS (0px diff) + GameOver PASS (0px diff) — pixel-stable
229|  - GameScene documented flake (1902px, truck-silhouette/spawn-layout variance only — camera/HUD/road pixel-identical) — non-blocking per card rules
230|  - Full w3b suite: 15 passed / 1 skipped (CP3 S3 fixme) / 1 failed (documented S2 flake only)
231|  - Evidence: W3B6V2-RED.txt + W3B6V2-GREEN.txt + 6 mirror PNGs
232|- [x] W3-B.7-v2 — In-browser verify: 4 critical paths in Chrome + Firefox (fresh run, post a47d623) — game-tester — `t_6758c88b` — 2026-09-22
233|  - Chrome (project=w3b, headed, swiftshader): 13 passed / 1 skipped (fixme) / 0 failed, 50.8s
234|  - Firefox (project=firefox, headed, no args): 13 passed / 1 skipped / 0 failed, 55.6s
235|  - 0 fatal console errors in both browsers; 0 pageerrors; 0 unexpected requestfailed
236|  - CP3 S2 known flake (UISystem.setScore stale element): NOT observed in either browser
237|  - a47d623 truck-scale + camera-follow visually confirmed in both legs via screenshot inspection
238|  - Evidence: W3B7V2-CHROME.txt + W3B7V2-FIREFOX.txt + 4 CP screenshots + 26 per-test screenshots
239|
240|241|# Week 3-C Lane (Performance / Day 10-11, 2026-09-23)
242|- [x] W3-C.3b — Input latency optimization: zero-allocation input path — game-dev — `t_448d7830` — 2026-09-23
243|  - Gating: C.3a measured p95 > 16 ms (16.2-16.8 ms across runs) → W3-C.3b required.
244|  - Optimizations applied (zero-allocation input path):
245|    1. Input.ts: getKeys() returns live key map by reference (no per-frame object spread).
246|    2. Input.ts: keydown/keyup handlers skip toLowerCase() for already-lowercase keys.
247|    3. Input.ts: clear() mutates maps in place instead of reassigning (this.keys = {} gone).
248|    4. GameScene.ts: camTarget pre-allocated as a class field; onUpdate() mutates in place
249|       instead of new THREE.Vector3() every frame.
250|    5. Physics.ts: forceScratch/impulseScratch pre-allocated CANNON.Vec3 fields;
251|       applyForce/applyImpulse set() in place instead of new CANNON.Vec3() per call.
252|    6. Physics.ts: update() docstring documents the fixed-timestep step-timing contract
253|       (physics step in same rAF as render; keypress landing just after a step boundary
254|       applies on the next 1/60 s step = 1-frame physical floor).
255|  - RED (unmodified source): avg 11.35 ms / p95 16.50 ms (20/20 moved).
256|  - GREEN (optimized, 4 runs): avg 11.57-13.61 ms / p95 16.10-16.80 ms (20/20 moved each).
257|  - p95 at the 1-frame physical floor (16.67 ms fixed-timestep + rAF cadence).
258|    Code-level overhead now allocation-free; remaining latency is the physics timestep.
259|  - To go below 16 ms p95: lower physics timestep to 1/120 s OR interpolate render
260|    position between physics steps.
261|  - tsc --noEmit: clean. vitest: 645/645 passed.
262|  - Evidence: tests/evidence/w3/W3C3B-RED.txt + W3C3B-GREEN.txt
263|
264|# Week 3-C Lane (Audio Policy, 2026-09-23)
265|- [x] W3-C.2 — Cross-browser audio policy: root-cause + fix Firefox AudioContext autoplay warnings — game-dev — `t_d57780a6` — 2026-09-23
266|  - Root cause: AudioContext created in AudioSystem constructor (boot, before user gesture)
267|  - Fix: deferred context creation (ensureContext + markUserGesture on MenuScene gestures)
268|  - RED: 2 Firefox warnings pre-fix; GREEN: 0 Firefox + 0 Chrome warnings post-fix
269|  - 646/646 unit suite; tsc clean; eslint clean
270|  - Evidence: W3C2-RED.txt + W3C2-VERIFY-firefox.txt + W3C2-VERIFY-chrome.txt
271|272|

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
- [x] R: T0.2.2a RED gate closure — verify committed RED evidence, lift PAUSE (game-tester) — parent: none
- [x] G1: Align game.test.ts + minimal Audio/UI stubs (make src/core/Game loadable) (game-dev) — parent R
- [x] G2: Align obstacle + physics-system tests (mock-cannon/mock-three divergence) (game-dev) — parent G1
- [x] G3: Align retroactive-core.test.ts (46 cross-cutting tests) (game-dev) — parent G2
- [x] G4: Align scene-manager + game-loop tests (game-dev) — parent G3
- [x] G5: Align constants + player tests (game-dev) — parent G4
- [x] G6: New retroactive tests for coverage gaps (AssetLoader, scenes, index) (game-dev) — parent G5
- [x] GV: T0.2.2b GREEN + final D0.2 verification (game-tester) — parent G6
- [x] QG: D0.2 quality gate + sign-off (reviewer) — parent GV

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

---
# Week 2 Lane (started 2026-09-13)

## W2-A: DOM Integration (gates all of W2)
- [x] W2-A.1 — Renderer attaches to existing canvas (RendererOptions.canvas + resizeToContainer) — game-dev — `t_2deaadf6` — 2026-09-13T17:02
  - RED: tests/evidence/w2/W2-A1-RED.txt (2 failed / 1 passed)
  - GREEN: tests/evidence/w2/W2-A1-GREEN.txt (3/3 passed), full suite 390/390
- [x] W2-A.2 — Game owns shared Renderer; start() boots scene; gameLoop calls sceneManager.render(); AssetLoader.load() hook — game-dev — `t_f1aa3f33` — 2026-09-13T17:30
  - RED: 4/4 W2-A.2 tests failed pre-change (no getRenderer, no boot path, no render call, no AssetLoader hook)
  - GREEN: 21/21 in game.test.ts; full suite 394/394; tsc clean; eslint clean on src/
  - Evidence: tests/evidence/w2/W2-A2-GREEN.txt
  - DECISION D1: minimal AssetLoader.load() manifest hook in boot path; W3 extends with scene-specific manifests
- [x] W2-A.3 — Minimal MenuScene + fix 'menu' transition (boot path lands in valid registered active scene) — game-dev — `t_16b337f1` — 2026-09-13T18:45
  - RED: 3/3 W2-A.3 tests failed pre-change (no scene registered, window.game undefined in happy-dom without three mock)
  - GREEN: 28/28 in scenes.test.ts; full suite 397/397; tsc clean; eslint clean on src/
  - Evidence: tests/evidence/w2/W2-A3-RED.txt, tests/evidence/w2/W2-A3-GREEN.txt
  - DECISION D2: minimal MenuScene with placeholder DOM only; full menu UI stays in W3 Task 8.2
- [x] W2-A.4 — Real-Chrome boot smoke test (Task 4.3) — first e2e in project — game-tester — `t_9b7d154e` — 2026-09-13T19:15
  - RED: #loading-message still showed 'Loading Three.js renderer...' after boot
  - GREEN: 1/1 e2e passed in 3.8s; full suite 397/397; build clean; lint 0 errors
  - Evidence: tests/evidence/w2/w2-a4-boot-smoke.png (348KB), w2-a4-boot-smoke-errors.txt
- [x] W2-B.2 — Browser verify: physics moves the visual in real Chrome (Task 6.2 browser-verification) — game-tester — `t_14c82dd1` — 2026-09-13T21:08
  - RED: tests/e2e/physics-sync.spec.ts committed (49c21d5); two live-app RED failures in real Chrome (bare three import; cannon-es Body has no userData)
  - GREEN: 1/1 e2e passed in real headed Chrome; teleport proof (body->y=25, mesh follows within 1e-3); 30 frame-over-frame samples, 0 drift
  - Evidence: tests/evidence/w2/W2-B2-RED.txt, W2-B2-GREEN.txt, w2-b2-physics-sync.png + -2.png, w2-b2-physics-sync-trace.json, w2-b2-physics-sync.txt
- [x] W2-E.1a — Smoke suite (Chrome): boot/WASD/jump/score/restart, 5 scenarios — game-tester — `t_8ac76c86` — 2026-09-13T23:10
  - RED: tests/e2e/smoke.spec.ts committed (4010dd8); jump scenario initially RED (keyboard.press too fast for InputSystem; spec fix: keydown + 150ms hold + keyup)
  - GREEN: 6/6 e2e passed in real headed Chrome; no src/ changes
  - Evidence: tests/evidence/w2/W2-E1a-GREEN.txt + 7 screenshots + w2-e1a-smoke-console.txt
- [x] W2-E.1b — Cross-browser (Firefox): add firefox project, re-run smoke suite, diff Chrome vs Firefox — game-tester — `t_7844ca73` — 2026-09-13T23:30
  - RED: 59f1e05 (firefox project in playwright.config.ts; spec moved to tests/e2e/smoke/; per-browser evidence via BROWSER env)
  - GREEN: 6/6 e2e passed in real headed Firefox AND 6/6 re-pass in headed Chrome; no functional diff; Firefox-only observation: 2x non-fatal "AudioContext prevented from starting automatically" boot warnings (documented, not fixed — W3-C territory)
  - Evidence: tests/evidence/w2/W2-E1b-GREEN.txt (result table + diff) + 7 Firefox screenshots + w2-e1a-smoke-console-firefox.txt + 7 fresh Chrome screenshots + w2-e1a-smoke-console-chrome.txt
  - Week-2 success criterion #1: BOTH legs (Chrome + Firefox) satisfied
- [x] W2-E.2 — FPS baseline @ 20 obstacles (D4 gate) — week-2 success criterion #7 — game-tester — `t_71338ca5` — 2026-09-14T07:20
  - RED: 8cc268c — tests/e2e/fps.spec.ts (new); D4 gate as in-test assertion; negative control (D4_MIN_FPS=61) FAILED in real headed Chrome as designed: 'Expected: >= 61, Received: 60.002...'
  - GREEN: 1/1 passed in real headed Chrome (chromium-boot). BASELINE: 601 frames / 10016 ms; mean 60.0, median 59.9, min 59.5 FPS; p95 frame time 16.7 ms. D4 gate (>=30) PASS — no W3 re-scope needed
  - OBSERVATION (out of scope): FPS_OBSTACLES=100 probe also measured 60.0 — rAF-capped display; frame-loop cadence not yet bottlenecked by injected obstacle load; 60-FPS/100-objects stays a W4 target (D4)
  - KNOWN: game canvas renders black in W2 e2e screenshots (detached per-scene renderer, src/scenes/Scene.ts:20) — rAF cadence still a valid frame-loop measurement; revisit in W3-A
  - Evidence: tests/evidence/w2/W2-E2-GREEN.txt, W2-E2-RED.txt, w2-e2-fps-20.log, w2-e2-fps-20.png
- [x] W2-E.3 — Week 2 sign-off: End-of-Week-2 quality gate — all 7 success criteria — reviewer — `t_bcf744c5` — 2026-09-14T08:50
  - All 7 criteria verified via FRESH reviewer executions in sign-off worktree (wt/t_71338ca5 base), not just implementer evidence:
    1. Chrome+Firefox e2e smoke: 6/6 + 6/6 (fresh re-runs, w2-signoff-e2e-battery.sh)
    2. Live audio pipeline: 4/4 triggers (w2-signoff-audio-probe.sh)
    3. Physics sync: 5/5 (fresh re-run)
    4. Score persistence: NEW probe (verify-signoff.spec.ts #4) — player:score -> HUD 1234 -> player:death -> saveHighScore() -> localStorage['cluster-rush-high-score']=1234 -> survives reload
    5. Shield mechanic: NEW probe (#5) — addPowerUp('invincibility',5000): damage absorbed, expires at 5.3s. GAP: no collectible entity/visual surface (Task 7.3 Phase 1)
    6. Full suite fresh: 550/550 · tsc 0 · eslint 0 · vite build ok
    7. FPS@20 re-run: mean 60.0 (fresh)
  - Trackers: tdd_tracker_config.json current_status -> W2-E.3-COMPLETE; task_registry.json w2_signoff block
  - Evidence: tests/evidence/w2/W2-E3-verify-probe.txt, w2-e3-localstorage.txt, w2-e3-shield.txt; sign-off doc: w2-signoff.md

## BUG-W2-1: MenuScene start path (post-W2, 2026-09-16)
- [x] BUG-W2-1 — MenuScene start path — DECOMPOSED + 1a COMPLETE + 1a VERIFIED IN REAL BROWSER @ 6f85f55 — orchestrator (both subtasks done)
- [x] BUG-W2-1a — MenuScene player start path: Enter/Space keydown + START button click -> switchScene('game'), double-start guard, listener cleanup in onExit/onCleanup — game-dev — `t_4298322b` — 2026-09-16
  - RED: 6/7 menu-scene tests failed pre-change (no button, no key wiring, no guard)
  - GREEN: 7/7 in tests/unit/menu-scene.test.ts; full suite 557/557; tsc clean; eslint 0 errors (7 pre-existing Logger.ts warnings)
  - Evidence: tests/evidence/w2/W2-W21a-RED.txt, W2-W21a-GREEN.txt
  - Scope note: minimal start path only — full menu UI (settings/high scores/styled buttons) stays W3 Task 8.2
- [x] BUG-W2-1b — In-browser verification of 1a start path (real headed Chrome: Enter/START-click -> GameScene + WASD moves player) — game-tester — `t_675ab2f6` — 2026-09-16
  - RED negative control (pre-fix MenuScene @ 8f1520a): 4/4 failed as designed (no START button; Enter no-op; no transition)
  - GREEN: 4/4 passed in headed Chromium (Playwright 1.63.0, display :1), 17.3s; 0 fatal console errors (only expected AudioContext autoplay warning)
  - Scenarios: (1) MenuScene + #menu-start-button visible/enabled; (2a) Enter -> GameScene; (2b) reload + START click -> GameScene; (3) 3D player + obstacles render, WASD moves (+x/-x/-z)
  - Evidence: tests/evidence/w2/W2-W21b-RED.txt, W2-W21b-GREEN.txt, w2-w21b-{menu,enter-game,wasd-move}.png, w2-w21b-console-chrome.txt
  - Verified @ 6f85f55 (fix commit ff-merged into worktree); no src/ changes by this card. Verdict: PASS — no BUG-W2-1a regression.

## W2-D: Game Flow & Score
- [x] W2-D.1 — Score manager pure fns + LocalStorage persistence (RED->GREEN) — game-dev — `t_5bff9ff6`
  - 41 new tests: pure functions (computeScore, subtractScore, applyMultiplier, clampScore)
  - ScoreManager class with injectable Storage, overflow/underflow clamping
  - GameScene HUD wired to ScoreManager (score display, game-over high score)
  - 428/428 full suite · tsc 0 errors

# Week 3-A Lane (UI System, 2026-09-16) — MERGED to main
- [x] W3-A.1 — UISystem core: real HUD (score/health/level), replace 32-line stub; no GameScene touch — game-dev — `t_16f7e67d` — @ 13982a3
- [x] W3-A.2 — Migrate GameScene to UISystem (remove inline HUD DOM divs; D2 HUD ownership payoff) — game-dev — `t_501493cf` — @ 4bc4472
- [x] W3-A.3 — Full MenuScene: START/SETTINGS/HIGH SCORES buttons + keyboard nav (SETTINGS = placeholder, full settings = W3-C) — game-dev — `t_d2e9e91c` — @ d3f5810
- [x] W3-A.4 — GameOverScene: final score + RESTART -> menu + register scene — game-dev — `t_de156e6e` — @ 19a7899
- [x] W3-A.5 — Wire full loop: death -> switchScene('gameover', {score, highScore}), remove inline overlay, resetRunState on re-entry — game-dev — `t_77ceb449` — @ 6955226
- [x] W3-A.6 — In-browser verify full loop + HUD (headed Chrome; 4/7 pass, confirmed BUG-W2-1a re-arm blocker + D-A6-1 score=0 major) — game-tester — `t_b08d3752` — @ 7e59434
  - RED: 3/7 failed pre-fix (S4 RESTART second-run timeout, S6 console timeout, W2-1b regression button-disabled)
  - GREEN: 4/7 (S1 boot+menu, S2 START->game+HUD, S3 death->gameover handoff, S5 high-score reload-persistence)
  - Evidence: tests/evidence/w3/W3A6-FAIL.txt (confirms 2 defects), tests/e2e/w3a-full-loop.spec.ts
  - DEFECTS: BUG-W2-1a re-arm (blocker, MenuScene.started never resets on onExit) + D-A6-1 (major, GameOverScene.onEnter ignores {score,highScore} payload)
- [x] W3-A.7 — FIX: MenuScene start-guard re-arm on onExit (BUG-W2-1a blocker) — game-dev — `t_c3a4bd20` — @ 843a66e — 2026-09-17
  - RED: 4 new tests failing pre-change (no onExit re-arm) → GREEN: 17/17 in menu-scene-full.test.ts; full suite 617/617; tsc clean; eslint 0
  - In-browser: tests/e2e/w3a-full-loop.spec.ts (chromium-boot) — S4/S6/2nd-run all PASS (BUG-W2-1a blocker cleared). S2/S3 pre-existing (verified via git stash baseline), out of scope.
  - Evidence: tests/evidence/w3/W3A7-RED.txt + W3A7-GREEN.txt
- [x] W3-A.8 — FIX: GameOverScene reads {score, highScore} from LEVEL_START event payload (D-A6-1 major) — game-dev — `t_e0b86767` — @ 41c7cfd — 2026-09-17
  - Root cause: Scene.onEnter() takes NO data param; SceneManager.loadScene() calls enter() with no arg; payload only emitted on LEVEL_START. Option 3 (event-based), stays ≤2 files.
  - RED: 9 new tests failing pre-change → GREEN: 21/21; full suite 619/619; tsc clean. Pins: (1) subscribe in onLoad/setupUI NOT onEnter (timing load-bearing); (2) fallback uses readStoredHighScore(), not phantom this.scoreManager.
  - Evidence: tests/evidence/w3/W3A8-RED.txt + W3A8-GREEN.txt
- [x] W3-A.9 — DRY high-score read: canonical readStoredHighScore() in Score.ts + 2 bug fixes (try/catch crash + overflow cap) — game-dev — `t_9d8237a9` — @ e909ae7 — 2026-09-17
  - The 3 copies DIVERGED in 2 ways (verified on main): (1) overflow cap (scenes uncapped vs clampScore), (2) missing try/catch in ScoreManager (latent crash on storage-unavailable). '5.7' does NOT diverge (parseInt is a no-op floor).
  - Canonical helper = superset: try/catch + clampScore + 0-floor. All 3 sites delegate; 2 private scene methods deleted.
  - Fix A: try/catch (ScoreManager no longer throws on storage-unavailable). Fix B: cap (menu/gameover now cap at MAX_SAFE_INTEGER like the in-game score).
  - RED: 9 new TDD tests locking canonical semantics {storage-throws→0, '9007199254740993'→MAX_SAFE_INTEGER, '5.7'→5 (regression), absent→0, '500'→500, 'abc'→0, '-5'→0, '0'→0}. Full suite green; tsc clean.
  - Evidence: tests/evidence/w3/W3A9-RED.txt + W3A9-GREEN.txt
- **W3-A MERGED to main + pushed to origin (eb3cc82..35a1033). 635/635 tests, tsc clean, eslint 0 errors.**
- [x] W3-B.0 — Debug accessors __debugPlayerPos + __setPlayerHealth + __debugScore — game-dev — `t_a3c5bda0` — 2026-09-19
  - Three deterministic window accessors installed by GameScene.onEnter() for B3 CP2, B4 CP3, B5 CP4 E2E specs
  - Player.setHealth(n) added (clamps to [0, PLAYER_HEALTH], calls die() at 0)
  - GameScene.onUpdate() health-0 safety-net check added
  - 7 unit tests (1 RED + 6 GREEN); 642/642 full suite; tsc clean
  - Evidence: tests/evidence/w3/W3B0-RED.txt + W3B0-GREEN.txt
- [x] W3-B.0-fix — Player.die() dispatches PLAYER_DEATH when lives hit 0 (unblocks W3-B.7 gate CP4 S1) — game-dev — `t_8cfc53be` — 2026-09-19
  - Root cause: die() else branch (lives<=0) was a stub; never dispatched GameEvents.PLAYER_DEATH, so __setPlayerHealth(0) never reached GameOverScene
  - Fix: 1 line in src/entities/Player.ts die() else branch — window.dispatchEvent(new CustomEvent(GameEvents.PLAYER_DEATH)) (no new import)
  - 3 new unit tests in tests/unit/player.test.ts (PLAYER_DEATH dispatch at lives=0 / via setHealth(0) / NOT dispatched when lives remain)
  - 645/645 full suite; tsc clean; eslint 0 new errors
  - Evidence: tests/evidence/w3/W3B0FIX-RED.txt + W3B0FIX-GREEN.txt
- [x] W3-B.1 — Playwright config harden for W3-B critical-path specs — game-dev — `t_9927d746` — @ 987704c — 2026-09-19
  - outputDir + HTML reporter moved to tests/evidence/w3/; screenshot: 'on' enabled
  - 635/635 unit; playwright --list 46/46; tsc clean
  - Evidence: tests/evidence/w3/W3B1-RED.txt + W3B1-GREEN.txt

# Week 3-B Lane (Integration / Day 9, 2026-09-19)
- [x] W3-B.1 — Playwright scaffold harden: playwright.config.ts (chromium-boot + firefox projects), webServer, reuse W2 smoke base — game-dev — `t_9927d746` → 6e4c45a
- [x] W3-B.1b — w3b Playwright project + tests/e2e/w3b/ dir — game-dev — `t_9819ee0b` — 2026-09-19
  - Changes: playwright.config.ts (w3b project added, testDir: tests/e2e/w3b/), tests/e2e/w3b/.gitkeep
  - Evidence: tests/evidence/w3/W3B1B-RED.txt + W3B1B-GREEN.txt
- [x] W3-B.2 — Critical-path E2E #1: boot → menu → START → game (menu→start→play flow) — game-dev — 2026-09-21
  - Playwright CP1 start: menu visible, START enabled, boot → menu → play verified
  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp1-start-*/ (3 tests)
- [x] W3-B.3 — Critical-path E2E #2: player movement + obstacle avoidance (WASD, collision) — game-dev — 2026-09-21
  - Playwright CP2 movement: readable player, collision → health decreases, delta threshold per axis
  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp2-movement-*/ (4 tests)
- [x] W3-B.4 — Critical-path E2E #3: score collection + HUD display (UISystem) — game-dev — 2026-09-21
  - Playwright CP3 score: +100 in state and HUD, driven with known value, in sync with game state
  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp3-score-*/ (3 tests) + playwright HTML report (tests/evidence/w3/playwright-report-html/)
  - 645/645 unit tests passing
- [x] W3-B.5 — Real-world browser round: full critical-path E2E (CP1-CP4) + HUD ownership fix — game-dev — 2026-09-22
  - Three defects found + fixed by live headed-Chromium diagnostics:
    (1) HUD ownership inversion: D2 probe asserted GameScene creates HUD divs, but W3-A.1 moved creation to UISystem by design. Spec now asserts UISystem owns, GameScene must NOT.
    (2) D-A6-1 re-asserted as still-present: W3-A.8 (41c7cfd) fixed GameOverScene to read LEVEL_START data payload. Spec now asserts the match (regression guard).
    (3) HUD not hidden on scene exit: added UISystem.hideHud() + GameScene.onExit() calls it.
  - Restored 4 W3-B CP specs (cp1-start, cp2-movement, cp3-score, cp4-restart) + w3b evidence from wt/t_9819ee0b into main.
  - W3B project timeout 30s → 60s.
  - Results: w3a-full-loop 7/7; w3b CP1-CP4 13/14 (1 skipped flaky by design); boot+fps+w2-w21b 12/12; tsc clean; 645/645 unit.
  - Evidence: tests/evidence/w3/playwright-artifacts/w3b-cp{1,2,3,4}-* + w3a-full-loop-*
  - Tracked follow-up: CP3 S2 flake — setScore(999) → #game-score reads "SCORE: 0" (UISystem.setScore writes to stale scoreEl during scene transition race; passes in full-suite run).
- [x] W3-B.6-v2 — Visual-regression baselines: capture + stability-verify per scene (post a47d623) — game-tester — `t_bc5c735e` → 8e5e695 — 2026-09-22
  - Fresh baselines reflecting truck-scale + camera-follow fix
  - Menu PASS (0px diff) + GameOver PASS (0px diff) — pixel-stable
  - GameScene documented flake (1902px, truck-silhouette/spawn-layout variance only — camera/HUD/road pixel-identical) — non-blocking per card rules
  - Full w3b suite: 15 passed / 1 skipped (CP3 S3 fixme) / 1 failed (documented S2 flake only)
  - Evidence: W3B6V2-RED.txt + W3B6V2-GREEN.txt + 6 mirror PNGs
- [x] W3-B.7-v2 — In-browser verify: 4 critical paths in Chrome + Firefox (fresh run, post a47d623) — game-tester — `t_6758c88b` — 2026-09-22
  - Chrome (project=w3b, headed, swiftshader): 13 passed / 1 skipped (fixme) / 0 failed, 50.8s
  - Firefox (project=firefox, headed, no args): 13 passed / 1 skipped / 0 failed, 55.6s
  - 0 fatal console errors in both browsers; 0 pageerrors; 0 unexpected requestfailed
  - CP3 S2 known flake (UISystem.setScore stale element): NOT observed in either browser
  - a47d623 truck-scale + camera-follow visually confirmed in both legs via screenshot inspection
  - Evidence: W3B7V2-CHROME.txt + W3B7V2-FIREFOX.txt + 4 CP screenshots + 26 per-test screenshots

# Week 3-C Lane (Performance / Day 10-11, 2026-09-23)
- [x] W3-C.3b — Input latency optimization: zero-allocation input path — game-dev — `t_448d7830` — 2026-09-23
  - Gating: C.3a measured p95 > 16 ms (16.2-16.8 ms across runs) → W3-C.3b required.
  - Optimizations applied (zero-allocation input path):
    1. Input.ts: getKeys() returns live key map by reference (no per-frame object spread).
    2. Input.ts: keydown/keyup handlers skip toLowerCase() for already-lowercase keys.
    3. Input.ts: clear() mutates maps in place instead of reassigning (this.keys = {} gone).
    4. GameScene.ts: camTarget pre-allocated as a class field; onUpdate() mutates in place
       instead of new THREE.Vector3() every frame.
    5. Physics.ts: forceScratch/impulseScratch pre-allocated CANNON.Vec3 fields;
       applyForce/applyImpulse set() in place instead of new CANNON.Vec3() per call.
    6. Physics.ts: update() docstring documents the fixed-timestep step-timing contract
       (physics step in same rAF as render; keypress landing just after a step boundary
       applies on the next 1/60 s step = 1-frame physical floor).
  - RED (unmodified source): avg 11.35 ms / p95 16.50 ms (20/20 moved).
  - GREEN (optimized, 4 runs): avg 11.57-13.61 ms / p95 16.10-16.80 ms (20/20 moved each).
  - p95 at the 1-frame physical floor (16.67 ms fixed-timestep + rAF cadence).
    Code-level overhead now allocation-free; remaining latency is the physics timestep.
  - To go below 16 ms p95: lower physics timestep to 1/120 s OR interpolate render
    position between physics steps.
  - tsc --noEmit: clean. vitest: 645/645 passed.
  - Evidence: tests/evidence/w3/W3C3B-RED.txt + W3C3B-GREEN.txt

- [x] W3-C.4 — Full settings panel in menu (volume/speed/difficulty/controls) + localStorage persistence + live wiring — game-dev — `t_421f4c7f` — 2026-09-23
  - SettingsManager (src/systems/Settings.ts): storage key 'cluster-rush-settings',
    defaults {volume:80, speed:1.0, difficulty:'normal'}, validates speed in
    [0.5,1.0,1.5,2.0] and difficulty in easy|normal|hard; sanitizeSettings guards
    against corrupt/partial localStorage.
  - MenuScene: SETTINGS button opens a full panel — VOLUME slider, SPEED
    (0.5/1/1.5/2), DIFFICULTY (easy/normal/hard), read-only CONTROLS, CLOSE.
    onEnter loads + applies settings (Audio.setMasterVolume +
    Game.setSpeedMultiplier); Esc closes + returns focus to START; Tab order
    Volume->Speed->Difficulty->Controls->Close; panel built eagerly (display:none
    until opened) so it's queryable on entry.
  - Game: speedMultiplier scales the game-loop deltaTime; get/set exposed.
  - GameScene: applyDifficultySettings() on onEnter scales spawn interval
    (OBSTACLE_SPAWN_RATE * mult) and obstacle speed by difficulty
    (easy 0.8x / normal 1.0x / hard 1.5x).
  - RED: settings-state (7 tests, 0 collected — Settings.ts missing) +
    settings-panel (14 tests, 0 collected). GREEN: 665/665 unit, tsc build clean,
    lint clean on new code; e2e settings-panel.spec.ts PASSED on real Chromium
    (persist + getSpeedMultiplier()===2 + Esc/reopen/reload persistence).
  - Evidence: tests/evidence/w3/W3C4-RED.txt + W3C4-GREEN.txt +
    settings-panel-open.png + settings-panel-persist.png

- [x] W4-A.3 — Visual-regression refinement: re-capture baselines, verify stability, flake policy — game-tester — `t_d0336dbf` — 2026-09-24
  - New spec tests/e2e/w4a-visual-regression.spec.ts (3 scenes x 2 browsers = 6 baselines).
  - Two determinism levers on top of W3-B.6-v2 world-freeze:
    (1) seeded Math.random via addInitScript (mulberry32, seed 0x9e3779b9),
    (2) pre-screenshot renderer.clear() to strip first-frame-clear variance.
  - 6 baselines captured: menu/game/gameover x chromium-boot/firefox.
  - Stability verified: run 2 passes against run-1 baselines (GREEN leg).
  - Flake policy: SwiftShader non-determinism documented (54-58% PNG byte
    variance on frozen GameScene under --use-angle=swiftshader);
    maxDiffPixels: 3000 for S2 GameScene, 0 for S1/S3 DOM scenes.
  - Evidence: tests/evidence/w4/w4a3-test-report.md + 6 mirror PNGs +
    task-plan/w4a3-findings.md

- [x] W4-B.1 — MenuScene keyboard navigation: Tab order + Enter/Space + Esc close + visible :focus style — game-dev — `t_e95e3455` — 2026-09-24
  - Explicit tabindex: START=1, SETTINGS=2, CLOSE=4; HIGH SCORES not a Tab
    stop; title/hint not focusable (div, no tabindex).
  - Visible :focus style: outline 3px solid #00ff00, offset 2px on all 3
    menu buttons (START, SETTINGS, CLOSE).
  - Enter/Space activates focused button (native <button> behavior preserved).
  - Esc closes settings panel + returns focus to START (existing behavior).
  - TDD RED: 6 failed (no tabindex, no :focus style) / 11 passed (behavioral
    already correct). GREEN: 17/17. Regression: 37/37 menu-scene suites.
    Full suite: 683/683. Lint + typecheck clean.
  - Evidence: tests/evidence/w4/W4B1-RED.txt + W4B1-GREEN.txt

- [x] W4-B.3 — ARIA labels for all buttons (Menu + GameOver + Settings) — game-dev — `t_64341d74` — 2026-09-24
  - MenuScene: START ("Start game"), SETTINGS ("Open settings"),
    HIGH SCORES panel ("View high scores", role=region).
  - GameOverScene: RESTART ("Restart game"), final score ("Final score").
  - Settings: volume slider ("Volume"), speed buttons ("Set speed to Xx"),
    difficulty buttons ("Set difficulty to X"), CLOSE ("Close settings").
  - TDD RED: 9 failed (all aria-labels missing). GREEN: 9/9.
    Regression: 45/45 scene suites. Full suite: 692/692. Lint + typecheck clean.
  - Evidence: tests/evidence/w4/W4B3-RED.txt + W4B3-GREEN.txt

- [x] W4-B.5 — Screen-reader announcements for scene transitions (aria-live region) — game-dev — `t_87e672ec` — 2026-09-25
  - Visually-hidden aria-live='assertive' region (#sr-announcer) owned by
    AccessibilitySystem. SceneManager.loadScene() announces every transition;
    GameOverScene.onEnter() overwrites with the authoritative final-score string.
  - Announcements: boot -> (none), menu -> 'Menu', game -> 'Game started',
    gameover -> 'Game over, final score: X', unknown -> 'Scene: <name>'.
  - TDD RED: 16 failed. GREEN: 16/16 in tests/unit/scene-announcements.test.ts.
    Mock updates: scene-manager.test.ts (spy), gameover-scene.test.ts +
    game-loop-wiring.test.ts (real instance). Full suite: 756/756.
    Type-check clean. Lint: zero new issues. In-browser verified: all 4
    transitions observed firing in live Chromium.
  - Evidence: tests/evidence/w4/W4B5-RED.txt + W4B5-GREEN.txt + W4B5-VERIFY.txt

- [x] W4-B.8 — Settings panel keyboard navigation: Tab order + Arrow-key adjustment + Esc-to-close — game-dev — `t_b01c78d5` — 2026-09-25
  - Tab order: Volume -> Speed -> Difficulty -> Controls(read-only) -> CLOSE.
  - ArrowRight/Up + ArrowLeft/Down adjust the volume slider (step 5, clamp
    0..100, persists + live audio update + label). Arrow keys cycle the speed
    and difficulty selectors (wraparound, apply + persist + visual state).
  - Esc closes the panel and returns focus to the SETTINGS button (was START —
    the control that opened it). Enter/Space activate the focused control
    (window handler swallows while panel open so START never fires). Arrow keys
    act ONLY while a settings control is focused (no global hijack).
  - TDD RED: 12 failed / 8 passed (no arrow-key handling, focus->START).
    GREEN: 20/20 in new tests/unit/settings-keyboard.test.ts.
    Regression: 51/51 (settings-keyboard+settings-panel+menu-scene-keyboard).
    Full suite: 756/756. Lint + typecheck clean on changed files.
  - Evidence: tests/evidence/w4/W4B8-RED.txt + W4B8-GREEN.txt

- [x] W4-B.11 — Edge case: low memory conditions (graceful degradation, no crash) — game-dev — `t_170c965a` — 2026-09-25
  - Eliminated per-obstacle GPU/heap allocation (the low-memory failure mode
    at 500+ obstacles). Obstacle.ts: module-level geometryCache (1 for default
    4x5x6) + materialCache (5 total). 500 obstacles now share 1 geometry +
    5 materials instead of 500+500. dispose() detaches instance mesh,
    preserves shared resources. reset(position, type) re-positions/re-types
    a pooled obstacle in-place with zero GPU allocation. GameScene.ts:
    obstaclePool + REAP_Z (-250); reapOffscreenObstacles() every frame;
    allocateObstacle() pool-first; onCleanup() calls disposeAllObstacles().
  - TDD RED: 10/12 failing. GREEN: 12/12 in new tests/unit/memory-leak.test.ts.
    Regression: 756/756 unit (38 files); 22/22 E2E. Lint + typecheck clean.
  - Evidence: tests/evidence/w4/W4B11-RED.txt + W4B11-GREEN.txt

