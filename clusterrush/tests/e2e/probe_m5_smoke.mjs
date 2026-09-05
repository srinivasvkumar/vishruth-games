/**
 * M5 smoke probe: boot → Start Game → hold jump → 40s → dump M5DBG/events.
 * Run: node probe_m5_smoke.mjs  (from tests/e2e/, server on :8765)
 */
import { chromium } from '@playwright/test';
import fs from 'fs';

const SHOTS = 'screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

const dbg = [], events = [], errors = [];
page.on('console', (msg) => {
  const t = msg.text().trim();
  if (!t) return;
  if (t.startsWith('[M5DBG]')) {
    if (/UNLOCK|EVENT/.test(t)) events.push(t);
    else dbg.push(t);
  } else if (/\[error\]|SCRIPT ERROR|PAGEERROR/i.test(t)) errors.push(t);
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { window.indexedDB?.deleteDatabases?.(); try { localStorage.clear(); } catch {} });
await page.waitForFunction(
  () => {
    const c = document.getElementById('canvas');
    const s = document.getElementById('status');
    return !!c && c.width >= 1280 && (!s || s.style.visibility === 'hidden');
  },
  { timeout: 90_000, polling: 300 },
);
await sleep(1000);
await page.screenshot({ path: `${SHOTS}/m5smoke-menu.png` });
console.log('BOOT OK — menu up');

await page.mouse.click(640, 306); // Start Game
await sleep(1200);
await page.screenshot({ path: `${SHOTS}/m5smoke-start1s.png` });

// Scripted input: periodic jumps every 1.4s, no strafe (auto-run is +X).
const t0 = Date.now();
let nextJump = Date.now() + 800;
let shotTimes = [5, 10, 15, 20, 25, 30, 35, 40];
while (Date.now() - t0 < 42_000) {
  if (Date.now() >= nextJump) {
    await page.keyboard.press(' ');
    nextJump = Date.now() + 1400;
  }
  const el = Math.round((Date.now() - t0) / 1000);
  if (shotTimes.includes(el)) {
    await page.screenshot({ path: `${SHOTS}/m5smoke-${el}s.png` });
    shotTimes = shotTimes.filter((n) => n !== el);
  }
  const done = events.some((e) => /UNLOCK|complete_triggered/.test(e));
  if (done) break;
  await sleep(300);
}
await sleep(800);
await page.screenshot({ path: `${SHOTS}/m5smoke-end.png` });

console.log('\n=== M5DBG trajectory ===');
for (const l of dbg) console.log(l);
console.log('\n=== events ===');
for (const l of events) console.log(l);
console.log('\n=== errors (' + errors.length + ') ===');
for (const l of errors.slice(0, 30)) console.log(l);

fs.writeFileSync('test-results/m5smoke.json', JSON.stringify({ dbg, events, errors }, null, 2));
console.log('\nDONE');
await browser.close();
