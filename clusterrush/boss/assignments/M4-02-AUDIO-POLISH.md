# Task: M4-02 - Audio Polish and Verification

## TASK ID
M4-02

## OWNER
game-tester

## MILESTONE
M4 - Performance & Polish

## OBJECTIVE
Verify complete audio system functionality including all SFX, music, and volume controls. Ensure audio plays correctly in all game states and volume sliders work properly.

## SOURCE OF TRUTH
Boss_Plan.md Section 10 (M4 - Performance & Polish), M4-02 requirement

## DEPENDENCIES
- M4-01 can run in parallel
- AudioManager autoload must be functional

## FILES/AREAS
- autoloads/audio_manager.gd
- audio/sfx/ (all SFX files)
- audio/music/ (all music files)
- scenes/main_menu.tscn (SettingsPanel)
- scripts/ui/main_menu_ui.gd
- test-plan/evidence/audio/

## EXACT ACTIONS
1. Test all SFX playback:
   - jump.wav
   - wall_jump.wav
   - wall_slide.wav
   - land.wav
   - hit.wav
   - death.wav
2. Test music playback (bgm_around.wav)
3. Test volume controls:
   - Master volume slider
   - SFX volume slider
   - Music volume slider
4. Verify audio plays in correct game states:
   - Main menu
   - Gameplay
   - Pause
   - End screen
5. Verify audio stops/changes appropriately between states
6. Test that volume changes apply in real-time

## DO NOT CHANGE
- Audio file contents
- AudioManager core logic (unless bug found)

## EXPECTED OUTPUT
- All 6 SFX play correctly when triggered
- Music plays in menu and gameplay
- Volume sliders control respective audio channels
- Audio properly stops/starts on state changes
- No audio glitches or clipping

## REQUIRED EVIDENCE
- Screenshots of settings panel with sliders
- Audio test log showing each SFX tested
- boss/results/M4-02-audio-verification.md with:
  - List of all audio files tested
  - Pass/Fail for each
  - Volume control verification
  - Any issues found

## HANDOFF CONDITION
- All audio tests PASS
- Volume controls verified working
- Results documented in boss/results/M4-02-audio-verification.md
- If sliders not connected, assign to game-dev to fix

## PRIORITY
P1 (Core polish feature)

## NOTES
- If AudioManager is already working (D17 fix verified), focus on testing
- If sliders not connected to AudioManager, this is a defect to fix
- Verify no audio plays when muted
