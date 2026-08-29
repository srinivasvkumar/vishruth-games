# Spec: Level Select UI — Phase 2

## Status: **SPEC ONLY** — Code already exists, spec needed for validation

## Owner: @game-dev, @reviewer (QA sign-off)

---

## Purpose

Allow players to choose which of the 35 levels to play. Show unlocked levels as clickable, locked levels as disabled. Show difficulty tiers, completion status, and best times for completed levels.

---

## Architecture

```
Scene:        res://scenes/level_select.tscn
Script:       res://scripts/ui/level_select_ui.gd
Autoloads:    GameManager (lives/score/save state), LevelManager (level params, progress save)
Save Path:    user://cluster_rush_save.dat (ConfigFile, key: progress/highest_level)
```

### Existing Scene Tree (level_select.tscn)
```
LevelSelect (Control, full-screen)
└── VBoxContainer
    ├── TitleLabel          ("Select Level")
    ├── LevelButtonsContainer (GridContainer, 7 columns)
    ├── RestartButton       ("Restart")
    └── BackButton          ("Back to Menu")
```

### Existing Script (level_select_ui.gd) — already implemented
- `_generate_buttons()`: creates 35 Button nodes dynamically
- `_create_level_button()`: sets text, disabled state, tooltip, style, signal
- `_apply_button_style()`: enables/disables via Color overrides + StyleBoxFlat
- `_on_level_selected()`: validates unlock threshold → GameManager.start_level() → change to game.tscn
- `update_unlocked_count()`: public API to refresh grid mid-session
- Uses `LevelManager.get_unlocked_levels()` for unlock threshold

**NOTE TO IMPLEMENTER:** Do NOT rewrite. The existing implementation is functional. Focus is on **validation, edge cases, and any missing features**.

---

## Visual Spec

### Layout

```
┌──────────────────────────────────────────────────────────┐
│                  [Back to Menu]                          │
│                  [Restart]                               │
│                                                          │
│                     Select Level                         │
│                                                          │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│   │  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │ │  7  ││
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│   │  8  │ │  9  │ │ 10  │ │ 11  │ │ 12  │ │ 13  │ │ 14  ││
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│
│   ... 5 rows of 7 = 35 levels total ...                   │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│   │ 29  │ │ 30  │ │ 31  │ │ 32  │ │ 33  │ │ 34  │ │ 35  ││
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **Grid**: 7 columns × 5 rows (35 levels)
- **Button size**: 80×44 px minimum
- **Spacing**: GridContainer default spacing
- **Colors** (from code):
  - Unlocked: font green (#33cc33), background light green (#ebf7eb), green border
  - Locked: font dark gray (#737373), background gray (#d9d9d9), gray border
  - Hover on unlocked: brighter green (#4de64d)
- **Text**: "Level N" format
- **Tooltip**: "Level N - Tap to play" / "Level N - Complete earlier levels first"

### Difficulty Tiers (LevelManager level_templates)

Levels are organized into 5 tiers — this should be visible:

| Tier | Levels | Speed Range | Gap Range | Hazards |
|------|--------|------------|-----------|---------|
| Tutorial | 1-5 | 10-12 | 3.0-4.0 | 0-1 |
| Easy | 6-10 | 12-15 | 2.5-3.5 | 1-2 |
| Medium | 11-20 | 15-18 | 2.0-3.0 | 2-3 |
| Hard | 21-30 | 18-22 | 1.5-2.5 | 3-4 |
| Expert | 31-35 | 22-25 | 1.0-2.0 | 4-5 |

**Recommended visual indicators** (nice-to-have, not blocking):
- Color-code buttons by difficulty tier:
  - Tutorial: green
  - Easy: blue
  - Medium: yellow/amber
  - Hard: orange
  - Expert: red
- Show star count below level number (1 star = tutorial, 2 = easy, etc.)

---

## Interaction Spec

### Button States

| State | Visual | Action |
|-------|--------|--------|
| Unlocked (idle) | Green bg, green text | Clickable |
| Unlocked (hover) | Brighter green bg, brighter text | Shows tooltip |
| Unlocked (pressed) | Darker green bg | Triggers level start |
| Locked (idle) | Gray bg, gray text, non-clickable | No action |
| Locked (hover) | Same as idle | Shows "locked" tooltip |

### Navigation

1. **Click unlocked level N**:
   - Validate `N <= _unlock_threshold`
   - Call `GameManager.start_level(N)` — resets lives/score, sets game_state to "playing"
   - Call `get_tree().change_scene_to_file("res://scenes/game.tscn")`
   - GameScene loads and immediately loads the level

2. **Click "Back to Menu"**:
   - `get_tree().change_scene_to_file("res://scenes/main_menu.tscn")`

3. **Click "Restart"**:
   - `get_tree().reload_current_scene()` — reloads this scene

---

## Edge Cases & Error Handling

### EC1: Only Level 1 unlocked (fresh install)
- Button 1: green, clickable
- Buttons 2-35: gray, disabled
- Tooltip on locked: "Level N - Complete earlier levels first"

### EC2: All 35 levels unlocked (player finished game)
- All 35 buttons green and clickable
- Tooltips all say "Tap to play"
- Player can replay any level

### EC3: Very small viewport (mobile)
- GridContainer will auto-scroll or overflow
- **Recommended**: wrap in a ScrollContainer so the grid scrolls vertically
- Minimum viewport: 360×640 (phone portrait) — grid wraps or scrolls
- Landscape mode: full grid visible without scroll

### EC4: Click "Back" during level load
- Scene change is instant in Godot; no intermediate state
- **Risk**: if player is in the middle of `_load_level()` in game.tscn when back is clicked, the old scene might not fully clean up
- **Mitigation**: GameManager handles cleanup via scene tree free on change

### EC5: GameManager.unlocked_levels is invalid (e.g., corrupted save)
- `LevelManager.get_unlocked_levels()` returns 1 on error (safe fallback)
- At minimum, Level 1 is always playable

### EC6: Scene load failure
- If `game.tscn` or `level_select.tscn` fails to load, Godot prints an error to console
- Game will NOT crash; Godot handles this gracefully
- No visual feedback to user — just an error in dev console

### EC7: Level selected but GameManager.start_level() fails
- `GameManager.start_level(N)` always succeeds (just sets vars)
- If `game.tscn` exists, `change_scene_to_file` will succeed
- No failure path to handle

### EC8: Rapid clicking between levels
- `_generate_buttons()` clears existing buttons each time
- No duplicate connections — each `_create_level_button` creates a fresh Button with a single `pressed` signal
- Godot's scene tree handles orphaned buttons via `queue_free()`

### EC9: Player opens level select mid-game (via pause → level select)
- Existing pause_menu has a "Level Select" button that calls `_on_level_select()`
- This changes scene without saving/leaving
- Level state is preserved in GameManager autoload (not lost)

---

## Data Flow

```
Player clicks level 5
  → _on_level_selected(5)
  → GameManager.start_level(5)
       → current_level = 5
       → lives = 2  (level > 5, so 2 lives not 3)
       → score = 0
       → level_started.emit(5)
  → change_scene_to_file("res://scenes/game.tscn")
       → game.tscn loads
       → GameScene._ready() → _load_level()
           → LevelManager.load_level(5)
               → get_level_parameters(5) → tier "easy"
               → _generate_level(5) → ground + trucks + hazards
       → Player can play
