import { chromium } from '@playwright/test';
const URL = 'http://localhost:8765';
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-setuid-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const t0 = Date.now();
await pg.goto(URL, { waitUntil: 'load' });
try {
  await pg.waitForFunction(() => { const c = document.getElementById('canvas'); return !!(c && c.width >= 1280 && c.height >= 720); }, { timeout: 45000 });
  console.log('BOOTED ms=' + (Date.now() - t0));
  await pg.screenshot({ path: 'tests/e2e/screenshots/m5-boot-fresh.png' });
} catch (e) {
  const s = await pg.evaluate(() => { const c = document.getElementById('canvas'); return c ? ({ w: c.width, h: c.height }) : 'no-canvas'; });
  console.log('BOOT-FAIL ms=' + (Date.now() - t0) + ' canvas=' + JSON.stringify(s));
  await pg.screenshot({ path: 'tests/e2e/screenshots/m5-boot-fresh-fail.png' });
}
await b.close();
