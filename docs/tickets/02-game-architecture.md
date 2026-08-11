---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: open
---

# Ticket: Game Architecture Pattern

## Question

What architecture pattern should the game code follow?

### Options to discuss:

**Option A: Entity-Component-System (ECS)**
- ✅ Highly modular, great for games with many objects
- ✅ Easy to add new features without changing existing code
- ❌ Complex learning curve
- ❌ Overkill for a single-player game?

**Option B: Class-based OOP**
- ✅ Familiar to most developers
- ✅ GameCharacter, Obstacle, Level classes
- ✅ Easier to understand and maintain
- ❌ Can become tightly coupled
- ❌ Less flexible for adding new features

**Option C: Functional/Data-Driven**
- ✅ Clean separation of data and logic
- ✅ Easy to serialize/deserialize levels
- ❌ Less intuitive for game logic
- ❌ May require more boilerplate

### Key Architectural Decisions:
1. How should the game loop be structured? (requestAnimationFrame vs setInterval)
2. How should game state be managed? (single state object vs distributed)
3. How should assets be loaded and cached?
4. How should the scene/level system work? (single class vs state machine)

### Discussion Points:
- What's the balance between simplicity and extensibility?
- Should we support a level editor later? (affects data architecture)
- How important is code organization for future contributions?

### Output:
- Architecture diagram
- Recommended pattern with justification
- Initial project structure