```

### Progress Save Flow

```
Level 5 complete
  → GameManager.complete_level()
       → time_bonus = min(elapsed * 10, 100)
       → score += 100 + time_bonus
       → save_progress(6)  ← saves highest_level = 6
       → level_completed.emit()
  
Next time level_select opens:
  → LevelManager.get_unlocked_levels()
       → reads user://cluster_rush_save.dat
       → returns 6
  → Buttons 1-6 enabled, 7-35 disabled
```

---

## Acceptance Criteria (QA Test Plan)

### Functional Tests
- [ ] Back button returns to main menu
- [ ] Restart button reloads the level select scene
- [ ] Unlocked level buttons (1 to highest_level) are clickable
- [ ] Locked level buttons (highest_level+1 to 35) are gray and non-clickable
- [ ] Clicking an unlocked level transitions to game.tscn and loads that level
- [ ] Clicking a locked level does nothing (no crash, no error)
- [ ] Fresh install: only level 1 is unlocked
- [ ] After completing level 1: level 2 becomes unlocked on next scene load
- [ ] All 35 levels unlocked after completing final level
- [ ] GameManager state (score, lives, current_level) is correct after navigating

### Visual Tests
- [ ] Grid displays all 35 levels in 7×5 layout
- [ ] Unlocked buttons are green/white, locked are gray
- [ ] Button text is readable at all viewport sizes
- [ ] Tooltips appear on hover for both unlocked and locked buttons
- [ ] Title "Select Level" is visible and centered

### Edge Case Tests
- [ ] Corrupted save file: falls back to level 1 unlock (no crash)
- [ ] Small viewport: grid remains usable (scroll or wrap)
- [ ] Rapid scene transitions: no memory leaks or orphaned nodes
- [ ] Level select opened mid-game via pause menu: works correctly
- [ ] Level number in button text matches clicked level (no off-by-one)

### Browser/Platform Tests
- [ ] Chrome (desktop) — fully functional
- [ ] Firefox (desktop) — fully functional
- [ ] Safari — works (may have WebGL limitations, but UI should render)
- [ ] Mobile browser — touch-friendly button sizes (80px minimum)

---

## Technical Notes for Implementer

### GDScript Conventions
- **GDScript ONLY** — no C#
- Use `extends Control` for the scene root
- Use `@onready var` for all node references
- Use `const` for magic numbers
- Signal-based architecture (no direct node access from other scripts)
- Follow existing naming: `_on_*` for signals, `_*` for private

### Key APIs
```gdscript
# Get unlocked level count
LevelManager.get_unlocked_levels() -> int

