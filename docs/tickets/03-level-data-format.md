---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: open
---

# Ticket: Level Data Format

## Question

How should game levels be defined, stored, and loaded?

### Options to discuss:

**Option A: JSON Level Files**
- ✅ Human-readable, easy to edit
- ✅ Easy to parse in JavaScript
- ✅ Supports complex level data
- ✅ Can be version-controlled
- Example structure:
```json
{
  "id": "level-1",
  "name": "Neon Beginnings",
  "music": "track-1.mp3",
  "bpm": 140,
  "blocks": [...],
  "obstacles": [...],
  "portals": [...],
  "par": 1
}
```

**Option B: In-Game Level Editor**
- ✅ User can create custom levels
- ✅ More complex to implement
- ✅ Should we build this first or later?

**Option C: Binary/Custom Format**
- ✅ Smaller file size
- ✅ Faster parsing
- ❌ Harder to edit and debug
- ❌ Not human-readable

### Key Questions:
1. How many built-in levels for v1? (5? 10? 20?)
2. Should levels reference music tracks explicitly?
3. How should the level format support different block types? (solid, portal, music sync points)
4. Should we support a level editor from day one?
5. How should level progression/unlock work?

### Output:
- Level data format specification
- Sample level file
- Level loading strategy
