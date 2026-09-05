---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: resolved
resolved: 2026-08-12
resolution: "All recommendations accepted: Geometric/Polygon visual style (clean, smooth, no assets), Canvas drawing (all code-based geometric shapes), Particles on death (sparkles, particles), Gradient background (simple, clean), In-menu settings (minimal buttons). Rendering optimized for smooth 60fps, no jitter, no clutter, effective item rendering."
---

# Ticket: Visual Design & Asset Strategy

## Question

How should visuals, sprites, and effects be handled?

### ✅ DECISION MADE:

**SELECTED: All Recommendations Accepted**

**Justification:**
- Geometric/Polygon style provides clean, modern look perfect for GD
- Canvas drawing means no external assets needed, all code-based
- Particles on death add visual feedback and fun
- Gradient background is simple and clean
- In-menu settings keep the UI minimal

**Visual Style: Geometric/Polygon**
- ✅ Clean, modern aesthetic
- ✅ Perfect for 2D platformer
- ✅ Easy to animate and scale
- ✅ No external assets needed
- ✅ All drawing done via Phaser Graphics API

**Character Design (Canvas Drawing):**
```
Cube:   [■] - Square with rotation
Ship:   [◄] - Triangle with movement
Ball:   (o) - Circle with spin
UFO:    [U] - Saucer with bobbing
Wave:   (∼) - Wave-like movement
Spider: (+) - Spiky shape
Robot:  [π] - Blocky robot
Flux:   [Ω] - Flux ball shape
```

**Color Palette:**
| Element | Color |
|---------|-------|
| Background | Dark blue/black gradient (#0a0a2e → #1a1a5e) |
| Player (Cube) | Bright cyan (#00ffff) |
| Player (Ship) | Bright green (#00ff00) |
| Player (Ball) | Bright orange (#ffaa00) |
| Player (UFO) | Bright purple (#aa00ff) |
| Obstacles | Red/orange (#ff3333, #ff6600) |
| HUD Text | White/silver (#ffffff) |

**Visual Effects (Particles):**
- ✅ **Death effects** - Sparkles, particles, explosion
- ✅ **Portal effects** - Glow, pulse, color shift
- ✅ **Score effects** - Confetti, animations on level complete
- ✅ **Jump effects** - Small particle trail

**Rendering Optimizations:**
```javascript
// Phaser config for smooth rendering
const config = {
    type: Phaser.AUTO,  // GPU-accelerated Canvas
    width: 1280,
    height: 720,
    backgroundColor: '#1a1a2e',
    
    // Physics
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    
    // Scale - fits to window
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};
```

**Clean UI (No Clutter):**
```
┌─────────────────────────────┐
│  Menu:                      │
│  [Play]                     │
│  [Level Editor]             │
│  [Settings]                 │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Game (top-left corner):    │
│  Level: 1                   │
│  Score: 85%                 │
│  Attempts: 3                │
│  [Settings]                 │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Settings:                  │
│  Volume: [=====|==] 75%     │
│  [Back]                     │
└─────────────────────────────┘
```

**Output:**
- ✅ Visual style: Geometric/Polygon (clean, smooth)
- ✅ Character drawing: Canvas-based (all code)
- ✅ Visual effects: Particles (death, portals, score)
- ✅ Background: Gradient (simple, clean)
- ✅ Settings: In-menu buttons (minimal)
- ✅ Rendering: Optimized for smooth 60fps, no jitter/clutter
- ✅ Ready to move to Ticket #07 (Controls & Input)

