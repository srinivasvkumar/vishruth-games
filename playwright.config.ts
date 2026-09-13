import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration — W2-A.4 (FIRST e2e scaffold in this project).
 *
 * One smoke spec lives in tests/e2e/. The dev server is launched by the
 * `devServer` project via Playwright's built-in webServer hook — vite is
 * started with the repo's config/vite.config.ts and the smoke test drives
 * a real (headed) Chromium against it.
 *
 * WebGL: the boot smoke asserts a LIVE WebGL context on #game-canvas, so
 * the browser must render with GPU acceleration enabled. Headless Chrome
 * falls back to SwiftShader/ANGLE; --enable-unsafe-webgl keeps real
 * WebGL available in recent Chrome versions where the flag is required
 * (no-op on versions that don't need it).
 */
export default defineConfig({
  /* W2-E.1b: the spec writes per-browser evidence. When the `browser` env is
   * set (e.g. BROWSER=firefox), screenshots and console capture are suffixed
   * with the browser name so Chrome and Firefox artifacts never collide. */
  testDir: process.env.BROWSER ? './tests/e2e/smoke' : './tests/e2e',
  /* Evidence artifacts: screenshots/trace live under tests/evidence/w2/.
   * The HTML reporter lives in a sibling subdir so it never collides
   * with per-test artifact output. */
  outputDir: './tests/evidence/w2/playwright-artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tests/evidence/w2/playwright-report-html' }]
  ],
  use: {
    /* The boot smoke is verified in real (headed) Chrome — Task 4.3
     * VERIFY criterion. `test:e2e:headed` overrides to headed; the
     * default here is headless so CI stays green without a display. */
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
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
    }
  ],
  webServer: {
    command: 'npm run dev -- --no-open',
    url: 'http://localhost:5173/public/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
