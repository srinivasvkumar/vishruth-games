
import { test, expect } from '@playwright/test';

test('debug: dump main menu page', async ({ page }) => {
  await page.goto('http://localhost:8765/');
  await page.waitForSelector('canvas', { state: 'visible', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Get all text content
  const text = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT ===');
  console.log(text);

  // Get all button roles
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, [role="button"]')).map(b => ({
      tag: b.tagName,
      text: b.textContent?.trim(),
      role: b.getAttribute('role'),
      class: b.className
    }));
  });
  console.log('=== BUTTONS ===');
  console.log(JSON.stringify(buttons, null, 2));

  // Get canvas attributes
  const canvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { width: c.width, height: c.height, style: c.style.display } : null;
  });
  console.log('=== CANVAS ===');
  console.log(JSON.stringify(canvas, null, 2));

  // Dump first 2000 chars of innerHTML
  const html = await page.evaluate(() => document.documentElement.outerHTML.substring(0, 3000));
  console.log('=== HTML (first 3000 chars) ===');
  console.log(html);
});
