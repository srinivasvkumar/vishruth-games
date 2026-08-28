---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: resolved
resolved: 2026-08-12
resolution: "JSON level format selected with 5 built-in levels for v1. Custom music upload supported (MP3/WAV). Level editor included in v1 for user-created content. Attempt tracking implemented with progress persistence. Level data structure includes blocks, obstacles, portals, music sync data, and visual settings."
---

# Ticket: Level Data Format

## Question

How should game levels be defined, stored, and loaded?

### ✅ DECISION MADE:

**SELECTED: JSON Level Format + 5 Built-in Levels + Level Editor + Custom Music + Attempt Tracking**

**Justification:**
- JSON is human-readable, easy to parse, version-controllable
- 5 built-in levels provide good starting experience
- Custom music upload lets players use their favorite songs
- Level editor empowers users to create/share custom levels
- Attempt tracking motivates players and shows progress
- Level editor generates JSON, so format works for both pre-built and user levels

**Level JSON Structure:**
```json
{
    "id": "level-1",
    "name": "Neon Beginnings",
    "difficulty": "Easy",
    "music": "assets/audio/track-1.mp3",
    "bpm": 140,
    "speed": 350,
    "par": 1,
    "background": "assets/sprites/bg-1.png",
    "groundColor": "#00ffff",
    "blocks": [
        {"x": 500, "y": 600, "width": 50, "height": 50, "type": "solid"}
    ],
    "obstacles": [
        {"x": 1000, "y": 600, "type": "spike", "direction": "down"}
    ],
    "portals": [
        {"x": 800, "y": 400, "type": "gravity", "value": -1}
    ],
    "musicSync": [
        {"beat": 1, "time": 0.43, "action": "spawn", "object": "spike"}
    ]
}
```

**Level Editor (v1):**
- ✅ Built-in level editor for user creation
- ✅ Drag-and-drop interface in Phaser
- ✅ Save/load levels as JSON files
- ✅ Export/import levels (share with friends)
- ✅ Preview playtest before saving
- ✅ Auto-generate music sync data from uploaded MP3

**Custom Music Upload:**
- ✅ Support MP3, WAV, OGG formats
- ✅ Auto-detect BPM from audio file
- ✅ Extract beat positions for music sync
- ✅ Store user music in local directory
- ✅ List uploaded music in level editor

**5 Built-in Levels:**

| Level | Name | Difficulty | BPM | Features |
|-------|------|------------|-----|----------|
| 1 | Neon Beginnings | Easy | 120 | Basic jumps, spikes |
| 2 | Pulse Protocol | Easy-Medium | 130 | Portals, gravity |
| 3 | Speed Demon | Medium | 140 | Fast scroll, saws |
| 4 | Orbital Overdrive | Medium-Hard | 150 | Ship mode, blocks |
| 5 | Final Frontier | Hard | 160 | All game modes |

**Attempt Tracking:**
- ✅ Track attempts per level
- ✅ Show best score (distance %)
- ✅ Persist in localStorage
- ✅ Show progress bar (% complete)
- ✅ Retry button (instant restart)
- ✅ "Almost there!" hints near completion

**Level Storage:**
```
~/vishruth/games/geometry-dash/
├── assets/levels/
│   ├── level-1.json    # Built-in level 1
│   ├── level-2.json    # Built-in level 2
│   └── ...
└── user-levels/
    ├── my-custom-level.json    # User created
    └── awesome-level.json      # User created
```

**Output:**
- ✅ Format confirmed: JSON
- ✅ Built-in levels: 5 levels
- ✅ Custom music: Yes (MP3/WAV/OGG)
- ✅ Level editor: Yes (in v1)
- ✅ Attempt tracking: Yes (persisted in localStorage)
- ✅ Ready to move to Ticket #04 (Audio System Design)

