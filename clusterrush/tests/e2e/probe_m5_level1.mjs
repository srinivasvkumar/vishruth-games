/**
 * M5 probe 2: instrumented level-1 observation.
 * - Boot, click Start Game (640,305)
 * - Log game state / player position / trucks every ~4s for 40s
 * - Screenshot at 5s / 15s / 30s / 40s
 * Console lines from Godot prints are captured for the report.
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
await sleep(800);

await page.mouse.click(640, 305); // Start Game
await sleep(2500);
await page.screenshot({ path: `${SHOTS}/m5-lvl1-05s.png` });

// Periodic sampling of game state via the Godot debug bridge (webgl_bridge exposes nothing by default;
// so we sample canvas pixels + console). Player position logging is added in-game via a temporary
// print in this probe's companion — instead we infer state from console lines.
for (const [tag, ms] of [
  ['15s', 4000],
  ['30s', 5000],
  ['40s', 4000],
]) {
  await sleep(ms);
  await page.screenshot({ path: `${SHOTS}/m5-lvl1-${tag}.png` });
  const state = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const s = document.getElementById('status');
    let nonBlack = 'n/a';
    try {
      const tmp = document.createElement('canvas');
      tmp.width = 320; tmp.height = 180;
      const ctx = tmp.getContext('2d');
      ctx.drawImage(c, 0, 0, 320, 180);
      const d = ctx.getImageData(0, 0, 320, 180).data;
      let nb = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) nb++;
      nonBlack = (nb / (320 * 180) * 100).toFixed(1);
    } catch {}
    return {
      canvasW: c ? c.width : 0,
      status: s ? s.style.visibility : 'removed',
      nonBlackPct: nonBlack,
    };
  });
  console.log(`SAMPLE t=${tag}: ${JSON.stringify(state)}`);
}

console.log('=== CONSOLE (' + lines.length + ' lines, last 160) ===');
for (const l of lines.slice(-160)) console.log(l);
await browser.close();
