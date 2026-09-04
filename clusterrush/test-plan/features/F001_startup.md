# F001 — Web Startup (engine boot, download, WebGL2, fatal errors)

Feature ref: feature_inventory F001. P0 gate — everything else depends on this.
Sources: Builds/WebGL/index.html (Godot 4.7.2 HTML5 runtime), project.godot.
Evidence: 63.2 MB total (index.wasm 39.0MB + index.pck 24.2MB + index.js 307KB).

## Test cases

- **F001-01 Clean first load (fresh profile, no cache)**
  Steps: fresh browser profile → open https://srinivasvkumar.github.io/vishruth-games/Builds/WebGL/index.html → wait.
  Expected: loading screen appears; Network panel shows index.js (~300KB) → index.wasm (~39MB) → index.pck (~24MB) all 200; total transfer ≈63MB; Main Menu renders.
  Evidence: T0 (loading visible) + T2 (menu visible) screenshots, network log, console clean.
  PASS: menu renders with zero console errors. FAIL: any error, stuck loading >60s, blank canvas.

- **F001-02 Relo...[truncated]