# Cluster Rush — Gaps & Fixes Map (consolidated, 2026-08-30)

Single prioritized map: **gap → fix → owner → milestone → acceptance**.
Evidence refs: `F*` = docs/CODE_AUDIT.md, `R*` = docs/RESEARCH_FINDINGS.md, `G*` = PLAN.md §0 ground truth.
Milestones per PLAN.md v3 §3 (M0–M5).

## P0 — blocks every downstream gate

| # | Gap | Evidence | Fix | Owner | Milestone | Acceptance (one line) |
|---|-----|----------|-----|-------|-----------|------------------------|
| P0-1 | Playwright launches headless Chrome with `--use-gl=egl --use-angle=egl` → engine fails WebGL boot; every L3 E2E run fails before test code runs. | F3, G3, R3 | Replace launch args with `--no-sandbox --disable-setuid-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (drop `--disable-gpu`); add boot fixture (status-overlay + canvas check) and `helpers/canvas.ts`. | game-tester | M0 | `npx playwright test` "menu boots" test passes against :8765 with screenshot evidence in `tests/e2e/screenshots/`. |
| P0-2 | No authored level content: all 35 `level_XX.tscn` removed (e22d198); only procedural generation exists, and `get_template_for_level(n)` silently returns tutorial tier for out-of-range n. | F4, G6 | Implement `LevelManager.load_level(n)` for n=1..35 per tier table (§5): authored-or-seeded level definitions (trucks/speed/gap/hazards per tier), range check that errors on n>35. | game-dev | M1 | L1 tests assert tier math per §5; L2 instantiates all 35 levels without script errors; `load_level(99)` errors instead of silently using tutorial params. |
| P0-3 | No cross-browser/perf evidence: gameplay (jump, double-jump, wall-jump, strafe, death, respawn, level-complete) exists in code (F5) but is unverified end-to-end; L3 suite currently cannot even boot. | F5, G1–G2 | After P0-1: add scripted-input L3 tests — jump over gap, die on saw (respawn), complete level 1; verify HUD + save persists across reload. | game-tester | M2 | Full L3 suite green with screenshots; save file `user://cluster_rush_save.dat` round-trips score/lives/progress. |

## P1 — must fix before ship, not blocking current work

| # | Gap | Evidence | Fix | Owner | Milestone | Acceptance (one line) |
|---|-----|----------|-----|-------|-----------|------------------------|
| P1-1 | CI test steps: pipeline L1/L2 now use GUT (fixed by 120e632) but CI must run `godot --headless --import` before GUT/export to avoid class-cache "Could not find type GutTest" failures, and must pin GUT v9.7.1 (tag, not main). | R1, F2, F7 | Update `godot-ci.yml`: add `--import` step, checkout GUT tag v9.7.1 into `addons/gut`, GUT with `-gexit -glog=2 -gjunit_xml_file=junit.xml`. | implementer | M0/M3 | CI test job green on a clean runner (no cached `.godot/`), JUnit XML published as artifact. |
| P1-2 | Duplicate save writers: both `GameManager.save_progress()` and `LevelManager.save_progress()/save_level_completion()` write the same `user://cluster_rush_save.dat` ConfigFile → interleaved load/save can overwrite each other's sections. | F5 | Single writer: consolidate save/load into one autoload (GameManager); LevelManager reads only. | game-dev | M2 | L1/L2 test: complete level → reload → progress and stars intact; no two writers remain in grep. |
| P1-3 | No performance measurement harness: M4 gate ("first-frame <8s, ≥30 FPS under SwiftShader sample") has no tooling; SwiftShader numbers are CPU-bound (10–100× slower than real GPU) and must be regression-only, not absolute targets. | R4, PLAN M4 | Add `tests/performance/`: CDP `Performance.getMetrics` + rAF frame-delta sampler; log machine/flag set with every sample; record baseline artifact. | game-tester | M4 | Baseline perf sample (first-frame ms, avg/p95 frame ms, flag set) committed under `tests/performance/`. |
| P1-4 | Hardcoded level-complete threshold (`player.global_position.x >= 140.0` in game_scene.gd) decouples level length from level data — breaks non-uniform authored levels. | F5 | Drive finish-x (and any level bounds) from the level definition loaded by LevelManager. | game-dev | M1 | L2 test: a level whose finish-x ≠ 140 completes at its own finish-x. |

## P2 — hygiene & polish, batch into free slots

