import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration — W2-A.4 (FIRST e2e scaffold), hardened in W3-B.1.
 *
 * specs live in tests/e2e/. The dev server is launched via Playwright's
 * built-in webServer hook — vite is started with the repo's
 * config/vite.config.ts and specs drive a real (headed) Chromium against it.
 *
 * WebGL: the boot smoke asserts a LIVE WebGL context on #game-canvas, so
 * the browser must render with GPU acceleration enabled. Headless Chrome
 * falls back to SwiftShader/ANGLE; --enable-unsafe-webgl keeps real
 * WebGL available in recent Chrome versions where the flag is required
 * (no-op on versions that don't need it).
 *
 * W3-B.1 (Integration lane, Day 9): evidence dir moved from w2/ → w3/,
 * screenshot mode 'on' enabled for visual-regression baselines.
 * W3-B.1b: dedicated `w3b` project added (testDir: tests/e2e/w3b/) so
 * W3-B critical-path E2E specs are always discoverable, independent of
 * the BROWSER smoke-swap.
 */
export default defineConfig({
  /* W2-E.1b: the spec writes per-browser evidence. When the `browser` env is
   * set (e.g. BROWSER=firefox), screenshots and console capture are suffixed
   * with the browser name so Chrome and Firefox artifacts never collide. */
  testDir: process.env.BROWSER ? './tests/e2e/smoke' : './tests/e2e',
  /* W3-B.1: evidence artifacts moved to w3/ — W3-B E2E + visual-regression
   * baselines live here. The HTML reporter lives in a sibling subdir so it
   * never collides with per-test artifact output. */
  outputDir: './tests/evidence/w3/playwright-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tests/evidence/w3/playwright-report-html' }]
  ],
  use: {
    /* The boot smoke is verified in real (headed) Chrome — Task 4.3
     * VERIFY criterion. `test:e2e:headed` overrides to headed; the
     * default here is headless so CI stays green without a display. */
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    /* W3-B.1: screenshots enabled for visual-regression baselines.
     * Full-page screenshots are captured on failure by default; mode 'on'
     * captures at every test end so baselines can be diffed across runs. */
    screenshot: 'on',
    /* Console capture happens in the spec; this just keeps tracing
     * off (we want a light smoke, not a trace dump). */
    trace: 'off'
  },
  projects: [
    {
      name: 'chromium-boot',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          /* W2-A.4 VERIFY: real Chrome, not headless-shell. The spec
           * runs headless:false (headed) per Task 4.3 VERIFY. */
          headless: false,
          args: [
            /* Real WebGL (not software-only) for the context assertion. */
            '--enable-unsafe-webgl',
            '--use-gl=angle',
            '--use-angle=swiftshader'
          ]
        }
      }
    },
    {
      /* W2-E.1b: Firefox leg of Week-2 success criterion #1. Same
       * headed, no-args posture as Chromium: Firefox's WebGL1/2 works
       * out of the box with ANGLE/GPU on this box, and adding
       * --enable-unsafe-webgl-style flags to Firefox would change
       * what we're verifying. */
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          headless: false
        }
      }
    },
    {
      /* W3-B.1b: dedicated W3-B project for critical-path E2E specs.
       * testDir points to tests/e2e/w3b/ so W3-B specs are always
       * discoverable, independent of the BROWSER smoke-swap.
       * Same headed + WebGL posture as chromium-boot. */
      name: 'w3b',
      testDir: './tests/e2e/w3b',
      // 2026-09-22: full critical-path suite (CP1-CP4) takes longer than
      // the default 30s; give each test 60s so death/restart cycles under
      // SwiftShader rendering have headroom.
      timeout: 60_000,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          headless: false,
          args: [
            '--enable-unsafe-webgl',
            '--use-gl=angle',
            '--use-angle=swiftshader'
          ]
        }
      }
    }
  ],
  webServer: {
    command: 'npm run dev -- --no-open',
    url: 'http://localhost:5173/public/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
