/**
 * M5 CRITICAL PROBE — verify player world-space trajectory on level 1.
 * Hypothesis under test: player auto-runs along +Z (perpendicular to the
 * +X direction of play / finish line at x=140), so they run off the
 * 20-unit-deep +Z edge of the ground and fall to death within ~2s.
 *
 * We read the [M5DBG] lines the game already prints every 2s:
 *   [M5DBG] t=<s> state=<state> lives=<n> p=(x,y,z) finish_x=140
 * and reconstruct the player's x/y/z over time. Also capture death /
 * game-over / complete events from the console.
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.clearCookies();
// Wipe any prior save (IndexedDB) so we start fresh on level 1.
await ctx.clearPermissions();
const page = await ctx.newPage();

const dbg = [];      // [M5DBG] trajectory lines
const events = [];   // death / complete / gameover / other godot prints
const errors = [];
page.on('console', (msg) => {
  const t = msg.text().trim();
  if (!t) return;
  if (t.startsWith('[M5DBG]')) dbg.push(t);
  else if (/died|death|game over|gameover|complete|completed|lives|respawn|GameOver|LevelComplete/i.test(t)) events.push(t);
  else if (/error|error|Error/i.test(t)) errors.push(t);
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  // Clear IndexedDB + local storage for a fresh save
  window.indexedDB?.deleteDatabases?.();
  try { localStorage.clear(); } catch {}
});
await page.waitForFunction(
  () => {
    const c = document.getElementById('canvas');
    const s = document.getElementById('status');
    return !!c && c.width >= 1280 && (!s || s.style.visibility === 'hidden');
  },
  { timeout: 90_000, polling: 300 },
);
await sleep(800);
await page.screenshot({ path: `${SHOTS}/m5-final-menu.png` });
console.log('BOOT OK — menu up. Clicking Start Game (640,305)...');

await page.mouse.click(640, 305);
await sleep(1200);
await page.screenshot({ path: `${SHOTS}/m5-final-1s.png` });

// Sample the trajectory: wait in 3s chunks up to ~24s, screenshot at 5/10/15s.
const t0 = Date.now();
let snap = [5, 10, 15];
while (Date.now() - t0 < 24000) {
  await sleep(3000);
  const el = Math.round((Date.now() - t0) / 1000);
  if (snap.includes(el)) {
    await page.screenshot({ path: `${SHOTS}/m5-final-${el}s.png` });
    console.log(`screenshot at ~${el}s`);
  }
  snap = snap.filter((n) => n !== el);
  // stop early if game over / complete overlay detected
  const ov = await page.evaluate(() => {
    const gc = document.getElementById('canvas');
    // Heuristic: read any overlay via pixel sample of center for a big panel — not reliable.
    return true;
  });
  if (!ov) break;
}
await sleep(500);
await page.screenshot({ path: `${SHOTS}/m5-final-end.png` });

console.log('\n=== [M5DBG] PLAYER TRAJECTORY ===');
for (const l of dbg) console.log(l);
console.log('\n=== GAME EVENTS ===');
for (const l of events.slice(0, 40)) console.log(l);
console.log('\n=== ERRORS (' + errors.length + ') ===');
for (const l of errors.slice(0, 20)) console.log(l);

await browser.close();