| # | Gap | Evidence | Fix | Owner | Milestone | Acceptance (one line) |
|---|-----|----------|-----|-------|-----------|------------------------|
| P2-1 | Stale root-level WebGL export (~39 MB: index.wasm/pck/js/html) still on disk (removed from git in 0a34694, now gitignored) — cache/deploy confusion. | F6, G7 | Delete the 4 stale root files locally; keep `Builds/WebGL/` as single source of truth. | game-dev | M3 | `du` at repo root shows no `index.wasm`; CI deploy points only at `Builds/WebGL/`. |
| P2-2 | Web export threading decision undocumented: single-threaded export needs no COOP/COEP (works on GitHub Pages as-is); multi-threaded requires COOP/COEP headers Pages cannot send. | R2 | Finalize single-threaded export in `export_presets.cfg`; document the tradeoff in PLAN/README. | implementer | M3 | Preset sets `variant/thread_support=false`; Pages URL boots without "missing features" overlay. |
| P2-3 | Pages deploy hardening: `.nojekyll`, brotli pre-compression, cache headers; current CI does export→Pages but without these. | R2, PLAN M3 | Add `touch Builds/WebGL/.nojekyll` + optional brotli step to CI; verify cache headers on deployed URL. | implementer | M3 | Deployed Pages URL serves `.nojekyll`, br variants where applicable, sane `Cache-Control`. |
| P2-4 | Stale artifacts: `tests/test-run-summary.json` ("41 L1 tests") predates GUT; `tests/e2e/tests/e2e/screenshots/` stray nested tree; `scenes/menu/` empty dir; 4 stray `*.import` files; PLAN.md G4/G5 now false (GUT is installed). | F7, F8 | Delete stale JSON + stray trees/files; update PLAN.md §0 (G4/G5 → resolved). | boss_bot | M0 | `git status` clean of strays; PLAN.md §0 matches verified reality. |
| P2-5 | Test coverage is smoke-level: 3 unit + 2 integration tests; no L1 tests for tier math, save round-trip, or input handling yet. | F2 | Grow GUT suite per milestone gates (M1: tier math; M2: save + level-complete logic). | game-dev | M1–M2 | L1/L2 suites cover every M1/M2 bullet in PLAN §3. |
| P2-6 | Audio: verify all referenced audio files exist (referenced-but-missing files silently no-op). | PLAN M4 | Audit `audio/` refs vs disk; add L2 scene-load check that flags missing resources. | game-dev | M4 | Zero missing-resource warnings on a full level load. |

## Milestone cross-check (PLAN v3 M0–M5 vs this map)

- **M0 (test foundation)**: P0-1 (E2E harness), P1-1 (CI GUT/import steps), P2-4 (stale-artifact cleanup). Gate = pipeline.sh steps 1–2 pass + green "menu boots" E2E with screenshot.
- **M1 (35 levels load)**: P0-2 (level content), P1-4 (finish-x from level data), P2-5a (tier-math L1 tests). Gate = reviewer verifies tier table matches §5.
- **M2 (gameplay verified)**: P0-3 (scripted-input L3), P1-2 (single save writer), P2-5b (save/complete L1-L2 tests). Gate = game-tester full suite green + reviewer sign-off.
- **M3 (ship-quality build)**: P2-1 (stale export removed), P2-2 (single-threaded preset), P2-3 (Pages hardening), P1-1 residual (full CI green). Gate = CI badge green + Pages boots.
- **M4 (perf & polish)**: P1-3 (perf harness + baseline), P2-6 (audio audit). Gate = L4 sample recorded.
- **M5 (content pass + final QA)**: no new gaps expected from audit; re-run full pipeline regression + cross-browser check. Gate = reviewer final sign-off → v1.0.

## In-flight board items (2026-08-30)

| Board task | Maps to | Status |
|------------|---------|--------|
| t_403f556e M0-E2E (game-tester) | P0-1 | running |
| t_4db35ffa M0-GUT (implementer) | P1-1 | running |
| t_7f4af0bc M0-HYGIENE (game-dev) | P2-1 | running |

**Key correction vs PLAN.md v3 §0:** G4/G5 ("GUT not installed", "tests/unit missing") are **resolved** by commit 120e632 — GUT 9.7.1 is installed, L1/L2 pass, pipeline + CI use GUT commands. The remaining P0 is the Playwright GL-flags issue (P0-1) and level content (P0-2).

*Sources: docs/CODE_AUDIT.md (verified findings F1–F8), docs/RESEARCH_FINDINGS.md (R1–R4 with external URLs), PLAN.md v3 §0/§3/§5.*
