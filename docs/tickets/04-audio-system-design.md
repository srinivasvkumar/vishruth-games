---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: open
---

# Ticket: Audio/Music System Design

## Question

How should the game handle audio, especially music sync which is CORE to Geometry Dash?

### Key Requirements:
- Music sync (objects spawn on beat)
- Sound effects (jump, death, portal, etc.)
- Volume control
- Mute option

### Options to discuss:

**Option A: Web Audio API**
- ✅ Precise timing (critical for beat sync)
- ✅ Frequency analysis possible
- ✅ Can modify audio in real-time
- ❌ More complex API
- ❌ Browser compatibility quirks

**Option B: HTML5 Audio Element**
- ✅ Simple to use
- ✅ Good for basic playback
- ❌ Less precise timing
- ❌ Harder to sync with game objects

**Option C: Web Audio + HTML5 Audio Hybrid**
- ✅ Best of both worlds
- ✅ More complex architecture
- ✅ Precise sync + simple fallback

### Key Design Questions:
1. How should beat detection work? (manual BPM marking vs automatic)
2. Should music be pre-analyzed for beat positions?
3. How should audio states work? (menu, playing, dead, paused)
4. What about sound effects vs background music?
5. Should players be able to use their own music for levels?

### Output:
- Audio system architecture
- Music sync implementation approach
- Audio file format recommendations
