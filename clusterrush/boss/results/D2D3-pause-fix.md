# D2 & D3 Defect Fix - Pause Button Issues

**Date**: 2026-09-06  
**Defect IDs**: D2, D3  
**Severity**: P0  
**Status**: FIXED - Awaiting Verification

## Problems

### D2: Pause Double-Bound
Single press produces no-op because toggle fires twice. The pause key is pressed but nothing happens.

### D3: Pause Bound to KP_Enter
Pause was supposedly bound to KP_Enter (key code 4194310), making it unusable on laptops without numpad.

## Root Causes

### D2 Root Cause
The `_toggle_pause()` function checked `GameManager.get_state()` but never UPDATED the state:
- First press: State was "playing", so it set `get_tree().paused = true` but DIDN'T set GameManager state to "paused"
- Second press: State was STILL "playing" (not "paused"), so it tried to pause again (no-op since tree was already paused)
- Result: Pause appeared broken - pressing it did nothing visible

### D3 Root Cause
The input mapping in project.godot actually shows pause is bound to physical_keycode 27 (Escape key), NOT KP_Enter. This defect description may be outdated or incorrect.

## Solutions

### D2 Fix
Modified `_toggle_pause()` in `scripts/game_scene.gd` to properly manage game state:
1. Check current state
2. If "playing": Set `get_tree.paused = true` AND call `GameManager.set_state("paused")`
3. If "paused": Set `get_tree.paused = false` AND call `GameManager.set_state("playing")`
4. Added debug prints to trace pause/unpause events

### D3 Verification
Confirmed pause is bound to Escape key (physical_keycode 27) in project.godot, which works on all keyboards. No change needed.

### Additional Fix
Added missing `game_resumed` signal emission in `autoloads/game_manager.gd`:
- When transitioning from "paused" to "playing", now emits `game_resumed` signal
- This ensures `_on_game_resumed()` is properly called to update `_is_paused` flag

## Files Changed
1. `scripts/game_scene.gd` - Fixed `_toggle_pause()` function (lines 388-404)
2. `autoloads/game_manager.gd` - Added game_resumed signal emission in `set_state()` (lines 28-38)

## Code Changes

### game_scene.gd
```gdscript
func _toggle_pause():
    var current_state = GameManager.get_state()
    
    if current_state == "playing":
        # Pause the game
        get_tree().paused = true
        GameManager.set_state("paused")
        pause_menu.visible = true
        print("[PAUSE DEBUG] Game paused - state set to 'paused'")
        
    elif current_state == "paused":
        # Unpause the game
        get_tree().paused = false
        GameManager.set_state("playing")
        pause_menu.visible = false
        print("[PAUSE DEBUG] Game unpaused - state set to 'playing'")
        
    else:
        # Cannot pause if not in playing state
        print("[PAUSE DEBUG] Cannot toggle pause in state: ", current_state)
```

### game_manager.gd
```gdscript
func set_state(new_state: String):
    var old_state = game_state
    game_state = new_state
    if new_state == "playing":
        level_start_time = Time.get_ticks_msec() / 1000.0
        # Emit game_resumed if we're transitioning from paused
        if old_state == "paused":
            game_resumed.emit()
    elif new_state == "paused":
        game_paused.emit()
    # ... rest of state handling
```

## Expected Behavior
1. **First press (Escape)**: Game pauses, pause menu appears, state becomes "paused"
2. **Second press (Escape)**: Game unpauses, pause menu disappears, state becomes "playing"
3. Pause works reliably on all keyboards (Escape key)
4. No double-fire or state corruption

## Verification Required
1. **Game Tester**: 
   - Press Escape during gameplay → verify pause menu appears
   - Press Escape again → verify game resumes
   - Verify state transitions are clean (no double-toggles)
   - Test multiple rapid presses to ensure no state corruption

2. **Reviewer**: 
   - Verify pause doesn't work in non-playing states (menu, game over, etc.)
   - Confirm no regression in other game flows

## Evidence Path
- Test results: `test-plan/evidence/D2D3-pause-fix/`
- Console logs showing pause state transitions
- Screenshot/video of pause toggle working correctly

## Next Steps
- Game Tester to verify fix with actual gameplay
- Run related regression tests (F011)
- Reviewer sign-off
- Update defect ledger to CLOSED
