# M0-05: Spec/Defect Reconciliation Report

**Author**: @researcher  
**Date**: 2026-09-02  
**Status**: Complete  
**Evidence**: `PLAN.md`, `test-plan/task_plan.md`, `boss/defects.md`, `test-plan/audit-findings.md`

---

## Executive Summary

The test plan (240 cases) provides **strong coverage for gameplay features** but has **critical gaps in infrastructure, CI/CD, and requirements verification**. Of the 19 documented defects (D1-D19), all have corresponding test cases, but several **requirement-to-test gaps** exist that could allow unverified code changes.

**Key Findings**:
- ✅ All 19 defects (D1-D19) have corresponding test cases
- ⚠️ **7 major requirement gaps** between PLAN milestones and test coverage
- ⚠️ **5 dead code/assets** not mentioned in any requirement or test
- ⚠️ **3 critical inputs (R, W/S keys, Pause) are unreachable** but not explicitly tested as failures

---

## 1. PLAN Requirements vs. Test Coverage Matrix

### M0 — Test Foundation (Wave 1)

| PLAN Requirement | Test Coverage | Gap |
|-----------------|---------------|-----|
| E2E harness with SwiftShader flags | ✅ F001-01, F001-02 | None |
| GUT installed, tests/unit + tests/integration scaffolded | ❌ **NO TESTS** | G4: `godot --test` doesn't exist; G5: tests/unit/ doesn't exist |
| pipeline.sh L1/L2 steps fixed | ❌ **NO TESTS** | No test for pipeline.sh execution |
| CI godot-ci.yml test steps fixed | ❌ **NO TESTS** | No CI verification tests |
| Gate: pipeline.sh steps 1–2 pass | ❌ **NO TESTS** | No gate verification |
| E2E "menu boots" green | ✅ F001-01 | None |

**GAP SUMMARY**: M0 requires GUT installation, pipeline.sh, and CI verification — **zero tests exist** for these infrastructure requirements.

---

### M1 — 35 Levels That Actually Load

| PLAN Requirement | Test Coverage | Gap |
|-----------------|---------------|-----|
| LevelManager.load_level(n) works for all n in 1..35 | ⚠️ **PARTIAL** | F004 has 6 tests for level generation, but **no test for all 35 levels** individually |
| Content: handcrafted-or-procedural-per-seed level definitions | ✅ F004-03, F025 | None |
| L1 tests: template/tier math | ❌ **NO TESTS** | No unit tests for tier calculation logic |
| L2 tests: every level scene instantiates without script errors | ❌ **NO TESTS** | No test verifying all 35 level scenes load |
| L3 test: level select grid shows 35 buttons, locked/unlocked correct | ✅ F003-02, F003-03, F003-04 | None |
| Clicking level 1 loads game | ✅ F003-05 | None |
| Gate: reviewer verifies tier table matches §5 | ❌ **NO TESTS** | No automated verification of tier table |

**GAP SUMMARY**: PLAN requires **verification of all 35 levels loading**, but test plan only has 6 level generation tests. No test for "every level scene instantiates without script errors."

---

### M2 — Gameplay Core Verified

| PLAN Requirement | Test Coverage | Gap |
|-----------------|---------------|-----|
| Auto-run, jump, double-jump, wall-jump/slide, strafe | ✅ F005, F006 | None |
| Death on hazard contact + fall | ✅ F010, F011 | None |
| Respawn/retry flow | ✅ F012, F016 | None |
| Level-complete flow | ✅ F014 | None |
| HUD: score, lives, level | ✅ F018 | None |
| Save persists across reload | ✅ F019 | None |
| L3 tests: scripted input sequences produce expected state | ✅ F005-04, F010-03, F014-04 | None |

**GAP SUMMARY**: M2 requirements are **fully covered** by test plan.

---

### M3 — Ship-Quality Build

| PLAN Requirement | Test Coverage | Gap |
|-----------------|---------------|-----|
| Single source of truth for web build (Builds/WebGL only) | ❌ **NO TESTS** | No test verifying G7 (stale root-level export files removed) |
| Export preset: threads decision finalized | ❌ **NO TESTS** | No test for export configuration |
| CI: test → export → Pages deploy fully green | ❌ **NO TESTS** | No CI pipeline test |
| .nojekyll + brotli + sane cache headers | ❌ **NO TESTS** | No test for deployment configuration |

