// Hard evidence probe: WebGL2 availability in Playwright Firefox.
// Writes tests/e2e/test-results/firefox_webgl_evidence.json
// Usage: node _check_firefox_webgl.cjs
const { firefox } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const evidence = {
    browser_version: null,
    webgl: null,
    webgl2: null,
    webgl2_renderer: null,
    webgl2_context_lost: null,
    sandbox: null,
    timestamp: new Date().toISOString(),
  };
  let browser;
  try {
    browser = await firefox.launch({ headless: true });
    const page = await browser.newPage();
    evidence.browser_version = await browser.version();
    await page.goto('about:blank');
    const r = await page.evaluate(() => {
      const c1 = document.createElement('canvas');
      const c2 = document.createElement('canvas');
      const gl1 = c1.getContext('webgl');
      const gl2 = c2.getContext('webgl2');
      let r2 = null;
      if (gl2) {
        const ext = gl2.getExtension('WEBGL_debug_renderer_info');
        r2 = ext ? String(gl2.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '(no debug ext)';
        r2 += ' | context lost: ' + gl2.isContextLost();
      }
      let r1 = null;
      if (gl1) {
        const ext = gl1.getExtension('WEBGL_debug_renderer_info');
        r1 = ext ? String(gl1.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '(no debug ext)';
      }
      return { webgl: !!gl1, webgl1: r1, webgl2: !!gl2, webgl2_renderer: r2 };
    });
    Object.assign(evidence, r);
  } catch (e) {
    evidence.error = String(e).split('\n').slice(0, 15).join('\n');
  } finally {
    if (browser) await browser.close();
  }
  const out = path.join(__dirname, 'test-results', 'firefox_webgl_evidence.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
})();
