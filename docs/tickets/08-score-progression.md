---
wayfinder: ticket
type: grilling
created: 2026-08-12
status: resolved
resolved: 2026-08-12
resolution: "Score system: Score = Distance % (0-100% per level). Attempt tracking per level. Progression based on completion status. Simple clean UI with minimal settings. Persistence in localStorage. Reset option in settings."
---

# Ticket: Score, Progression & Persistence

## Question

How should scoring, progress tracking, and data persistence work?

### ✅ DECISION MADE:

**SELECTED: Score = Distance % (0-100%)**

**Justification:**
- Distance-based scoring is standard for GD
- Simple, intuitive progress tracking
- Easy to implement and understand
- Clean, minimal UI

**Score System:**
- ✅ **Score = Distance %** (0-100% per level)
- ✅ 0% = Start of level
- ✅ 100% = Level complete
- ✅ Track best score per level

**Progression System:**

**Per Level:**
- ✅ Best score (distance %)
- ✅ Attempts count
- ✅ Completion status

**Global:**
- ✅ Total attempts
- ✅ Total levels completed

**Storage: localStorage**
```json
{
    "levels": {
        "level-1": {
            "bestScore": 100,
            "attempts": 5,
            "completed": true
        },
        "level-2": {
            "bestScore": 85,
            "attempts": 12,
            "completed": false
        }
    },
    "totalAttempts": 17,
    "totalLevelsCompleted": 1
}
```

**HUD (Top-left corner):**
```
┌─────────────────────────────┐
│  Level: 1                   │
│  Score: 85%                 │
│  Attempts: 3                │
└─────────────────────────────┘
```

**UI Elements:**
- ✅ Level select screen with progress
- ✅ Level complete screen with stats
- ✅ Death screen with retry button
- ✅ Settings screen with reset option

**Clean & Simple:**
- ✅ Minimal UI (only essential information)
- ✅ No clutter
- ✅ Clear, readable text
- ✅ Consistent styling

**Output:**
- ✅ Score: Distance % (0-100%)
- ✅ Attempt tracking: Per level
- ✅ Progression: Completion status
- ✅ Simple UI: Clean, minimal
- ✅ Persistence: localStorage
- ✅ Reset option: In settings
- ✅ **Wayfinder complete! Ready for implementation!**

