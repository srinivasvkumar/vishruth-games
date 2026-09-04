// M5 E2E timing probe: how long to reach canvas>=1280 + status removed, exact runner flags
import { chromium, devices } from '@playwright/test';

const URL = 'http://localhost:8765';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});
const ctx = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const lines = [];
page.on('console', (m) => { const t=m.text().trim(); if (t) lines.push(`[${m.type()}] ${t}`); });
page.on('pageerror', (e) => lines.push(`[pageerror] ${e.message}`));

const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log(`goto returned at +${((Date.now()-t0)/1000).toFixed(1)}s`);

let reached = -1;
const deadline = Date.now() + 150000;
let lastLog = 0;
while (Date.now() < deadline) {
  let st = null, err = null;
  try {
    st = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      const s = document.getElementById('status');
      return { w: c?.width ?? null, h: c?.height ?? null, status: s ? (s.style.visibility==='hidden'?'hidden':'present') : 'removed', ready: document.readyState };
    });
  } catch (e) { err = e.message.slice(0,120); }
  const e2 = ((Date.now()-t0)/1000);
  if (e2 - lastLog >= 5 || err) {
    console.log(`+${e2.toFixed(0)}s ${err ? 'ERR '+err : JSON.stringify(st)}`);
    lastLog = e2;
  }
  if (!err && st?.w >= 1280 && st.status === 'removed') { reached = e2; break; }
  await new Promise((r) => setTimeout(r, 1000));
}
console.log(`\nBOOT REACHED (canvas>=1280 + status removed): ${reached >= 0 ? reached.toFixed(1)+'s' : 'NEVER within 150s'}`);

// capture final
try {
  const gl = await page.evaluate(() => {
    const c = document.getElementById('canvas'); if (!c) return 'no canvas';
    const g = c.getContext('webgl2');
    return g ? 'webgl2 ok' : 'no webgl2 on main canvas (engine holds it)';
  });
  console.log('gl:', gl);
  await page.screenshot({ path: 'tests/e2e/screenshots/diag_timed.png' });
} catch (e) { console.log('final err', e.message.slice(0,120)); }

console.log('\n--- console (interesting, last 30) ---');
lines.filter(l=>/ERROR|SCRIPT|webgl|WebGL|canvas|abort|GL|angle|swiftshader|M5DBG/i.test(l)).slice(-30).forEach(l=>console.log(l));
console.log(`\ntotal console lines: ${lines.length}`);
const fs = await import('fs');
fs.writeFileSync('test-results/m5_diag_timed.json', JSON.stringify({ reached, lines }, null, 2));
await browser.close();
