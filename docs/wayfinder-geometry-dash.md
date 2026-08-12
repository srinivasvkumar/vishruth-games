---
wayfinder: map
created: 2026-08-12
status: active
---

# Wayfinder Map: Geometry Dash Clone

## Destination

A feature-rich, web-based 2D Geometry Dash clone running locally in the browser with auto-scrolling character, jump mechanics, collision detection, obstacles, and score tracking.

## Notes

- **Domain**: Web-based 2D platformer game
- **Location**: ~/vishruth/games/geometry-dash/
- **Skills to consult**: web-artifacts-builder (for game development), frontend-ui-engineering (for UI)
- **User preference**: Feature-rich version, 2D, web-based, runs locally
- **Essential features**: Auto-scrolling, jump mechanics, collision detection, obstacles, score tracking

## Decisions so far

- [Ticket #01: Choose Game Engine/Framework](tickets/01-tech-stack.md) — **Phaser.js v3 selected** (built-in physics, audio, sprites, particles, input handling) ✨
- [Ticket #02: Game Architecture Pattern](tickets/02-game-architecture.md) — **Organized Structure B selected** (scenes/entities/systems separation, hybrid pattern) ♪
- [Ticket #06: Game Loop & Physics](tickets/06-game-loop-physics.md) — **Phaser Arcade Physics selected** (configurable, all 8 game modes, smooth 60fps rendering) (◕‿◕)
- [Ticket #03: Level Data Format](tickets/03-level-data-format.md) — **JSON format + 5 built-in levels + Level Editor + Custom Music + Attempt Tracking** 📊
- [Ticket #04: Audio System Design](tickets/04-audio-system-design.md) — **Hybrid BPM + Mix Music + Volume Controls + Persist Settings + Simple Editor** 🎵
- [Ticket #05: Visual Design & Assets](tickets/05-visual-design-assets.md) — **Geometric/Polygon style + Canvas drawing + Particles + Gradient background + In-menu settings** 🎨
- [Ticket #07: Controls & Input Handling](tickets/07-controls-input.md) — **Tap to jump + Keyboard/Mouse/Touch + Scroll prevention + Focus handling** ⌨️
- [Ticket #08: Score & Progression](tickets/08-score-progression.md) — **Score = Distance % (0-100%) + Attempt tracking + Simple UI + localStorage** 🏆
- [Scope confirmed] — Auto-scrolling character, jump mechanics, obstacles, collision detection, score tracking

## Not yet specified

All active decision tickets have been resolved! The map is complete and ready for implementation. Any new features or decisions that arise during development can be added as new tickets.

**Completed tickets (8 total):**
- ✅ Technology Stack (Phaser.js v3)
- ✅ Game Architecture (Organized Structure B)
- ✅ Game Loop & Physics (Arcade Physics, all 8 game modes)
- ✅ Level Data Format (JSON, 5 levels, level editor, custom music)
- ✅ Audio System Design (Hybrid BPM, mix music, volume controls)
- ✅ Visual Design & Assets (Geometric/Polygon, Canvas drawing)
- ✅ Controls & Input Handling (Tap to jump, all input methods)
- ✅ Score & Progression (Distance %, attempt tracking)

**Ready for implementation!** 🚀

## Out of scope

- 3D graphics (user confirmed 2D)
- Multiplayer/leaderboards (can be added later)
- Mobile app (web-based only)
- Steam/Platform integration (local only)
