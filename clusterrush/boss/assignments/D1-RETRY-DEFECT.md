# TASK: D1 - Retry After Game Over

**TASK ID**: D1-FIX-v6  
**OWNER**: game-dev  
**MILESTONE**: M0 (Prerequisite for M2)  
**OBJECTIVE**: Fix the retry-after-game-over defect where reloading the scene doesn't call start_level(), causing players to start with 0 lives.

**SOURCE OF TRUTH**: 
- Defect D1 in boss/defects.md
- Test F014 in test-plan/task_plan.md
- Affected files: game_scene.gd, game_manager.gd

**DEPENDENCIES**: None (P0 blocker)

**FILES/AREAS**:
- `scripts/game_scene.gd` - Scene reload logic
- `autoloads/game_manager.gd` - Game state management
- `scenes/game.tscn` - Scene configuration

**EXACT ACTIONS**:
1. Locate the retry button handler in game_scene.gd (likely in `_on_game_over` or similar)
2. Identify where `change_scene_to_file()` is called
3. Add call to `GameManager.start_level()` after scene change
4. Ensure all game state is properly reset (lives, score, level)
5. Test the fix by: reaching game over → clicking retry → verify game starts with correct lives

**DO NOT CHANGE**:
- Other game flow paths (main menu → game, level select → game)
- Lives calculation logic
- Save/load functionality

**EXPECTED OUTPUT**:
- Retry button properly initializes a new game session
- Player starts with correct number of lives after retry
- No console errors during scene transition

**REQUIRED EVIDENCE**:
1. Code diff showing the fix
2. Screenshot of retry flow working (game_over → retry → game starts)
3. Console output showing start_level() being called
4. Verification that lives are correct after retry

**HANDOFF CONDITION**: 
- Game Tester can successfully reproduce the retry flow without the 0-lives bug
- Evidence stored in test-plan/evidence/D1-retry-fix/
- Reviewer validates the fix doesn't break other game flows

**PRIORITY**: P0 - Blocks gameplay entirely
**ASSIGNED**: 2026-09-06
**STATUS**: DISPATCHED
