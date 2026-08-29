# Spec: Level Select UI — Phase 2
## Status: **SPEC ONLY** — Code NOT STARTED
## Owner: @game-dev

## Purpose
Allow players to choose which of the 35 levels to play. Show unlocked levels as clickable, locked levels as disabled.

## Visual Spec
```
┌──────────────────────────────────────┐
│          [Back to Menu]              │
│                                      │
│      LEVEL SELECT                    │
│                                      │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│   │  1 │ │  2 │ │  3 │ │  4 │ ...   │
│   └────┘ └────┘ └────┘ └────┘       │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│   │  8 │ │  9 │ │ 10 │ │ 11 │ ...   │
│   └────┘ └────┘ └────┘ └────┘       │
│   ...                                │
│   ┌────┐ ┌────┐                      │
│   │ 34 │ │ 35 │                      │
│   └────┘ └────┘                      │
│                                      │
└──────────────────────────────────────┘
```
- Background: #1a1a2e
- Grid: 5 columns x 7 rows (35 levels)
- Unlocked buttons: Blue (#0f3460), white text, 24px
- Locked buttons: Dark gray (#2a2a3e), gray text, 24px, non-clickable
- Difficulty stars: 1-5 stars shown below level number
- Spacing: 16px between buttons

## Acceptance Criteria (Playwright Tests)
- [ ] `test('Back button returns to main menu')`
- [ ] `test('Unlocked level buttons are visible and enabled')`
- [ ] `test('Locked level buttons are disabled (gray)')`
- [ ] `test('Clicking unlocked level loads that level')`
- [ ] `test('Grid layout is responsive on small screens')`

## Technical Notes
- Scene: `res://scenes/level_select.tscn`
- Script: `res://scripts/ui/level_select_ui.gd`
- Data Source: `GameManager` autoload (`unlocked_level` property)

## Edge Cases
- What happens if player has only Level 1 unlocked? (Only button 1 enabled)
- What happens on very small viewports? (Grid scrolls or scales)
- What happens if player clicks "Back" during level load? (Cancel load, return to menu)

## Notes for Implementer
- Use `GridContainer` for layout
- Check `GameManager.unlocked_level` to enable/disable buttons
- Clicking a level should call `LevelManager.load_level(level_number)`
- **GDScript ONLY** — do not use C#
