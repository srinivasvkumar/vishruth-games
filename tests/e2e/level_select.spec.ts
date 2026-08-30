// Phase 2: Level Select — E2E Tests
//
// PARKED for M2 — see PLAN.md §3 (M2: gameplay core verified) and §4 (E2E
// Standard: canvas pixel-coordinate input, no DOM role selectors).
//
// This suite clicks the "Level Select" menu button and inspects level buttons
// via DOM roles (getByRole('button')). Godot WebGL has NO DOM buttons — every
// control is rendered as canvas pixels — so these specs cannot pass until M2
// rewrites them on top of tests/e2e/helpers/canvas.ts (clickCanvas + pixel
// state asserts). The level select screen itself is also M1 content (35 levels
// that actually load), which does not exist yet.
//
// test.fixme keeps the M0 gate green while recording exactly what M2 must do.

import { test, expect } from '@playwright/test';

test.describe('Level Select Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to level select via main menu
    await page.goto('http://localhost:8765/');
    // Wait for main menu to load
    await page.waitForSelector('canvas', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1500);

    // M2: replace with clickCanvas(page, x, y) for the "Level Select" button
    // pixel coords, then assert on canvas pixel state (nonBlackPct / region
    // sampling) instead of DOM buttons.
    const levelBtn = page.getByRole('button', { name: /Level Select/i });
    await expect(levelBtn).toBeVisible({ timeout: 5000 });
    await levelBtn.click();

    // Wait for level select screen to appear
    await page.waitForTimeout(1000);
  });

  test.fixme('Back button exists and is visible', async ({ page }) => {
    // M2: pixel-assert the back-button region on the level select canvas.
    const backBtn = page.getByRole('button', { name: /Back/i });
    await expect(backBtn).toBeVisible();
  });

  test.fixme('Level 1 button is enabled (unlocked)', async ({ page }) => {
    // M2: pixel-assert level 1 cell in the grid (unlocked color/brightness).
    const lvl1 = page.getByRole('button', { name: /1\b/i });
    await expect(lvl1).toBeVisible();
    // Level 1 should be clickable
    await expect(lvl1).toBeEnabled();
  });

  test.fixme('Level 1 is clickable and triggers level load', async ({ page }) => {
    // M2: clickCanvas at level-1 cell coords; assert gameplay scene pixels.
    const lvl1 = page.getByRole('button', { name: /1\b/i });
    await lvl1.click();
    // After clicking, either navigate to level or show loading indicator
    // For now, verify no crash/error occurred
    await page.waitForTimeout(500);
  });

  test.fixme('Locked levels show disabled state', async ({ page }) => {
    // M2: pixel-assert locked-cell styling (dimmed/grayed) in the grid.
    // Level 2 might be locked if player only completed level 1
    const lvl2 = page.getByRole('button', { name: /2\b/i });
    if (await lvl2.isVisible()) {
      // Either enabled or disabled, just ensure it exists
      await expect(lvl2).toBeVisible();
    }
  });
});