# Start a specific level
GameManager.start_level(level_number: int)

# Load level parameters
LevelManager.get_level_parameters(level_number: int) -> Dictionary

# Save progress (automatic on level complete)
GameManager.save_progress(level_number: int)

# Refresh button grid (call if unlocked count changes)
$LevelSelectUI.update_unlocked_count(new_count: int)
```

### Scene File Structure (existing — do not change)
```
LevelSelect (Control)
└── VBoxContainer
    ├── TitleLabel
    ├── LevelButtonsContainer (GridContainer, 7 columns)
    ├── RestartButton
    └── BackButton
```

### Known Issues in Existing Code
1. **Title is hardcoded** as "Select Level" in .tscn — could be internationalized
2. **Restart button** reloads level_select, not the game — may be confusing
3. **No difficulty indicators** — players can't tell which levels are easy vs expert
4. **No completion status** — no visual indication of which levels have been completed
5. **GridContainer has fixed 7 columns** — may not fit on very narrow screens
6. **No ScrollContainer** — if the grid overflows, buttons are clipped
7. **GameManager.start_level() sets lives based on level number** — level 1-5 get 3 lives, rest get 2. This is by design but should be documented in the spec.

---

---

## Transitions & Animations

| Transition | Behavior |
|------------|----------|
| Level Select → Game | Instant `change_scene_to_file()` — no fade. LoadingScreen overlay shows during level generation. |
| Game → Level Select (pause) | Instant scene change. No fade. |
| Game → Main Menu (pause) | Instant scene change. No fade. |
| Level Select → Main Menu (back) | Instant `change_scene_to_file()`. No fade. |
| Level Complete → Next Level | Instant scene reload. |
| Level Complete → End Screen | Instant scene change. |
| Level Over → Game Over | Overlay fade (visible = true, no animation tween required). |

**Note:** No tween animations required for MVP. Simple `visible = true/false` with `change_scene_to_file()` is sufficient.

---

## Difficulty Stars — Implementation Spec

### Star Display
- **Below** the level number text, in a separate Label node
- Format: "⭐" repeated N times (e.g., "⭐" for tier 1, "⭐⭐⭐" for tier 3)
- Star color: #FFD700 (gold)
- Star font size: 14px (smaller than button text)
- Star alignment: Centered below level number

### Star-to-Tier Mapping
| Levels | Tier | Stars | Color (Optional) |
|--------|------|-------|------------------|
| 1-5 | Tutorial | ⭐ | Green |
| 6-10 | Easy | ⭐⭐ | Blue |
| 11-20 | Medium | ⭐⭐⭐ | Yellow |
| 21-30 | Hard | ⭐⭐⭐⭐ | Orange |
| 31-35 | Expert | ⭐⭐⭐⭐⭐ | Red |

### Implementation (GDScript)
```gdscript
func _get_star_count(level: int) -> String:
    if level <= 5: return "⭐"
    if level <= 10: return "⭐⭐"
    if level <= 20: return "⭐⭐⭐"
    if level <= 30: return "⭐⭐⭐⭐"
    return "⭐⭐⭐⭐⭐"

func _get_tier_color(level: int) -> Color:
    if level <= 5: return Color(0.2, 0.8, 0.2)  # Green
    if level <= 10: return Color(0.2, 0.2, 0.8)  # Blue
    if level <= 20: return Color(0.8, 0.8, 0.2)  # Yellow
    if level <= 30: return Color(0.8, 0.4, 0.2)  # Orange
    return Color(0.8, 0.2, 0.2)  # Red
```

### Visual Layout (with stars)
```
┌──────────┐
│  Level 5 │  ← Button text
│   ⭐      │  ← Star label (below number)
└──────────┘
```

---

## Responsive Grid — Scroll Strategy

### Strategy: Vertical Scroll (NOT wrapping)
- Wrap `LevelButtonsContainer` (GridContainer) inside a `ScrollContainer`
- GridContainer keeps 7 columns
- When viewport height < 640px, vertical scrollbar appears
- Horizontal scrolling NOT needed (7 columns fit on any reasonable width)

### Minimum Viewport: 360×480 (phone portrait)
- At 360×480: Grid shows ~4 rows, rest scrolls
- At 480×640+: Grid shows all 5 rows, no scroll
- At 800×600+: Grid fully visible, no scroll

### Implementation (GDScript)
```gdscript
# In level_select.tscn scene tree:
LevelSelect (Control)
└── VBoxContainer
    ├── ScrollContainer           ← NEW: wraps the grid
    │   └── LevelButtonsContainer (GridContainer, 7 columns)
    ├── RestartButton
    └── BackButton
```

---

## Priority

- **P0**: Core functionality (click → load level, back → menu) — already working
- **P1**: Visual polish (difficulty colors, completion indicators, scroll container)
- **P2**: Star ratings, best time display, level descriptions
- **P3**: Internationalization, accessibility improvements
