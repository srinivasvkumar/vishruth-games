# TASK: D17 - Audio System Implementation

**TASK ID**: D17-AUDIO-FIX-v1  
**OWNER**: game-dev  
**MILESTONE**: M0 (Prerequisite for M4)  
**OBJECTIVE**: Implement the audio system properly. Currently `play_sfx()` is just a print-stub and no audio plays.

**SOURCE OF TRUTH**: 
- Defect D17 in boss/defects.md
- Test F019 in test-plan/task_plan.md
- Audio files in `audio/` directory
- Audio manager in `autoloads/audio_manager.gd`

**DEPENDENCIES**: None (P2 but blocks M4 polish)

**FILES/AREAS**:
- `autoloads/audio_manager.gd` - Audio management system
- `audio/music/` - Background music files
- `audio/sfx/` - Sound effect files
- All scripts that call `AudioManager.play_sfx()` or `AudioManager.play_music()`

**EXACT ACTIONS**:
1. **Audit audio files**:
   - List all files in `audio/music/` and `audio/sfx/`
   - Verify file formats are supported by Godot (ogg, wav, mp3)
   - Check that all referenced audio files actually exist

2. **Implement audio_manager.gd**:
   - Replace print-stub `play_sfx()` with actual AudioStreamPlayer playback
   - Implement proper audio mixing (music vs SFX channels)
   - Add volume control methods for both music and SFX
   - Implement audio pause/resume for game pause
   - Add proper audio resource loading (preload or lazy load)

3. **Connect audio to game events**:
   - Find all calls to `AudioManager.play_sfx()` and verify they match actual sound effects
   - Add missing audio calls for: jump, double-jump, wall-jump, hazard death, level complete, etc.
   - Set up background music for: main menu, game, game over

4. **Test audio**:
   - Verify each SFX plays when triggered
   - Verify music plays and can be muted
   - Verify volume sliders in settings work
   - Verify audio pauses with game pause

**DO NOT CHANGE**:
- Game mechanics or logic
- UI layout (unless adding audio controls)
- Other autoloads

**EXPECTED OUTPUT**:
- All sound effects play correctly when triggered
- Background music plays in appropriate scenes
- Volume controls work for both music and SFX
- Audio properly pauses/resumes with game state

**REQUIRED EVIDENCE**:
1. Code diff showing:
   - Complete audio_manager.gd implementation
   - Audio player setup and configuration
2. List of audio files found and their usage
3. Screenshot of audio settings working
4. Video demonstrating:
   - SFX playback (jump, death, etc.)
   - Music playback
   - Volume controls working
5. Console output showing audio initialization and playback

**HANDOFF CONDITION**: 
- Game Tester verifies all audio plays correctly
- Audio settings affect volume as expected
- Evidence stored in test-plan/evidence/D17-audio-fix/
- Reviewer validates audio quality and coverage

**PRIORITY**: P2 - Not blocking core gameplay but required for M4 polish
**ASSIGNED**: 2026-09-06
**STATUS**: DISPATCHED
