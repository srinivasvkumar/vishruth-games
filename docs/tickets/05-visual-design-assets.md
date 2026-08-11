---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: open
---

# Ticket: Visual Design & Asset Strategy

## Question

How should visuals, sprites, and effects be handled?

### Options to discuss:

**Option A: CSS/SVG Graphics**
- ✅ No external assets needed
- ✅ Scalable, crisp at any resolution
- ✅ Easy to change colors/themes
- ❌ Limited animation capabilities
- ❌ May look too "flat"

**Option B: Canvas Drawing (Programmatic)**
- ✅ Full control over rendering
- ✅ No asset files needed
- ✅ Can create particle effects easily
- ✅ Geometric style fits GD aesthetic
- ❌ Must draw everything programmatically
- ❌ More code for visual effects

**Option C: External Sprites/Images**
- ✅ More polished look
- ✅ Can use existing GD-style art
- ❌ Requires asset creation or sourcing
- ❌ Licensing concerns
- ❌ More files to manage

**Option D: Hybrid (Canvas + CSS)**
- ✅ Best approach? Use canvas for game, CSS for UI
- ✅ Balance of flexibility and ease

### Key Design Questions:
1. Should the game use a geometric/polygon style (like GD) or pixel art?
2. What color themes/palettes? (GD uses neon colors on dark backgrounds)
3. How should the player character be designed? (cube, ship, ball, UFO - GD has different shapes)
4. Should we support multiple game modes? (cube, ship, ball, UFO, wave, spider, robot, flux)
5. What about background effects? (parallax scrolling, particles, gradients)

### Output:
- Visual style recommendation
- Asset strategy (create vs use vs generate)
- Color palette and theme recommendations
- Character design approach
