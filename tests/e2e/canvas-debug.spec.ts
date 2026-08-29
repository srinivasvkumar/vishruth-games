
import { test, expect } from '@playwright/test';

test.describe('Canvas Game Debug', () => {
  test('game canvas loads and renders', async ({ page }) => {
    await page.goto('http://localhost:8765/');
    
    // Wait for the canvas to appear and the splash to disappear
    await page.waitForFunction(() => {
      const overlay = document.getElementById('status');
      return overlay && overlay.style.visibility === 'hidden';
    }, { timeout: 30000 });
    
    await page.waitForTimeout(2000);

    // Check canvas size
    const canvasSize = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return { width: c.width, height: c.height };
    });
    console.log('Canvas size:', JSON.stringify(canvasSize));
    expect(canvasSize.width).toBeGreaterThan(100);
    expect(canvasSize.height).toBeGreaterThan(50);

    // Take screenshot to verify game rendered
    await page.screenshot({ path: 'tests/e2e/screenshots/game-loaded.png', fullPage: false });
    console.log('Screenshot saved');

    // Check for any console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`${msg.type()}: ${msg.text()}`);
    });

    // Get canvas data URL (check if it's rendered)
    const dataUrl = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (c) return c.toDataURL();
      return null;
    });
    expect(dataUrl).toBeTruthy();
    expect(dataUrl.length).toBeGreaterThan(100);
    
    // If any JS errors, log them
    if (errors.length > 0) {
      console.log('JS Errors found:', errors);
    }
  });

  test('check game title', async ({ page }) => {
    await page.goto('http://localhost:8765/');
    const title = await page.title();
    console.log('Page title:', title);
    expect(title).toBe('ClusterRush');
  });
});
