# W3-C.3a — Input latency measurement: key press → visual response

Task ID: t_ee6106c3 (W3-C.3a — input latency, target < 16ms = 1 frame @ 60fps)
Workspace: scratch @ /home/srinivasvkumar/.hermes/kanban/boards/cluster-rush/workspaces/t_ee6106c3
Repo (work directly, main checkout): /home/srinivasvkumar/vishruth/games/clusterrush
Branch: main @ 7b73e1c (W3-B merged)

## Objective
MEASURE input-to-frame latency in real headed Chrome. Target: < 16ms (1 frame @ 60fps).
Write tests/e2e/w3c-input-latency.spec.ts; run via chromium-boot; log avg/min/max/p95.
Outcome: if avg (or p95) latency <= 16ms → W3-C.3b NOT required; else REQUIRED + document gap+top suspect.

## Design (measurement method — decided up front)
- Boot to menu, Enter → GameScene. Clear input (keyup all), settle player.
- Per trial (W key = forward, z decreases at 5.0 units/s):
  1. Read baseline pos P0 = window.__debugPlayerPos().
  2. In-page: start a rAF sampler polling the player mesh position every frame.
  3. Fire `page.keyboard.down('w')` (keydown delivered via CDP); capture T_press = performance.now() via a
     window 'keydown' listener added in-page (fires at the exact moment the DOM keydown lands).
  4. Sampler resolves when P.z first differs from P0.z by > EPS; latency = T_firstMoveFrame - T_keydown.
  5. `page.keyboard.up('w')`; teleport player back to spawn (scene-graph) + settle 2 frames.
- 15 trials → avg/min/max/mean/median/p95 + per-trial list + frame delta per trial.
- Scene-transition latency (Enter game→gameover) as a secondary metric (feasible via __setPlayerHealth(0)
  + rAF poll of scene manager current-scene name / #game-score removal). Best-effort, recorded, not a gate.
- EPS: position delta threshold. At 60fps one frame moves z by 5.0/60 ≈ 0.083 units. Use EPS = 0.02 units
  (well under a single-frame move) so we catch the FIRST frame the position changed, not the second.

## Phases
- [x] Phase 0: orient + env checks (DONE: repo, accessors, constants, pre-commit, dev-server status)
- [x] Phase 1: RED — confirmed no input-latency spec exists; captured "No tests found" run → W3C3A-RED.txt
- [x] Phase 2: GREEN — wrote tests/e2e/w3c-input-latency.spec.ts; ran via chromium-boot; measures + logs; screenshot → W3C3A-GREEN.txt
- [x] Phase 3: VERIFY — 20/20 trials moved; avg 12.63ms, p95 16.2ms; tsc clean; methodology + screenshot; W3-C.3b outcome documented
- [x] Phase 4: commit — SKIPPED by design: task scope is "write spec + run + record evidence"; commit is orchestrator's job (working in scratch workspace, not a git worktree of the repo; untracked W3-C files accumulate for the orchestrator to merge). Evidence + spec are in place.

## Files
- tests/e2e/w3c-input-latency.spec.ts (new) ✓
- tests/evidence/w3/W3C3A-RED.txt (new) ✓
- tests/evidence/w3/W3C3A-GREEN.txt (new) ✓
- tests/evidence/w3/w3c-input-latency.png (screenshot) ✓
- tests/evidence/w3/playwright-artifacts/w3c-input-latency-*/test-finished-1.png (pass screenshot) ✓
- GameScene.ts debug accessor — NOT NEEDED: window.__debugPlayerPos already exists + player
  mesh is reachable via getSceneManager().getCurrentScene().getScene().getChildren. No src change.

## FINDINGS (evidence-backed)
- **Result**: 20/20 trials observed a position change. Latency avg=12.63ms, min=1.8ms, median=14.3ms,
  max=16.2ms, p95=16.2ms. All 20 in the 1.8-16.2ms range = solidly 1 frame @ 60fps.
- **Strict 16ms gate**: avg PASSES (12.6ms), p95 marginally exceeds by 0.2ms (16.2 vs 16.0).
  This is at the 1-frame PHYSICAL boundary (true 1 frame = 16.67ms). The game achieves ~1-frame
  input latency; p95=16.2ms is 1.25% over the strict gate — NOT a 2-frame (~33ms) defect.
- **W3-C.3b (optimization)**: Formally "REQUIRED" by the strict <16ms p95 gate, but the gap is
  0.2ms (at the physical 1-frame floor). Recommend: document as a boundary finding, NOT a code defect.
  No optimization is warranted — the input path is already at the 1-frame limit.
- **Scene-transition secondary**: NOT observed in this environment. __setPlayerHealth(0) does not
  trigger the FSM playing→gameOver transition in headless SwiftShader (verified via probe: FSM stays
  'playing' 2000ms+ after the call). Best-effort, non-gate — documented honestly.
- **BUG FIXED during GREEN**: initial spec had a fatal flaw — the in-page rAF sampler was started but
  `page.keyboard.down('w')` was NEVER fired (the 250ms sanity hold was a separate pre-loop hold, so the
  sampler timed out with 0 moves on all 15 trials). Fixed by wrapping the sampler + keydown in Promise.all
  with the keydown fired concurrently ~80ms after the sampler arms. Also: (a) stamped firstMove with
  performance.now() instead of the rAF callback's frame-start `now` (which produced spurious negative
  latencies), (b) bumped keydown delay 30ms→80ms to eliminate the listener-arming race.

## Risks / open questions (resolved)
- Q1 (keyboard.down delivers keydown?): RESOLVED — in-page window listener fires on the CDP keydown;
  20/20 trials confirm the input path is live.
- Q2 (frame timing): RESOLVED — measured latencies 1.8-16.2ms = 1 frame, matching W3-C.1a p95 frame
  time of 16.8ms. Fixed-step accumulator explains the sub-1-frame variance.
- Q3 (player drift): RESOLVED — teleport to spawn + full health + 120ms settle each trial; no game-over
  hit across 20 trials.
- Q4 (tracker-drift gate): N/A — not committing (orchestrator's job). If committing, stage the 4 trackers
  alongside tests/evidence/ (or the new spec, which makes it not "evidence-only").

## Errors
| # | Error | Fix |
|---|-------|-----|
| 1 | 0/15 trials moved (sampler timed out) | keydown was never fired after the sampler armed — wrapped sampler+keydown in Promise.all, fired keydown ~80ms after sampler arms |
| 2 | Spurious negative latencies (firstMove < keydown) | stamped firstMove with performance.now() at detection instead of the rAF callback's frame-start `now` param |
| 3 | keydown fired before in-page listener armed (race) | bumped keydown delay 30ms → 80ms (~5 frames) |
| 4 | Scene-transition secondary "not observed" | __setPlayerHealth(0) doesn't trigger FSM transition in headless SwiftShader; documented honestly as best-effort, not a gate |
