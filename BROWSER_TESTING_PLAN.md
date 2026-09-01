# Browser Testing Plan — Cluster Rush (Godot 4.7 WebGL)

## Game Technical Profile

| Property | Value |
|---|---|
| Engine | Godot 4.7 (Forward Plus renderer) |
| Export | Single-threaded WebGL (no SharedArrayBuffer, no COOP/COEP) |
| Canvas | Single `<canvas id="canvas">`, 1280×720 virtual port, stretch mode=none, aspect=ignore |
| Binary | `index.wasm` (37 MB) + `index.pck` (771 KB) + `index.js` (307 KB) |
| Audio | AudioWorklet (non-GLTF, non-threaded fallback path with `Atomics`) |
| Compression | Brotli |
| Input | WASD / Arrows (strafe), Space (jump), Q (climb), Escape (pause), R (reset); mouse hidden |
| PWA | Disabled (no service worker registered by default) |
| Features Detected | `Engine.getMissingFeatures(threads=false)` |

---

## 1. Browser Interaction Patterns

### 1.1 Initial Load & Boot Sequence
- **What to test:** The full page lifecycle from URL load → canvas render → game start.
- **Why it matters:** `index.wasm` is 37 MB; large download + instantiation can vary widely across browsers and network conditions.
- **Checklist:**
  - [ ] Status splash screen renders (`#status`, `#status-splash`, `#status-progress`)
  - [ ] Progress bar advances during WASM load (calls `Engine.startGame` `onProgress` callback)
  - [ ] Canvas becomes interactive after `setStatusMode('hidden')`
  - [ ] Loading screen (`#status-notice`) appears on failure, not just in console

### 1.2 Runtime Pause / Unpause
- **What to test:** The game's own pause system (`get_tree().paused`) versus browser-level pauses.
- **Why it matters:** The game uses `_process` in `GameScene` to detect pause key (`_on_game_paused`). If the browser throttles or stops `requestAnimationFrame`-driven loops, the game may appear frozen.
- **Checklist:**
  - [ ] Escape key triggers pause UI overlay
  - [ ] Escape key unpause resumes normal gameplay
  - [ ] Rapid toggle (press Escape multiple times) does not cause double-pause / stuck state

### 1.3 Scene Navigation (Reload, Level Select, Main Menu)
- **What to test:** `get_tree().reload_current_scene()` and `get_tree().change_scene_to_file()`
- **Why it matters:** These are DOM-free navigation events. They replace the canvas content without a full page reload, which means:
  - [ ] No memory leaks across scene reloads (monitor heap in Chrome DevTools → Memory tab)
  - [ ] No stale event listeners after `reload_current_scene()`
  - [ ] Transition animations complete before scene switch (the 0.4 s tween guard)

### 1.4 Full Page Reload
- **What to test:** `location.reload()` (F5 / Ctrl+R / browser refresh button).
- **Why it matters:** A full reload re-downloads the 37 MB WASM module.
- **Checklist:**
  - [ ] Service worker (if later enabled) caches correctly on reload
  - [ ] No corrupted WASM module after interrupted download
  - [ ] Reload during gameplay does not silently corrupt save state

### 1.5 Keyboard Shortcuts Interference
- **What to test:** Browser hotkeys that conflict with game keys.
- **Specific conflicts to verify:**
  - [ ] `R` does not trigger browser reload when game is focused (should be intercepted by game)
  - [ ] `Escape` does not close browser modal or exit full-screen before game processes it
  - [ ] `F11` toggles full-screen correctly without freezing the game
  - [ ] `Ctrl+R` / `Ctrl+F5` still work as intended (user override)
  - [ ] `Ctrl+T`, `Ctrl+W`, `Ctrl+Tab` (tab navigation) work without game interference

---

## 2. Rendering & Canvas Behavior

