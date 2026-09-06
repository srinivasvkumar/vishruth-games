# TASK: D2 & D3 - Pause Button Defects

**TASK ID**: D2D3-PAUSE-FIX-v1  
**OWNER**: game-dev  
**MILESTONE**: M0 (Prerequisite for M2)  
**OBJECTIVE**: Fix pause button defects: (D2) double-bound pause causing no-op, (D3) pause bound to KP_Enter which laptops without numpad cannot use.

**SOURCE OF TRUTH**: 
- Defects D2, D3 in boss/defects.md
- Test F011 in test-plan/task_plan.md
- Input mapping documentation in docs/input_mapping_matrix.md

**DEPENDENCIES**: None (P0 blocker)

**FILES/AREAS**:
- `scripts/game_scene.gd` - Pause toggle logic
- `autoloads/input_manager.gd` - Input mappings
- `project.godot` - Input map configuration

**EXACT ACTIONS**:
1. **For D2 (Double-bound)**:
   - Find all pause toggle event handlers
   - Ensure only ONE listener exists for the pause input
   - Verify toggle logic uses proper state tracking (paused → unpaused)
   - Test: Press pause once → game pauses; press again → unpauses

2. **For D3 (KP_Enter binding)**:
   - Change pause key from KP_Enter (key code 4194310) to standard Enter or P key
   - Update input mapping in project.godot
   - Verify the new binding works on standard keyboards
   - Test on a laptop without numpad if possible

3. **Testing**:
   - Scripted test: Send pause key event → verify game state changes to paused
   - Send again → verify unpaused
   - Verify no console errors

**DO NOT CHANGE**:
- Other input bindings (jump, strafe, etc.)
- Game mechanics
- HUD or UI layout

**EXPECTED OUTPUT**:
- Single pause key press toggles pause state correctly
- Pause key works on standard keyboards (not just numpad)
- No double-fire or state corruption

**REQUIRED EVIDENCE**:
1. Code diff showing:
   - Removal of duplicate pause handlers
   - Input mapping change from KP_Enter to Enter/P
2. Screenshot/video of pause toggle working correctly
3. Console output showing single pause event handling
4. Verification that both D2 and D3 are resolved

**HANDOFF CONDITION**: 
- Game Tester can verify pause toggles correctly with single press
- Pause works with standard Enter or P key
- Evidence stored in test-plan/evidence/D2D3-pause-fix/
- Reviewer validates no regression in other input handling

**PRIORITY**: P0 - Makes game unpausable on most keyboards
**ASSIGNED**: 2026-09-06
**STATUS**: DISPATCHED
