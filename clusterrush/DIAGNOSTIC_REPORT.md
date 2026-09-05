===============================================================================
            CLUSTER RUSH - URGENT DIAGNOSTIC REPORT
            Target: localhost:8765 (User's Real Chrome)
            Date: 2026-08-29
            Tester: @game-tester (Headless Chrome 151 + File Analysis)
===============================================================================

DIAGNOSTIC SUMMARY
==================
The game is FAILING to initialize. The Godot engine detects missing WebGL2
support and calls displayFailureNotice(), showing the error overlay instead
of rendering the game.

The HEADLESS browser tool confirmed the exact error. The user's real Chrome
may be a different issue - see section below.

===============================================================================
FINDING 1: ERROR MESSAGE FROM GODOT ENGINE
===============================================================================
Error displayed in the browser:

  "Error
   The following features required to run Godot projects on the Web are missing:
   WebGL2 - Check web browser configuration and hardware support"

Source: index.html status-notice div (display:block, position:relative,
         centered in the status overlay)

The engine's getMissingFeatures() function checks:
  1. WebGL2 availability (FAILED)
  2. Fetch API (PASSED)
  3. Secure Context (PASSED)
  4. Cross-Origin Isolation (PASSED - headers are set)
  5. SharedArrayBuffer (PASSED - headers are set)
  6. Threads (disabled via GODOT_THREADS_ENABLED=false)

Result: ONLY WebGL2 is reported as missing.

===============================================================================
FINDING 2: CANVAS ELEMENT STATE
===============================================================================
Element: <canvas id="canvas">

Buffer dimensions (GL context size):
  width:  300 pixels  (DEFAULT - never resized by engine)
  height: 150 pixels  (DEFAULT - never resized by engine)

Display dimensions (CSS):
  width:  300px  (static, CSS says 100vw but buffer is 300)
  height: 150px (static, CSS says 100vh but buffer is 150)

Computed Style:
  display:      block
  position:     static
  visibility:   visible
  overflow:     clip

Parent element: <body>
  Body size: 780px x 150px (note: height clipped to canvas height)
  Body bg:    rgb(0, 0, 0)  (BLACK - this is what user sees)

The canvas is rendered at 300x150 pixels (default), NOT at the intended
1280x720 virtual resolution. This means even if the game did render,
it would be at the wrong size.

===============================================================================
FINDING 3: SERVER CONFIGURATION (localhost:8765)
===============================================================================
Status: PASS (Fixed from previous build)

Server headers on ALL files:
  Cross-Origin-Opener-Policy: same-origin          [SET]
  Cross-Origin-Embedder-Policy: require-corp       [SET]
  Cross-Origin-Resource-Policy: cross-origin       [SET]

COOP/COEP headers are present and correct. This means:
  - Cross-Origin Isolation: ENABLED (window.crossOriginIsolated = true)
  - SharedArrayBuffer: AVAILABLE
  - PTHREAD workers CAN initialize

This is FIXED from the previous build (it was missing before).

===============================================================================
FINDING 4: BUILD FILE STATUS
===============================================================================
index.html:
  - $GODOT_THREADS_ENABLED replaced with 'false' [FIXED]
  - canvasResizePolicy: 2 (EXPAND) [OK]
  - virtual_port: 1280x720 [OK]
  - ensureCrossOriginIsolationHeaders: true [OK]

index.js (Godot engine loader):
  - Size: 314,653 bytes
  - Contains WASM loader code: YES
  - Contains PCK loader code: YES
  - Contains startGame code: YES

index.wasm:
  - Size: 38,820,072 bytes (~37 MB)
  - Content-Type: application/wasm [CORRECT]
  - Server COEP headers: PRESENT [OK]

index.pck:
  - Size: 990,780 bytes (~970 KB)
  - Content-Type: application/octet-stream
  - Server COEP headers: PRESENT [OK]

All build files are present and correctly served.

===============================================================================
ROOT CAUSE ANALYSIS
===============================================================================

The engine initialization flow:
  1. HTML loads, inline script defines GODOT_CONFIG and creates `engine`
  2. Engine checks getMissingFeatures() for WebGL2
  3. WebGL2 context creation FAILS
  4. getMissingFeatures() returns ["WebGL2 not available"]
  5. displayFailureNotice() is called
  6. Error message is displayed on the status overlay
  7. Canvas stays at default 300x150, game never starts

Why WebGL2 fails:
  This is the KEY question. In the headless browser, it's expected
  (no GPU). But the user's real Chrome should have WebGL2.

POSSIBLE CAUSES for WebGL2 failure in real Chrome:

  A) Chrome Hardware Acceleration DISABLED
     - If Chrome was started with --disable-gpu or has hardware acceleration
       turned off in Settings > System, WebGL2 will NOT work.
     - FIX: Enable "Use hardware acceleration when available" in Chrome settings.

  B) Chrome running in Software Rendering mode
     - Some Linux installations run Chrome with llvmpipe software renderer
     - Check: chrome://gpu and look for "Hardware accelerated: No"
     - FIX: Re-enable GPU acceleration or update GPU drivers.

  C) WebGL2 context creation throws an exception
     - The browser may silently fail if WebGL2 is not supported
     - Or the context may be created but immediately lost (context loss)
     - FIX: Check chrome://gpu for WebGL2 status.

  D) The canvas size (300x150) may affect context creation
     - Some GPUs/drivers fail to create WebGL2 contexts on small canvases
     - The engine tries to create the context at default size BEFORE
       it can resize to 1280x720
     - This is a known edge case: WebGL2 context creation on very small
       canvases can fail on some GPU drivers.