### 2.1 Canvas Size & Stretch Mode
- **What to test:** The canvas uses `stretch_mode="none"` and `stretch_aspect="ignore"` with virtual port 1280×720.
- **Why it matters:** "Ignore" aspect ratio means the game will distort when the browser window is not exactly 16:9.
- **Checklist:**
  - [ ] Canvas fills the viewport completely (CSS: `margin: 0; padding: 0` on body and canvas)
  - [ ] 16:9 viewport renders without distortion (expected: no distortion by design)
  - [ ] Non-16:9 viewport (e.g., 4:3, portrait) renders with visible stretching
  - [ ] Window resize during gameplay does not break rendering or crash the canvas

### 2.2 WebGL Context Creation
- **What to test:** The WebGL 2 context is created by the Godot JS library.
- **Checklist:**
  - [ ] WebGL 2 context is successfully created on Chrome, Firefox, Safari, Edge
  - [ ] Graceful fallback if WebGL 2 is unavailable (the canvas shows "Your browser does not support the canvas tag")
  - [ ] No WebGL context lost messages during normal gameplay

### 2.3 MSAA 3D = 2
- **What to test:** Anti-aliasing is set to MSAA 2x.
- **Why it matters:** Some mobile GPUs (especially older ones) do not support MSAA in WebGL 2, or may silently disable it.
- **Checklist:**
  - [ ] MSAA 2x works on desktop GPUs (Chrome, Firefox, Edge)
  - [ ] MSAA 2x works on mobile GPUs (Safari iOS, Chrome Android) — or fails gracefully
  - [ ] No rendering artifacts where MSAA samples blend
  - [ ] Performance impact of MSAA 2x is acceptable on mid-range hardware

### 2.4 3D Rendering in WebGL
- **What to test:** The game is a 3D platformer rendered via Godot's Forward Plus renderer.
- **Checklist:**
  - [ ] Lighting renders correctly (directional, point, and spot lights if present)
  - [ ] Shadows (if any) render without artifacts
  - [ ] Particle effects (particle system rendering) display correctly
  - [ ] Texture compression: S3TC (DXT) is enabled; ASTC is disabled
    - [ ] S3TC-compressed textures load correctly on Chrome/Edge (which support DXT)
    - [ ] Firefox does **not** support S3TC natively — verify fallback path works
    - [ ] Safari does **not** support S3TC natively — verify fallback path works
  - [ ] No z-fighting between overlapping geometry (ground, walls, truck, player)

### 2.5 Canvas Focus & Scroll
- **What to test:** The canvas has `touch-action: none` on body and `#canvas:focus { outline: none }`.
- **Checklist:**
  - [ ] Clicking canvas does not show focus ring (browser default outline suppressed)
  - [ ] Scrolling the page (if any) does not scroll the canvas — `overflow: hidden` on body
  - [ ] Touch gestures (pinch, swipe) are fully consumed by the game and do not trigger browser navigation

---

## 3. Viewport / Responsive Behavior

### 3.1 Viewport Meta Tag
- **Config:** `<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0">`
- **Checklist:**
  - [ ] Game renders at full width on mobile devices (iPhone SE, iPhone 15, Pixel 7, iPad)
  - [ ] `user-scalable=no` prevents pinch-zoom — verify the game is not accidentally zoomed on double-tap
  - [ ] Landscape orientation renders correctly on mobile (the primary intended orientation)
  - [ ] Portrait orientation on mobile does not cause rendering issues (even if distorted)

### 3.2 High-DPI / Retina Displays
- **What to test:** The canvas is 1280×720 virtual port. The actual pixel size may be larger on HiDPI screens.
- **Checklist:**
  - [ ] Game renders crisply on 2× and 3× DPI displays (Retina MacBook, Pixel phones)
  - [ ] Text in HUD is readable on HiDPI screens (24px font on scaled canvas)
  - [ ] No blurry canvas due to CSS width/height mismatch with internal resolution
  - [ ] Godot's canvas scaling respects `devicePixelRatio`

