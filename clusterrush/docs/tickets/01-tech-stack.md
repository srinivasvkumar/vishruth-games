---
wayfinder: ticket
type: research
created: 2026-08-12
status: resolved
resolved: 2026-08-12
resolution: "Phaser.js v3 selected as game engine. Provides built-in physics (Arcade Physics), audio system with Web Audio API integration, sprite management, particle system, input handling, scene management, and tilemap support. Best fit for feature-rich 2D platformer with music sync. Bundle size ~200KB is acceptable trade-off for development speed and features."
---

# Ticket: Choose Game Engine/Framework

## Question

Which technology stack should we use for the Geometry Dash clone?

### Options to evaluate:

**Option A: Phaser.js**
- ✅ Purpose-built 2D game engine
- ✅ Built-in physics, collision, sprite management
- ✅ Massive community and tutorials
- ✅ Asset management built-in
- ❌ Larger bundle size
- ❌ Learning curve for Phaser-specific patterns

**Option B: Vanilla HTML5 Canvas + JavaScript**
- ✅ No dependencies, pure JS
- ✅ Full control over everything
- ✅ Smaller bundle size
- ✅ Great for learning fundamentals
- ❌ Must build physics, collision, game loop from scratch
- ❌ More code to write for same features

**Option C: Pixi.js + Custom Physics**
- ✅ Fast 2D rendering
- ✅ Lighter than Phaser
- ❌ Still need to build game-specific features

### Decision Criteria:
- Feature-rich scope (music sync, particles, multiple levels)
- Development speed vs learning
- Maintenance and extensibility

### ✅ DECISION MADE:

**SELECTED: Phaser.js v3**

**Justification:**
- Geometry Dash requires music sync, collision detection, particles, and multiple game modes
- Phaser has ALL of these built-in
- Saves weeks of development time
- Community is massive (40k+ GitHub stars, tons of tutorials)
- Arcade Physics is perfect for 2D platformer gameplay
- Scene management handles menu → game → game over flow
- Can load levels from JSON (great for level design)
- Web Audio API integration handles precise timing for beat sync

**Dependencies:**
```json
{
    "dependencies": {
        "phaser": "^3.80.0"
    },
    "devDependencies": {
        "vite": "^5.0.0"
    }
}
```

**Output:**
- ✅ Recommendation confirmed
- ✅ Phaser.js v3 selected
- ✅ Ready to move to architecture ticket (Ticket #02)

