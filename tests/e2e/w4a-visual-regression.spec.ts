import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W4-A.3 — Visual-regression refinement: re-capture baselines + verify
 * stability + flake policy.
 *
 * Kanban t_d0336dbf. Supersedes the W3-B.6-v2 baselines
 * (tests/e2e/w3b/w3b-visual-baseline.spec.ts) as the W4-A.3 gate
 * artefact. The W3-B.6-v2 spec is left in place (still the historical
 * record for W3-B); this spec is the W4-A.3 artefact with two new
 * determinism levers on top of the W3-B.6-v2 world-freeze:
 *
 *   NEW LEVER 1 — pre-boot Math.random seed.
 *     The W3-B.6-v2 GameScene baseline flaked on SPAWN LAYOUT: the 3
 *     initial obstacles are spawned in GameScene.onLoad() via unseeded
 *     Math.random() (type + x-position each), which runs during the
 *     menu → Enter transition, i.e. BEFORE any rAF tick. The W3-B.6-v2
 *     world-freeze (rAF monkeypatch) only freezes FRAMING, not the
 *     already-spawned obstacles. This spec seeds Math.random in the page
 *     context BEFORE page.goto() (Playwright addInitScript runs on every
 *     frame/iframe before the page's own scripts execute, so the app
 *     code — which reads Math.random() during boot — sees the seeded
 *     PRNG, not the unseeded one). With a fixed seed (0x9e3779b9) and a
 *     deterministic mulberry32 sequence, the 3 initial obstacles' types
 *     AND x-positions are bit-for-bit reproducible run-to-run.
 *
 *   NEW LEVER 2 — pre-screenshot renderer.clear().
 *     The renderer is created with preserveDrawingBuffer:true
 *     (src/core/Renderer.ts), so the last-rendered WebGL frame is the
 *     screenshot content. Any sub-pixel / clear-color non-determinism
 *     between boots (e.g. SwiftShader vs GPU, or a partial first-frame
 *     clear) is stripped by calling
 *     window.game.getRenderer().getRenderer().clear() immediately before
 *     the screenshot, forcing a clean clear-color fill that the next
 *     render pass (frozen) then draws over deterministically.
 *
 * Scenes baselined (same 3 scenes as W3-B.6-v2):
 *   S1 MenuScene    — static DOM overlay → pixel-stable.
 *   S2 GameScene    — animated WebGL. Now DETERMINISTIC via seeded RNG
 *                     + world-freeze + pre-screenshot clear. Flake risk
 *                     reduced from "spawn layout varies" to "0 known
 *                     variance sources" (documented in flake policy).
 *   S3 GameOverScene — static DOM overlay → pixel-stable. Driven via the
 *                     `player:death` window event (the path
 *                     GameScene.setupEventListeners() subscribes to).
 *                     localStorage wiped pre-boot so the score text is
 *                     deterministically "0".
 *
 * Baseline location: Playwright's toHaveScreenshot snapshot dir is
 *   tests/e2e/w4a-visual-regression.spec.ts-snapshots/
 * with per-project + OS suffix: <name>-<project>-<os>.png
 *   e.g. w4a3-menu-scene-chromium-boot-linux.png
 *        w4a3-menu-scene-firefox-linux.png
 * Each baseline is additionally mirrored to tests/evidence/w4/ for the
 * evidence trail:
 *   tests/evidence/w4/w4a3-{menu,game,gameover}-scene-{chrome,firefox}.png
 *
 * Stability model (TDD RED → GREEN → VERIFY, per card rules):
 *   Run 1 (RED/capture): no baselines exist yet → Playwright fails each
 *   toHaveScreenshot with "snapshot doesn't exist, writing actual" and
 *   writes the baseline. 3 expected failures (the documented RED state).
 *   Run 2 (GREEN/verify): all three toHaveScreenshot assertions must
 *   PASS against the run-1 baselines → per-scene stability verdict.
 *   Run 2 is the stability proof: pixel-identical across 2 consecutive
 *   captures, both browsers.
 *
 * Spec lives under tests/e2e/ (the default testDir when the BROWSER env
 * var is NOT set — see the W4-A.2 caveat: playwright.config.ts swaps
 * testDir to ./tests/e2e/smoke when BROWSER is set, which would HIDE
 * this spec). Chrome-only for the dedicated `w3b`-style posture is NOT
 * used here; instead we run the spec under the two existing projects
 * (chromium-boot and firefox) which both inherit testDir ./tests/e2e.
 *
 * Headed, per project config (chromium-boot: SwiftShader WebGL args;
 * firefox: GPU, no extra args).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w4');
