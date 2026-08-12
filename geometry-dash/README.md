# 🎮 Geometry Dash Clone

A feature-rich, web-based 2D Geometry Dash clone built with Phaser.js. Play the classic rhythm-based platformer right in your browser!

## 🚀 Getting Started

### Option 1: Quick Play (No Setup Required)

Just open your browser and navigate to:
```
http://localhost:8080
```

The game loads Phaser from CDN, so no installation is needed!

### Option 2: Start Your Own Server

If you want to host it yourself:

```bash
# Using Python's built-in HTTP server
python3 -m http.server 8080

# Or using Node.js http-server
npx http-server -p 8080
```

Then open: **http://localhost:8080**

## 🎯 How to Play

### Controls
- **Jump**: Spacebar, Arrow Up, W key, Left Click, or Tap (anywhere on screen)
- **Pause**: ESC key
- **Retry**: Click the "Retry" button on game over screen

### Game Modes
1. **Cube** - Classic block with rotation
2. **Ship** - Fly up when holding, fall when released
3. **Ball** - Spin while jumping
4. **UFO** - Float with pulse movement
5. **Wave** - Diagonal wave movement
6. **Spider** - Wall clinging
7. **Robot** - Jetpack flight
8. **Flux** - Portal teleportation

### Scoring
- Score = Distance % (0-100% per level)
- 100% = Level Complete!
- Track your best scores and attempts in localStorage

## 📁 Project Structure

```
geometry-dash/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Styling
├── js/
│   ├── main.js             # Game initialization
│   ├── config.js           # Game configuration
│   ├── utils/
│   │   ├── Constants.js    # Game constants
│   │   └── Helpers.js      # Utility functions
│   ├── systems/
│   │   ├── Input.js        # Input handling
│   │   ├── Score.js        # Score tracking
│   │   └── Save.js         # Persistence
│   ├── entities/
│   │   ├── Player.js       # Player class
│   │   ├── Obstacle.js     # Obstacle class
│   │   └── Portal.js       # Portal class
│   └── scenes/
│       ├── Boot.js         # Asset loading
│       ├── Menu.js         # Main menu
│       ├── Game.js         # Gameplay
│       ├── Pause.js        # Pause menu
│       └── GameOver.js     # Death screen
├── assets/
│   └── levels/
│       ├── level-1.json    # Neon Beginnings (Easy)
│       ├── level-2.json    # Pulse Protocol (Medium)
│       ├── level-3.json    # Speed Demon (Medium)
│       ├── level-4.json    # Orbital Overdrive (Hard)
│       └── level-5.json    # Final Frontier (Expert)
└── user-levels/            # Your custom levels go here
```

## 🎨 Features

✅ **Smooth 60fps rendering**  
✅ **Arcade Physics** for realistic platforming  
✅ **8 Game Modes** from the start  
✅ **5 Built-in Levels** with increasing difficulty  
✅ **Score & Progression** system with localStorage  
✅ **Multi-input support** (keyboard, mouse, touch)  
✅ **Responsive design** that works on all devices  
✅ **Pause & Resume** functionality  
✅ **Attempt tracking** per level  

## 📊 Levels

| Level | Name | Difficulty | BPM | Features |
|-------|------|------------|-----|----------|
| 1 | Neon Beginnings | Easy | 120 | Basic jumps, spikes |
| 2 | Pulse Protocol | Easy-Medium | 130 | Portals, gravity |
| 3 | Speed Demon | Medium | 140 | Fast scroll, saws |
| 4 | Orbital Overdrive | Medium-Hard | 150 | Ship mode, blocks |
| 5 | Final Frontier | Hard | 160 | All game modes |

## 🛠️ Technology Stack

- **Phaser.js 3.80** - Game engine
- **Vanilla JavaScript** - No framework overhead
- **HTML5 Canvas** - GPU-accelerated rendering
- **Web Audio API** - Audio integration
- **LocalStorage** - Persistent data

## 🎯 Developer Notes

### Adding Custom Levels
Place your level JSON files in `assets/levels/` or `user-levels/` and reference them in your game code.

### Modifying Physics
Edit `js/config.js` to tune:
- Gravity
- Player speed
- Jump force
- Scroll speed

## 📝 License

MIT License - Feel free to use and modify!

## 🌟 Enjoy the Game!

Have fun playing! 🎵✨
