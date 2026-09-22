import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3-B.6-v2 — Visual-regression baselines per scene (post a47d623).
 *
 * Kanban t_bc5c735e. Fresh baselines reflecting the truck-scale +
 * camera-follow fix (commit a47d623). Baselines from the first B.6 pass
 * are stale (pre-fix trucks) and are superseded by this card.
 *
 * Scenes baselined:
 *   S1 MenuScene   — static DOM overlay → pixel-stable.
 *   S2 GameScene   — animated WebGL. Captured with the world FROZEN:
 *                    after the HUD-visible gate, window.requestAnimationFrame
 *                    is monkeypatched to feed a frozen timestamp for 3
 *                    frames (zero-delta updates → the WebGL frame is
 *                    painted at one deterministic moment), then restored.
 *                    Remaining flake source is documented: obstacle spawns
 *                    are unseeded Math.random(), so WHICH obstacles appear
 *                    varies run-to-run — verified by diff analysis (run 2
 *                    diff = truck shapes only; camera/HUD/road identical).
 *                    Per card rules, a GameScene flake does NOT block the
 *                    gate when MenuScene + GameOverScene are stable.
 *   S3 GameOverScene — static DOM overlay → pixel-stable. Driven via
 *                      the `player:death` window event (the path
 *                      GameScene.setupEventListeners() subscribes to).
 *
 * Baseline location: Playwright's toHaveScreenshot snapshot dir is
 *   tests/e2e/w3b/snapshots/<sanitized-test-name>-<n>.png
 * (first run = auto-create "expected" baseline; subsequent runs =
 * comparison against it). Note: Playwright 1.62's Page-level screenshot
 * matcher is `toHaveScreenshot` — neither `toMatchScreenshot` nor
 * `toMatchSnapshot` exists on Page assertions in this version (verified
 * against node_modules/playwright/types/test.d.ts + standalone tsc).
 * Each baseline is additionally mirrored to tests/evidence/w3/ for the
 * evidence trail:
 *   tests/evidence/w3/w3b6v2-menu-scene.png
 *   tests/evidence/w3/w3b6v2-game-scene.png
 *   tests/evidence/w3/w3b6v2-gameover-scene.png
 *
 * Stability model: this spec is run twice.
 *   Run 1 (RED/capture): no baselines exist yet → Playwright creates
 *   them, run passes, "expected to write" artifacts recorded.
 *   Run 2 (GREEN/verify): all three snapshot assertions must PASS
 *   against the run-1 baselines → per-scene stability verdict.
 *
 * Spec lives under tests/e2e/w3b/ (dedicated `w3b` Playwright project,
 * testDir ./tests/e2e/w3b). Chrome-only, headed, per project config.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', '..', 'evidence', 'w3');
const APP_URL = 'http://localhost:5173/public/index.html';

// The window event name GameScene.setupEventListeners() subscribes to
// for game-over. Kept literal (no build-time coupling to src/).
const PLAYER_DEATH_EVENT = 'player:death';

// ── Console capture (same posture as CP1-CP4) ───────────────────────────────

interface ConsoleEntry {
  type: string;
  text: string;
}

function captureConsole(page: Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on('console', (msg) => entries.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => entries.push({ type: 'pageerror', text: String(err) }));
  page.on('requestfailed', (req) =>
    entries.push({ type: 'requestfailed', text: `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'failed'}` })
  );
  return entries;
}

/**
 * Fatal-error filter (same posture as CP1/CP2/CP3/CP4). AudioContext
 * autoplay warning is NON-FATAL + expected; the boot-manifest fetch 404
 * is by-design until asset manifests land.
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
      return t.includes('uncaught') || t.includes('cors') || t.includes('webgl context lost') || t.includes('three');
    }
    return false;
  });
}

// ── Boot + scene-drive helpers ──────────────────────────────────────────────

/** Boot to the menu scene; returns console entries for fatal checks. */
async function bootToMenu(page: Page): Promise<ConsoleEntry[]> {
  const consoleEntries = captureConsole(page);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  // Let fonts/layout + any menu animations settle so the static DOM is
  // in its final painted state before capture.
  await page.waitForTimeout(800);
  return consoleEntries;
}

