# Cluster Rush — Comprehensive Test Plan (task_plan.md)

Lead QA: boss_bot · Date: 2026-09-02 · Status: **COMPLETE — ready for execution**
Team: @researcher (discovery/audit) · @game-dev (implementation fragility) · @game-tester (execution realism) · @reviewer (**unstaffed — profile config bug**)
Method: 2-round collaborative discussion; every P0/P1 claim verified against source by the lead before inclusion. See `discussion_log.md` (full reply provenance: /tmp/cr_qa/*.out).

## 1. What this plan is / is not
- IS: a complete, deeply decomposed test plan for the Cluster Rush WebGL build (Godot 4.7.2, single-thread WASM, 63MB, 35 levels). 165 test cases across 27 features + 6 cross-cutting sections. Plan-only — no execution, no PASS/FAIL yet.
- IS NOT: a bug report, a fix, or a CI config. Known defects are recorded as "expected-to-FAIL" cases so execution confirms them.

## 2. Document map
| Doc | Purpose |
|-----|---------|
| `findings.md` | Verified shared reconnaissance (CONFIRMED/INFERRED/UNKNOWN/NOT PRESENT classification) |
| `state_model.md` | State machine: every screen/transition + state hazards (stale lives/score across reloads) |
| `feature_inventory.md` | 27 features F001–F027 with source anchors |
| `discussion_log.md` | Real teammate replies (Round 1+2) + **verified defect ledger D1–D19** |
| `features/F0XX_*.md` | Per-feature test cases (165 total) |
| `10_browser_matrix.md` … `16_risks_open_questions.md` | Cross-cutting sections |
| `task_plan.md` (this file) | Master plan + coverage matrix + execution order + exit gates |

## 3. Verified defect ledger (from source audit — each has an expected-to-FAIL test)
| ID | Sev | What |
|----|-----|------|
| D1 | P0 | Retry/Next reload scene without `start_level()` → post-GameOver Retry starts with **0 lives** (F016-02/03/04) |
| D2 | P0 | Pause double-bound (input_manager + game_scene) → single keypress = net no-op (F017-03) |
| D3 | P0 | Pause key is **KP_Enter (4194310)**, not Escape → unreachable on laptops (F017-01/02) |
| D4 | P0 | Hazard `body_entered` not gated by transition lockout → death/complete race at x=140 (F014-08) |
| D5 | P1 | Star formula: 3 lives + bonus<50 → 2★ (F014-06) |
| D6 | P1 | "Start Game" never calls start_level() → 3 lives on all levels incl. L6-35 (F013-04) |
| D7 | P1 | AUTO_RUN_SPEED overwrites X-momentum every physics frame (F005) |
| D8 | P1 | Audio: AudioManager print-stub, no AudioStreamPlayer → all audio sliders inert (F021) |
| D9 | P1 | HUD allocates 3 StyleBoxFlat per ~100ms update → ~30 allocs/sec (F018-06) |
| D10 | P1 | Wall-clock timer (Time.get_ticks_msec) → tab-switch/pause corrupts stars/score (F017-11) |
| D11 | P1 | End-screen `set_score()` never called → final score never shown (F023-02) |
| D12 | P1 | Credits screen static, no exit → trap (F024-02) |
| D13–D19 | P2 | Ramp x-min, double-respawn, wall-climb symmetry, swerve ×5, camera sway 0.02, tier-1→2 difficulty dip, no pre-boot loading UI, GitHub Pages COOP/COEP |

## 4. Coverage matrix (165 test cases)
| Feature | TCs | Priority | File |
|---------|-----|----------|------|
| F001 Web startup | 2 | P0 | `features/F001_startup.md` |
| F002 Main menu + settings | 8 | P0 | `features/F002_main_menu.md` |
| F003 Level select | 7 | P0 | `features/F003_level_select.md` |
| F004 Level generation | 6 | P0 | `features/F004_level_generation.md` |
| F005 Player movement | 7 | P0 | `features/F005_player_movement.md` |
| F006 Wall mechanics | 5 | P1 | `features/F006_wall_mechanics.md` |
| F007 Trucks | 4 | P0 | `features/F007_trucks.md` |
| F008 Hazards (saw/ramp/debris/hammer) | 6 | P0 | `features/F008_hazards.md` |
| F009 Falling debris | 3 | P1 | `features/F009_falling_debris.md` |
| F010 Hazard collision & death | 4 | P0 | `features/F010_hazard_death.md` |
| F011 Fall death | 3 | P0 | `features/F011_fall_death.md` |
| F012 Death & respawn | 4 | P0 | `features/F012_death_respawn.md` |
| F013 Lives | 7 | P0 | `features/F013_lives.md` |
| F014 Level complete (score/stars) | 11 | P0 | `features/F014_level_complete.md` |
| F015 Transitions | 6 | P1 | `features/F015_transitions.md` |
| F016 Game Over | 7 | P0 | `features/F016_gameover.md` |
| F017 Pause | 11 | P0 | `features/F017_pause.md` |
| F018 HUD | 8 | P1 | `features/F018_hud.md` |
| F019 Save/Load | 9 | P0 | `features/F019_save_load.md` |
| F020 Camera | 6 | P1 | `features/F020_camera.md` |
| F021 Audio | 5 | P2 | `features/F021_audio.md` |
| F022 Particles | 8 | P2 | `features/F022_particles.md` |
| F023 End screen | 4 | P1 | `features/F023_end_screen.md` |
| F024 Credits | 3 | P2 | `features/F024_credits.md` |
| F025 Tier/difficulty curve | 5 | P1 | `features/F025_tier_curve.md` |
| F026 Input bindings | 9 | P0 | `features/F026_input.md` |
| F027 Cross-feature session integrity | 8 | P0 | `features/F027_crosscut.md` |

Cross-cutting: browser matrix (B-01…09) · edge conditions (E-01…12) · performance (P-01…10) · accessibility (A-01…08) · cross-feature (X-01…08) · regression (R1–R16) = **75 additional cases**.
**Grand total: 240 test cases.**

## 5. Execution order (for @game-tester)
**Phase 0 — Smoke gate (15 min):** R1–R8 (regression P0). If R2 fails → stop, file blocker; game doesn't play.
**Phase 1 — P0 spine (~2 days):** F001 → F002 → F003 → F004 → F005 → F007 → F010 → F011 → F012 → F013 → F014 → F016 → F019 → F026 → F027 + B-01…05 + E-01…04.
**Phase 2 — P1 (~1.5 days):** F006, F008, F009, F015, F017, F018, F020, F023, F025 + B-06…09 + E-05…12 + P-01…06 + A-01…08 + X-01…08.
**Phase 3 — P2 + soak (~1 day):** F021, F022, F024 + P-07…10 + F025-04 (expert passability) + 30-min soak.

## 6. Evidence protocol (per @game-tester)
- Screenshot at every PASS/FAIL decision point (named `F0XX-YY_state.png`).
- Console capture (Godot `print`/`printerr`) for every state transition.
- Network waterfall for F001; DevTools memory/perf snapshots for P-section.
- Video (screen-record) for movement/camera/truck timing tests.
- All artifacts → `test-plan/evidence/<feature>/`.

## 7. Exit criteria
- **Build stable:** all P0 smoke (R1–R8) PASS.
- **Defect ledger dispositioned:** every D1–D19 either confirmed (evidence attached) or refuted with source+runtime proof.
- **No P0 test failing without a filed defect entry.**
- Coverage: 240/240 executed or explicitly blocked with reason.

## 8. Blockers & asks
1. **@reviewer profile broken**: `~/.hermes/profiles/reviewer/config.yaml` → `platform_toolsets.cli.tools: [messaging]` is an invalid toolset; every CLI call fails before the agent starts. Fix: remove `messaging` from that list. Then run the final adversarial pass on this plan.
2. **Pause key gap (D3)** blocks human playtesting of F017 on laptops — needs a temporary Escape binding in a test-only build, or test with a full keyboard.
3. **D1 (0-lives Retry)** blocks all Retry-based flows until fixed — plan routes around it via Level Select / Main Menu.
4. Build size 63MB > 50MB target — P-09 tests time-to-playable on 500kbps.
