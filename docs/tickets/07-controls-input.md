---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: open
---

# Ticket: Controls & Input Handling

## Question

How should player input be captured and processed?

### Key Requirements:
- Keyboard input (Spacebar to jump)
- Mouse click to jump
- Touch input for mobile/tablet
- Responsive to different screen sizes
- No input lag

### Input Methods:

**Keyboard:**
- Spacebar (default)
- Arrow Up
- W key
- Should multiple keys work simultaneously?

**Mouse:**
- Left click
- Should it be click-to-jump or hold-to-jump?

**Touch:**
- Tap anywhere on screen
- Need to prevent default browser behavior (scrolling, zooming)

**Gamepad:**
- Optional for v1?
- A button / X button to jump

### Key Design Questions:
1. Should jump be:
   - **Tap to jump** (press and release quickly)
   - **Hold to keep jumping** (auto-jump while holding)
   - **Both options** with a setting?
2. How should input buffering work? (queue inputs during frames)
3. Should there be input cooldowns? (prevent rapid spamming)
4. How should we handle focus loss? (pause game when tab is hidden)
5. Should we show input hints on screen?

### Technical Considerations:
- How to prevent browser zooming/scrolling on mobile?
- How to handle different input devices uniformly?
- Should there be input remapping in settings?

### Output:
- Input handling architecture
- Control scheme design
- Input event flow diagram
- Mobile optimization strategy