**GAP SUMMARY**: **Zero tests** for M3 requirements. Entire build/CI/deployment pipeline is untested.

---

### M4 — Performance & Polish

| PLAN Requirement | Test Coverage | Gap |
|-----------------|---------------|-----|
| First-frame < 8s on mid hardware | ✅ P-01, P-02 | None |
| Stable frame pacing ≥ 30 FPS | ✅ P-03, P-04 | None |
| Audio (all referenced files exist) | ✅ F021-01 | None |
| Particles | ✅ F022 | None |
| Settings wired (volume, quality) | ⚠️ **PARTIAL** | F021 tests audio sliders, but AudioManager is a print-stub (D17) — no actual audio plays |
| L4 perf sample recorded | ✅ P-05...P-10 | None |

**GAP SUMMARY**: Audio requirement has a **defect (D17)** — AudioManager.play_sfx() is a print-stub. Test F021-01 will FAIL, but no test verifies that audio actually plays.

---

### M5 — 35-Level Content Pass + Final QA

| PLAN Requirement | Test Coverage | Gap |
|-----------------|---------------|-----|
| All 35 levels playable to completion | ⚠️ **PARTIAL** | F004, F025 cover level generation and tier curve, but **no test for completing all 35 levels** |
| Difficulty curve per §5 | ✅ F025-01...F025-05 | None |
| Cross-browser: Chrome + Firefox (webgl2) | ✅ B-01...B-09 | None |
| Mobile spot check | ✅ B-06...B-09 | None |
| Full regression: pipeline.sh all-green | ❌ **NO TESTS** | No regression test for pipeline.sh |
| Save-file migration test | ✅ F019-08, F019-09 | None |
| Gate: reviewer final sign-off → tag v1.0 | ❌ **NO TESTS** | No automated sign-off verification |

**GAP SUMMARY**: No test verifies "all 35 levels playable to completion." Pipeline regression tests missing.

---

## 2. Defect-to-Test Coverage

All 19 defects (D1-D19) have corresponding test cases:

| Defect | Severity | Test Cases | Status |
|--------|----------|------------|--------|
| D1: Retry/Next 0 lives | P0 | F016-02, F016-03, F016-04 | ✅ Covered |
| D2: Pause double-bound | P0 | F017-03 | ✅ Covered |
| D3: Pause KP_Enter (unreachable) | P0 | F017-01, F017-02 | ✅ Covered |
| D4: Hazard death race | P0 | F014-08 | ✅ Covered |
| D5: Star formula off-by-one | P1 | F014-06 | ✅ Covered |
| D6: Lives tier boundary | P1 | F013-01...F013-07 | ✅ Covered |
| D7: HUD allocation churn | P1 | F018-06 | ✅ Covered |
| D8: Wall-clock timer (pause-aware) | P1 | F017-11 | ✅ Covered |
| D9: End screen set_score never called | P1 | F023-02 | ✅ Covered |
| D10: Credits trap (no exit) | P1 | F024-02 | ✅ Covered |
| D11: Start Game no start_level() | P1 | F013-04 | ✅ Covered |
| D12: Credits static (no script) | P1 | F024-02 | ✅ Covered |
| D13: Ramp x-min check | P2 | F008-04 | ✅ Covered |
| D14: Double-respawn | P2 | F012-04 | ✅ Covered |
| D15: Wall climb strafe drift | P2 | F006-05 | ✅ Covered |
| D16: Auto-run overwrites momentum | P2 | F005-06 | ✅ Covered |
| D17: AudioManager print-stub | P2 | F021-02, F021-03 | ✅ Covered |
| D18: No random seed | P2 | F004-05 | ✅ Covered |
| D19: GitHub Pages COOP/COEP | P2 | B-08, B-09 | ✅ Covered |

**VERDICT**: All defects are covered by test cases. No gaps in defect-to-test mapping.

---

## 3. Requirements Not Mentioned in Test Plan

The following **requirements from source code** are **not mentioned** in PLAN.md or test-plan/task_plan.md:

