---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: resolved
resolved: 2026-08-12
resolution: "Phaser Arcade Physics selected (not custom). Physics configurable via settings (gravity, jump force, scroll speed). All 8 game modes implemented from start: cube, ship, ball, UFO, wave, spider, robot, flux. Rendering optimized for smooth 60fps experience, clean UI without jitter/clutter. Effective rendering of items and explanations on screen."
---

# Ticket: Game Loop & Physics System

## Question

How should the game loop and physics system be implemented?

### ✅ DECISION MADE:

**SELECTED: Phaser Arcade Physics + Configurable + All Game Modes**

**Justification:**
- Phaser Arcade Physics is perfect for 2D platformer physics (gravity, jumping, collision)
- Configurable physics allows tuning for optimal game feel
- All 8 game modes (cube, ship, ball, UFO, wave, spider, robot, flux) from start
- Smooth 60fps experience guaranteed (Phaser optimizes this automatically)
- Clean UI rendering (no jitter, no clutter, effective item display)

**Game Loop Architecture:**
```javascript
class GameScene extends Phaser.Scene {
    update(time, delta) {
        // Runs 60 times per second automatically
        this.movePlayer();          // Auto-scroll
        this.handleInput();         // Jump/fly mechanics
        this.checkCollisions();     // Obstacle detection
        this.updateScore();         // Distance tracking
    }
}
```

**Physics Configuration (Tunable):**
```javascript
physics: {
    default: 'arcade',
    arcade: {
        gravity: { y: 1000 },    // Configurable (tune for jump height)
        debug: false,            // Set true to see collision boxes
        timestep: Phaser.CLOCK_SYSTEM  // Consistent timing
    }
}
```

**Game Modes (All 8 from Start):**

| Mode | Physics | Input |
|------|---------|-------|
| **Cube** | Gravity + Jump | Tap/Space to jump |
| **Ship** | Float + Fly | Hold to go up, release to fall |
| **Ball** | Spin + Gravity | Hold to invert gravity |
| **UFO** | Float + Pulse | Tap to pulse upward |
| **Wave** | Diagonal Movement | Hold to go up-right, release for down-right |
| **Spider** | Gravity + Wall Cling | Auto-clings to walls |
| **Robot** | Gravity + Jetpack | Hold to jetpack upward |
| **Flux** | Gravity + Portal | Teleports between portals |

**Rendering Optimizations (from memory context):**
- ✅ Use Phaser's built-in rendering (GPU-accelerated)
- ✅ Object pooling for particles and obstacles (no GC spikes)
- ✅ Batch rendering where possible
- ✅ Clean UI layers (game objects, HUD, effects on separate layers)
- ✅ No screen jitter (fixed timestep, consistent rendering)
- ✅ No clutter (minimal UI, only essential information shown)
- ✅ Effective item rendering (sprites scaled properly, smooth animations)

**Key Physics Settings (Configurable):**
- Gravity: 1000-1500 (affects jump height)
- Player Speed: 300-400 (auto-scroll speed)
- Jump Force: -500 to -600 (how high player jumps)
- Ship Speed: 200-300 (fly up/down speed)
- Ball Gravity Invert: Instant flip

**Collision Detection:**
- Instant death on obstacle (like GD)
- Portal triggers (gravity flip, shrink, grow)
- Ground/platform collision
- World bounds (prevent leaving screen)

**Output:**
- ✅ Physics confirmed: Phaser Arcade Physics
- ✅ Configurable: Yes (gravity, jump force, scroll speed)
- ✅ Game modes: All 8 from start (cube, ship, ball, UFO, wave, spider, robot, flux)
- ✅ Rendering: Optimized for smooth 60fps, clean UI, no jitter/clutter
- ✅ Ready to move to Ticket #03 (Level Data Format)

