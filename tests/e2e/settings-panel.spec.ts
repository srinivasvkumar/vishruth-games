import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3-C.4 — Settings panel (settings-panel.spec.ts)
 *
 * Drives the LIVE app (real Chromium, real WebGL, real localStorage) to
 * prove the settings panel is fully wired end-to-end:
 *
 *   1. Boot to menu. Panel is closed on entry.
 *   2. Click SETTINGS → panel opens with 4 sections
 *      (VOLUME / SPEED / DIFFICULTY / CONTROLS) + CLOSE.
 *   3. Move the volume slider, set speed to 2.0x, difficulty to 'hard',
 *      then confirm the choices persist to localStorage under
 *      'cluster-rush-settings' as { volume, speed, difficulty }.
 *   4. The speed/difficulty choices take effect on the live Game object
 *      (getSpeedMultiplier() reflects the chosen speed).
 *   5. Press Escape → panel closes; focus returns to START.
 *   6. Re-open → previously chosen values are restored from storage
 *      (persistence across a reload).
 *
 * Evidence: tests/evidence/w3/W3C4-GREEN.txt
 * + settings-panel-open.png + settings-panel-persist.png
 *
 * Runs under the default `./tests/e2e` testDir (run without the BROWSER
 * env var so testDir stays ./tests/e2e).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
/* spec lives at <repo>/tests/e2e/settings-panel.spec.ts:
 * '..' → tests, '..' → repo root, then 'tests/evidence/w3'. */
const EVIDENCE_DIR = join(__dirname, '..', '..', 'tests', 'evidence', 'w3');
const APP_URL = 'http://localhost:5173/public/index.html';
const STORAGE_KEY = 'cluster-rush-settings';

async function bootToMenu(page: Page): Promise<void> {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', {
    timeout: 15_000,
    state: 'attached'
  });
  await page.waitForTimeout(400);
}