/**
 * Boot → menu → START (Enter) → GameScene. Wait for the HUD then a short
 * fixed settle so the first camera-lerp frames complete and the HUD has
 * its initial text. Returns console entries.
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
 * Pin the in-page clock for the next few rAF callbacks so the 3D world
 * is FROZEN at one deterministic moment: obstacle advancement, camera
 * lerp, and HUD updates all become no-ops between the HUD-visible gate
 * and the screenshot. This is the flake-reduction lever for the
 * GameScene baseline (documented in the S2 section below + GREEN txt):
 * spawns are still unseeded Math.random(), so WHAT is on screen varies
 * run-to-run, but HOW it is painted (mid-animation frames) does not.
 * The loop's accumulated-time integrator then digests the elapsed
 * virtual time as one fixed-step batch on the first post-restore frame.
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
    // rAF callbacks receive a FROZEN timestamp → zero-delta world updates,
    // but rendering still happens each callback (static final frame).
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      (w.__origRAF?.bind(window) ?? requestAnimationFrame)(() => cb(w.__freezeBase as number)) as number);
    // cancelAnimationFrame on the frozen id is harmless (no-op path in
    // the loop's stop()), keep the original for safety.
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

// ── S1: MenuScene baseline (static DOM → pixel-stable) ─────────────────────

test('W3-B.6-v2 S1: MenuScene baseline (static DOM, pixel-stable)', async ({ page }) => {
  const consoleEntries = await bootToMenu(page);

  // Precondition: we ARE on the menu.
  expect(await elementVisible(page, 'menu-container'), 'MenuScene must be visible').toBe(true);

  // Mirror into the evidence trail (always, so both runs leave a copy).
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const mirror = join(EVIDENCE_DIR, 'w3b6v2-menu-scene.png');
  await page.screenshot({ path: mirror });

  // Playwright-managed baseline: auto-created on run 1, compared on run 2+.
  await expect(page).toHaveScreenshot('w3b6v2-menu-scene.png', {
    maxDiffPixels: 0,
  });

  // No fatal console errors on boot.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected at menu.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});

// ── S2: GameScene baseline (animated WebGL → flake risk documented) ────────

test('W3-B.6-v2 S2: GameScene baseline (animated WebGL, world frozen at capture)', async ({ page }) => {
  const consoleEntries = await startGame(page);

  // Precondition: GameScene is live (HUD up + debug accessor installed).
  expect(await elementVisible(page, 'game-score'), 'Game HUD must be visible').toBe(true);
  const accessorInstalled = await page.evaluate(() =>
    typeof (window as unknown as { __debugPlayerPos?: unknown }).__debugPlayerPos === 'function'
  );
  expect(accessorInstalled, 'window.__debugPlayerPos must be installed (GameScene entered)').toBe(true);

  // Freeze the world clock so the WebGL frame is painted at one
  // deterministic moment (see freezeWorldForCapture doc). Then let a few
  // frozen frames settle before capturing.
  await freezeWorldForCapture(page, 3);
  await page.waitForTimeout(200);

  // Mirror into the evidence trail.
  const mirror = join(EVIDENCE_DIR, 'w3b6v2-game-scene.png');
  await page.screenshot({ path: mirror });

  // Baseline capture/compare.
  //
  // FLAKE RISK (documented per card): obstacle spawns use unseeded
  // Math.random() — WHICH obstacles are on screen varies run-to-run.
  // The world-freeze removes the other variance source (frame-timing /
  // mid-animation capture), so the remaining risk is spawn layout only.
  // maxDiffPixels=0 is kept to make ANY drift visible in the evidence;
  // if this flakes on run 2 while S1+S3 are stable, that is the
  // documented flake, NOT a gate blocker (per card rules).
  await expect(page).toHaveScreenshot('w3b6v2-game-scene.png', {
    maxDiffPixels: 0,
  });

  // Restore the real clock for any teardown work.
  await unfreezeWorld(page);

  // No fatal console errors up to the capture moment.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected in GameScene up to capture.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});

// ── S3: GameOverScene baseline (static DOM → pixel-stable) ─────────────────

test('W3-B.6-v2 S3: GameOverScene baseline (static DOM, pixel-stable)', async ({ page }) => {
  test.setTimeout(90_000);

  const consoleEntries = await startGame(page);
  await page.evaluate(() => window.focus());
  await dispatchPlayerDeath(page);

  // GameOverScene must be active.
  await page.waitForSelector('#gameover-restart-button', { timeout: 10_000, state: 'visible' });
  // Let setupUI + score writes settle so the DOM is in its final state.
  await page.waitForTimeout(500);

  // Precondition: we ARE on the game-over screen.
  expect(await elementVisible(page, 'gameover-container'), 'GameOverScene must be visible').toBe(true);

  // Mirror into the evidence trail.
  const mirror = join(EVIDENCE_DIR, 'w3b6v2-gameover-scene.png');
  await page.screenshot({ path: mirror });

  // Baseline capture/compare. Static DOM: final score text is the only
  // variable; after a death with no score gained it is deterministically
  // "0" (resetRunState zeroes it), so pixel-stability is expected.
  await expect(page).toHaveScreenshot('w3b6v2-gameover-scene.png', {
    maxDiffPixels: 0,
  });

  // No fatal console errors across the boot → start → gameover path.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected up to GameOver.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});