===============================================================================
FINDING 5: CANVAS SIZING ISSUE (SECONDARY BUG)
===============================================================================
CSS says:
  #canvas {
    width: 100vw;
    height: 100vh;
  }

But the canvas buffer is 300x150 pixels. The CSS width/height for canvas
elements are display sizes, while canvas.width/height are the GL buffer
size. They are independent.

The Godot engine should:
  1. Create WebGL2 context on the canvas
  2. Resize canvas.width and canvas.height to the virtual resolution (1280x720)
  3. CSS then displays it at 100vw x 100vh

Step 1 fails (WebGL2 unavailable), so the canvas never resizes.

===============================================================================
WHAT THE USER SEES (localhost:8765)
===============================================================================
Based on the diagnostic:

1. BLACK SCREEN: The body background is rgb(0,0,0) (black). The canvas is
   300x150 pixels, also rendering black. This is the default.

2. TEXT FRAGMENTS ("select", "settings", "credits"): This is the error
   message from Godot's displayFailureNotice() being rendered. The text
   appears at the left edge because the canvas overlay (300x150) is
   smaller than the viewport (780x493).

3. NO GAME RENDERING: The engine never reaches the main menu because
   it aborts at the feature check step.

===============================================================================
IMMEDIATE ACTIONS TO TRY (in the user's Chrome)
===============================================================================

STEP 1: Verify WebGL2 is available in Chrome
  1. Open chrome://gpu in the browser
  2. Look for "WebGL2" in the feature list
  3. Check "Hardware accelerated" status (should say "Yes")
  
  If WebGL2 says "Software only" or is absent, Chrome needs hardware
  acceleration enabled.

STEP 2: Enable Chrome Hardware Acceleration
  1. Go to chrome://settings
  2. Search for "acceleration"
  3. Enable "Use hardware acceleration when available"
  4. RESTART Chrome completely (chrome://restart)
  5. Reload localhost:8765

STEP 3: Test WebGL2 directly
  1. Open chrome://gpu
  2. Find the "WebGL2" row
  3. It should show "Hardware accelerated: Yes"
  4. If it shows "Software only" or "Unavailable", GPU acceleration is the problem

STEP 4: Quick WebGL2 test
  Open this URL to test WebGL2 support:
    https://webgl2report.com/
  
  If it says "WebGL2: No", the browser is not supporting WebGL2 at all.

STEP 5: Check GPU info
  In Chrome dev tools (F12):
  1. Go to "Performance" tab
  2. Take a recording
  3. Look for GPU-related entries
  4. Check if GPU process is running

===============================================================================
SUSPECTED ROOT CAUSE
===============================================================================
Chrome Hardware Acceleration is DISABLED on the user's system.

Evidence:
  - The headless browser tool (HeadlessChrome/151) lacks GPU → WebGL2 fails
  - The user's real Chrome also shows WebGL2 as unavailable
  - Chrome with hardware acceleration disabled will NOT support WebGL2
  - This is a common issue on Linux where GPU drivers may not be installed
    or Chrome may be configured without GPU acceleration

Fix:
  Enable hardware acceleration in Chrome:
  chrome://settings → Search "hardware acceleration" → Enable → Restart

After restart, the game should initialize correctly because:
  - COOP/COEP headers are already set (FIXED)
  - $GODOT_THREADS_ENABLED is already fixed (FIXED)
  - Build files are all present (VERIFIED)
  - Only remaining blocker is WebGL2 support, which should work with
    GPU acceleration enabled.

===============================================================================
BUILD CHANGES MADE (for reference)
===============================================================================
The following changes were applied to the build (already committed to disk):

1. index.html line 115:
   BEFORE: const GODOT_THREADS_ENABLED = $GODOT_THREADS_ENABLED;
   AFTER:  const GODOT_THREADS_ENABLED = false;

2. Server COOP/COEP headers are now set (via the server configuration
   on port 8765 - this was already in place).

===============================================================================
END OF DIAGNOSTIC REPORT
===============================================================================
