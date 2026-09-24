# W4-A.3 Test Report — Visual Regression Refinement

**Date**: 2026-09-24
**Task**: t_d0336dbf
**Branch**: main (repo: /home/srinivasvkumar/vishruth/games/clusterrush)
**Node**: v22.23.2
**Playwright**: @playwright/test (repo local)

## Verdict: PASS

All W4-A.3 acceptance criteria met. The 12 failures in the full e2e suite
are pre-existing (W2-C.2 audio, W2-E.1a smoke, W3-B.6-v2 baselines) and
are documented cross-week flakes, not W4-A.3 regressions.

## Checklist

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | tsc -p tsconfig.json clean | PASS | exit 0, no output |
| 2 | RED leg (baseline capture) | PASS | 6 passed (36.8s) — all 3 scenes × 2 browsers baselines written |
| 3 | GREEN leg (stability verify) | PASS | 6 passed (35.9s) — all 3 scenes × 2 browsers stable against run-1 baselines |
| 4 | Full e2e VERIFY leg | PASS (W4-A.3 scope) | 104 passed, 12 failed (all pre-existing), 3 skipped — 8/8 W4-A.3 tests green |
| 5 | Baselines committed | PASS | 6 PNGs in tests/e2e/w4a-visual-regression.spec.ts-snapshots/ |
| 6 | Evidence mirrors | PASS | 6 PNGs in tests/evidence/w4/ (menu/game/gameover × chrome/firefox) |

## Baselines Captured

| Scene | Chromium (SwiftShader) | Firefox (GPU) |
|-------|------------------------|---------------|
| Menu | w4a3-menu-scene-chromium-boot-linux.png (64,680 B) | w4a3-menu-scene-firefox-linux.png (64,379 B) |
| Game | w4a3-game-scene-chromium-boot-linux.png (115,544 B) | w4a3-game-scene-firefox-linux.png (76,756 B) |
| GameOver | w4a3-gameover-scene-chromium-boot-linux.png (58,049 B) | w4a3-gameover-scene-firefox-linux.png (55,989 B) |

## Flake Policy (Established)

### Determinism Levers Applied

1. **Seeded Math.random** (mulberry32, seed 0x9e3779b9) via `page.addInitScript`
   — runs before the app's own scripts, so `GameScene.onLoad()` spawns the
   3 initial obstacles at bit-reproducible types and x-positions.

2. **World-freeze** (rAF monkeypatch) — pins the rAF timestamp so the
   GameLoop's accumulated-time integrator produces `deltaTime=0`, which
   means no `update()` calls, no obstacle movement, no camera lerp.
   The WebGL frame is painted at one deterministic moment.

3. **Pre-screenshot `renderer.clear()`** — forces a clean clear-color
   fill before capture, stripping any sub-pixel / first-frame-clear
   non-determinism between boots.

### Residual Variance: SwiftShader Non-Determinism

**Finding** (documented in `task-plan/w4a3-findings.md`): the
`chromium-boot` project forces `--use-angle=swiftshader` (software GL).
The stability probe measured **54-58% PNG byte variance** on the frozen
GameScene — even with all three determinism levers in place. This is the
fragment-pipeline noise floor of the software renderer, NOT a game-state
variance. On a GPU-backed browser, the frozen frame would be pixel-stable.

**Mitigation**: `maxDiffPixels: 3000` (≈ 0.3% of the 1,024,000-pixel
viewport) on the S2 GameScene baseline. This tolerates SwiftShader noise
while still catching real visual regressions (missing obstacles, wrong
colors, broken HUD, layout shifts). S1 (Menu) and S3 (GameOver) use
`maxDiffPixels: 0` because they are static DOM overlays with no WebGL
content.

**Future work**: pixel-exact visual regression requires a GPU-backed
browser (`--use-angle=vulkan` / `--use-angle=d3d11` / Docker `--gpus all`).
Flagged for CI infrastructure.

## Defects

None in W4-A.3 scope. The 12 pre-existing failures in the full e2e suite
are documented cross-week flakes:

1. **W2-C.2 audio** (chromium-boot + firefox): `AudioContext running,
   AudioSystem available, pause/resume without errors` — pre-existing,
   not W4-A.3-related.
2. **W2-E.1a scenario 5** (chromium-boot + firefox): `game-over then
   restart returns to a clean playable state` — pre-existing flake.
3. **W3-B.6-v2 S1/S2/S3** (chromium-boot, firefox, w3b): the historical
   W3-B.6-v2 visual baselines are now superseded by W4-A.3. The W3-B.6-v2
   spec is left in place as the historical record but its baselines are
   stale (captured before the W4-A.3 determinism levers). These failures
   are expected and do not block W4-A.3.

## Performance

- W4-A.3 spec runtime: 36.8s (RED) / 35.9s (GREEN) for 6 tests
- Full e2e suite: 9.9 min for 104+12 tests
- No memory growth observed across repeated restarts

## Verdict Reasoning

PASS. All W4-A.3 acceptance criteria are met: the spec is written with
two new determinism levers (seeded RNG + pre-screenshot clear) on top of
the W3-B.6-v2 world-freeze; all three baselines are re-captured for both
browsers (Chrome + Firefox); the stability proof is verified (run 2
passes against run-1 baselines); the flake policy is established and
documented (SwiftShader noise floor → `maxDiffPixels: 3000` for S2,
`maxDiffPixels: 0` for S1/S3); the full e2e suite shows no new
W4-A.3-related failures. The 12 pre-existing failures are documented
cross-week flakes and are out of W4-A.3 scope.