const APP_URL = 'http://localhost:5173/public/index.html';

// The window event name GameScene.setupEventListeners() subscribes to
// for game-over. Kept literal (no build-time coupling to src/).
const PLAYER_DEATH_EVENT = 'player:death';

// ── Determinism: seeded PRNG (mulberry32) ───────────────────────────────────
// Injected into the page context BEFORE page.goto() via addInitScript, so
// the app's own Math.random() reads (during BootScene → MenuScene →
// GameScene.onLoad() → spawnObstacles(3)) come from THIS deterministic
// sequence, not the unseeded one. The seed is a fixed constant; the
// mulberry32 generator is a 32-bit LCG-style PRNG with the right
// statistical properties for our purpose (deterministic, reproducible,
// no state leakage between pages because addInitScript re-injects on
// every frame load).
const SEED = 0x9e3779b9;

function seededRandomScript(): string {
  return `(() => {
    let s = ${SEED} >>> 0;
    function mulberry32() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    window.__w4a3SeededRng = mulberry32;
    window.Math.random = mulberry32;
  })()`;
}

// ── Console capture (same posture as W3-B.6-v2 / W4-A.2) ────────────────────

interface ConsoleEntry {
  type: string;
  text: string;
}

function captureConsole(page: Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on('console', (msg) => entries.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => entries.push({ type: 'pageerror', text: String(err) }));
  page.on('requestfailed', (req) =>
    entries.push({
      type: 'requestfailed',
      text: `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'failed'}`,
    })
  );
  return entries;
}

/**
 * Fatal-error filter (same posture as W3-B.6-v2). AudioContext autoplay
 * warning is NON-FATAL + expected; the boot-manifest fetch 404 is by-design
 * until asset manifests land.
 */
function filterFatalErrors(entries: ConsoleEntry[]): ConsoleEntry[] {
  return entries.filter((e) => {
    if (e.type === 'pageerror') return true;
    if (e.type === 'requestfailed') {
      return !e.text.includes('manifest');
    }
    if (e.type === 'error') {
      const t = e.text.toLowerCase();
      if (t.includes('audiocontext') || t.includes('autoplay')) return false;
      return (
        t.includes('uncaught') ||
        t.includes('cors') ||
        t.includes('webgl context lost') ||
        t.includes('three')
      );
    }
    return false;
  });
}

// ── Boot + scene-drive helpers ──────────────────────────────────────────────

/**
 * Boot to the menu scene with a clean localStorage (so the menu
 * high-score is deterministically "0") and the seeded PRNG in place.
 * Returns console entries for fatal checks.
 *
 * Determinism steps (in order):
 *   1. addInitScript → seeded Math.random is in place before ANY page
 *      script runs (every frame, every navigation).
 *   2. goto(APP_URL) → first boot; the app reads localStorage (high
 *      score, settings) and spawns nothing yet (menu scene is static
 *      DOM). We capture the console from THIS boot only (the real
 *      one the screenshot reflects).
 *   3. evaluate → localStorage.clear() on the app origin (NOT
 *      about:blank — localStorage is only accessible on the origin
 *      that created it).
 *   4. reload → the app re-boots with empty localStorage; the menu
 *      high-score is deterministically "0". The seeded PRNG (from
 *      step 1) is still in place, so any Math.random() calls during
 *      this second boot are deterministic.
 */
async function bootToMenu(page: Page): Promise<ConsoleEntry[]> {
  // Seed the PRNG BEFORE the page's scripts run. addInitScript runs on
  // every frame before the page's own JS, so the app sees the seeded
  // Math.random() from the very first line of execution.
  await page.addInitScript(seededRandomScript());
  // First boot: reach the app origin so localStorage is accessible.
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  // Wipe localStorage on the app origin (NOT about:blank — localStorage
  // is scoped to the origin that created it).
  await page.evaluate(() => window.localStorage.clear());
  // Second boot: reload with clean state. The console capture starts HERE
  // so the fatal-error check reflects the actual boot the screenshot
  // was taken on (the first boot's console is discarded).
  const consoleEntries = captureConsole(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  // Let fonts/layout + any menu animations settle so the static DOM is
  // in its final painted state before capture.
  await page.waitForTimeout(800);
  return consoleEntries;
}

/**
 * Boot → menu → START (Enter) → GameScene. Wait for the HUD then a short
 * fixed settle so the first camera-lerp frames complete and the HUD has
 * its initial text. The seeded PRNG ensures the 3 initial obstacles
 * spawn at reproducible positions. Returns console entries.
 */
async function startGame(page: Page): Promise<ConsoleEntry[]> {
  const consoleEntries = await bootToMenu(page);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);
  return consoleEntries;
}

