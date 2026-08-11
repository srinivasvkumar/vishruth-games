---
wayfinder: ticket
type: research
created: 2026-08-12
status: open
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

### Research Tasks:
1. Compare Phaser.js vs vanilla Canvas for a GD-like game
2. Check Phaser's built-in physics (Arcade Physics might suffice)
3. Look at similar GD clones to see what they use
4. Consider bundle size and performance implications

### Output:
- Recommendation document with pros/cons
- Final recommendation for our use case
