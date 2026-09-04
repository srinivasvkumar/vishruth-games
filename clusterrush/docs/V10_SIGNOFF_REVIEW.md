# Cluster Rush — v1.0 Sign-off Review (t_1f332bb9)

Date: 2026-09-01 · Reviewer: sowmya (auto-decomposed from t_cb7d7856 M5-REVIEW)
Method: every claim below was checked against the working tree at commit 9ff0a76 (+ uncommitted changes).

## Verdict: NOT READY for v1.0 sign-off

P0-1, P1-2 closed with evidence. P0-2/P0-3 closed with partial evidence (L3
level-select grid + scripted-input death/complete tests missing). P1-1 has one
acceptance miss (JUnit XML). M5 bullets are not done. Additionally, the M5
evidence itself (perf spec, campaign spec, audio, screenshots) is UNCOMMITTED —
8 modified + 46 untracked files in the working tree.

## Gap status (docs/GAPS_AND_FIXES.md)

P0-1  E2E harness        CLOSED      playwright.config.ts has the §4 SwiftShader args
                                   (--no-sandbox --disable-setuid-sandbox --enable-unsafe-swiftshader
                                    --use-gl=angle --use-angle=swiftshader); helpers/canvas.ts present;
                                   screenshots/menu-boot.png committed (c7eaeac); 6 tests in
                                   cluster_rush.spec.ts incl. "game canvas loads and splash hides".
P0-2  35 levels load     PARTIAL     load_level(n) works for 1..35 via tier table matching §5
                                   (templates tutorial[1-5]/easy[6-10]/medium[11-20]/hard[21-30]/
                                    expert[31-35]; commit 6fa6225). 19 unit tests on tier math
                                   (tests/unit/test_level_templates.gd) + integration coverage.
                                   MISS: get_template_for_level() still silently returns the
                                   tutorial tier for out-of-range n (level_manager.gd:110-117) —
                                   acceptance asked for an error on n>35. No range guard in load_level.
P0-3  L3 gameplay        PARTIAL     cluster_rush.spec.ts (6 tests) + m5_campaign_e2e.spec.ts
                                   (level-1 boot + trajectory capture, uncommitted) + perf.spec.ts.
                                   Save round-trip IS covered at L2 (test_gameplay_core.gd
                                   test_save_persistence: complete level → reload ConfigFile →
                                    level 2 unlocked). MISS: "jump over gap / die on saw" scripted
                                   L3 sequences do not exist; level_select.spec.ts is entirely
                                   test.fixme (parked); no L3 save-persists-across-reload test.
P1-1  CI GUT/import      PARTIAL     godot-ci.yml: GUT pinned to tag v9.7.1 (git clone
                                   --branch v9.7.1), import warm-up step present, GUT with
                                   -gexit -glog=2, L1 then L2, export, .nojekyll, Pages deploy.
                                   MISS: no -gjunit_xml_file / JUnit XML artifact — acceptance
                                   required "JUnit XML published as artifact".
P1-2  single save writer  CLOSED      game_manager.gd:72 comment "single writer — no
                                   LevelManager.save_level_completion"; grep confirms no save
                                   writers in level_manager.gd (commit bd15151); L2 round-trip
                                    test above.
P1-3  perf harness        CLOSED      tests/e2e/perf.spec.ts: CDP/rAF first-frame + FPS sample,
                                   writes tests/performance/latest.json + screenshot; baseline
                                    committed? latest.json: first_frame_ms=4476, fps p50=60, p95=30,
                                    622 frames, swiftshader=true. Caveat: sample flags test_env +
                                    swiftshader but not the full launch-flag set / machine id.
P1-4  finish_x from data  PARTIAL     game_scene.gd + hud.gd now use LevelManager.finish_x
                                   (commit bd15151; hardcoded 140.0 check removed). MISS:
                                    finish_x is still set to a constant 140.0 inside
                                    load_level() (level_manager.gd:182) — not driven by the level
                                    definition; no L2 test "level whose finish-x ≠ 140 completes
                                     at its own finish-x".

