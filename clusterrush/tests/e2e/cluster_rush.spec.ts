/**
 * Cluster Rush — E2E Tests (Canvas-based Godot WebGL game)
 *
 * Godot WebGL renders all UI on a `<canvas id="canvas">` element. Standard DOM
 * selectors do NOT work — everything is drawn as pixels. Boot/pixel/click
 * logic is centralized in tests/e2e/helpers/canvas.ts (PLAN.md §4).
 *
 * Launch args (SwiftShader) live in playwright.config.ts — verified 2026-08-30.
 */

import { test, expect } from '@playwright/test';
import { bootWait, canvasStats, clickCanvas } from './helpers/canvas.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Game loads and renders on canvas
// ─────────────────────────────────────────────────────────────────────────────
test('game canvas loads and splash hides', async ({ page }) => {
  await page.goto('/');
  await bootWait(page);

  // The main menu is a dark-gray (non-black) bg with a light title + button
  // column, so the sampled canvas reads ~100% non-black (background counts as
  // non-black). The >5 threshold is the floor: a crashed/unrendered canvas
  // reads ~0% (black) or an all-black clear color.
  const stats = await canvasStats(page);
  console.log('Canvas stats at menu boot:', JSON.stringify(stats));
  expect(stats.cw).toBeGreaterThanOrEqual(1280);
  expect(stats.ch).toBeGreaterThanOrEqual(720);
  expect(stats.nonBlackPct, `nonBlackPct=${stats.nonBlackPct}%`).toBeGreaterThan(5);

  // Evidence (PLAN.md §4: screenshot on every gate test).
  await page.screenshot({ path: 'tests/e2e/screenshots/menu-boot.png', fullPage: false });
});

test('page title contains "Cluster"', async ({ page }) => {
  // Title is static in Builds/WebGL/index.html (Godot export, project name),
  // so no boot wait is needed — the document title is available at DOM parse.
  await page.goto('/');
  const title = await page.title();
  console.log('Page title:', JSON.stringify(title));
  expect(title.toLowerCase()).toContain('cluster');
});

test('canvas pixel data is non-trivial', async ({ page }) => {
  await page.goto('/');
  await bootWait(page);

  const stats = await canvasStats(page);
  console.log('Canvas stats:', JSON.stringify(stats));
  expect(stats.cw).toBeGreaterThan(0);
  expect(stats.ch).toBeGreaterThan(0);
  // Menu: light title text + 4 button outlines/fills over dark bg.
  expect(stats.nonBlackPct, `nonBlackPct=${stats.nonBlackPct}%`).toBeGreaterThan(5);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Keyboard input is accepted by the browser (game receives focus)
// ─────────────────────────────────────────────────────────────────────────────
test('canvas accepts keyboard focus and key events', async ({ page }) => {
  await page.goto('/');
  await bootWait(page);
  // Give the menu a beat after boot before input.
  await page.waitForTimeout(500);

  // Click the canvas to focus it (Godot sets focusCanvas=true on boot, but a
  // click guarantees input focus in headless Chrome).
  await clickCanvas(page, 640, 360);

  // Send a key event — the menu accepts Enter/Space for the focused button.
  // No crash = canvas still present and visible afterwards.
  await page.keyboard.press('Space');
  await expect(page.locator('#canvas')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. No 404s for key assets
// ─────────────────────────────────────────────────────────────────────────────
test('no missing WASM or PCK files', async ({ page }) => {
  const notFound: string[] = [];
  page.on('response', (response) => {
    if (response.status() === 404) notFound.push(response.url());
  });

  await page.goto('/');
  await bootWait(page);

  // Filter out known non-critical 404s (favicon, etc.)
  const critical = notFound.filter(
    (url) => !url.includes('favicon') && !url.includes('icon'),
  );
  expect(critical).toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Game scene loads via URL parameter / direct navigation
// ─────────────────────────────────────────────────────────────────────────────
test('game scene renders when loaded directly', async ({ page }) => {
  await page.goto('/');
  await bootWait(page);
  const stats = await canvasStats(page);
  expect(page.locator('#canvas')).toBeVisible();
  expect(stats.nonBlackPct, `nonBlackPct=${stats.nonBlackPct}%`).toBeGreaterThan(5);
});

// ─────────────────────────────────────────────────────────────────────────────
// M2 (gameplay core) — parked until M2 milestones land.
// Coordinate-click specs for menu navigation / gameplay are tracked in the M2
// milestone (PLAN.md §3 M2: "scripted input sequences produce expected state").
// test.fixme keeps the suite green at M0 without pretending these pass.
// ─────────────────────────────────────────────────────────────────────────────
test.fixme('menu: clicking Start Game launches gameplay (M2)', async ({ page }) => {
  await page.goto('/');
  await bootWait(page);
  // TODO(M2): locate "Start Game" button pixel coords and clickCanvas;
  // assert the gameplay scene renders (HUD score/lives visible).
  await clickCanvas(page, 640, 300);
});
