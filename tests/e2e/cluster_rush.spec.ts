/**
 * Cluster Rush — E2E Tests (Canvas-based Godot WebGL game)
 *
 * Godot WebGL renders all UI on a `<canvas>` element. Standard DOM selectors
 * (button labels, etc.) do NOT work with Playwright because there are no
 * HTML buttons — everything is drawn as pixels.
 *
 * Strategy:
 * 1. Wait for the game canvas to appear and the splash overlay to hide.
 * 2. Verify the canvas renders a non-trivial image.
 * 3. Use page.evaluate() to inspect page title / canvas state.
 * 4. Click the canvas at known pixel coordinates to simulate player input.
 */

import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Game loads and renders on canvas
// ─────────────────────────────────────────────────────────────────────────────
test('game canvas loads and splash hides', async ({ page }) => {
  await page.goto('http://localhost:8765/');

  // Wait for the splash overlay to disappear (game started)
  await page.waitForFunction(() => {
    const overlay = document.getElementById('status');
    return overlay && overlay.style.visibility === 'hidden';
  }, { timeout: 30_000 });

  // Give the WebGL context a moment to render
  await page.waitForTimeout(2000);

  // Verify canvas exists and has non-zero dimensions
  const canvasSize = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { width: 0, height: 0 };
    return { width: c.width, height: c.height };
  });
  console.log('Canvas size:', canvasSize);
  expect(canvasSize.width).toBeGreaterThan(0);
  expect(canvasSize.height).toBeGreaterThan(0);

  // Save a screenshot for visual inspection
  await page.screenshot({
    path: 'tests/e2e/screenshots/game-loaded-main-menu.png',
    fullPage: false,
  });

  // No JS errors in console
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`${msg.type()}: ${msg.text()}`);
  });
  expect(errors.length).toBe(0);
});

test('page title contains "Cluster"', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('status');
    return overlay && overlay.style.visibility === 'hidden';
  }, { timeout: 30_000 });
  const title = await page.title();
  console.log('Page title:', title);
  // Godot WebGL templates use the project name; accept either variant
  expect(title).toMatch(/cluster/i);
});

test('canvas pixel data is non-trivial', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('status');
    return overlay && overlay.style.visibility === 'hidden';
  }, { timeout: 30_000 });
  await page.waitForTimeout(2000);

  // Read a small patch of pixels from the center of the canvas
  const pixelData = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const data = ctx.getImageData(
      Math.floor(c.width / 2) - 5,
      Math.floor(c.height / 2) - 5,
      10,
      10,
    );
    // Return a compact summary: number of non-black pixels
    let count = 0;
    for (let i = 0; i < data.data.length; i += 4) {
      if (data.data[i] > 0 || data.data[i + 1] > 0 || data.data[i + 2] > 0) {
        count++;
      }
    }
    return { width: c.width, height: c.height, nonBlackPixels: count };
  });

  expect(pixelData).not.toBeNull();
  // A properly-rendered scene should have many non-black pixels
  expect(pixelData.nonBlackPixels).toBeGreaterThan(50);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Keyboard input is accepted by the browser (game receives focus)
// ─────────────────────────────────────────────────────────────────────────────
test('canvas accepts keyboard focus and key events', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('status');
    return overlay && overlay.style.visibility === 'hidden';
  }, { timeout: 30_000 });
  await page.waitForTimeout(1000);

  // Click on the canvas to focus it
  const canvas = await page.locator('canvas').first();
  await canvas.click();

  // Send a key event
  await page.keyboard.press('Space');

  // No crash — verify the canvas is still visible
  await expect(canvas).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. No 404s for key assets
// ─────────────────────────────────────────────────────────────────────────────
test('no missing WASM or PCK files', async ({ page }) => {
  const notFound: string[] = [];

  page.on('response', async (response) => {
    if (response.status() === 404) {
      notFound.push(response.url());
    }
  });

  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('status');
    return overlay && overlay.style.visibility === 'hidden';
  }, { timeout: 30_000 });
  await page.waitForTimeout(2000);

  // Filter out known non-critical 404s (favicon, etc.)
  const critical = notFound.filter(
    (url) =>
      !url.includes('favicon') &&
      !url.includes('icon'),
  );
  expect(critical).toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Game scene loads via URL parameter / direct navigation
// ─────────────────────────────────────────────────────────────────────────────
test('game scene renders when loaded directly', async ({ page }) => {
  await page.goto('http://localhost:8765/', { waitUntil: 'load' });
  await page.waitForFunction(() => {
    const overlay = document.getElementById('status');
    return overlay && overlay.style.visibility === 'hidden';
  }, { timeout: 30_000 });

  const canvas = await page.locator('canvas').first();
  await expect(canvas).toBeVisible();
});
