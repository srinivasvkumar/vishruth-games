# D8 & D11 Defect Fixes - Timer and Game Initialization

**Date**: 2026-09-06  
**Defect IDs**: D8, D11  
**Severity**: P1  
**Status**: FIXED

---

## D11 - Start Game Doesn't Initialize Game State

### Problem
When clicking "Start Game" from the main menu, the game scene loaded but never called `GameManager.start_level()`, resulting in:
- Lives not initialized (remained at default or previous value)
- Score not reset to 0
- Level not properly started
- Game state inconsistent

### Root Cause
The `_load_level()` function in `game_scene.gd` called `LevelManager.load_level()` and set the state to "playing", but never called `GameManager.start_level()` to initialize the game state (lives, score, etc.).

### Solution
Added a call to `GameManager.start_level()` at the beginning of `_load_level()`:

```gdscript
func _load_level():
    # Show loading screen
    loading_screen.visible = true
    
    # Wait a frame for scene to settle
    await get_tree().process_frame
    
    # FIX D11: Initialize game state before loading the level
    print("[D11 FIX] Calling GameManager.start_level with level=", GameManager.current_level)
    GameManager.start_level(GameManager.current_level)
    print("[D11 FIX] After start_level, lives=", GameManager.lives, " score=", GameManager.score)
    
    # Generate the level through LevelManager
    LevelManager.load_level(GameManager.current_level)
    
    # ... rest of the function
```

### Files Changed
- `scripts/game_scene.gd` - Added `GameManager.start_level()` call in `_load_level()`

### Expected Behavior
When player clicks "Start Game":
1. Game state is properly initialized with correct lives (3 for levels 1-5, 2 for levels 6+)
2. Score is reset to 0
3. Level is loaded with correct settings
4. Game begins in a consistent, playable state

---

## D8 - Wall-Clock Timer Not Pause-Aware

### Problem
The game used `Time.get_ticks_msec()` to calculate elapsed time, which continues counting even when the game is paused. This caused:
- Time bonus calculations to include pause duration
- Incorrect level completion times
- Unfair scoring (players could pause to extend time)

### Root Cause
The timer calculation was simply: `Time.get_ticks_msec() / 1000.0 - level_start_time`, which doesn't account for time spent paused.

### Solution
Implemented a pause-aware timer system:

1. **Added tracking variables**:
   - `_pause_start_time`: When current pause started
   - `_total_pause_time`: Cumulative time spent paused

2. **Updated `set_state()` to track pauses**:
   ```gdscript
   func set_state(new_state: String):
       var old_state = game_state
       game_state = new_state
       if new_state == "playing":
           if old_state == "paused":
               # Stop tracking current pause
               _total_pause_time += Time.get_ticks_msec() / 1000.0 - _pause_start_time
               game_resumed.emit()
           if old_state != "paused":
               # New game, reset pause tracking
               level_start_time = Time.get_ticks_msec() / 1000.0
               _total_pause_time = 0.0
       elif new_state == "paused":
           # Start tracking pause time
           _pause_start_time = Time.get_ticks_msec() / 1000.0
           game_paused.emit()
   ```

3. **Created pause-aware `get_current_time()`**:
   ```gdscript
   func get_current_time() -> float:
       if game_state == "playing":
           var current_time = Time.get_ticks_msec() / 1000.0
           var elapsed = current_time - level_start_time
           # Subtract current pause duration if paused
           if game_state == "paused":
               elapsed -= (current_time - _pause_start_time)
           # Subtract all previous pause time
           elapsed -= _total_pause_time
           return elapsed
       return 0.0
   ```

4. **Updated `complete_level()` to use pause-aware time**:
   ```gdscript
   var elapsed: float = get_current_time()
   var time_bonus: float = minf(elapsed * 10.0, 100.0)
   ```

### Files Changed
- `autoloads/game_manager.gd` - Added pause tracking variables and logic

### Expected Behavior
- Timer only counts actual gameplay time
- Pausing does not affect time bonus calculations
- Level completion time reflects only active play time
- Fair scoring system unaffected by pausing

---

## Verification Required

### D11 Verification
1. Start game from main menu
2. Verify lives = 3 (levels 1-5) or 2 (levels 6+)
3. Verify score = 0
4. Play through level and confirm proper state

### D8 Verification
1. Start a level and note the time
2. Pause the game for 10 seconds
3. Unpause and complete the level
4. Verify time bonus does NOT include the 10-second pause
5. Compare with unpause time - should be nearly identical

## Evidence Path
- Test results: `test-plan/evidence/D8-pause-timer/`
- Test results: `test-plan/evidence/D11-start-game-init/`
- Console logs showing time calculations
- Screenshots of time bonus with/without pausing

## Next Steps
- Game Tester to verify both fixes in actual gameplay
- Run related regression tests (F016 for D8, F002 for D11)
- Reviewer sign-off
- Update defect ledger to CLOSED

## Notes
- Both fixes improve game fairness and consistency
- D11 ensures proper game initialization
- D8 prevents time manipulation through pausing
- Implementation is clean and doesn't affect other game systems
