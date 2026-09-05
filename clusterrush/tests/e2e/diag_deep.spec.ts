// M5 E2E deep diagnostic: use Playwright's full config, capture every console line
import { test } from '@playwright/test';

test('diag', { timeout: 180_000 }, async ({ page }) => {
  const lines = [];
  page.on('console', (m) => lines.push(`[${m.type()}] ${m.text().trim()}`));
  page.on('pageerror', (e) => lines.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => lines.push(`[reqfail] ${r.url()} :: ${r.failure()?.errorText}`));

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // Track page reachability + canvas status every 3s
  const t0 = Date.now();
  let booted = false;
  while (Date.now() - t0 < 120_000) {
    let state = null, err = null;
    try {
      state = await page.evaluate(() => {
        const c = document.getElementById('canvas');
        const s = document.getElementById('status');
        return {
          c: c ? { w: c.width, h: c.height } : null,
          s: s ? { inDOM: true, vis: s.style.visibility } : 'removed',
          docState: document.readyState,
          url: location.href,
        };
      });
    } catch (e) {
      err = e.message.slice(0, 200);
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    lines.push(`[poll ${elapsed}s] ${err ? 'ERR ' + err : JSON.stringify(state)}`);
    if (!err && state?.c && state.c.w >= 1280 && state.s === 'removed') {
      booted = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  try { await page.screenshot({ path: 'tests/e2e/screenshots/diag_deep.png' }); } catch {}
  const fs = await import('fs');
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/m5_diag_deep.json', JSON.stringify({ booted, lines }, null, 2));
  console.log('booted =', booted);
  console.log('total lines:', lines.length);
  console.log('\n--- last 40 lines ---');
  lines.slice(-40).forEach((l) => console.log(l));
});
