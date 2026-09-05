// One-off probe: is WebGL2 available in headless Playwright Firefox, and
// can the Godot engine actually boot? Prints a verdict line:
//   FIREFOXPROBE-VERDICT <BOOTED|NO_WEBGL2|SLOW|CRASHED>
// Usage: npx playwright test _probe_firefox_webgl.spec.ts --project=firefox
import { test } from '@playwright/test';

test('probe firefox webgl2 + godot boot', { timeout: 150_000 }, async ({ page }) => {
  const consoleLines: string[] = [];
  const webglErrors: string[] = [];
  page.on('console', (m) => {
    const t = m.text();
    if (!t.trim()) return;
    consoleLines.push(t.trim());
    if (/webgl|context|swiftshader|llvmpipe/i.test(t)) webglErrors.push(t.trim());
  });
  page.on('pageerror', (e) => consoleLines.push(`[pageerror] ${e.message}`));

  await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded' });

  // 1) WebGL2 availability — ask the page directly.
  const glInfo = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl2 = c.getContext('webgl2');
    let renderer = '';
    if (gl2) {
      const ext = gl2.getExtension('WEBGL_debug_renderer_info');
      renderer = ext
        ? String(gl2.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : '(webgl2 available, no debug ext)';
    }
    return { webgl2: !!gl2, renderer };
  });
  console.log('FIREFOXPROBE glInfo:', JSON.stringify(glInfo));

  // 2) Poll for Godot boot for up to 120s (much longer than bootWait's 45s).
  let booted = false;
  const t0 = Date.now();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const state = await page.evaluate(() => {
      const c = document.getElementById('canvas') as HTMLCanvasElement | null;
      const s = document.getElementById('status');
      return {
        canvasW: c ? c.width : 0,
        canvasH: c ? c.height : 0,
        statusGone: !s || s.style.visibility === 'hidden',
        statusText: s ? (s.textContent || '').trim().slice(0, 120) : '(removed)',
      };
    });
    if (i % 5 === 0) console.log(`FIREFOXPROBE t+${i * 2}s:`, JSON.stringify(state));
    if (state.canvasW >= 1280 && state.statusGone) {
      booted = true;
      console.log(`FIREFOXPROBE BOOTED at t+${i * 2}s`);
      break;
    }
  }

  await page.screenshot({ path: 'screenshots/firefox-probe.png' });

  if (booted) {
    console.log('FIREFOXPROBE-VERDICT BOOTED');
  } else if (!glInfo.webgl2) {
    console.log('FIREFOXPROBE-VERDICT NO_WEBGL2');
  } else {
    // WebGL2 exists but engine never resized the canvas — dump evidence.
    console.log('FIREFOXPROBE-VERDICT SLOW');
    console.log('FIREFOXPROBE console tail:', JSON.stringify(consoleLines.slice(-40)));
  }
});
