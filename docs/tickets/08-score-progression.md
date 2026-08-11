---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: open
---

# Ticket: Score, Progression & Persistence

## Question

How should scoring, progress tracking, and data persistence work?

### Features to Design:

**Score System:**
- Score based on distance traveled?
- Score based on percentage of level completed?
- Best score per level?
- Attempts counter?

**Progression:**
- Should levels unlock progressively?
- Or can players try any level anytime?
- Should there be achievements?

**Persistence:**
- Store best scores locally?
- How many levels to track?
- Settings persistence (volume, controls)?

### Storage Options:

**Option A: localStorage**
- ✅ Built into browsers
- ✅ Simple API
- ✅ No server needed (we're running locally)
- ❌ Limited storage (~5-10MB)
- ❌ Per-browser, not synced
- Example:
```javascript
// Save
localStorage.setItem('gd-best-scores', JSON.stringify(scores));
// Load
const scores = JSON.parse(localStorage.getItem('gd-best-scores')) || {};
```

**Option B: IndexedDB**
- ✅ More storage space
- ✅ Better for larger datasets
- ❌ More complex API
- ❌ Overkill for our needs?

**Option C: Both**
- ✅ localStorage for settings
- ✅ IndexedDB for level data
- ❌ More code

### Key Questions:
1. What exactly constitutes "score"? (distance, completion %, attempts)
2. Should there be a "best of" system? (e.g., best time, best attempt)
3. How should level progression work? (all available vs locked)
4. Should we show statistics? (completion %, best scores)
5. Should settings persist? (volume, control scheme, fullscreen)

### Output:
- Score calculation design
- Data model for persistence
- Storage strategy
- UI for displaying scores/stats
