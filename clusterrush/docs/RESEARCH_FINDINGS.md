# Cluster Rush — Web Research Findings (Godot 4.7 / WebGL / CI / E2E)

Researched 2026-08-30. Sections R1–R4: approach (concrete), versions, pitfalls, sources.

## R1. GUT (Godot Unit Testing) for Godot 4.x

- **Version: GUT 9.7.1** (tag `v9.7.1`, `godot_4_7` branch) is the release mapped to Godot 4.7.x in
  the repo README table (9.6.1 → 4.6.x; `main` tracks 4.6.x — don't use main). GUT 9.x = Godot 4.
  Download `https://github.com/bitwes/Gut/archive/refs/tags/v9.7.1.zip` → `addons/gut/gut_cmdln.gd`.
- **Headless run** (project root):

```bash
godot --headless -d -s addons/gut/gut_cmdln.gd --path "$PWD" \
  -gdir=res://test -ginclude_subdirs -gexit -glog=2 -gignore_pause -gjunit_xml_file=junit.xml
```

- **Exit codes: 0 = all pass, 1 = any fail** (pending doesn't count). Official v9.7.1 flags:
  `-gdir` (dirs), `-gtest` (file), `-gselect` (filename substring), `-gunit_test_name` (method),
  `-gexit` (REQUIRED in CI or it waits on a window), `-gexit_on_success`, `-gignore_pause`,
  `-glog=0..3`, `-gconfig=` (gutconfig JSON; default `res://.gutconfig.json`),
  `-gjunit_xml_file`, `-gerrors_do_not_cause_failure`.
- **Pitfalls**
  - No spaces around `=` in flags; a space makes Godot treat the value as a scene path
    ("Failed loading scene: res://...").
  - CI "Could not find type GutTest/GutUtils" = missing `.godot/` import cache → run
    `godot --headless --import` first; never commit `.godot/`.
  - GUT 9.7.0+ for Godot 4.7: doubles return type-appropriate defaults instead of null
    (stricter engine typing); invalid stub values now raise errors — double-based tests may flip.
  - Since 9.6.0, headless auto-exits and ignores `pause_before_teardown`, but keep `-gexit` explicit.
  - Note: `-gignore_headless_warning` is NOT in the official v9.7.1 flag list (needs verification
    in newer builds); real levers are `-glog`, `-gignore_pause`, `-gerrors_do_not_cause_failure`.

**Sources**
- https://github.com/bitwes/Gut (README version table) · https://github.com/bitwes/Gut/releases
- https://gut.readthedocs.io/en/v9.7.1/Command-Line.html · https://github.com/bitwes/Gut/blob/v9.7.1/documentation/docs/Command-Line.md
- https://github.com/bitwes/Gut/issues/491 (headless CI class-cache pitfall)

## R2. CI for Godot on GitHub Actions

```yaml
name: godot-ci
on: [push, pull_request]
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/checkout@v4
      - uses: chickensoft-games/setup-godot@v2
        with: { version: 4.7.2, include-templates: true }
      - run: godot --headless --import --path . || true
      - run: godot --headless -d -s addons/gut/gut_cmdln.gd --path . -gdir=res://test -ginclude_subdirs -gexit -glog=2
      - run: |
          mkdir -p Builds/WebGL
          godot --headless --export-release "Web" Builds/WebGL/index.html
      - uses: actions/configure-pages@v5
      - run: touch Builds/WebGL/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with: { path: Builds/WebGL }
      - id: deployment
        uses: actions/deploy-pages@v4
```

- Binary-download fallback: `curl -LO .../releases/download/4.7.2-stable/Godot_v4.7.2-stable_linux.x86_64.zip`
  (assets at https://godotengine.org/download/archive/4.7.2-stable/). **Set repo Settings → Pages →
  source = "GitHub Actions"** (deploy-from-artifact pattern, not a branch).
- Preset name must match `export_presets.cfg`; templates must match engine version exactly.
- **Use the single-threaded web export (default since 4.3):** GitHub Pages cannot set custom
  response headers, so multi-threaded exports (SharedArrayBuffer → need
  `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`)
  don't work there (community discussion #13309 confirms; old workaround was coi-serviceworker).
- **Pitfalls**: skip `--import` → class-cache errors (historical godot issue #75684); `.nojekyll`
  stops Jekyll mangling; Pages gzips on-the-fly only — pre-compress wasm with brotli/wasm-opt for
  bigger wins (modest gains post-zip).

**Sources**
- https://github.com/godotengine/godot-docs/blob/master/tutorials/export/exporting_for_web.rst
- https://github.com/godotengine/godot-docs/issues/7084 · https://github.com/orgs/community/discussions/13309
- https://github.com/actions/upload-pages-artifact · https://github.com/actions/deploy-pages
- https://github.com/chickensoft-games/setup-godot · https://flametime/brotli-web-example

## R3. Playwright E2E for a WebGL game in headless Chrome

```js
// playwright.config.js
export default {
  use: {
    headless: true,
    launchOptions: {
      args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader",
             "--enable-unsafe-swiftshader"],
    },
    baseURL: "http://localhost:8765",
  },
};
```

- Since Chromium's "Intent to Remove" of the automatic WebGL→SwiftShader fallback, headless Chrome
  fails WebGL context creation unless `--enable-unsafe-swiftshader` is passed;
  `--use-gl=angle --use-angle=swiftshader` (SwANGLE) is the documented software path.
- **Verify boot**: (1) wait for Godot's `#status` overlay to detach/leave "Loading"; (2) check a
  webgl/webgl2 context exists on the game canvas via `page.evaluate`; (3) non-blank canvas via
  `canvas.toDataURL()` or `toHaveScreenshot` (`maxDiffPixelRatio: ~0.02`); (4) keep
  `page.screenshot()` evidence per milestone. Prefer overlay + screenshot over raw pixel sampling
  — Godot can recreate GL contexts, so `preserveDrawingBuffer` reads can miss the drawn frame.
- **Pitfalls**: `--disable-gpu` kills SwiftShader — don't combine; without the flag the Godot
  error overlay says WebGL unsupported and tests time out silently; SwiftShader is 10–100× slower
  than real GPU — set navigation/expectation timeouts ≥30 s; SwiftShader renderer string is
  detectable (fine for CI, not a user proxy). The project's CORS server already sends COOP/COEP —
  only strictly required for multi-threaded exports; single-threaded needs a secure context.

**Sources**
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/gpu/swiftshader.md
- https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM/m/pzrvX-1zCQAJ (Intent to Remove: SwiftShader)
- https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/ · https://playwright.dev/docs/test-snapshots
- https://github.com/Randroids-Dojo/PlayGodot (Playwright-for-Godot prior art)

## R4. Measuring WebGL performance (first frame, FPS)

- **First frame (page-side)**: resolve when Godot's status overlay clears, timed with
  `performance.now()` (capture t0 pre-navigation via CDP for precision):

```js
await page.waitForFunction(() => {
  const s = document.querySelector("#status");
  return !s || !s.textContent.includes("Loading");
});
```

- **FPS**: sample rAF deltas in-page: push `t - last` per `requestAnimationFrame` tick for ~5 s,
  then `fps = 1000/avg(frameMs)` plus p95. rAF still fires in headless, but frame cadence is
  CPU-bound under SwiftShader.
- **CDP/DevTools**: `Performance.getMetrics` (TaskDuration, JSHeapUsedSize) and
  `Tracing.start/end` with `["gpu","viz","blink"]` categories give real paint/frame timestamps —
  the most accurate first-paint signal.
- **Engine-side**: expose `Performance.get_monitor(Performance.TIME_FPS)` / `TIME_FPS` and
  `TIME_PROCESS` (update only once per second — sample ≥2 s) to a HUD or console log the E2E test
  can capture.
- **Pitfalls**: first-frame includes ~10–40 MB wasm fetch+compile — report "first paint" vs
  "interactive" separately (Godot issue #41118 documents long web TTI); SwiftShader numbers are
  CPU-bound — use for regression deltas on the same machine/flags, never absolute perf claims;
  log machine + Chrome flags with every sample.

**Sources**
- https://docs.godotengine.org/en/stable/classes/class_performance.html · https://gdquest.com/tutorial/godot/gdscript/optimization-measure
- https://github.com/godotengine/godot/issues/41118 (web TTI) · https://kevinlynagh.com/newsletter/2016_12_web_perf (rAF timing)
- https://developer.chrome.com/docs/devtools/protocol/ (CDP Performance/Tracing)
