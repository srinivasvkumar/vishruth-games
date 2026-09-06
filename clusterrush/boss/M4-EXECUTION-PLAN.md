# M4 - Performance & Polish Execution Plan

## Overview
M4 focuses on performance measurement, audio polish, visual effects, and user settings. This milestone ensures the game runs smoothly at 60 FPS and provides a polished user experience with audio controls and visual feedback.

## Milestone Objectives
1. **M4-01**: Measure and document performance metrics (FPS, frame time, memory)
2. **M4-02**: Verify complete audio system functionality
3. **M4-03**: Implement particle effects and screen shake
4. **M4-04**: Connect settings UI for volume control
5. **M4-GATE**: Review and sign-off on all M4 deliverables

## Task Assignments

### M4-01: First Frame/FPS Measurement
**Owner:** game-tester  
**Verifier:** reviewer  
**Status:** ASSIGNED

**Objective:** Measure performance on real hardware (NOT SwiftShader)

**Requirements:**
- First frame render time
- Average FPS during gameplay
- FPS during truck/hazard encounters
- Memory usage
- Target: 60 FPS on mid-range hardware

**Evidence Required:**
- Screenshot of FPS counter/developer tools
- Performance metrics report (boss/results/M4-01-performance-metrics.md)
- Hardware specs used for testing

**Acceptance Criteria:**
- Performance metrics documented
- FPS ≥ 60 on mid-range hardware (or optimization plan if not met)
- No memory leaks detected

---

### M4-02: Audio Polish and Verification
**Owner:** game-tester  
**Verifier:** game-dev  
**Status:** ASSIGNED

**Objective:** Verify complete audio system functionality

**Requirements:**
- Test all 6 SFX: jump, wall_jump, wall_slide, land, hit, death
- Test music: bgm_around
- Verify volume sliders work (master, SFX, music)
- Test audio in all game states (menu, gameplay, pause, end screen)

**Evidence Required:**
- Audio test log (boss/results/M4-02-audio-verification.md)
- Screenshots of settings panel
- Pass/Fail for each audio component

**Acceptance Criteria:**
- All SFX play correctly when triggered
- Music plays in menu and gameplay
- Volume sliders control respective channels
- Audio properly stops/starts on state changes
- No audio glitches or clipping

---

### M4-03: Particles and Screen Shake
**Owner:** game-dev  
**Verifier:** game-tester  
**Status:** ASSIGNED

**Objective:** Integrate particle effects and implement screen shake

**Requirements:**
- Integrate existing ParticleEffects.gd into gameplay
- Implement screen shake system (weak, medium, strong)
- Add particle effects for:
  - Jump (green particles)
  - Landing (yellow particles)
  - Death (red particles)
  - Level complete (gold particles)
  - Hazard contact (spark particles)
- Add screen shake for:
  - Player death
  - Truck encounters
  - Major impacts

**Files to Modify:**
- scripts/game_scene.gd
- scripts/player/player_controller.gd
- scripts/hazards/*.gd
- (May need to create screen_shake.gd utility)

**Evidence Required:**
- Screenshots/video showing particle effects
- Screenshots/video showing screen shake
- Performance impact assessment
- boss/results/M4-03-particles-screen-shake.md

**Acceptance Criteria:**
- All particle effects working in-game
- Screen shake implemented and functional
- No performance regression (maintain 60 FPS)
- Effects are visible but not distracting

---

### M4-04: Settings Menu Implementation
**Owner:** game-dev  
**Verifier:** game-tester  
**Status:** ASSIGNED

**Objective:** Connect settings UI sliders to AudioManager

**Requirements:**
- Connect AudioSlider to AudioManager.set_sfx_volume()
- Connect MusicSlider to AudioManager.set_music_volume()
- Initialize slider values from AudioManager on load
- (Optional) Add settings persistence to save/load volume preferences

**Files to Modify:**
- scripts/ui/main_menu_ui.gd
- (Already exists: scenes/main_menu.tscn with SettingsPanel)

**Evidence Required:**
- Screenshots of settings panel with different volume levels
- Verification that audio responds to slider changes
- boss/results/M4-04-settings-implementation.md

**Acceptance Criteria:**
- AudioSlider controls SFX volume in real-time
- MusicSlider controls music volume in real-time
- Settings persist across sessions (if implemented)
- Settings panel opens/closes smoothly

---

## M4-GATE Review

**Owner:** reviewer  
**Verifier:** boss_bot

**Gate Requirements:**
1. All M4 tasks (M4-01 through M4-04) complete with evidence
2. Performance meets target (60 FPS) or optimization plan documented
3. Audio system fully functional with volume controls
4. Visual effects (particles, screen shake) implemented without regression
5. Settings menu functional with real-time controls
6. No core gameplay regressions

**Gate Evidence:**
- M4-01: Performance metrics report
- M4-02: Audio verification log
- M4-03: Visual effects demonstration
- M4-04: Settings functionality verification
- M4-GATE sign-off document (boss/results/M4-GATE-REPORT.md)

**Acceptance Criteria:**
- All M4 tasks marked DONE with evidence
- Reviewer challenges and validates each deliverable
- No blocking issues found
- M4-GATE marked PASS in boss/gates.md

---

## Execution Order

**Parallel Tasks (no dependencies):**
- M4-01 (FPS Measurement) - game-tester
- M4-02 (Audio Polish) - game-tester
- M4-03 (Particles/Shake) - game-dev
- M4-04 (Settings) - game-dev

**Sequential Requirements:**
- M4-03 must wait for M4-01 results to ensure no performance regression
- M4-GATE review after all M4 tasks complete

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| FPS < 60 on target hardware | High | Optimize rendering, reduce particle count, use LOD |
| Audio not playing | Medium | Verify AudioManager D17 fix, check audio files exist |
| Settings not persisting | Low | Deferrable to post-M4 enhancement |
| Visual effects cause lag | Medium | Profile and optimize particle count/lifetime |

---

## Success Metrics

- ✅ All 4 M4 tasks completed with evidence
- ✅ Performance ≥ 60 FPS on mid-range hardware
- ✅ All audio functions working correctly
- ✅ Visual effects enhance gameplay without performance penalty
- ✅ User can control audio volumes in real-time
- ✅ M4-GATE signed off by reviewer

---

## Next Steps After M4-GATE

Upon M4-GATE approval:
1. Update boss/gates.md: M4-GATE = ✅ PASS
2. Update boss/state.md: M4 = COMPLETE, M5 = IN PROGRESS
3. Begin M5 execution:
   - M5-01: Complete 35-level verification
   - M5-02: Difficulty curve analysis
   - M5-03: Browser matrix testing
   - M5-04: Save migration/regression
   - M5-05: Full pipeline regression
   - M5-06: Final adversarial review
   - M5-07: Release decision

---

## Notes

- All work must follow Boss_Plan.md execution playbook
- Evidence protocol must be followed (screenshots, logs, metrics)
- No milestone advancement without reviewer sign-off
- Defects found during M4 should be logged as D20+ and tracked
