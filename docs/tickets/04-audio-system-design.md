---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: resolved
resolved: 2026-08-12
resolution: "Hybrid BPM detection (manual + auto-detect). Mix of built-in (5 tracks, 1 per level) and user-uploaded music. Full volume controls (Master, Music, SFX + mute). Settings persist in localStorage. Keep editor simple - no beat visualizations. Audio system uses Phaser's built-in Web Audio API integration."
---

# Ticket: Audio/Music System Design

## Question

How should the game handle audio, especially music sync which is CORE to Geometry Dash?

### ✅ DECISION MADE:

**SELECTED: Hybrid BPM + Mix Music + Volume Controls + Persist Settings + Simple Editor**

**Justification:**
- Hybrid BPM ensures accurate beat detection with fallback
- Mix of built-in and user music provides flexibility
- Volume controls give players control
- Persisted settings improve user experience
- Keep editor simple avoids clutter

**Hybrid BPM Detection:**
```javascript
// Priority order:
// 1. Use manual BPM from level JSON if available
// 2. Auto-detect BPM from audio file if no manual value

const bpm = level.bpm || await detectBPM(audioFile);
const beatInterval = 60000 / bpm;  // milliseconds per beat
```

**Music Sources:**
- **Built-in (5 tracks)** - 1 per level, curated quality
- **User-uploaded** - MP3, WAV, OGG files from local directory
- **Level editor** - Select from built-in or upload new

**Audio System Architecture:**
```javascript
class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.music = null;
        this.sfx = {};
        this.bpm = 0;
        this.volume = { master: 1, music: 1, sfx: 1 };
    }
    
    // Load music (built-in or user)
    loadMusic(file, type = 'built-in') { /* load audio */ }
    
    // Play with beat sync
    playWithSync() { /* start music, spawn beats */ }
    
    // Volume controls
    setVolume(type, value) { /* update volume */ }
    mute() { /* mute all */ }
    
    // Beat detection
    getCurrentBeat() { /* return beat # */ }
}
```

**Volume Settings (Persisted in localStorage):**
```json
{
    "audio": {
        "master": 1.0,
        "music": 0.8,
        "sfx": 1.0,
        "muted": false
    }
}
```

**Sound Effects:**
- Jump (jump sound)
- Death/explosion (death effect)
- Portal activation (portal sound)
- Level complete (success sound)
- Button click (menu interactions)

**Output:**
- ✅ BPM: Hybrid (manual + auto-detect)
- ✅ Music: Mix (built-in + user-uploaded)
- ✅ Volume: Master, Music, SFX + mute
- ✅ Persistence: localStorage
- ✅ Editor: Simple (no beat visualizations)
- ✅ Ready to move to Ticket #05 (Visual Design & Assets)

