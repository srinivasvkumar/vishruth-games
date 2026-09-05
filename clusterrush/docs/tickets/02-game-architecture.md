---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: resolved
resolved: 2026-08-12
resolution: "Organized architecture (Structure B + Hybrid Pattern) selected. Clean separation: scenes (Boot/Menu/Game/Pause/GameOver), entities (Player/Obstacle/Portal), systems (Input/Audio/Level/Score/Save). Uses Phaser's built-in systems while maintaining clean, extendable code structure."
---

# Ticket: Game Architecture Pattern

## Question

What architecture pattern should the game code follow?

### ✅ DECISION MADE:

**SELECTED: Organized Architecture (Structure B + Hybrid Pattern)**

**Justification:**
- Clean separation of concerns: entities vs systems vs scenes
- Uses Phaser's built-in systems (physics, input, audio) while keeping clean architecture
- Easy to extend (add new game modes, levels, effects)
- Scalable for feature-rich GD clone
- Best of both worlds: structured code + Phaser's features

**Project Structure (Organized):**
```
~/vishruth/games/geometry-dash/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js          # Game configuration
│   ├── scenes/
│   │   ├── Boot.js        # Asset preloading
│   │   ├── Menu.js        # Main menu
│   │   ├── Game.js        # Main gameplay
│   │   ├── Pause.js       # Pause menu
│   │   └── GameOver.js    # Death screen
│   ├── entities/
│   │   ├── Player.js      # Character class (cube, ship, ball, UFO)
│   │   ├── Obstacle.js    # Obstacle types
│   │   ├── Portal.js      # Portal effects
│   │   ├── Block.js       # Ground blocks
│   │   └── Particle.js    # Visual effects
│   ├── systems/
│   │   ├── Input.js       # Input manager (keyboard, mouse, touch)
│   │   ├── Audio.js       # Audio manager (music sync, SFX)
│   │   ├── Level.js       # Level loader (JSON files)
│   │   ├── Score.js       # Score tracking
│   │   └── Save.js        # localStorage manager
│   └── utils/
│       ├── Constants.js   # Game constants
│       └── Helpers.js     # Utility functions
├── assets/
│   ├── sprites/
│   ├── audio/
│   └── levels/
│       └── level-1.json
└── package.json
```

**Key Design Decisions:**
1. **Player class** handles all game modes (cube, ship, ball, UFO, wave, spider, robot, flux)
2. **Level loader** reads JSON files and creates game objects
3. **Audio manager** handles music sync, sound effects, volume control
4. **Score manager** tracks best scores in localStorage
5. **Input manager** handles keyboard, mouse, touch uniformly

**Output:**
- ✅ Architecture confirmed: Organized Structure B
- ✅ Pattern confirmed: Hybrid (OOP + Phaser Components)
- ✅ Ready to move to Ticket #06 (Game Loop & Physics)