| Requirement | Source | Test Coverage | Gap |
|-------------|--------|---------------|-----|
| **R key (reset) does nothing** | `project.godot` L148-163 defines reset=R; **zero scripts** check `is_action_just_pressed("reset")` | ❌ **NO TESTS** | Critical: untested dead input binding |
| **W/S keys (ui_up/ui_down) do nothing** | `project.godot` L66-97 define ui_up=W, ui_down=S; **zero scripts** use these actions | ❌ **NO TESTS** | Critical: untested dead input bindings |
| **Pause key unreachable** | `project.godot` L132-147: pause mapped to keycode 4194310 (not Escape) | ✅ F017-01, F017-02 | Covered as defect D3 |
| **camera_controller.gd (FollowCamera) is dead code** | `level_manager.gd` L656-677 creates FollowCamera, but `game.tscn` uses `first_person_camera.gd` | ❌ **NO TESTS** | Dead code not mentioned in requirements |
| **test_simple.tscn is dead scene** | Exists but **never referenced** by any scene/script | ❌ **NO TESTS** | Dead code not mentioned in requirements |
| **default_env.tres missing** | `project.godot` L205 references it, but **file doesn't exist** on disk | ❌ **NO TESTS** | Missing asset not mentioned in requirements |
| **Particle effects system** | `scripts/utilities/particle_effects.gd` with 6 particle types | ✅ F022 | Covered in M4 |
| **Input buffering & remapping** | `InputManager` has 0.1s input buffer + `remap_action()` | ❌ **NO TESTS** | Feature not mentioned in PLAN or test plan |
| **Progress bar** | `game.tscn` HUD/ProgressBar, `hud.gd` updates it | ❌ **NO TESTS** | Feature not mentioned in PLAN or test plan |
| **Lives flash animation** | `hud.gd` flashes yellow on change (0.3s tween) | ❌ **NO TESTS** | Feature not mentioned in PLAN or test plan |
| **Overlay fade animations** | `game_scene.gd` L178-200: Tween modulate:a transitions | ❌ **NO TESTS** | Feature not mentioned in PLAN or test plan |
| **Two-direction hazard collision** | `level_manager.gd` L691-699: walks up node tree to check player | ❌ **NO TESTS** | Implementation detail not mentioned in requirements |
| **Music volume slider** | `settings_ui.gd` has Music slider, but no AudioStreamPlayer for music | ⚠️ **PARTIAL** | F021 tests sliders, but music playback is non-functional |

**VERDICT**: 12+ requirements/features are **not mentioned** in PLAN.md or test-plan. These represent **untested functionality** that could break without detection.

---

## 4. Cross-Reference: PLAN vs. Defects vs. Tests

### Critical Issues (P0)

| Issue | PLAN Requirement | Defect | Test Coverage | Status |
|-------|------------------|--------|---------------|--------|
| Pause unreachable | M2: Pause functionality | D3 | ✅ F017-01, F017-02 | **Defect exists, test covers it** |
| Retry starts with 0 lives | M2: Respawn/retry flow | D1 | ✅ F016-02, F016-03, F016-04 | **Defect exists, test covers it** |
| Pause double-bound | M2: Pause functionality | D2 | ✅ F017-03 | **Defect exists, test covers it** |
| Hazard death race | M2: Death on hazard | D4 | ✅ F014-08 | **Defect exists, test covers it** |
| GUT not installed | M0: GUT installed | ❌ No defect ID | ❌ No test | **CRITICAL GAP** |
| pipeline.sh broken | M0: pipeline.sh L1/L2 | ❌ No defect ID | ❌ No test | **CRITICAL GAP** |

### High Priority Issues (P1)

| Issue | PLAN Requirement | Defect | Test Coverage | Status |
|-------|------------------|--------|---------------|--------|
| Star formula off-by-one | M2: Score/stars | D5 | ✅ F014-06 | **Defect exists, test covers it** |
| Lives tier boundary | M2: Lives | D6 | ✅ F013-01...F013-07 | **Defect exists, test covers it** |
| HUD allocation churn | M4: HUD | D7 | ✅ F018-06 | **Defect exists, test covers it** |
| Wall-clock timer | M2: Time tracking | D8 | ✅ F017-11 | **Defect exists, test covers it** |
| End screen set_score | M4: End screen | D9 | ✅ F023-02 | **Defect exists, test covers it** |
| Credits trap | M4: Credits | D10 | ✅ F024-02 | **Defect exists, test covers it** |
| Start Game no start_level | M2: Level loading | D11 | ✅ F013-04 | **Defect exists, test covers it** |
| LevelManager.load_level all 35 | M1: 35 levels | ❌ No defect ID | ⚠️ Partial (F004) | **GAP** |

