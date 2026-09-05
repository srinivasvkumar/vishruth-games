// M5 E2E diagnostics: boot + console capture
import { chromium, firefox } from '@playwright/test';
import fs from 'fs';

const URL = 'http://localhost:8765';

function report(name, lines, shots) {
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(`test-results/m5_diag_${name}.json`, JSON.stringify({ lines, shots }, null, 2));
  console.log(`\n===== ${name} ===== (${lines.length} console lines, ${shots.length} shots)`);
  // print interesting lines only
  const interesting = lines.filter((l) =>
    /ERROR|error|SCRIPT|fail|FAIL|WebGL|webgl|canvas|M5DBG|Godot|abort|warn|WARN/i.test(l)
  );
  interesting.slice(0, 60).forEach((l) => console.log(l));
  if (interesting.length > 60) console.log(`... ${interesting.length - 60} more`);
}

async function run(browserType, name, swiftshaderArgs) {
  const browser = await browserType.launch({
    headless: true,
    args: swiftshaderArgs ? [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      ...swiftshaderArgs,
    ] : ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const lines = [];
  const shots = [];
  page.on('console', (m) => {
    const t = m.text().trim();
    if (!t) return;
    lines.push(`[${m.type()}] ${t}`);
  });
  page.on('pageerror', (e) => lines.push(`[pageerror] ${e.message}`));
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // wait up to 90s for canvas + engine
    let booted = false;
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      const ok = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        if (!c) return false;
        return c.width > 0 && c.height > 0;
      }).catch(() => false);
      if (ok) { booted = true; break; }
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (booted) {
      await new Promise((r) => setTimeout(r, 2000));
      const p1 = `tests/e2e/screenshots/diag_${name}_menu.png`;
      await page.screenshot({ path: p1 });
      shots.push(p1);
      console.log(`${name}: booted OK — canvas present`);
      // capture WebGL status
      const glInfo = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        if (!c) return 'no canvas';
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return 'no webgl context (already held by engine?)';
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return 'renderer=' + (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown');
      }).catch((e) => 'gl err ' + e.message);
      console.log(`${name}: ${glInfo}`);
    } else {
      console.log(`${name}: BOOT FAIL — no usable canvas after 90s`);
      try {
        const p1 = `tests/e2e/screenshots/diag_${name}_fail.png`;
        await page.screenshot({ path: p1, fullPage: true });
        shots.push(p1);
      } catch {}
    }
  } catch (e) {
    lines.push(`[diag] goto/loop err: ${e.message}`);
  }
  await browser.close();
  report(name, lines, shots);
}

const which = process.argv[2] || 'chromium';
if (which === 'chromium') {
  await run(chromium, 'chromium', null);
} else if (which === 'chromium-noargs') {
  await run(chromium, 'chromium_noargs', null);
} else if (which === 'firefox') {
  await run(firefox, 'firefox', []);
} else {
  console.error('usage: node m5_diag.mjs [chromium|firefox|chromium-noargs]');
  process.exit(2);
}
