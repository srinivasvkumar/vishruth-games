# D1 Defect Fix - Retry After Game Over

**Date**: 2026-09-06  
**Defect ID**: D1  
**Severity**: P0  
**Status**: FIXED - Awaiting Verification

## Problem
Retry after Game Over reloads the scene without calling `start_level()`, causing the player to start with 0 lives. The game becomes unplayable after the first death.

## Root Cause
The `_on_retry()` function was calling `get_tree().reload_current_scene()` which completely reloads the scene, resetting ALL state including the GameManager. Even though `GameManager.start_level()` was called before the reload, the reload discarded that state.

## Solution
Instead of reloading the scene, the fix:
1. Resets game state to "idle"
2. Calls `GameManager.start_level()` to properly initialize lives, score, and level
3. Uses `LevelManager.respawn_player()` to reset player position
4. Reloads the level through `LevelManager.load_level()`
5. Re-wires player death signals
6. Sets game state back to "playing"

## Files Changed
- `scripts/game_scene.gd` - Modified `_on_retry()` function (lines 303-330)

## Code Changes
```gdscript
func _on_retry():
    # ... transition handling ...
    
    # FIX D1: Reset game state properly without reloading scene
    GameManager.set_state("idle")
    GameManager.start_level(GameManager.current_level)
    
    # Reset player position using LevelManager's respawn
    LevelManager.respawn_player()
    
    # Reset level
    LevelManager.load_level(GameManager.current_level)
    
    # Re-wire player death
    _wire_player_death()
    
    # Set game to playing state
    GameManager.set_state("playing")
```

## Expected Behavior
- Player clicks Retry after Game Over
- Game resets to initial state with correct number of lives (3 for levels 1-5, 2 for levels 6+)
- Score resets to 0
- Player is positioned at spawn point
- Game is immediately playable

## Verification Required
1. **Game Tester**: Play through a level to death, click Retry, verify:
   - Player has correct number of lives
   - Score is reset to 0
   - Game is playable immediately
   - No console errors

2. **Reviewer**: Verify the fix doesn't break:
   - Initial game start
   - Level complete flow
   - Other game state transitions

## Evidence Path
- Test results: `test-plan/evidence/D1-retry-fix/`
- Console logs during retry
- Screenshot/video of retry flow

## Next Steps
- Game Tester to verify fix with actual gameplay
- Run related regression tests (F014)
- Reviewer sign-off
- Update defect ledger to CLOSED
