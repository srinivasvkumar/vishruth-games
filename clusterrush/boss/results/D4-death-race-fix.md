# D4 Defect Fix - Hazard Death Race Condition

**Date**: 2026-09-06  
**Defect ID**: D4  
**Severity**: P0  
**Status**: FIXED - Awaiting Verification

## Problem
Hazard death race at the finish line - no transition lockout. When a player dies from a hazard at the exact moment they cross the finish line, both the death handler and level complete handler may fire, causing:
- State corruption (gameover vs levelcomplete conflict)
- Double transitions
- Unpredictable game behavior

## Root Cause
The game lacked proper transition lockout mechanisms:
1. `_on_player_died()` had a basic `_is_transitioning` check but didn't provide feedback
2. `_on_level_completed()` had NO lockout protection at all
3. `GameManager.complete_level()` only checked if state was "playing" but didn't account for rapid sequential calls
4. No logging to help diagnose race conditions when they occurred

## Solution
Implemented comprehensive transition lockout with debug logging:

### 1. Enhanced Death Handler (`game_scene.gd`)
- Added debug logging when death is blocked due to transition
- Added debug logging for game over state
- Maintains `_is_transitioning` flag to prevent concurrent transitions

### 2. Protected Level Complete Handler (`game_scene.gd`)
- Added `_is_transitioning` check at the start
- Logs when level complete is blocked due to race condition
- Prevents level complete UI from showing if death is already in progress

### 3. Strengthened GameManager (`game_manager.gd`)
- Enhanced `complete_level()` with detailed state checking
- Logs when level complete is blocked due to non-playing state
- Ensures state transitions are atomic and mutually exclusive

## Files Changed
1. `scripts/game_scene.gd` - Enhanced `_on_player_died()` and `_on_level_completed()`
2. `autoloads/game_manager.gd` - Enhanced `complete_level()` with debug logging

## Code Changes

### game_scene.gd - _on_player_died()
```gdscript
func _on_player_died():
    # FIX D4: Check transition lockout to prevent race conditions at finish line
    if _is_transitioning:
        print("[D4 FIX] Death blocked - already transitioning")
        return
    if GameManager.is_player_alive():
        _handle_death()
    else:
        print("[D4 FIX] Game over state - no additional action needed")
```

### game_scene.gd - _on_level_completed()
```gdscript
func _on_level_completed():
    # FIX D4: Check transition lockout to prevent race conditions with death
    if _is_transitioning:
        print("[D4 FIX] Level complete blocked - already transitioning (possible death race)")
        return
    # ... rest of level complete logic
```

### game_manager.gd - complete_level()
```gdscript
func complete_level():
    # FIX D4: Check if we're already in a transition state
    if game_state != "playing":
        print("[D4 FIX] Level complete blocked - state is: ", game_state)
        return
    # ... rest of level complete logic
```

## Expected Behavior
1. **Normal death**: Player dies → death handler runs → respawn or game over
2. **Normal completion**: Player crosses finish line → level complete handler runs → show results
3. **Race condition**: Player dies at exact moment of crossing finish line:
   - Whichever event fires first sets `_is_transitioning = true`
   - Second event is blocked and logged
   - Only ONE transition occurs (no corruption)
   - Debug logs help identify which event won the race

## Verification Required
1. **Game Tester**: 
   - Test normal death scenarios
   - Test normal level completion
   - **Edge case**: Attempt to die at the exact moment of crossing finish line (may require multiple attempts)
   - Verify only ONE outcome occurs (death OR completion, not both)
   - Check console logs for D4 FIX messages

2. **Reviewer**: 
   - Verify no state corruption in edge cases
   - Confirm debug logging is helpful for diagnosis
   - Ensure no regression in normal gameplay

## Evidence Path
- Test results: `test-plan/evidence/D4-death-race-fix/`
- Console logs showing race condition handling
- Screenshot/video of edge case testing

## Next Steps
- Game Tester to verify fix with actual gameplay
- Run related regression tests (F010)
- Reviewer sign-off
- Update defect ledger to CLOSED
