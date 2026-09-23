# W3-C.2 — Cross-browser audio policy: root-cause + fix Firefox AudioContext autoplay warnings

## Root Cause (confirmed by code inspection)

**2× warnings, 2 sources:**

1. `src/systems/Audio.ts` constructor (line 124): `new AudioContext()` is called
   immediately when `Game` constructs `AudioSystem` (Game.ts:54). Firefox logs
   "An AudioContext was prevented from starting automatically" because no user
   gesture has occurred yet at construction time.

2. `src/core/Game.ts` start() (line 128): `void this.audioSystem.init().then(() => startMusic())`
   calls `context.resume()` at boot with no user gesture. Firefox logs a second
   warning for the `resume()` attempt.

Chrome is more permissive — it allows `new AudioContext()` + `resume()` without
a gesture (context stays suspended but no warning is logged).

## Fix Design

**Audio.ts:**
- `createContext()` → deferred: only creates the AudioContext when `ensureContext()`
  is called (lazy init on first `init()`, `playSfx()`, or `startMusic()`).
- `init()` → if context doesn't exist yet, create it + resume. If it exists
  and is suspended, resume. Idempotent.
- `playSfx()` / `startMusic()` → call `ensureContext()` first (creates if null).
- `bindToGameEvents()` → still works: listeners call playSfx/startMusic which
  ensure the context exists.
- `isAvailable()` → context !== null (unchanged semantics: false if never created
  or in degraded mode).
- `cleanup()` → unchanged (closes context if it exists).

**MenuScene.ts:**
- Add a `userGestureHandled` flag.
- On first click (START button, SETTINGS button) or first keydown (Enter/Space),
  set `userGestureHandled = true` and call `this.game.getAudioSystem().init()`.
- This is the "user gesture" that unlocks the AudioContext in Firefox.
- The call is fire-and-forget (void) — never blocks the start path.

**Game.ts (out of scope — task allows ≤2 files, Audio.ts + MenuScene.ts only):**
- The `void this.audioSystem.init().then(() => startMusic())` in Game.start()
  will now call init() which defers context creation. Since the context is
  created lazily on first init() call, and init() is now called from MenuScene
  on first user gesture, the Game.start() call to init() will create the
  context at boot (before gesture) — same warning.

## REVISED DESIGN (to stay within 2 files)

Since Game.ts calls `audioSystem.init()` at start() and we can't modify Game.ts:
- `init()` must NOT create the context if no user gesture has occurred.
- Add a `userGestureReceived` flag to AudioSystem.
- `init()` only creates + resumes the context when `userGestureReceived` is true.
- `markUserGesture()` method: sets `userGestureReceived = true`, then calls `init()`.
- MenuScene calls `game.getAudioSystem().markUserGesture()` on first click/keypress.
- `playSfx()` / `startMusic()` still call `ensureContext()` (lazy create for
  SFX triggers that fire after gesture — these are fine because they happen
  during gameplay, which is post-gesture).
- Game.start() calls `init()` which is a no-op until `markUserGesture()` is called.

## TDD Phases

1. RED: Capture current Firefox console (2× warnings) → W3C2-RED.txt
2. GREEN: Implement fix → run Firefox console → 0 warnings → W3C2-GREEN.txt
3. VERIFY: Run unit tests + lint + typecheck → all pass

## Files Changed (≤2)
- src/systems/Audio.ts
- src/scenes/MenuScene.ts

## Errors
| # | Error | Fix |
|---|-------|-----|
