---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: open
---

# Ticket: Game Loop & Physics System

## Question

How should the game loop and physics system be implemented?

### Key Requirements:
- Smooth 60fps (or higher) game loop
- Auto-scrolling (constant forward movement)
- Jump mechanics with gravity
- Collision detection
- Smooth animations

### Options to discuss:

**Option A: requestAnimationFrame Loop**
- ✅ Standard for web games
- ✅ Syncs with monitor refresh rate
- ✅ Smooth animations
- ✅ Browser optimizes when tab is inactive
- Example:
```javascript
function gameLoop(timestamp) {
  update(timestamp);
  render();
  requestAnimationFrame(gameLoop);
}
```

**Option B: Fixed Timestep Game Loop**
- ✅ More predictable physics
- ✅ Better collision detection
- ✅ Consistent behavior across devices
- ❌ More complex implementation
- Example:
```javascript
const FIXED_TIMESTEP = 1000 / 60; // 60fps
let accumulator = 0;
let lastTime = 0;

function gameLoop(currentTime) {
  const delta = currentTime - lastTime;
  accumulator += delta;
  
  while (accumulator >= FIXED_TIMESTEP) {
    update(FIXED_TIMESTEP);
    accumulator -= FIXED_TIMESTEP;
  }
  
  render(accumulator / FIXED_TIMESTEP);
  requestAnimationFrame(gameLoop);
}
```

**Option C: Hybrid (Fixed physics + Variable rendering)**
- ✅ Best of both worlds
- ✅ Smooth visuals + reliable physics
- ❌ More complex

### Physics Questions:
1. Should we use a physics library? (Matter.js, Box2D, p2.js)
2. Or build custom simple physics? (gravity, jump, collision)
3. How should different game modes work? (cube jumps, ship flies, ball rotates, etc.)
4. How precise should collision be? (pixel-perfect vs hitbox-based)
5. Should there be a death mechanism? (instant death on collision like GD?)

### Output:
- Game loop architecture
- Physics system design
- Collision detection approach
- Game mode implementation strategy
