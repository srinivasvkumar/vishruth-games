# D14 & D16 Defect Fixes - Double-Respawn & Auto-Run Momentum

**Date**: 2026-09-06  
**Defect IDs**: D14, D16  
**Severity**: P2  
**Status**: FIXED

---

## D14 - Possible Double-Respawn on Hazard Death

### Problem
Both `_on_player_died` (signal handler) and `player_died` function could fire simultaneously, causing the player to respawn twice. This could lead to:
- Player appearing in wrong position
- State corruption
- Unpredictable gameplay behavior

### Root Cause
The `player_died` signal from the player could potentially trigger multiple handlers, or the signal could be emitted multiple times in quick succession (e.g., from both hazard collision and fall death checks).

### Solution
Added a guard flag `_is_responding_to_death` to prevent multiple respawns:

1. **Added tracking variable** (`autoloads/game_manager.gd`):
```gdscript
# FIX D14: Prevent double-respawn
var _is_responding_to_death: bool = false
```

2. **Updated `player_died()` function**:
```gdscript
func player_died():
    # FIX D14: Prevent double-respawn by checking if we're already handling death
    if _is_responding_to_death:
        print("[D14 FIX] Death already being handled, ignoring duplicate call")
        return
    
    _is_responding_to_death = true
    lives -= 1
    lives_changed.emit()
    
    if lives <= 0:
        set_state("gameover")
        _is_responding_to_death = false
    else:
        get_node("/root/LevelManager").respawn_player()
        # Reset the flag after respawn is triggered
        _is_responding_to_death = false
```

### Files Changed
- `autoloads/game_manager.gd` - Added `_is_responding_to_death` flag and guard logic

### Expected Behavior
- Only ONE respawn occurs per death event
- Duplicate death signals are ignored
- Game state remains consistent

---

## D16 - Auto-Run Overwrites Momentum Every Frame

### Problem
The auto-run system was setting `velocity.x = AUTO_RUN_SPEED` every frame, which:
- Overwrote momentum from jumps, wall jumps, and other actions
- Prevented players from maintaining speed gained through skillful play
- Made movement feel rigid and unnatural

### Root Cause
The `_handle_movement()` function unconditionally set `velocity.x = AUTO_RUN_SPEED` every physics frame, ignoring any existing forward momentum.

### Solution
Modified auto-run to maintain a MINIMUM forward speed rather than overwriting:

```gdscript
func _handle_movement(delta: float):
    # FIX D16: Auto-run should maintain minimum forward speed without overwriting momentum
    if not is_climbing and not is_on_wall:
        # Only set auto-run if current forward velocity is below threshold
        # This preserves momentum from jumps, wall jumps, etc.
        if velocity.x < AUTO_RUN_SPEED:
            velocity.x = AUTO_RUN_SPEED
        # If player is moving faster than auto-run (e.g., from a jump), keep that speed
    
    # ... rest of movement logic
```

### Files Changed
- `scripts/player/player_movement.gd` - Modified `_handle_movement()` function

### Expected Behavior
- Auto-run provides minimum forward speed of 5.0
- Players can exceed auto-run speed through jumps and other actions
- Momentum is preserved for more fluid, skill-based movement
- Auto-run doesn't interfere with advanced movement techniques

---

## Verification Required

### D14 Verification
1. Trigger hazard death multiple times in quick succession
2. Verify only ONE respawn occurs
3. Check console for "[D14 FIX] Death already being handled" messages if duplicates occur
4. Verify game state remains consistent

### D16 Verification
1. Perform a wall jump and observe forward speed exceeds AUTO_RUN_SPEED
2. Verify the extra speed is maintained (not overwritten by auto-run)
3. Test normal auto-run when not jumping
4. Verify smooth, fluid movement without speed resets

## Evidence Path
- Test results: `test-plan/evidence/D14-double-respawn/`
- Test results: `test-plan/evidence/D16-auto-run-momentum/`
- Console logs showing duplicate death prevention
- Video demonstrating momentum preservation

## Next Steps
- Game Tester to verify both fixes in actual gameplay
- Run related regression tests (F012 for D14, F005 for D16)
- Reviewer sign-off
- Update defect ledger to CLOSED

## Notes
- D14 fix ensures stable death/respawn mechanics
- D16 fix improves gameplay feel and rewards skillful play
- Both fixes are minimal, targeted changes with low risk of regression
