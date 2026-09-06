# TASK: D4 - Hazard Death Race Condition

**TASK ID**: D4-DEATH-RACE-FIX-v1  
**OWNER**: game-dev  
**MILESTONE**: M0 (Prerequisite for M2)  
**OBJECTIVE**: Fix the hazard death race condition at the finish line where there's no transition lockout, causing potential double-death or state corruption.

**SOURCE OF TRUTH**: 
- Defect D4 in boss/defects.md
- Test F016 in test-plan/task_plan.md
- Affected files: game_scene.gd, player movement scripts

**DEPENDENCIES**: None (P0 blocker)

**FILES/AREAS**:
- `scripts/game_scene.gd` - Death handling and state transitions
- `scripts/player/player_movement.gd` - Player collision and death triggers
- `prefabs/hazards/` - Hazard scripts
- `scenes/game.tscn` - Game scene configuration

**EXACT ACTIONS**:
1. Locate the hazard death handler in game_scene.gd
2. Identify the race condition: player can die from hazard AND reach finish line simultaneously
3. Implement a transition lockout mechanism:
   - Add a `is_transitioning` flag to prevent multiple state changes
   - Set flag when death or completion is triggered
   - Check flag before allowing any state transition
   - Reset flag after transition completes
4. Ensure death state takes priority over finish line at the exact moment
5. Test edge cases:
   - Player touches hazard at exact finish line position
   - Player dies and finish line triggers in same frame
   - Multiple hazards near finish line

**DO NOT CHANGE**:
- Death mechanics themselves
- Finish line logic
- Other game state transitions

**EXPECTED OUTPUT**:
- Only ONE death or completion event fires per game session
- No state corruption when hazard and finish line coincide
- Clean transition to game over or level complete screen

**REQUIRED EVIDENCE**:
1. Code diff showing:
   - Addition of transition lockout mechanism
   - Proper flag setting/resetting
2. Screenshot/video of edge case testing (death at finish line)
3. Console output showing no duplicate death events
4. Verification that the fix handles all race condition scenarios

**HANDOFF CONDITION**: 
- Game Tester can verify no double-death or state corruption at finish line
- Edge case testing complete with evidence
- Evidence stored in test-plan/evidence/D4-death-race-fix/
- Reviewer validates no regression in death/finish flows

**PRIORITY**: P0 - Causes state corruption and unplayable scenarios
**ASSIGNED**: 2026-09-06
**STATUS**: DISPATCHED
