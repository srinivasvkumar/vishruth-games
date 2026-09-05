/**
 * M5 probe: verify Start Game click enters gameplay; monitor player Z runaway.
 * - Boot, screenshot menu
 * - Click Start Game at (640, 305)
 * - Screenshot at +1s, +3s, +6s
 * - Dump console lines (Godot prints surface in browser console)
 */
import { chromium } from '@playwright/test';

const SHOTS = 'screenshots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const lines = [];
page.on('console', (msg) => {
  const t = msg.text().trim();
  if (t) lines.push(`[${msg.type()}] ${t}`);
});
page.on('pageerror', (e) => lines.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => {
    const c = document.getElementById('canvas');
    const s = document.getElementById('status');
    return !!c && c.width >= 1280 && (!s || s.style.visibility === 'hidden');
  },
  { timeout: 90_000, polling: 300 },
);
await sleep(1000);
await page.screenshot({ path: `${SHOTS}/m5-00-menu.png` });
console.log('BOOT OK — menu captured');

// Focus + click Start Game
await page.mouse.click(640, 305);
await sleep(1000);
await page.screenshot({ path: `${SHOTS}/m5-01-start1s.png` });
await sleep(2000);
await page.screenshot({ path: `${SHOTS}/m5-02-start3s.png` });
await sleep(3000);
await page.screenshot({ path: `${SHOTS}/m5-03-start6s.png` });

console.log('=== CONSOLE (' + lines.length + ' lines) ===');
for (const l of lines.slice(0, 200)) console.log(l);
await browser.close();