### 3.3 Small Screens
- **Checklist:**
  - [ ] Game is playable on smallest smartphones (320 px width) — even if controls are cramped
  - [ ] HUD elements do not overflow or overlap on narrow viewports
  - [ ] Progress bar and labels remain legible on small screens

### 3.4 Browser Chrome Overhead
- **What to test:** Mobile browsers have address bars and bottom toolbars that consume viewport space.
- **Checklist:**
  - [ ] Game renders fully visible after browser address bar auto-hides (Chrome on Android)
  - [ ] Game does not render behind notch / status bar (iPhone safe areas)
  - [ ] Android Chrome bottom toolbar does not cover the player character

---

## 4. Browser Lifecycle

### 4.1 Tab Switch (Visibility Change)
- **What to test:** Switching to another browser tab pauses the game.
- **Why it matters:** Godot's game loop uses `requestAnimationFrame` and `_physics_process`. When the tab is hidden, the browser throttles or pauses these callbacks.
- **Checklist:**
  - [ ] Game freezes when tab is hidden (expected — verify no timer drift occurs)
  - [ ] Resuming the tab resumes from the correct game state (no time-warp glitch)
  - [ ] Player position is stable after tab switch (no teleport or physics corruption)
  - [ ] Timer in HUD does not jump after tab switch
  - [ ] Audio does not continue playing while tab is hidden (check browser autoplay policy)

### 4.2 Page Hide / Back-Forward Cache
- **What to test:** Navigating away and pressing Back.
- **Why it matters:** Modern browsers use bfcache (back-forward cache), which restores the page instantly — but bfcache invalidates if:
  - The page used `onbeforeunload`
  - The page has an active service worker
  - The page has a long-living SharedArrayBuffer
  - The page posted to `localStorage` during page lifecycle
- **Checklist:**
  - [ ] bfcache does not interfere (verify page restores correctly on back navigation)
  - [ ] No "bfcache invalidation" warnings in console
  - [ ] Game state resets correctly when navigating away and back (or restores to exact state, depending on intent)

### 4.3 Minimize Window
- **What to test:** Minimizing the browser window on desktop.
- **Why it matters:** Similar to tab switching — the renderer may stop drawing frames.
- **Checklist:**
  - [ ] Game resumes correctly when window is restored
  - [ ] No rendering artifacts on restore
  - [ ] No excessive CPU usage from frame compaction

### 4.4 Page Visibility API — Audio Policy
- **What to test:** Audio continues / stops when tab visibility changes.
- **Why it matters:** Browsers may pause AudioWorklet processors when the tab is hidden.
- **Checklist:**
  - [ ] Music and SFX pause when tab is hidden
  - [ ] Music and SFX resume correctly on tab return
  - [ ] No audio glitch / pop / stutter on resume

### 4.5 Tab Close / Page Unload
- **What to test:** Closing the tab or navigating away while the game is running.
- **Checklist:**
  - [ ] No JS exceptions in `beforeunload` / `unload` handlers
  - - [ ] WebGL context is released cleanly
  - [ ] No resource leak warnings in DevTools

### 4.6 Network Interruption Recovery
- **What to test:** Losing network during the initial download of index.wasm.
- **Why it matters:** The WASM file is 37 MB. If download is interrupted, the page shows an error.
- **Checklist:**
  - [ ] User sees `#status-notice` error message (not a blank screen)
  - [ ] Reload recovers from the interrupted state
  - [ ] Service worker (if later enabled) can serve cached version for offline play

---

## 5. Console / Network Diagnostics

### 5.1 Browser Console — What to Monitor

**Chrome DevTools Console:**
- [ ] No JS errors at any point during the game
- [ ] No `WebGL: INVALID_FRAMEBUFFER` or `WebGL: drawElements: framebuffer incomplete` errors
- [ ] No `Failed to load resource` errors (check 404s on .wav files, textures, fonts)
- [ ] No `AudioContext` creation errors (Web Audio API failures)
- [ ] No `ServiceWorker` registration errors (even though PWA is disabled, the code path exists)
- [ ] No `Uncaught (in promise)` rejections

