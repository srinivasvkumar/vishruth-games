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
- [Scope confirmed] — Auto-scrolling character, jump mechanics, obstacles, collision detection, score tracking

## Not yet specified

The fog gathers around implementation details. Each decision ticket below chips away at the uncertainty~! ♪

### Active Decision Tickets

#### Technology & Architecture
1. **[Choose Game Engine/Framework](tickets/01-tech-stack.md)** — Phaser.js vs Vanilla Canvas vs Pixi.js
2. **[Game Architecture Pattern](tickets/02-game-architecture.md)** — ECS vs OOP vs Functional
3. **[Controls & Input Handling](tickets/07-controls-input.md)** — Keyboard, Mouse, Touch input design

#### Core Gameplay
4. **[Game Loop & Physics System](tickets/06-game-loop-physics.md)** — requestAnimationFrame vs Fixed Timestep
5. **[Level Data Format](tickets/03-level-data-format.md)** — JSON files vs Level Editor vs Binary

#### Features & Polish
6. **[Audio/Music System Design](tickets/04-audio-system-design.md)** — Web Audio API vs HTML5 Audio vs Hybrid
7. **[Visual Design & Assets](tickets/05-visual-design-assets.md)** — Canvas Drawing vs CSS/SVG vs External Sprites
8. **[Score & Progression](tickets/08-score-progression.md)** — Scoring, persistence, localStorage vs IndexedDB

### Suggested Order
- **Start with** #01 (Tech Stack) — it influences everything else
- **Then** #02 (Architecture) and #06 (Game Loop/Physics)
- **Parallel work** possible on #03, #04, #05, #07, #08

## Out of scope

- 3D graphics (user confirmed 2D)
- Multiplayer/leaderboards (can be added later)
- Mobile app (web-based only)
- Steam/Platform integration (local only)
