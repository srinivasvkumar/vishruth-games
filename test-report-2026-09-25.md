# W4-D.1 Regression Test Report — cluster-rush — 2026-09-25
Task: t_50346590 · Repo @ 5953dac · Node v22.22.2 · headed Chrome (SwiftShader) + Firefox (GPU)

## Verdict: FAIL

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Unit tests (npx vitest run) | PASS | 38 files, 756/756 passed, 3.56s |
| 2 | Coverage >= 90% | PASS | lines 95.19%, branches 90.73%, funcs 95.19% (v8) |
| 3 | Type check (tsc --noEmit) | PASS | exit 0, no output |
| 4 | Lint (eslint src config scripts) | FAIL | 3 errors: GameScene.ts:172/176/179 @typescript-eslint/no-explicit-any (W3-B.0 debug accessors, pre-existing since 6771762); 7 no-console warnings in Logger.ts (rule is warn, non-blocking) |
| 5 | E2E (npx playwright test, full suite) | FAIL | 18 failed / 96 passed / 3 skipped, 10.6m, 3 projects |
| 6 | No new regressions vs W4-A.3 checkpoint | FAIL | 2 new defect classes: settings Esc focus return (D2, 2 fails), stale W4-A.3 visual baselines (D6, 4 fails) |

## Defects

1. [blocker — NEW] D2: settings-panel.spec.ts W3-C.4 step 4 fails on both browsers: after Escape closes the panel, focus is on #menu-settings-button, expected #menu-start-button. Suspected W4-B.8 keyboard-nav interaction (a720a10, 2026-09-25). Repro: open settings, Esc, check document.activeElement.id.
2. [blocker — NEW] D6: w4a-visual-regression.spec.ts S1 MenuScene (3050/3051 px diff, deterministic across legs) + S2 GameScene (6806 px > 3000 allowance) fail on both browsers. W4-A.3 baselines captured @ c580ee1 (2026-09-24 21:40); five W4-B commits since changed MenuScene.ts +182 lines (focus styles/ARIA/announcer) → baselines stale. GameScene drift also implicates W4-B.11 renderer changes. W4-A.3 S3 (GameOverScene) still passes all 3 legs.
3. [major — pre-existing] D5: w3b-visual-baseline.spec.ts S1/S2 fail on all 3 legs (2026-09-22 baselines, same stale-baseline + SwiftShader-flake class).
4. [major — pre-existing] D4: CP3 S2 #game-score after setScore(999) reads "SCORE: 0" on chromium-boot + firefox legs (spec/contract mismatch, root-caused in W4-A.1 t_ca6a8ada). Same spec PASSES on the w3b project in this run → project-context dependent.
5. [major — pre-existing] D1: audio.spec.ts W2-C.2 AudioSystem.isAvailable() === false on both browsers (was in the W4-A.3 12-failure set).
6. [major — pre-existing] D3: smoke.spec.ts W2-E.1a S5 "game-over overlay must be visible after player:death" fails on both browsers (old-era timing-sensitive assertion).
7. [minor — pre-existing] Lint errors: GameScene.ts:172-179 `(window as any).__debugPlayerPos/__setPlayerHealth/__debugScore` (W3-B.0, 6771762) violate no-explicit-any=error (enabled 79b7b3f). Fix class: Window interface augmentation. Not applied (task scope: capture + diagnose only).

## Performance
- FPS @ 120 obstacles (W3-C.1a, both browsers): 60.0 mean / 59.9 median, D4 gate PASS
- FPS @ 20 obstacles (W2-E.2, chromium): 60.0 mean, p95 frame 16.7 ms
- Input latency (W3-C.3a, both browsers): < 16 ms target met
- E2E suite runtime: 10.6 min, workers=1, no timeouts, no OOM

## Verdict Reasoning
All core-loop, performance, and type/coverage gates are green and the game is playable end-to-end in both real browsers (boot → menu → game → death → game-over → restart verified by CP1-CP4 and the W3-A/W4-A.2 full-loop specs). However, the task gate is "entire test suite + verify all pass" and that bar is not met: 18 E2E failures including two NEW defect classes since the W4-A.3 checkpoint (settings Esc focus return — suspected W4-B.8 regression; stale W4-A.3/W3-B.6-v2 visual baselines after W4-B menu DOM changes), plus 3 pre-existing lint errors. Per task rules no fixes were applied. Route: D2 to the W4-B.8 owner, baseline re-capture card for D5/D6, D1/D3/D4 + lint as pre-existing tech-debt.
