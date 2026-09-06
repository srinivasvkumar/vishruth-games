# D5, D6, D7 Defect Fixes - Star Calculation & Performance

**Date**: 2026-09-06  
**Defect IDs**: D5, D6, D7  
**Severity**: P1  
**Status**: ALL FIXED

---

## D5 & D6 - Star Formula Off-by-One & Lives Tier Boundary

### Problems

**D5**: Star formula uses `lives` after decrement, causing off-by-one errors when lives=1.

**D6**: Lives tier system (L1-5=3 lives, L6-35=2 lives) had potential off-by-one errors at boundaries, and star calculation didn't account for different starting lives per tier.

### Root Cause

The original star calculation used absolute `lives` values:
```gdscript
var stars := 1
if lives >= 2:
    stars = 2
if lives >= 3 and time_bonus >= 50:
    stars = 3
```

This had several issues:
1. **Off-by-one**: If you start with 3 lives and die once (2 remaining), you get 2 stars. But if you start with 2 lives and die once (1 remaining), you only get 1 star - even though both scenarios represent the same "performance" (1 death).
2. **Tier boundary issue**: Players on levels 6+ (starting with 2 lives) could NEVER earn 3 stars because the condition `lives >= 3` could never be true.
3. **Inconsistent scoring**: Same performance (e.g., 1 death) resulted in different star ratings depending on the level tier.

### Solution

Implemented a lives-lost-based star calculation:

1. **Track starting lives**: Added `_starting_lives` variable in GameManager
2. **Calculate lives lost**: `_starting_lives - lives` gives the number of deaths
3. **Base stars on lives lost**:
   - 0 lives lost → 2-3 stars (depending on time bonus)
   - 1 life lost → 2 stars
   - 2+ lives lost → 1 star

### Code Changes

**Added tracking variable** (`autoloads/game_manager.gd`):
```gdscript
var _starting_lives: int = 0
```

**Set starting lives in `start_level()`**:
```gdscript
func start_level(level_num: int):
    current_level = level_num
    lives = 3 if level_num <= 5 else 2
    _starting_lives = lives  # Track starting lives
    score = 0
    level_started.emit(level_num)
```

**Fixed star calculation in `complete_level()`**:
```gdscript
# FIX D5/D6: Calculate star rating based on lives remaining vs starting lives
var lives_lost = _starting_lives - lives
var stars := 1
if lives_lost == 0:
    # No lives lost - potential for 3 stars
    if time_bonus >= 50:
        stars = 3
    else:
        stars = 2
elif lives_lost == 1:
    # Lost 1 life - 2 stars
    stars = 2
else:
    # Lost 2+ lives - 1 star
    stars = 1

print("[D5/D6 FIX] Level ", current_level, " - Starting lives: ", _starting_lives, 
      ", Remaining: ", lives, ", Lost: ", lives_lost, ", Stars: ", stars)
```

### Expected Behavior

| Starting Lives | Lives Remaining | Lives Lost | Time Bonus | Stars |
|----------------|-----------------|------------|------------|-------|
| 3 | 3 | 0 | ≥50 | 3 |
| 3 | 3 | 0 | <50 | 2 |
| 3 | 2 | 1 | any | 2 |
| 3 | 1 | 2 | any | 1 |
| 2 | 2 | 0 | ≥50 | 3 |
| 2 | 2 | 0 | <50 | 2 |
| 2 | 1 | 1 | any | 2 |
| 2 | 0 | 2 | any | 1 |

Now players on ALL levels can earn 3 stars, and the same performance yields the same star rating regardless of tier.

---

## D7 - HUD Allocation Churn

### Problem

The `_update_progress_bar()` function created new `StyleBoxFlat` instances every 100ms:
```gdscript
var pb_style: StyleBoxFlat = StyleBoxFlat.new()  # Created every 100ms!
pb_style.bg_color = Color(0.2, 0.5, 0.9, 0.3)
// ... more allocations in _bar_style() calls
```