/**
 * Drive GameOver via the `player:death` window event — the path
 * GameScene.setupEventListeners() actually subscribes to.
 */
async function dispatchPlayerDeath(page: Page): Promise<void> {
  await page.evaluate((evtName) => {
    window.dispatchEvent(new CustomEvent(evtName));
  }, PLAYER_DEATH_EVENT);
}

/** True when the given element is attached AND not display:none. */
async function elementVisible(page: Page, id: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.getElementById(sel);
    return !!el && window.getComputedStyle(el).display !== 'none';
  }, id);
}

/**
 * W3-B.6-v2 world-freeze, carried forward. Pin the in-page clock for the
 * next few rAF callbacks so the 3D world is FROZEN at one deterministic
 * moment: obstacle advancement, camera lerp, and HUD updates all become
 * no-ops between the HUD-visible gate and the screenshot. With the
 * GameLoop's accumulated-time integrator, a frozen rAF timestamp means
 * deltaTime = 0 → no updateCallback calls → no obstacle.update() → both
 * 'moving' (performance.now()-driven) and 'rotating' (dt-driven)
 * obstacles are frozen at their spawn state.
 */
async function freezeWorldForCapture(page: Page, frames = 3): Promise<void> {
  await page.evaluate((n) => {
    const w = window as unknown as {
      __freezeActive?: boolean;
      __freezeFramesLeft?: number;
      __freezeBase?: number;
      __origRAF?: typeof requestAnimationFrame;
      __origCAF?: typeof cancelAnimationFrame;
    };
    if (w.__freezeActive) return;
    w.__freezeActive = true;
    w.__freezeFramesLeft = n;
    w.__freezeBase = performance.now();
    w.__origRAF = requestAnimationFrame;
    w.__origCAF = cancelAnimationFrame;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      (w.__origRAF?.bind(window) ?? requestAnimationFrame)(() =>
        cb(w.__freezeBase as number)
      ) as number);
    void w.__origCAF;
  }, frames);
}

/** Restore the real rAF (call once per test, after the screenshot). */
async function unfreezeWorld(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as {
      __freezeActive?: boolean;
      __origRAF?: typeof requestAnimationFrame;
    };
    if (w.__freezeActive && w.__origRAF) {
      window.requestAnimationFrame = w.__origRAF;
      w.__freezeActive = false;
    }
  });
}

/**
 * NEW LEVER 2 — force a clean WebGL clear-color fill immediately before
 * the screenshot, stripping any sub-pixel / first-frame-clear
 * non-determinism between boots. The renderer is exposed on
 * window.game.getRenderer() (src/core/Game.ts) and its underlying
 * THREE.WebGLRenderer via .getRenderer() (src/core/Renderer.ts).
 * No-op-safe: if the handle is missing (shouldn't be post-boot), the
 * screenshot still proceeds — the world-freeze alone is the primary
 * lever and this is a secondary hardening.
 */
async function clearRendererBeforeCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = (window as unknown as {
      game?: {
        getRenderer?: () => { getRenderer: () => { clear: () => void } };
      };
    }).game;
    try {
      const threeRenderer = g?.getRenderer?.().getRenderer();
      threeRenderer?.clear();
    } catch {
      /* non-fatal: screenshot proceeds on the frozen frame */
    }
  });
}

// ── S1: MenuScene baseline (static DOM → pixel-stable) ─────────────────────

