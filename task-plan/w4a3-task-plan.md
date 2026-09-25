# W4-A.3 — Visual-regression refinement: re-capture baselines + verify stability + flake policy

Kanban: t_d0336dbf | Assignee: game-tester
Repo: /home/srinivasvkumar/vishruth/games/clusterrush @ c8bcead
Date: 2026-09-24 (AEST)

## Goal
1. Re-capture pixel-stable baselines for MenuScene + GameOverScene.
2. GameScene: attempt DETERMINISTIC capture (new lever: pre-boot Math.random
   seed + world-freeze + pre-screenshot renderer.clear()). If still flaky,
   document flake risk + capture policy.
3. Run 2 consecutive captures; verify pixel-identical across runs.
4. Document flake policy.
5. Run in Chrome (chromium-boot, SwiftShader) + Firefox (GPU).

## Deliverables (files <= 2 + evidence)
- tests/e2e/w4a-visual-regression.spec.ts   (new spec)
- tests/evidence/w4/W4A3-flake-policy.md     (flake policy doc)
- tests/evidence/w4/W4A3-RED.txt             (first-run evidence)
- tests/evidence/w4/W4A3-GREEN.txt           (stability-run evidence)

## Determinism design (the new lever)
The W3-B.6-v2 GameScene baseline flaked on spawn LAYOUT: 3 initial obstacles
spawn via unseeded Math.random() in GameScene.onLoad() (before any rAF tick,
i.e. during menu → Enter transition), so frame-freezing cannot retroactively
determinize them. New lever:
- (a) Seed Math.random in page context BEFORE goto() (Playwright addInitScript
      runs on every frame/iframe before page scripts; app code not yet
      executed at that point).
- (b) World-freeze: rAF monkeypatch → frozen timestamps (zero-delta sim
      updates; 'moving' obstacle sin(t) frozen since t constant; 'rotating'
      obstacles frozen since dt=0).
- (c) Pre-screenshot renderer.clear() via window.game.getRenderer()
      .getRenderer() to strip any WebGL frame residue / clear-color
      non-determinism between boots.
- (d) localStorage wipe pre-boot: menu high-score + GameOver score text are
      the only DOM-variable content; both forced to 0.

Seeded RNG (mulberry32) with fixed seed 0x9e3779b9:
- spawnObstacles(3): 6 calls total (3x type + 3x x-position).
- spawnObstacle(): 0 calls at capture (spawn interval never reached at
  1x speed before ~500ms; first spawn at OBSTACLE_SPAWN_RATE/level —
  need to check constant, but world is frozen after HUD gate anyway).

Expected result: S2 GameScene deterministically identical run-to-run
→ 3/3 GREEN on run 2. If not: fall back to documented flake policy
(S2 non-blocking; S1+S3 stable = gate satisfied).

## Playwright mechanics
- testDir: playwright.config.ts swaps to ./tests/e2e/smoke when BROWSER env
  is set → run WITHOUT BROWSER env var (per W4-A.2 caveat).
- Chromium leg: --project=chromium-boot (headed, DISPLAY=:1, swiftshader args).
- Firefox leg:  firefox is the browser, but no dedicated firefox testDir
  project points at tests/e2e/ — use --project=firefox which inherits
  testDir ./tests/e2e.
- Snapshot naming: Playwright auto-suffixes with project + OS:
  <name>-chromium-boot-linux.png / <name>-firefox-linux.png.
- RED: delete w4a3 snapshot dir → run → 3 "snapshot doesn't exist, writing
  actual" failures → baselines written. This IS the RED capture.
- GREEN: second consecutive run → toHaveScreenshot must PASS 3/3
  (maxDiffPixels: 0) against run-1 baselines.

## Steps
- [x] 0. Re-read W3-B.6-v2 spec + evidence; read GameScene/Obstacle/GameLoop
      source to confirm deterministic levers (done: unseeded Math.random in
      spawnObstacles/spawnObstacle/getRandomObstacleType; GameLoop uses
      accumulated-time fixed-step; renderer has preserveDrawingBuffer:true).
- [ ] 1. Write tests/e2e/w4a-visual-regression.spec.ts (3 tests S1/S2/S3).
- [ ] 2. tsc --noEmit clean.
- [ ] 3. RED leg Chrome: rm snapshot dir; run spec → 3 "writing actual"
      failures; capture log.
- [ ] 4. GREEN leg Chrome: re-run unchanged → expect 3/3 PASS; capture log.
- [ ] 5. RED leg Firefox: rm -rf firefox snapshot suffixes; run → 3 "writing
      actual" failures; capture log.
- [ ] 6. GREEN leg Firefox: re-run → expect 3/3 PASS; capture log.
- [ ] 7. sha256sum all 6 baselines + mirror PNGs into evidence/w4/.
- [ ] 8. Write W4A3-RED.txt + W4A3-GREEN.txt + W4A3-flake-policy.md.
- [ ] 9. tsc re-check; report verdict.

## Errors
| # | Symptom | Attempt | Resolution |
|---|---------|---------|------------|

## Risks / open questions
- R1: If seeded RNG + freeze still flakes S2 (e.g. camera lerp not fully
  settled at 500ms, or renderer clear() not deterministic between boots) →
  document S2 as FLAKY-NON-BLOCKING per flake policy; gate still satisfied
  by S1+S3 stability. Evidence: diff pixel counts + diff images.
- R2: Firefox GPU vs Chrome SwiftShader → baselines WILL differ between
  browsers (expected; that's why snapshot files are per-project). Stability
  check is WITHIN a browser, not across browsers.
- R3: GameConstants.OBSTACLE_SPAWN_RATE — need to confirm no obstacle spawns
  during the ~500ms+800ms pre-capture window at 1x normal difficulty. If a
  spawn fires before freeze, seeded RNG covers it (deterministic either way),
  so this is a non-issue as long as the RNG is seeded.
- R4: 'moving' obstacles use performance.now() (real clock) in
  Obstacle.update() — but world-freeze makes deltaTime=0 AND the update loop
  digest the frozen timestamp... actually update() is called with the
  fixed-step deltaTime (1/60s) even during freeze, because GameLoop.digests
  accumulatedTime. BUT performance.now() inside Obstacle.update() reads the
  REAL clock (not rAF timestamp), so 'moving' obstacles WOULD still move
  during freeze. Mitigation: seed RNG so the 3 initial obstacles have known
  types; if any is 'moving', its x-oscillation is a flake source. Need to
  check what types the seed produces — if 'moving'/'rotating' appear,
  consider a longer settle or accept as documented flake. (rotating is safe:
  rotation.y += speed*dt with dt from update arg... no wait, update arg is
  the fixed 1/60s step, NOT zeroed. Let me re-check: freezeWorldForCapture
  feeds frozen rAF timestamps → deltaTime = 0 → accumulatedTime += 0 → no
  updateCallback calls at all. So update() is NOT called during freeze.
  Good — 'moving' and 'rotating' are both frozen. Re-verify at run time.)
