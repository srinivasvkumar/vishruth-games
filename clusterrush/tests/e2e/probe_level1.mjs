/**
 * Probe: empirically observe Level 1 behavior for ~40 s.
 * - Click main-menu Start Game (centered layout: x=640, y≈290)
 * - Collect Godot console output (print() surfaces via browser console in release builds)
 * - Screenshot at t=2s, t=10s, t=20s, t=35s
 * - Report console lines + screenshots. No assertions — observation only.
 */
import { chromium } from '@playwright/test';

const SHOTS = 'tests/e2e/screenshots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--no-sandbox',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const lines = [];
page.on('console', (msg) => {
  const t = msg.text();
  if (t.trim()) lines.push(`[${msg.type()}] ${t}`);
});
page.on('pageerror', (e) => lines.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:8765/');
// Boot: status overlay removed + canvas sized
await page.waitForFunction(
  () => {
    const c = document.getElementById('canvas');
    const s = document.getElementById('status');
    return !!c && c.width >= 1280 && (!s || s.style.visibility === 'hidden');
  },
  { timeout: 60_000, polling: 300 },
);
await sleep(1500);
await page.screenshot({ path: `${SHOTS}/probe-00-menu.png` });

// Focus canvas then click Start Game (centered VBox: title 80 + sep 20 -> button1 y≈260..320)
await page.mouse.click(640, 360);
await sleep(300);
await page.mouse.click(640, 290);
await sleep(2500);
await page.screenshot({ path: `${SHOTS}/probe-02-inlevel.png` });

for (const [tag, wait] of [
  ['10s', 8000],
  ['20s', 10000],
  ['35s', 15000],
]) {
  await sleep(wait);
  await page.screenshot({ path: `${SHOTS}/probe-${tag.replace('s', '')}.png` });
}

// Also probe the "Hazard collision" / death prints — print them all.
console.log('=== CONSOLE LINES (' + lines.length + ') ===');
for (const l of lines.slice(0, 120)) console.log(l);
await browser.close();
