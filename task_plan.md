
74|# W3-C.2 — Cross-browser audio policy: root-cause + fix Firefox AudioContext autoplay warnings
75|
76|## Root Cause (confirmed by code inspection)
77|
78|**2× warnings, 2 sources:**
79|
80|1. `src/systems/Audio.ts` constructor (line 124): `new AudioContext()` is called
81|   immediately when `Game` constructs `AudioSystem` (Game.ts:54). Firefox logs
82|   "An AudioContext was prevented from starting automatically" because no user
83|   gesture has occurred yet at construction time.
84|
85|2. `src/core/Game.ts` start() (line 128): `void this.audioSystem.init().then(() => startMusic())`
86|   calls `context.resume()` at boot with no user gesture. Firefox logs a second
87|   warning for the `resume()` attempt.
88|
89|Chrome is more permissive — it allows `new AudioContext()` + `resume()` without
90|a gesture (context stays suspended but no warning is logged).
91|
92|## Fix Design
93|
94|**Audio.ts:**
95|- `createContext()` → deferred: only creates the AudioContext when `ensureContext()`
96|  is called (lazy init on first `init()`, `playSfx()`, or `startMusic()`).
97|- `init()` → if context doesn't exist yet, create it + resume. If it exists
98|  and is suspended, resume. Idempotent.
99|- `playSfx()` / `startMusic()` → call `ensureContext()` first (creates if null).
100|- `bindToGameEvents()` → still works: listeners call playSfx/startMusic which
101|  ensure the context exists.
102|- `isAvailable()` → context !== null (unchanged semantics: false if never created
103|  or in degraded mode).
104|- `cleanup()` → unchanged (closes context if it exists).
105|
106|**MenuScene.ts:**
107|- Add a `userGestureHandled` flag.
108|- On first click (START button, SETTINGS button) or first keydown (Enter/Space),
109|  set `userGestureHandled = true` and call `this.game.getAudioSystem().init()`.
110|- This is the "user gesture" that unlocks the AudioContext in Firefox.
111|- The call is fire-and-forget (void) — never blocks the start path.
112|
113|**Game.ts (out of scope — task allows ≤2 files, Audio.ts + MenuScene.ts only):**
114|- The `void this.audioSystem.init().then(() => startMusic())` in Game.start()
115|  will now call init() which defers context creation. Since the context is
116|  created lazily on first init() call, and init() is now called from MenuScene
117|  on first user gesture, the Game.start() call to init() will create the
118|  context at boot (before gesture) — same warning.
119|
120|## REVISED DESIGN (to stay within 2 files)
121|
122|Since Game.ts calls `audioSystem.init()` at start() and we can't modify Game.ts:
123|- `init()` must NOT create the context if no user gesture has occurred.
124|- Add a `userGestureReceived` flag to AudioSystem.
125|- `init()` only creates + resumes the context when `userGestureReceived` is true.
126|- `markUserGesture()` method: sets `userGestureReceived = true`, then calls `init()`.
127|- MenuScene calls `game.getAudioSystem().markUserGesture()` on first click/keypress.
128|- `playSfx()` / `startMusic()` still call `ensureContext()` (lazy create for
129|  SFX triggers that fire after gesture — these are fine because they happen
130|  during gameplay, which is post-gesture).
131|- Game.start() calls `init()` which is a no-op until `markUserGesture()` is called.
132|
133|## TDD Phases
134|
135|1. RED: Capture current Firefox console (2× warnings) → W3C2-RED.txt
136|2. GREEN: Implement fix → run Firefox console → 0 warnings → W3C2-GREEN.txt
137|3. VERIFY: Run unit tests + lint + typecheck → all pass
138|
139|## Files Changed (≤2)
140|- src/systems/Audio.ts
141|- src/scenes/MenuScene.ts
142|143|
144|## Errors
145|| # | Error | Fix |
146||---|-------|-----|
147|| 1 | 0/15 trials moved (sampler timed out) | keydown was never fired after the sampler armed — wrapped sampler+keydown in Promise.all, fired keydown ~80ms after sampler arms |
148|| 2 | Spurious negative latencies (firstMove < keydown) | stamped firstMove with performance.now() at detection instead of the rAF callback's frame-start `now` param |
149|| 3 | keydown fired before in-page listener armed (race) | bumped keydown delay 30ms → 80ms (~5 frames) |
150|| 4 | Scene-transition secondary "not observed" | __setPlayerHealth(0) doesn't trigger FSM transition in headless SwiftShader; documented honestly as best-effort, not a gate |