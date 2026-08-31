import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  // SwiftShader boots slow (CPU-rendered WebGL2); give each test 60s headroom.
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:8765',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Headless WebGL: SwiftShader (verified 2026-08-30 — PLAN.md §4 / G2).
        // Without --enable-unsafe-swiftshader + angle/swiftshader the engine
        // aborts at boot with "WebGL2 missing" (a test-env artifact, not a bug).
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--enable-unsafe-swiftshader',
            '--use-gl=angle',
            '--use-angle=swiftshader',
          ],
        },
      },
    },
  ],
  retries: 1,
  reportSlowTests: { max: 5, threshold: 15000 },
});