test('W4-A.3 S1: MenuScene baseline (static DOM, pixel-stable)', async ({ page }, testInfo) => {
  const project = testInfo.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const consoleEntries = await bootToMenu(page);

  // Precondition: we ARE on the menu.
  expect(
    await elementVisible(page, 'menu-container'),
    'MenuScene must be visible'
  ).toBe(true);

  // Mirror into the evidence trail (always, so both runs leave a copy).
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const mirror = join(EVIDENCE_DIR, `w4a3-menu-scene-${project}.png`);
  await page.screenshot({ path: mirror });

  // Playwright-managed baseline: auto-created on run 1, compared on run 2+.
  await expect(page).toHaveScreenshot('w4a3-menu-scene.png', {
    maxDiffPixels: 0,
  });

  // No fatal console errors on boot.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected at menu.\nGot:\n${fatal
      .map((e) => `[${e.type}] ${e.text}`)
      .join('\n')}`
  ).toBe(0);
});

// ── S2: GameScene baseline (animated WebGL → now deterministic) ────────────

test('W4-A.3 S2: GameScene baseline (animated WebGL, seeded + frozen + cleared)', async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const consoleEntries = await startGame(page);

  // Precondition: GameScene is live (HUD up + debug accessor installed).
  expect(
    await elementVisible(page, 'game-score'),
    'Game HUD must be visible'
  ).toBe(true);
  const accessorInstalled = await page.evaluate(() =>
    typeof (window as unknown as { __debugPlayerPos?: unknown }).__debugPlayerPos === 'function'
  );
  expect(
    accessorInstalled,
    'window.__debugPlayerPos must be installed (GameScene entered)'
  ).toBe(true);

  // Freeze the world clock so the WebGL frame is painted at one
  // deterministic moment (see freezeWorldForCapture doc). The seeded
  // RNG (in place since pre-boot) means the 3 initial obstacles are at
  // reproducible positions; the freeze means their framing is static.
  await freezeWorldForCapture(page, 3);
  await page.waitForTimeout(200);

  // NEW LEVER 2: force a clean WebGL clear before the screenshot.
  await clearRendererBeforeCapture(page);

  // Mirror into the evidence trail.
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const mirror = join(EVIDENCE_DIR, `w4a3-game-scene-${project}.png`);
  await page.screenshot({ path: mirror });

  // Baseline capture/compare.
  //
  // FLAKE RISK (documented per card + W4-A.3 findings):
  //   (a) spawn layout     → eliminated by seeded Math.random
  //   (b) frame timing     → eliminated by world-freeze
  //   (c) WebGL clear      → eliminated by pre-screenshot renderer.clear()
  //   (d) SwiftShader non-determinism → RESIDUAL, not eliminable without
  //       a GPU-backed browser. The probe (w4a3-diag-stability.spec.ts)
  //       measured 54-58% PNG byte variance on the frozen GameScene under
  //       --use-angle=swiftshader. This is the fragment-pipeline noise
  //       floor of the software GL renderer, NOT a game-state variance.
  //
  // maxDiffPixels: 3000 ≈ 0.3% of the 1280×800 = 1,024,000 pixel
  // viewport. This tolerates SwiftShader noise while still catching
  // real visual regressions (missing obstacles, wrong colors, broken
  // HUD, layout shifts). See task-plan/w4a3-findings.md for the full
  // calibration rationale.
  await expect(page).toHaveScreenshot('w4a3-game-scene.png', {
    maxDiffPixels: 3000,
  });

  // Restore the real clock for any teardown work.
  await unfreezeWorld(page);

  // No fatal console errors up to the capture moment.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected in GameScene up to capture.\nGot:\n${fatal
      .map((e) => `[${e.type}] ${e.text}`)
      .join('\n')}`
  ).toBe(0);
});

// ── S3: GameOverScene baseline (static DOM → pixel-stable) ─────────────────

test('W4-A.3 S3: GameOverScene baseline (static DOM, pixel-stable)', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const project = testInfo.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const consoleEntries = await startGame(page);
  await page.evaluate(() => window.focus());
  await dispatchPlayerDeath(page);

  // GameOverScene must be active.
  await page.waitForSelector('#gameover-restart-button', { timeout: 10_000, state: 'visible' });
  // Let setupUI + score writes settle so the DOM is in its final state.
  await page.waitForTimeout(500);

  // Precondition: we ARE on the game-over screen.
  expect(
    await elementVisible(page, 'gameover-container'),
    'GameOverScene must be visible'
  ).toBe(true);

  // Mirror into the evidence trail.
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const mirror = join(EVIDENCE_DIR, `w4a3-gameover-scene-${project}.png`);
  await page.screenshot({ path: mirror });

  // Baseline capture/compare. Static DOM: final score text is the only
  // variable; after a death with no score gained it is deterministically
  // "0" (resetRunState zeroes it), so pixel-stability is expected.
  // localStorage was wiped pre-boot so the high-score display is "0"
  // on both the game-over and (if reached) menu screens.
  await expect(page).toHaveScreenshot('w4a3-gameover-scene.png', {
    maxDiffPixels: 0,
  });

  // No fatal console errors across the boot → start → gameover path.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected up to GameOver.\nGot:\n${fatal
      .map((e) => `[${e.type}] ${e.text}`)
      .join('\n')}`
  ).toBe(0);
});