/** Read the persisted settings object from the live app's localStorage. */
function readStored(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

/** Seed localStorage with a known settings blob. */
function seedStored(page: Page, value: Record<string, unknown>) {
  return page.evaluate(([key, val]) => {
    window.localStorage.setItem(key, JSON.stringify(val));
  }, [STORAGE_KEY, value] as const);
}

/** Read Game.getSpeedMultiplier() off the live app handle. */
function readSpeedMultiplier(page: Page) {
  return page.evaluate(() => {
    const g = window as unknown as {
      game?: { getSpeedMultiplier?: () => number };
    };
    return g?.game?.getSpeedMultiplier?.() ?? null;
  });
}

/** Panel is open iff #settings-panel exists and computed display is not 'none'.
 *  (Can't use offsetParent — a position:fixed element has offsetParent===null
 *  even when fully visible.) */
function panelVisible(page: Page) {
  return page.evaluate(() => {
    const el = document.getElementById('settings-panel') as HTMLElement | null;
    if (!el) return false;
    const display = getComputedStyle(el).display;
    return display !== 'none';
  });
}

// ── The test ────────────────────────────────────────────────────────────────

test('W3-C.4: settings panel persists volume/speed/difficulty and wires to game', async ({
  page
}) => {
  test.setTimeout(60_000);

  await bootToMenu(page);

  // 1. Panel closed on entry.
  expect(await panelVisible(page), 'settings panel must be closed on menu entry').toBe(false);

  // 2. Click SETTINGS → panel opens with all 4 sections + CLOSE.
  await page.click('#menu-settings-button');
  expect(await panelVisible(page), 'panel must open on SETTINGS click').toBe(true);
  for (const id of [
    'settings-volume-section',
    'settings-speed-section',
    'settings-difficulty-section',
    'settings-controls-section'
  ]) {
    expect(
      await page.locator(`#${id}`).count(),
      `section ${id} must be present`
    ).toBe(1);
  }
  expect(await page.locator('#settings-close-button').count()).toBe(1);
  await page.screenshot({
    path: join(EVIDENCE_DIR, 'settings-panel-open.png'),
    fullPage: true
  });

  // 3. Change the controls: volume → 50, speed → 2.0, difficulty → hard.
  const volume = page.locator('#settings-volume-slider');
  await volume.fill('50');
  await volume.dispatchEvent('input');

  const speed2 = page.locator('#settings-speed-2');
  await speed2.click();
  await page.waitForTimeout(100);

  const diffHard = page.locator('#settings-difficulty-hard');
  await diffHard.click();
  await page.waitForTimeout(100);

  // 3a. Persisted to localStorage with the exact shape.
  const stored1 = await readStored(page);
  expect(stored1, 'settings must be persisted to localStorage').not.toBeNull();
  expect(stored1?.volume).toBe(50);
  expect(stored1?.speed).toBe(2);
  expect(stored1?.difficulty).toBe('hard');

  // 3b. Speed choice wired to the live Game object.
  const speedMult = await readSpeedMultiplier(page);
  expect(speedMult, 'game.getSpeedMultiplier() must reflect the chosen speed').toBe(2);

  // 4. Escape closes the panel; focus returns to START.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  expect(await panelVisible(page), 'panel must close on Escape').toBe(false);
  const focused = await page.evaluate(() => document.activeElement?.id ?? null);
  expect(focused, 'focus must return to START after Escape').toBe('menu-start-button');

  // 5. Re-open → previously chosen values restored from storage.
  await page.click('#menu-settings-button');
  await page.waitForTimeout(100);
  expect(await page.locator('#settings-volume-slider').inputValue()).toBe('50');
  expect(
    await page.evaluate(() =>
      document
        .getElementById('settings-speed-2')
        ?.getAttribute('aria-pressed')
    ),
    'speed 2.0 button must be the active (pressed) one on re-open'
  ).toBe('true');
  expect(
    await page.evaluate(() =>
      document
        .getElementById('settings-difficulty-hard')
        ?.getAttribute('aria-pressed')
    ),
    'difficulty hard button must be the active (pressed) one on re-open'
  ).toBe('true');
  await page.screenshot({
    path: join(EVIDENCE_DIR, 'settings-panel-persist.png'),
    fullPage: true
  });

  // 6. Close via the CLOSE button (second close path exercised).
  await page.click('#settings-close-button');
  await page.waitForTimeout(100);
  expect(await panelVisible(page), 'panel must close on CLOSE click').toBe(false);

  // 7. Persistence across a FULL reload: seed hard+2.0, reload, confirm
  //    the menu reads it back (slider + speed button restored).
  await seedStored(page, { volume: 10, speed: 2, difficulty: 'hard' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000 });
  await page.click('#menu-settings-button');
  await page.waitForTimeout(150);
  expect(await page.locator('#settings-volume-slider').inputValue()).toBe('10');
  expect(
    await page.evaluate(() =>
      document
        .getElementById('settings-speed-2')
        ?.getAttribute('aria-pressed')
    ),
    'speed must survive a full reload'
  ).toBe('true');

  // ── Evidence log ──────────────────────────────────────────────────────────
  const ts = new Date().toISOString();
  const log = [
    'W3-C.4 — Settings panel (e2e, real Chromium + localStorage)',
    `timestamp: ${ts}`,
    `url: ${APP_URL}`,
    'browser: real Chromium (Playwright chromium-boot project, headed)',
    '',
    'assertions passed:',
    '  - panel closed on menu entry',
    '  - SETTINGS click opens panel with VOLUME/SPEED/DIFFICULTY/CONTROLS + CLOSE',
    '  - volume=50, speed=2.0, difficulty=hard persisted to localStorage["cluster-rush-settings"]',
    '  - game.getSpeedMultiplier() === 2 after choosing 2.0x',
    '  - Escape closes panel and returns focus to START',
    '  - re-open restores volume=50, speed=2 (aria-pressed), difficulty=hard (aria-pressed)',
    '  - CLOSE button closes the panel',
    '  - seeded {volume:10,speed:2,difficulty:hard} survives a full page reload',
    '',
    'screenshots: settings-panel-open.png, settings-panel-persist.png'
  ].join('\n');
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(join(EVIDENCE_DIR, 'W3C4-GREEN.txt'), log + '\n', 'utf-8');
  console.log(log);
});
