// Probe: can Firefox software WebGL be enabled via user.js prefs?
// Tries several pref combinations; writes firefox_webgl_prefs_evidence.json
const { firefox } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PREFS = [
  { name: 'no_prefs_baseline', prefs: {} },
  { name: 'gfx.webgl.software=true', prefs: { 'gfx.webgl.software': true } },
  {
    name: 'webrender_software',
    prefs: {
      'gfx.webrender.enabled': true,
      'gfx.webrender.software': true,
      'gfx.webrender.all': true,
      'gfx.webrender.backend': 'software',
    },
  },
  {
    name: 'all_software_stack',
    prefs: {
      'gfx.webrender.enabled': true,
      'gfx.webrender.software': true,
      'gfx.webrender.all': true,
      'gfx.webrender.backend': 'software',
      'gfx.webgl.enabled': true,
      'gfx.webgl.software': true,
      'layers.acceleration.disabled': true,
      'webgl.disabled': false,
    },
  },
];

(async () => {
  const out = [];
  for (const p of PREFS) {
    const entry = { config: p.name, prefs: p.prefs, result: null, error: null };
    let ctx;
    try {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ffprefs-'));
      const userJs = Object.entries(p.prefs)
        .map(([k, v]) => `user_pref("${k}", ${JSON.stringify(v)});`)
        .join('\n');
      fs.writeFileSync(path.join(dir, 'user.js'), userJs);
      ctx = await firefox.launchPersistentContext(dir, { headless: true });
      const page = await ctx.newPage();
      await page.goto('about:blank');
      entry.result = await page.evaluate(() => {
        const gl1 = document.createElement('canvas').getContext('webgl');
        const gl2 = document.createElement('canvas').getContext('webgl2');
        let renderer = null;
        if (gl2) {
          const ext = gl2.getExtension('WEBGL_debug_renderer_info');
          renderer = ext
            ? String(gl2.getParameter(ext.UNMASKED_RENDERER_WEBGL))
            : '(available, no debug ext)';
        }
        return { webgl1: !!gl1, webgl2: !!gl2, webgl2_renderer: renderer };
      });
    } catch (e) {
      entry.error = String(e).split('\n').slice(0, 8).join(' | ');
    } finally {
      if (ctx) await ctx.close();
    }
    out.push(entry);
    console.log(p.name, '=>', JSON.stringify(entry.result), entry.error ? `ERR ${entry.error}` : '');
  }
  const outPath = path.join(__dirname, 'test-results', 'firefox_webgl_prefs_evidence.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), probes: out }, null, 2));
  console.log('written:', outPath);
})();