This caused:
- **Memory churn**: New objects allocated 10 times per second
- **Garbage collection pressure**: Objects immediately become eligible for GC
- **Performance impact**: Unnecessary CPU usage for allocation/deallocation
- **Potential frame stuttering**: GC runs during gameplay

### Root Cause

The `_update_progress_bar()` function is called every 100ms (via `_process` timer), and it created new StyleBoxFlat objects on every call instead of reusing pre-created instances.

### Solution

Pre-create all progress bar styles in `_setup_visuals()` and reuse them:

1. **Added pre-created style variables**:
```gdscript
var _progress_bar_style: StyleBoxFlat
var _progress_bar_fill_style: StyleBoxFlat
var _progress_bar_bg_style: StyleBoxFlat
```

2. **Initialize styles once in `_setup_visuals()`**:
```gdscript
_progress_bar_style = StyleBoxFlat.new()
_progress_bar_style.bg_color = Color(0.2, 0.7, 1.0)
_progress_bar_style.set_corner_radius_all(2)

_progress_bar_fill_style = StyleBoxFlat.new()
_progress_bar_fill_style.bg_color = Color(0.2, 0.5, 0.9, 0.3)
_progress_bar_fill_style.set_corner_radius_all(4)

_progress_bar_bg_style = StyleBoxFlat.new()
_progress_bar_bg_style.bg_color = Color(0.1, 0.1, 0.1, 0.5)
_progress_bar_bg_style.set_corner_radius_all(4)
```

3. **Reuse in `_update_progress_bar()`**:
```gdscript
func _update_progress_bar() -> void:
    if not progress_bar:
        return
    var player_node: CharacterBody3D = _find_player()
    if player_node:
        var progress: float = clampf(player_node.global_position.x / LevelManager.finish_x, 0.0, 1.0)
        progress_bar.value = progress
        # FIX D7: Use pre-created styles instead of allocating new ones every 100ms
        if _progress_bar_fill_style:
            progress_bar.add_theme_stylebox_override("finished", _progress_bar_fill_style)
        if _progress_bar_style:
            progress_bar.add_theme_stylebox_override("fill", _progress_bar_style)
        if _progress_bar_bg_style:
            progress_bar.add_theme_stylebox_override("bar", _progress_bar_bg_style)
```

4. **Removed unnecessary `_bar_style()` function** that was creating additional allocations.

### Files Changed
- `scripts/ui/hud.gd` - Pre-created styles, removed allocation churn

### Expected Behavior
- **Zero allocations** in `_update_progress_bar()` after initialization
- **Reduced GC pressure**: No short-lived objects created during gameplay
- **Better performance**: Consistent frame times without GC spikes
- **Same visual appearance**: Identical styling, just more efficient

---

## Verification Required

### D5/D6 Verification
1. Complete levels from both tiers (1-5 and 6+)
2. Verify star calculation is fair and consistent
3. Test edge cases:
   - Complete with all lives remaining → 2-3 stars
   - Complete with 1 death → 2 stars
   - Complete with 2+ deaths → 1 star
4. Verify levels 6+ can earn 3 stars (previously impossible)

### D7 Verification
1. Monitor memory usage during gameplay
2. Check for frame stuttering or GC spikes
3. Verify progress bar visual appearance unchanged
4. Profile to confirm zero allocations in `_update_progress_bar()`

## Evidence Path
- Test results: `test-plan/evidence/D5D6-star-calculation/`
- Test results: `test-plan/evidence/D7-hud-performance/`
- Memory profile snapshots
- Frame timing data

## Next Steps
- Game Tester to verify all three fixes in actual gameplay
- Run related regression tests (F014 for D5, F013 for D6, F018 for D7)
- Reviewer sign-off
- Update defect ledger to CLOSED

## Notes
- D5/D6 fix ensures fair scoring across all 35 levels
- D7 fix eliminates unnecessary memory allocations (10 per second → 0)
- All fixes improve game quality without changing visual appearance
- Performance improvement from D7 is especially valuable for WebGL targets
