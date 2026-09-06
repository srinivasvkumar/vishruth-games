# Task: M4-04 - Settings Menu Implementation

## TASK ID
M4-04

## OWNER
game-dev

## MILESTONE
M4 - Performance & Polish

## OBJECTIVE
Connect the existing settings UI sliders to the AudioManager to enable real-time volume control for master, SFX, and music.

## SOURCE OF TRUTH
Boss_Plan.md Section 10 (M4 - Performance & Polish), M4-04 requirement

## DEPENDENCIES
- M4-02 (Audio Tester will verify functionality)

## FILES/AREAS
- scenes/main_menu.tscn (SettingsPanel with AudioSlider and MusicSlider)
- scripts/ui/main_menu_ui.gd
- autoloads/audio_manager.gd

## EXACT ACTIONS
1. **Connect AudioSlider to AudioManager:**
   - Get reference to AudioSlider node in main_menu_ui.gd
   - Connect slider's value_changed signal to AudioManager.set_sfx_volume()
   - Initialize slider value from AudioManager.get_sfx_volume()

2. **Connect MusicSlider to AudioManager:**
   - Get reference to MusicSlider node in main_menu_ui.gd
   - Connect slider's value_changed signal to AudioManager.set_music_volume()
   - Initialize slider value from AudioManager.get_music_volume()

3. **Add Master Volume Control (optional enhancement):**
   - Add Master Volume slider to settings panel
   - Connect to AudioManager.set_master_volume()

4. **Add Settings Persistence:**
   - Save volume settings to GameManager or ConfigFile
   - Load settings on game start
   - Apply settings to AudioManager on load

5. **Test Settings Functionality:**
   - Verify sliders update audio in real-time
   - Verify settings persist across game sessions
   - Verify default values are appropriate

## DO NOT CHANGE
- AudioManager core logic
- Audio file contents

## EXPECTED OUTPUT
- AudioSlider controls SFX volume in real-time
- MusicSlider controls music volume in real-time
- Settings persist across game sessions (if persistence implemented)
- Settings panel opens/closes smoothly
- All UI elements properly styled and visible

## REQUIRED EVIDENCE
- Screenshots of settings panel with different volume levels
- Verification that audio responds to slider changes
- boss/results/M4-04-settings-implementation.md with:
  - List of implemented features
  - Signal connections made
  - Persistence status (if implemented)
  - Testing results

## HANDOFF CONDITION
- All sliders connected and functional
- Audio responds to slider changes in real-time
- Settings persist (if implemented)
- Game-tester verifies all controls work
- Results documented in boss/results/M4-04-settings-implementation.md

## PRIORITY
P1 (User control and accessibility)

## NOTES
- SettingsPanel already exists in main_menu.tscn with AudioSlider and MusicSlider
- main_menu_ui.gd already has _on_settings() handler
- Need to add signal connections in _setup_ui() or _ready()
- Consider adding labels showing current volume percentage