### Medium Priority Issues (P2)

All P2 defects (D13-D19) have test coverage.

---

## 5. Gap Summary & Recommendations

### Critical Gaps (Must Fix Before M0 Completion)

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **No tests for GUT installation** | M0 cannot be verified | Add test: `./bin/godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit` should exit 0 |
| **No tests for pipeline.sh** | M0 cannot be verified | Add test: `./scripts/pipeline.sh` L1/L2 steps should pass |
| **No tests for CI godot-ci.yml** | M3 cannot be verified | Add CI integration test or document manual verification steps |
| **No tests for all 35 levels loading** | M1 cannot be verified | Add test: loop through levels 1-35, verify each loads without error |
| **R key, W/S keys untested** | Dead code could mask bugs | Add negative tests: pressing R, W, S should have no effect (document as known issue) |

### High Priority Gaps (Should Fix Before M1 Completion)

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **No tests for tier calculation logic** | M1 tier table not verified | Add unit test: verify level N maps to correct tier with correct parameters |
| **No tests for pipeline.sh regression** | M5 cannot be verified | Add test: `./scripts/pipeline.sh` full run should pass |
| **No test for all 35 levels playable** | M5 cannot be verified | Add test: scripted playthrough of all 35 levels |
| **Audio not actually playing** | M4 audio requirement unmet | Fix AudioManager.play_sfx() or document as known limitation (D17) |

### Medium Priority Gaps (Nice to Have)

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **Input buffering/remapping not tested** | Feature could break | Add tests for InputManager buffer and remap functionality |
| **Progress bar not tested** | Feature could break | Add tests for HUD progress bar updates |
| **Lives flash animation not tested** | Feature could break | Add visual test for lives flash on change |
| **Overlay fade animations not tested** | Feature could break | Add tests for overlay transitions |
| **Two-direction hazard collision not tested** | Edge case could break | Add test for hazard collision with player child nodes |
| **Dead code (camera_controller, test_simple) not documented** | Repo hygiene | Document as known dead code in CODE_AUDIT.md |
| **default_env.tres missing** | Engine warning at load | Create file or remove reference from project.godot |

---

## 6. Defect Status Summary

| Status | Count | Notes |
|--------|-------|-------|
| All defects have test coverage | 19/19 | ✅ |
| Critical defects (P0) | 4 | D1, D2, D3, D4 — all have tests |
| High priority defects (P1) | 8 | D5-D12 — all have tests |
| Medium priority defects (P2) | 7 | D13-D19 — all have tests |
| Defects without test coverage | 0 | ✅ |

---

## 7. Final Recommendations

1. **Immediate Action (M0)**:
   - Add tests for GUT installation and pipeline.sh execution
   - Add test verifying all 35 levels load without script errors
   - Document R key, W/S keys as known dead inputs (or fix them)

2. **Before M1 Completion**:
   - Add unit tests for tier calculation logic
   - Fix AudioManager.play_sfx() or mark as known limitation
   - Add test for "all 35 levels playable to completion"

3. **Before M3 Completion**:
   - Add tests for CI pipeline (test → export → deploy)
   - Add tests for .nojekyll, brotli, cache headers

4. **Before M5 Completion**:
   - Add regression tests for pipeline.sh
   - Add cross-browser tests (Chrome + Firefox)
   - Add save-file migration test

5. **Documentation Updates**:
   - Add dead code list (camera_controller.gd, test_simple.tscn) to CODE_AUDIT.md
   - Add missing features (particle effects, input buffering, progress bar, etc.) to feature inventory
   - Document default_env.tres missing as known issue

---

## 8. Conclusion

The test plan provides **excellent coverage for gameplay features** and **all 19 defects have corresponding tests**. However, there are **significant gaps in infrastructure testing** (GUT, pipeline.sh, CI) and **untested requirements** (35 levels loading, tier calculations, dead inputs).

**Recommendation**: Address critical gaps before M0 completion, high-priority gaps before M1 completion, and medium-priority gaps before M5 completion. The test plan is a strong foundation but needs infrastructure and edge-case coverage to fully validate the PLAN requirements.

**Evidence Paths**:
- `test-plan/audit-findings.md` — Detailed source code audit
- `test-plan/task_plan.md` — 240 test cases
- `boss/defects.md` — 19 defects with status
- `PLAN.md` — Milestone requirements