**Firefox Console:**
- [ ] Same checks as Chrome, plus:
  - [ ] No S3TC texture compression warnings (Firefox does not support S3TC)
  - [ ] No WebRender errors (if using WebRender)

**Safari Console:**
- [ ] Same checks, plus:
  - [ ] No `-webkit-` prefixed feature deprecation warnings
  - [ ] No S3TC / ASTC fallback messages

### 5.2 Network Tab — What to Verify

- [ ] `index.html` loads successfully (200 OK)
- [ ] `index.wasm` downloads completely (37 MB, check `Content-Length` matches)
- [ ] `index.pck` downloads (771 KB)
- [ ] `index.js` downloads (307 KB)
- [ ] Audio files (`.wav`) load on demand (SFX are loaded at runtime via `load("res://audio/sfx/...")`)
- [ ] All resources use Brotli compression (check `Content-Encoding: br`)
- [ ] No 304 Not Modified issues if caching is enabled later
- [ ] CORS headers are correct if game is served from a different origin

### 5.3 Performance Tab

- [ ] No long tasks (>50 ms) during gameplay that cause visible stutter
- [ ] WASM instantiation time is acceptable (< 5 seconds on desktop)
- [ ] No excessive GC (garbage collection) pauses visible in the Performance timeline
- [ ] Frame rate is stable at 60 fps on desktop, 30 fps minimum on mobile
- [ ] Memory usage does not grow unbounded over a 5-minute play session

### 5.4 Memory Tab (Chrome DevTools)

- [ ] Heap snapshot after initial load vs. after 5 minutes of gameplay shows no significant growth
- [ ] No detached DOM nodes (the canvas content may accumulate if scenes are not cleaned up)
- [ ] No WebGL texture leaks (check "Rendering" → "Textures" in Memory tab)

---

## 6. Timing-Sensitive Browser Issues

### 6.1 Physics Frame Rate Sensitivity
- **What to test:** The player movement uses `_physics_process` with delta-time calculations.
- **Critical constants:** `GRAVITY=25.0`, `MOVE_SPEED=8.0`, `JUMP_FORCE=10.0`, `COYOTE_TIME=0.15`, `JUMP_BUFFER_TIME=0.1`
- **Why it matters:** These values are tuned for a stable 60 fps (Δt ≈ 0.0167 s). Browser tab throttling, frame drops, or inconsistent frame pacing can make:
  - [ ] Coyote time (0.15 s) feel inconsistent on frame-jank browsers
  - [ ] Jump buffer (0.1 s) may be too tight on browsers that drop frames
  - [ ] Wall jump hang time (0.15 s) may feel too short or too long
  - [ ] Gravity acceleration (25.0) may produce different jump heights across frame rates
- **Checklist:**
  - [ ] Jump height is consistent across Chrome, Firefox, Safari
  - [ ] Wall-jump works reliably (test: jump into wall, press jump again immediately)
  - [ ] Double-jump timing is forgiving enough (0.1 s buffer may be too strict on some browsers)
  - [ ] Slow-motion / frame drop scenarios do not cause physics explosion

### 6.2 `requestAnimationFrame` Throttling
- **What to test:** What happens when the browser throttles `rAF` (e.g., background tab, low-power mode).
- **Checklist:**
  - [ ] Game loop does not "spike" in delta time when un-throttled after a long background period
  - [ ] Godot engine handles the delta time jump without physics corruption

### 6.3 Timer Accuracy
- **What to test:** The HUD timer (`Time: 01:23.45`) relies on `GameManager.get_current_time()`.
- **Checklist:**
  - [ ] Timer is accurate to within ~100 ms over a 2-minute session
  - [ ] Timer does not run faster/slower on different browsers
  - [ ] Timer freezes during pause (verified by `get_tree().paused`)
  - [ ] Timer survives a tab switch (no drift)