P2-1  stale root export   PARTIAL     files removed from git in 0a34694 and gitignored, BUT still
                                   on local disk (index.wasm 37 MB etc.) — acceptance was "du at
                                    repo root shows no index.wasm".
P2-2  single-thread preset CLOSED      export_presets.cfg: variant/thread_support=false;
                                   CI deploy = Builds/WebGL only.
P2-3  Pages hardening     PARTIAL     .nojekyll in CI; brotli + cache-header verification absent.
P2-4  stale artifacts     PARTIAL     tests/test-run-summary.json still present (stale, 08-29,
                                   pre-GUT "41 L1 tests"); scenes/menu/ still empty; ~9 stray
                                    .import files (screenshots/, audio/, index.png.import).
P2-5  test coverage       PARTIAL     tier math + save + level-complete L1/L2 covered; level-select
                                   grid L3 still test.fixme.
P2-6  audio audit         PARTIAL     all 6 referenced sfx exist on disk (death/hit/jump/land/
                                   wall_jump/wall_slide.wav); 4 of them uncommitted; no L2
                                    missing-resource check.

## PLAN.md §3 milestones

M0 test foundation      DONE (uncommitted bits) — SwiftShader flags + boot fixture + canvas
                          helpers + menu-boot screenshot; GUT v9.7.1 installed; pipeline.sh L1/L2
                          run GUT with -gexit; CI fixed. PLAN.md checkboxes not ticked.
M1 35 levels load        DONE (uncommitted bits) — load_level 1..35 per tier table, tier-math L1
                          (19 tests), L2 scene instantiation; L3 level-select-grid test NOT done
                          (parked fixme) — the 4th M1 bullet is missing.
M2 gameplay verified     PARTIAL — movement/death/complete flows + HUD + save persistence exist
                          (7b9f878) with L1/L2 tests; L3 scripted-input sequences (jump over gap,
                          die on saw, complete level 1) not present; level_select E2E parked.
M3 ship-quality build    DONE (uncommitted bits) — Builds/WebGL single source, single-thread
                          preset, CI test→export→Pages with .nojekyll; brotli/cache headers not
                          verified; CI green on clean runner not evidenced here (no JUnit artifact).
M4 perf & polish         PARTIAL — L4 baseline sample recorded (4.48 s first frame under
                          SwiftShader, informational per R4); audio files present but 4
                          uncommitted + no missing-resource L2 check; settings wiring not verified.
M5 content + final QA    NOT DONE — no evidence of all-35-levels-playable pass, no Firefox
                          cross-browser run (config has a firefox project but no result evidence),
                          no full pipeline re-run record, save-migration test exists
                          (test_save_migration.gd) but unverified.

## Blocking items for sign-off

1. Commit the M5 evidence: perf.spec.ts, m5_campaign_e2e.spec.ts, performance/latest.json,
   4 new sfx + .import, screenshots, modified player/hud/pipeline/playwright files.
   Sign-off cannot rest on uncommitted work.
2. M2/M1 L3 gap: add scripted-input L3 tests (jump over gap, die on saw/respawn, complete
   level 1) and replace level_select.spec.ts test.fixme with canvas.ts-based tests.
3. P1-1: add -gjunit_xml_file=junit.xml + artifact upload to godot-ci.yml.
4. P0-2 range guard: get_template_for_level/load_level must error on n>35, not silently
   return tutorial tier.
5. M5: record a full pipeline.sh all-green run + Firefox cross-browser result.
6. Hygiene: delete stale root export from disk, delete tests/test-run-summary.json +
   scenes/menu/ + stray .import files, remove M5DBG debug print in game_scene.gd.

## Recommendation

Block t_8d04ff7b (tag v1.0) until items 1-5 are closed. The repo is materially further along
than the 08-30 gap map (M0-M3 essentially done in code), but v1.0 sign-off requires the M2
L3 gameplay tests and M5 cross-browser/regression evidence, plus a committed working tree.
