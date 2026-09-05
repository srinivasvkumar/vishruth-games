// Deep probe: capture Firefox console + about:support GL info to explain WHY
// WebGL is unavailable. Writes firefox_webgl_diag.json
const { firefox } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const consoleMsgs = [];
  const out = {};
  let browser;
  try {
    browser = await firefox.launch({
      headless: true,
      // Try to surface GL init messages.
    });
    const page = await browser.newPage({
      // @ts-ignore
    });
    page.on('console', (m) => consoleMsgs.push(`${m.type()}: ${m.text()}`));
    await page.goto('about:blank');

    out.webgl2 = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      return !!gl;
    });

    // about:support GL details — parse the Features/WEBGL section.
    await page.goto('about:support');
    const body = await page.evaluate(() => document.body.innerText);
    // Grab lines mentioning WebGL / GL / ANGLE / llvmpipe / SwiftShader / WebRender / GPU
    const lines = body.split('\n').filter((l) =>
      /webgl|webrender|angle|llvmpipe|swiftshader|opengl|gpu|glsl|webgl2/i.test(l),
    );
    out.support_gl_lines = lines.slice(0, 80);

    // Also try reading WebGL debug renderer via a data: page.
    out.debug_renderer = await page.evaluate(() => {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return 'no-context';
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '(no debug ext)';
      } catch (e) {
        return 'err: ' + e.message;
      }
    });
  } catch (e) {
    out.error = String(e).split('\n').slice(0, 12).join('\n');
  } finally {
    if (browser) await browser.close();
  }
  out.console_msgs = consoleMsgs.slice(0, 60);
  out.timestamp = new Date().toISOString();
  const p = path.join(__dirname, 'test-results', 'firefox_webgl_diag.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(out, null, 2));
  console.log('webgl2:', out.webgl2);
  console.log('debug_renderer:', out.debug_renderer);
  console.log('--- GL lines ---');
  console.log((out.support_gl_lines || []).join('\n'));
  console.log('--- console (filtered gl) ---');
  console.log((out.console_msgs || []).filter((m) => /webgl|gl|angle|swiftshader|llvmpipe/i.test(m)).join('\n'));
  console.log('written:', p);
})();
