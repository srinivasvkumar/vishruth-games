
import { test, expect } from '@playwright/test';

test('canvas: detailed init diagnostics', async ({ page, browserName }) => {
  // Capture all console messages
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error') || text.includes('ERROR') || text.includes('warn') || text.includes('Warn')) {
      consoleErrors.push(`${msg.type()}: ${text}`);
    }
    consoleLogs.push(`${msg.type()}: ${text}`);
  });

  await page.goto('http://localhost:8765/');

  // Wait up to 15 seconds for status overlay to hide
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const vis = await page.evaluate(() => {
      const el = document.getElementById('status');
      return el ? el.style.visibility : 'none';
    });
    if (vis === 'hidden') break;
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(2000);

  // Check canvas
  const canvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.width, h: c.height, dpr: c.width / c.clientWidth || 1 } : null;
  });
  console.log('Canvas:', JSON.stringify(canvas));

  // Status overlay state
  const status = await page.evaluate(() => {
    const el = document.getElementById('status');
    return {
      visible: el ? el.style.visibility : 'no-element',
      progress: el ? el.querySelector('#status-progress')?.getAttribute('value') : 'no-progress',
      maxProgress: el ? el.querySelector('#status-progress')?.getAttribute('max') : 'no-max'
    };
  });
  console.log('Status:', JSON.stringify(status));

  // Console output
  console.log('Total log entries:', consoleLogs.length);
  console.log('Errors:', consoleErrors.length);
  
  // Print first 20 log entries
  for (const line of consoleLogs.slice(0, 30)) {
    console.log(line);
  }
  
  // Print all errors
  for (const err of consoleErrors) {
    console.log('ERROR:', err);
  }

  // Check for WebGL
  const hasWebGL = await page.evaluate(() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
  });
  console.log('Has WebGL in browser:', hasWebGL);

  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/screenshots/diagnostic.png' });
  console.log('Screenshot saved');
});
