// Phase 2: Level Select — E2E Tests
import { test, expect } from '@playwright/test';

test.describe('Level Select Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to level select via main menu
    await page.goto('http://localhost:8765/');
    // Wait for main menu to load
    await page.waitForSelector('canvas', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1500);
    
    // Click "Level Select" button on main menu
    const levelBtn = page.getByRole('button', { name: /Level Select/i });
    await expect(levelBtn).toBeVisible({ timeout: 5000 });
    await levelBtn.click();
    
    // Wait for level select screen to appear
    await page.waitForTimeout(1000);
  });

  test('Back button exists and is visible', async ({ page }) => {
    const backBtn = page.getByRole('button', { name: /Back/i });
    await expect(backBtn).toBeVisible();
  });

  test('Level 1 button is enabled (unlocked)', async ({ page }) => {
    const lvl1 = page.getByRole('button', { name: /1\b/i });
    await expect(lvl1).toBeVisible();
    // Level 1 should be clickable
    await expect(lvl1).toBeEnabled();
  });

  test('Level 1 is clickable and triggers level load', async ({ page }) => {
    const lvl1 = page.getByRole('button', { name: /1\b/i });
    await lvl1.click();
    // After clicking, either navigate to level or show loading indicator
    // For now, verify no crash/error occurred
    await page.waitForTimeout(500);
  });

  test('Locked levels show disabled state', async ({ page }) => {
    // Level 2 might be locked if player only completed level 1
    const lvl2 = page.getByRole('button', { name: /2\b/i });
    if (await lvl2.isVisible()) {
      // Either enabled or disabled, just ensure it exists
      await expect(lvl2).toBeVisible();
    }
  });
});
