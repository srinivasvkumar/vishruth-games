---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: resolved
resolved: 2026-08-12
resolution: "All recommendations accepted: Tap to jump (press to jump, gravity does rest). Keyboard: Space, Arrow Up, W (all work, multiple keys supported). Mouse: Left click. Touch: Single tap anywhere with scroll prevention. Gamepad: Optional (v2 feature). Input buffering for responsive gameplay. Focus handling prevents input lag when tab regains focus."
---

# Ticket: Controls & Input Handling

## Question

How should player input be captured and processed?

### ✅ DECISION MADE:

**SELECTED: All Recommendations Accepted**

**Justification:**
- Tap to jump is the standard for GD
- Multiple keyboard keys provide flexibility
- Mouse and touch work seamlessly
- Scroll prevention on touch devices is essential
- Input buffering ensures responsive gameplay

**Jump Behavior: Tap to Jump**
- ✅ Press to jump, gravity does the rest
- ✅ No holding required
- ✅ Consistent with GD gameplay

**Keyboard Support:**
| Key | Action |
|-----|--------|
| Spacebar | Jump |
| Arrow Up | Jump |
| W key | Jump |
| Multiple keys | Supported simultaneously |

**Mouse Support:**
- ✅ Left click triggers jump
- ✅ No double-click jump (to avoid browser zoom)

**Touch Support:**
- ✅ Single tap anywhere on screen
- ✅ Prevents default browser behavior (scrolling, zooming)
- ✅ Multi-touch supported

**Input Handling Architecture:**
```javascript
class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.jumpPressed = false;
        this.jumpReleased = false;
        this.inputQueue = [];
    }
    
    init() {
        // Keyboard
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.wKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        
        // Mouse - left click only
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.leftButton()) {
                this.jumpPressed = true;
            }
        });
        
        // Touch - single tap, prevent scrolling
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.touch) {
                pointer.preventDefault();
                this.jumpPressed = true;
            }
        });
        
        // Keyboard key down
        this.scene.input.keyboard.on('keydown', (event) => {
            if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
                this.jumpPressed = true;
            }
        });
        
        // Focus handling - pause when tab loses focus
        window.addEventListener('blur', () => {
            if (this.scene.scene.isActive('Game')) {
                this.scene.scene.pause('Game');
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.scene.scene.isActive('Game')) {
                this.scene.scene.resume('Game');
            }
        });
    }
    
    update() {
        // Reset flags each frame
        this.jumpPressed = false;
        this.jumpReleased = false;
    }
}
```

**Input Optimization:**
- ✅ **Input buffering** - Queue inputs during frames for responsive gameplay
- ✅ **Focus handling** - Pause when tab loses focus
- ✅ **Scroll prevention** - Prevent touch scrolling on mobile
- ✅ **Cross-platform** - Works on desktop and mobile

**Output:**
- ✅ Jump behavior: Tap to jump
- ✅ Keyboard: Space, Arrow Up, W (all work)
- ✅ Mouse: Left click
- ✅ Touch: Single tap with scroll prevention
- ✅ Gamepad: Optional (v2 feature)
- ✅ Focus handling: Pause on tab lose, resume on gain
- ✅ Ready to move to Ticket #08 (Score & Progression)

