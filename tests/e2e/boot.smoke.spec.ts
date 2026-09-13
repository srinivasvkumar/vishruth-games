import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W2-A.4 — Real-Chrome boot smoke (Task 4.3 VERIFY).
 *
 * FIRST real-browser test in this project's history. Loads the dev
 * server and asserts:
 *   1. #game-canvas holds a LIVE WebGL context
 *   2. window.game is set (Game instance from src/index.ts initGame())
 *   3. #loading-message is cleared (boot path completed, no error state)
 *   4. Boot → Menu transition happens (menu-container in DOM)
 *   5. No THREE / CORS / uncaught-error / console.error entries
 *   6. Screenshot + console log captured to tests/evidence/w2/
 *
 * Evidence: tests/evidence/w2/w2-a4-boot-smoke.png / .log
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w2');
const EVIDENCE_PNG = join(EVIDENCE_DIR, 'w2-a4-boot-smoke.png');
const EVIDENCE_LOG = join(EVIDENCE_DIR, 'w2-a4-boot-smoke.log');

interface ConsoleEntry {
  type: string;
  text: string;
}

/**
 * Collect console entries + page errors into an array. Returns the
 * cleanup (no-op — kept for symmetry with a real disposer).
 */
function captureConsole(page: Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on('console', (msg) => {
    entries.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    entries.push({ type: 'pageerror', text: String(err) });
  });
  page.on('requestfailed', (req) => {
    entries.push({ type: 'requestfailed', text: `${req.url()} — ${req.failure()?.errorText}` });
  });
  return entries;
}

/**
 * Assert the canvas element holds a live WebGL context.
 */
async function assertWebGLContext(page: Page): Promise<void> {
  const hasContext = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
    if (!canvas) return false;
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  });
  expect(hasContext, '#game-canvas must hold a live WebGL context').toBe(true);
}

/**
 * Assert window.game is a Game instance (has the public API surface).
 */
async function assertWindowGame(page: Page): Promise<void> {
  const gameShape = await page.evaluate(() => {
    const g = (window as unknown as { game?: unknown }).game;
    if (!g) return null;
    return {
      isObject: typeof g === 'object',
      hasGetSceneManager: typeof (g as { getSceneManager?: unknown }).getSceneManager === 'function',
      hasStart: typeof (g as { start?: unknown }).start === 'function',
      isRunning: typeof (g as { isGameRunning?: unknown }).isGameRunning === 'function'
        ? (g as { isGameRunning(): boolean }).isGameRunning()
        : false
    };
  });
  expect(gameShape, 'window.game must be set').not.toBeNull();
  expect(gameShape!.isObject).toBe(true);
  expect(gameShape!.hasGetSceneManager, 'window.game.getSceneManager must be a function').toBe(true);
  expect(gameShape!.hasStart, 'window.game.start must be a function').toBe(true);
  expect(gameShape!.isRunning, 'window.game.isGameRunning() must be true after boot').toBe(true);
}

/**
 * Assert #loading-message is cleared — either removed from the DOM or
 * its text no longer says "Loading" / "Error".
 */
async function assertLoadingCleared(page: Page): Promise<void> {
  const loadingState = await page.evaluate(() => {
    const el = document.getElementById('loading-message');
    if (!el) return { exists: false, text: '', display: '' };
    const style = window.getComputedStyle(el);
    return {
      exists: true,
      text: el.textContent ?? '',
      display: style.display
    };
  });
  if (loadingState.exists) {
    const text = loadingState.text.toLowerCase();
    expect(
      !text.includes('error') && !text.includes('loading'),
      `#loading-message must be cleared (text: "${loadingState.text}", display: ${loadingState.display})`
    ).toBe(true);
  }
}

/**
 * Assert the boot → menu transition happened: menu-container is in the DOM.
 */
async function assertMenuVisible(page: Page): Promise<void> {
  const menuVisible = await page.evaluate(() => {
    const menu = document.getElementById('menu-container');
    if (!menu) return false;
    const style = window.getComputedStyle(menu);
    return style.display !== 'none' && menu.textContent?.includes('CLUSTER RUSH') === true;
  });
  expect(menuVisible, '#menu-container must be visible after boot→menu transition').toBe(true);
}

/**
 * Filter console entries for THREE / CORS / uncaught-error patterns.
 */
function filterErrors(entries: ConsoleEntry[]): ConsoleEntry[] {
  return entries.filter((e) => {
    const t = e.text.toLowerCase();
    if (e.type === 'pageerror') return true;
    if (e.type === 'requestfailed') return true;
    if (e.type === 'error') {
      return (
        t.includes('three') ||
        t.includes('cors') ||
        t.includes('uncaught') ||
        t.includes('webgl') ||
        t.includes('failed to')
      );
    }
    return false;
  });
}

test('W2-A.4 boot smoke: game boots in real Chrome, renders, no errors', async ({ page }) => {
  test.setTimeout(45_000);

  const consoleEntries = captureConsole(page);

  // Navigate to the dev server root. The index.html lives in public/
  // (vite publicDir), so the dev server serves it at /public/index.html.
  await page.goto('http://localhost:5173/public/index.html', { waitUntil: 'domcontentloaded' });

  // Wait for the boot → menu transition. BootScene.onLoad() takes ~1s
  // (simulated delay), then auto-transitions to 'menu' after 500ms.
  // Total: ~2s from DOMContentLoaded. Give 15s margin for slow environments.
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });

  // Allow a few frames to render after the menu is visible
  await page.waitForTimeout(1000);

  // --- Assertions ---
  await assertWebGLContext(page);
  await assertWindowGame(page);
  await assertLoadingCleared(page);
  await assertMenuVisible(page);

  // No THREE/CORS/uncaught errors
  const errors = filterErrors(consoleEntries);
  const errorText = errors.map((e) => `[${e.type}] ${e.text}`).join('\n');
  expect(errorText, `No THREE/CORS/uncaught errors expected.\nGot:\n${errorText}`).toBe('');

  // --- Evidence capture ---
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: EVIDENCE_PNG, fullPage: true });

  const logLines = consoleEntries.map((e) => `[${e.type}] ${e.text}`);
  writeFileSync(EVIDENCE_LOG, logLines.join('\n') + '\n', 'utf-8');

  // Also save the error-filtered view for quick review
  const errLines = errors.map((e) => `[${e.type}] ${e.text}`);
  writeFileSync(join(EVIDENCE_DIR, 'w2-a4-boot-smoke-errors.txt'), errLines.join('\n') + '\n', 'utf-8');
});
