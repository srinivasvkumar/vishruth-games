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
- [ ] BUG-W2-1 — MenuScene start path — DECOMPOSED + 1a COMPLETE + 1a VERIFIED IN REAL BROWSER @ 6f85f55 — orchestrator
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