### 6.4 Audio Latency
- **What to test:** AudioWorklet processor has ~0 ms latency compared to the old ScriptProcessorNode.
- **Checklist:**
  - [ ] Jump SFX plays within ~20 ms of the jump action on all browsers
  - [ ] Death SFX plays immediately on player death
  - [ ] Music BGM does not have an initial ~1-second delay at game start
  - [ ] Rapid successive SFX (e.g., rapid land/slide sounds) do not clip or drop

---

## 7. WebGL / WASM-Specific Risks

### 7.1 WASM Module Loading
- **What to test:** The 37 MB `index.wasm` file is downloaded and instantiated.
- **Why it matters:** This is the single largest download and the most browser-incompatible component.
- **Checklist:**
  - [ ] WASM module loads and runs on Chrome (V8 JIT, fastest WASM)
  - [ ] WASM module loads and runs on Firefox (SpiderMonkey JIT — historically slightly slower)
  - [ ] WASM module loads and runs on Safari (JavaScriptCore JIT — historically WASM compatibility issues)
  - [ ] WASM module loads and runs on Edge (Chromium-based — should match Chrome)
  - [ ] No `CompileError` or `RuntimeError` in console
  - [ ] No `wasm streaming compiler failed` errors (indicates browser couldn't use streaming compilation)

### 7.2 WebGL Feature Support
- **What to test:** Godot 4.7 Forward Plus requires WebGL 2.0.
- **Checklist:**
  - [ ] WebGL 2.0 is available on all tested browsers
  - [ ] Required WebGL 2 extensions are present (e.g., `EXT_texture_compression_s3tc`, `OES_texture_float`, `WEBGL_draw_buffers`)
  - [ ] Firefox does **not** natively support `EXT_texture_compression_s3tc` — verify Godot falls back to ETC2 (which is also disabled in export config: `etc=false, etc2=false`). This is a **critical issue** — Firefox may fail to render textures.
  - [ ] Safari's WebGL 2 support is sufficient (test all levels)

### 7.3 Single-Threaded Constraint
- **What to test:** The export is single-threaded (`variant/thread_support=false`).
- **Why it matters:** No `SharedArrayBuffer`, no `OffscreenCanvas`, no multithreaded WASM. All game logic runs on the main JS thread.
- **Checklist:**
  - [ ] No `SharedArrayBuffer` errors (since threads=false, this should not occur)
  - [ ] Main thread does not get blocked by GC or layout thrashing
  - [ ] AudioWorklet runs on a separate thread (this is correct — it's separate from the game loop)
  - [ ] No dropped frames caused by JS heap pressure from scene loading

### 7.4 WebAssembly SIMD / Tail Calls
- **What to test:** Does Godot's WASM build use SIMD or tail calls?
- **Why it matters:** Firefox historically had issues with these features, but they are widely supported now.
- **Checklist:**
  - [ ] No `UnsupportedWebAssemblyFeatureError` in Firefox
  - [ ] No warnings about SIMD/tail calls in any browser console

### 7.5 Service Worker Installation
- **What to test:** The `index.html` has code to install a service worker if `Engine.getMissingFeatures()` finds missing features and `GODOT_CONFIG['serviceWorker']` is set.
- **Why it matters:** The code at lines 168–192 of `index.html` attempts to register a service worker for COOP/COEP headers (which are needed for features like `SharedArrayBuffer`).
- **Checklist:**
  - [ ] When PWA is disabled and no service worker config exists, no SW registration error occurs
  - [ ] If a `service-worker.js` is later deployed, it installs correctly and enables offline play
  - [ ] The SW does not interfere with game updates (cache invalidation)

---

## 8. Input Handling Differences

### 8.1 Keyboard Input

**Physical keycodes used (from `project.godot`):**
| Input Action | Physical Keycode | Key |
|---|---|---|
| ui_left / strafe_left | 65 | A |
| ui_right / strafe_right | 68 | D |
| ui_up | 87 | W |
| ui_down | 85 (S in code) | S |
| jump | 32 | Space |
| climb | 81 | Q |
| pause | 4194310 | Escape |
| reset | 82 | R |

- **What to test:**
  - [ ] All keys work on QWERTY keyboards (primary layout)
  - [ ] All keys work on AZERTY keyboards (French — A and Q positions swapped)
  - [ ] All keys work on QWERTZ keyboards (German — Y and Z swapped)
  - [ ] Mac `Cmd` key does not interfere (e.g., Cmd+R reloads the page)
  - [ ] Laptop function keys (Fn) do not intercept `WASD` keys
  - [ ] Numpad keys are not mapped accidentally

**Key behavior specifics:**
  - [ ] `A` and `D` have `ui_action_repeat=true` — verify continuous movement when held
  - [ ] `Space` has `ui_action_repeat=false` — only fires once per press (correct for jump)
  - [ ] Repeated key presses during a jump do not trigger multiple jumps (coyote time / buffer handles this)
  - [ ] Holding `Q` while on wall triggers continuous climb (wall climb speed 1.5 units/s)
  - [ ] `R` resets player position without reloading the page

### 8.2 Mouse Input
- **What to test:** Mouse is hidden (`input_devices/pointing/show_mouse=false`) and canvas has `touch-action: none`.
- **Checklist:**
  - [ ] Mouse cursor does not appear over the canvas during gameplay
  - [ ] Mouse cursor does not appear when clicking the canvas
  - [ ] `ctx-menu` (right-click) does not interrupt gameplay — verify `event.preventDefault()` is called
  - [ ] Middle-click paste does not trigger unexpected behavior
  - [ ] Mouse wheel does not cause page scroll

### 8.3 Touch Input (Mobile)
- **What to test:** The game uses keyboard-only input actions (`Input.is_action_*`). There is **no touch input mapping** in `project.godot`.
- **Critical finding:** The game has **no touch controls** configured.
- **Checklist:**
  - [ ] Touch input does not trigger any game action (expected — keyboard-only game)
  - [ ] Touch does not zoom the page (`touch-action: none` prevents this)
  - [ ] Touch does not trigger browser navigation (swipe back/forward)
  - [ ] Touch does not cause the virtual keyboard to appear (no `<input>` elements)
  - [ ] **Recommendation:** For mobile testing, verify that the game is **intended to be desktop-only** or consider adding touch overlay controls

### 8.4 Gamepad / Joystick
- **What to test:** No gamepad input is configured in `project.godot`.
- **Checklist:**
  - [ ] Connecting a gamepad does not cause unexpected behavior
  - [ ] Gamepad does not interfere with keyboard input

### 8.5 Simultaneous Key Combinations
- **What to test:**
  - [ ] Holding `A` + `Space` (strafe + jump simultaneously) works correctly
  - [ ] Holding `W` + `D` + `Space` (move forward-right + jump) works correctly
  - [ ] Holding `Q` + `A` (climb + strafe) works correctly
  - [ ] Pressing `Escape` while holding `A` unpause and does not send `A` to the game again
  - [ ] Pressing `R` while jumping resets the player correctly

---

## 9. Visual Validation Concerns

### 9.1 HUD Text Rendering
- **What to test:** HUD text includes:
  - Level number (integer)
  - Lives (❤️ heart emoji: `\u2764\ufe0f`)
  - Score (integer)
  - Timer (`%02d:%02d.%02d` format)
  - Progress bar (clamped 0.0–1.0)
- **Checklist:**
  - [ ] Heart emoji (❤️) renders correctly on all browsers (may show differently on macOS vs. Windows vs. Android)
  - [ ] Timer format is consistent (`00:00.00` through `99:59.99`)
  - [ ] Score updates smoothly (no flicker from `_process` at 10 Hz update rate)
  - [ ] Progress bar fill is accurate (player position / finish_x ratio)

### 9.2 UI Overlays
- **What to test:** Overlays include: `LevelComplete`, `GameOver`, `PauseMenu`, `LoadingScreen`.
- **Checklist:**
  - [ ] All overlays fade in (0.4 s tween to `modulate:a=1.0`)
  - [ ] All overlays fade out (0.3 s tween to `modulate:a=0.0`)
  - [ ] Overlays block input correctly while visible
  - [ ] No overlay renders on top of another (Z-order correct)
  - [ ] Buttons in overlays are clickable and respond to hover
  - [ ] Loading screen does not appear briefly during scene transitions (the 0.4 s delay guard)

### 9.3 3D Scene Rendering
- **What to test:** First-person camera with forward auto-run, truck-based levels, particle effects.
- **Checklist:**
  - [ ] Player character model renders in all orientations (front, side, top-down)
  - [ ] Truck model renders correctly (collision shape matches visual)
  - [ ] Hazards (saw blades, swinging hammers, falling debris, ramps) render with correct animation
  - [ ] Particle effects (death particles, impact effects) render without corruption
  - [ ] Camera tracking is smooth (no jank or frame drops during fast movement)
  - [ ] No visual clipping through geometry

### 9.4 Color & Contrast
- **What to test:** The game uses a dark theme (black background, white text, blue accents).
- **Checklist:**
  - [ ] HUD text (white on dark semi-transparent panel) is readable at all times
  - [ ] Progress bar (blue fill) is visible against the background
  - [ ] Hazard visuals are distinguishable from environment (red danger indicators)
  - [ ] No accessibility issues for common color blindness types (red-green, blue-yellow)

### 9.5 Animation Consistency
- **What to test:** Transitions use Godot `Tween` nodes.
- **Checklist:**
  - [ ] 0.4 s fade-in transitions complete before scene switch (prevents visual glitch)
  - [ ] 0.3 s fade-out transitions feel natural (not too fast)
  - [ ] Parallel tweens (multiple overlays fading simultaneously) do not cause GPU stutter
  - [ ] Tweened properties (`modulate:a`) interpolate smoothly (no quantization artifacts)

---

## 10. Browser-Specific Edge Cases

### 10.1 Chrome / Chromium (Desktop & Android)
- **What to test:** Best WASM support, best WebGL 2 support.
- **Edge cases:**
  - [ ] Chrome's strict Content-Security-Policy does not block game resources
  - [ ] Chrome's "Data Saver" mode does not interfere (brotli compression should be fine)
  - [ ] Chrome DevTools attached does not slow down the game below playable fps
  - [ ] Chrome Android's bottom toolbar does not cover gameplay elements
  - [ ] Chrome's GPU process does not crash under sustained 3D load

### 10.2 Firefox (Desktop)
- **What to test:** Known issue: Firefox does not support S3TC (DXT) texture compression.
- **Edge cases:**
  - [ ] **Critical:** Verify Godot's texture fallback works on Firefox (ASTC and ETC2 are disabled in export config — this may mean no texture compression fallback!)
  - [ ] Firefox's WebRender may introduce visual artifacts (verify no banding, tearing)
  - [ ] Firefox's AudioContext may have different latency characteristics
  - [ ] Firefox may require explicit WebGL 2 context creation (vs. Chrome's auto-selection)

### 10.3 Safari (macOS & iOS)
- **What to test:** Safari has historically had weaker WebGL 2 and WASM support.
- **Edge cases:**
  - [ ] Safari does not support S3TC — verify fallback works (see Firefox note above)
  - [ ] Safari's JIT compiler may produce slower WASM execution (verify frame rate)
  - [ ] Safari's Web Audio API may have a different initial latency (music may start with a delay)
  - [ ] iOS Safari may terminate the page if it uses too much memory (37 MB WASM + textures)
  - [ ] iOS Safari's low-power mode may throttle frame rate to 30 fps

### 10.4 Edge (Desktop)
- **What to test:** Chromium-based, generally similar to Chrome.
- **Edge cases:**
  - [ ] Edge's "Efficiency Mode" (Windows 11) does not throttle the game
  - [ ] Edge's IE Mode (if accidentally activated) fails the game with a clear error
  - [ ] Edge's built-in ad blocker does not block game resources

### 10.5 Samsung Internet (Android)
- **Edge cases:**
  - [ ] Samsung Internet's "Game Mode" does not interfere with canvas rendering
  - [ ] Samsung Internet's data saver does not break WASM loading
  - [ ] Samsung Internet's orientation lock does not cause issues

### 10.6 Opera / Vivaldi / Brave
- **Edge cases:**
  - [ ] Opera's "Turbo Mode" does not proxy/brotli-encode the game's own brotli resources
  - [ ] Vivaldi's built-in tracker blocker does not interfere
  - [ ] Brave's Shields do not block game resources

### 10.7 Accessibility Features
- **What to test:** Browser accessibility features can interfere with game rendering and input.
- **Edge cases:**
  - [ ] Browser text zoom (Ctrl+Plus) does not break canvas rendering
  - [ ] High contrast mode does not cause visual artifacts
  - [ ] Screen readers do not interfere with game input (no `<input>` or `<button>` elements in the game canvas)
  - [ ] Magnifier tool does not cause canvas tearing
  - [ ] macOS VoiceOver does not capture keyboard input

### 10.8 Developer Tools Impact
- **What to test:** Having DevTools open affects performance.
- **Edge cases:**
  - [ ] Chrome DevTools `Performance` panel recording does not cause frame drops
  - [ ] Chrome DevTools `Memory` panel snapshot does not corrupt the canvas
  - [ ] Firefox `WebGL` debugger does not freeze the game

### 10.9 Corporate / Restricted Environments
- **What to test:** Games on corporate networks may face additional restrictions.
- **Edge cases:**
  - [ ] Corporate proxy does not intercept/break WASM downloads
  - [ ] Content security filters do not block `.wasm` content type
  - [ ] Firewall rules do not block WebSocket if any future feature adds networking

---

## Summary of Critical Browser-Testing Risks

| Priority | Risk | Browser(s) Affected |
|---|---|---|
| **P0** | Firefox/Safari lack S3TC and export has no other texture compression fallback | Firefox, Safari, iOS Safari |
| **P0** | Single-threaded WASM on main JS thread — main thread blocking causes all stutters | All browsers |
| **P1** | No touch input mapping — game is keyboard-only on a potentially touch device | Mobile browsers |
| **P1** | 37 MB WASM download time — slow on 3G / metered connections | All mobile browsers |
| **P1** | 0.1 s jump buffer may feel too tight on browsers with frame jank | All browsers (especially Firefox on low-end devices) |
| **P2** | `user-scalable=no` prevents pinch-zoom — accessibility concern | All mobile browsers |
| **P2** | Stretch aspect="ignore" causes distortion on non-16:9 viewports | All browsers on non-standard screens |
| **P2** | Tab throttling breaks timer accuracy and physics timing | All browsers |
| **P3** | Safari iOS may OOM-kill with 37 MB WASM + textures | iOS Safari |
| **P3** | Mac `Cmd+R` interferes with game's `R` (reset) key | Safari, Chrome on Mac |

---

## Recommended Browser Test Matrix

| Browser | Desktop | Mobile | Priority |
|---|---|---|---|
| Chrome | ✅ Required | ✅ Required | P0 |
| Firefox | ✅ Required | ✅ Required | P0 |
| Safari (macOS) | ✅ Required | — | P0 |
| Safari (iOS) | — | ✅ Required | P0 |
| Edge | ✅ Required | — | P1 |
| Samsung Internet | — | ✅ Recommended | P1 |
| Opera | ✅ Optional | — | P2 |
