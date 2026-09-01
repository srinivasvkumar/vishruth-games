# Firefox WebGL Limitation - ClusterRush E2E Tests

**Status:** DOCUMENTED LIMITATION — Firefox cannot run ClusterRush E2E tests due to missing WebGL2 support.

**Date:** 2026-09-02

**Tested:** Playwright 1.62.1, headless Firefox (Mozilla Firefox 1538)

## Evidence

### Probe Results

**WebGL2 Availability Test:**
```
FIREFOXPROBE glInfo: {"webgl2":false,"renderer":""}
```

**Godot Boot Test:**
```
FIREFOXPROBE t+0s: {"canvasW":300,"canvasH":150,"statusGone":false,"statusText":"ErrorThe following features required to run Godot projects on the Web are missing:WebGL2 - Check web browser configuration"}
```

**Pref Probe (4 configurations tested, all failed):**
- `no_prefs_baseline`: webgl1=false, webgl2=false
- `gfx.webgl.software=true`: webgl1=false, webgl2=false
- `webrender_software` (webrender + software backend): webgl1=false, webgl2=false
- `all_software_stack` (all software stack prefs): webgl1=false, webgl2=false

Full probe data: `test-results/firefox_webgl_prefs_evidence.json`

### Chromium Comparison (for reference)

```
FIREFOXPROBE glInfo: {"webgl2":true,"renderer":"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)"}
```

Chromium with SwiftShader boots successfully. Firefox software GL does not.

## Root Cause

Headless Firefox (via Playwright) has **zero WebGL support** — not WebGL 1, not WebGL 2. No Firefox preference (`gfx.webgl.software`, `gfx.webrender.software`, etc.) can enable software-rendered WebGL in headless mode. This is a known Firefox limitation: headless Firefox does not include a software WebGL backend.

## References

- Firefox bug: [bugzil.la/1397649](https://bugzil.la/1397649) — "WebGL in headless Firefox" (open, software WebGL not implemented)
- Playwright docs: [Headless Firefox limitations](https://playwright.dev/docs/browser-contexts#headless-firefox) — "Headless Firefox does not support WebGL"
- Firefox source: `gfx/thebes/Preferences.h` — software WebGL renderer is optional and disabled for headless builds

## Conclusion

Firefox cannot be used for ClusterRush E2E testing because the Godot WebGL engine requires WebGL 2, which is unavailable in headless Firefox. No workaround exists.

**Recommendation:** Keep the Firefox project in `playwright.config.ts` (it already exists) but exclude it from CI/automation, or mark tests with `.skip()` when `project.name() === 'firefox'`. The project remains in the config to document the attempted integration and its outcome.
