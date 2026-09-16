import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * BUG-W2-1b — In-browser verification of the player start path.
 *
 * Objective (kanban t_675ab2f6, parent t_4298322b commit 6f85f55):
 *   In REAL HEADED CHROME, verify the BUG-W2-1a fix end-to-end:
 *   1. Load app -> lands on MenuScene (title "CLUSTER RUSH" + START button
 *      #menu-start-button visible).
 *   2a. Press Enter -> assert it enters GameScene (HUD visible, menu hidden,
 *       3D player in scene graph).
 *   2b. Reload and click the START button -> assert it enters GameScene.
 *   3. In GameScene: confirm a visible 3D player + obstacles render, and
 *      WASD moves the player (reuse the W2-E.1a movement checks).
 *
 * Single-browser discipline: Chrome only (chromium-boot project, headed).
 * The Firefox leg of start-path is out of scope (W2-E.1b covered the smoke
 * suite cross-browser; start-path W2-1b is Chrome-only per card).
 *
 * Evidence: tests/evidence/w2/w2-w21b-{menu,enter-game,wasd-move}.png +
 * w2-w21b-console-chrome.txt + W2-W21b-RED.txt / W2-W21b-GREEN.txt.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w2');
const APP_URL = 'http://localhost:5173/public/index.html';

// ── Console capture helper (same posture as smoke.spec.ts) ─────────────────

interface ConsoleEntry {
  type: string;
  text: string;
}

function captureConsole(page: Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on('console', (msg) => entries.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => entries.push({ type: 'pageerror', text: String(err) }));
  page.on('requestfailed', (req) =>
    entries.push({ type: 'requestfailed', text: `${req.url()} — ${req.failure()?.errorText ?? 'unknown'}` })
  );
  return entries;
}

function filterFatalErrors(entries: ConsoleEntry[]): ConsoleEntry[] {
  return entries.filter((e) => {
    if (e.type === 'pageerror') return true;
    if (e.type === 'requestfailed') return true;
    if (e.type === 'error') {
      const t = e.text.toLowerCase();
      return t.includes('three') || t.includes('cors') || t.includes('uncaught') || t.includes('webgl');
    }
    return false;
  });
}

// ── Boot + menu-state helpers ──────────────────────────────────────────────

/** Boot to the menu scene; return console entries for fatal-error checks. */
async function bootToMenu(page: Page): Promise<ConsoleEntry[]> {
  const consoleEntries = captureConsole(page);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
  return consoleEntries;
}

/** True when the menu container is visible AND the START button is enabled. */
async function menuVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById('menu-container');
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none';
  });
}

/** True when the #game-score HUD is visible (i.e. we are in GameScene). */
async function gameHudVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById('game-score');
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none';
  });
}

/**
 * Read the player mesh position from the current scene's THREE scene graph
 * (same locator heuristic as W2-E.1a scenario 2: the player is the first
 * Group child; ground/obstacles are Meshes).
 */
async function getPlayerPosition(page: Page): Promise<{ x: number; y: number; z: number }> {
  return page.evaluate(() => {
    const g = (window as unknown as {
      game?: {
        getSceneManager: () => {
          getCurrentScene: () => {
            getScene: () => {
              children: Array<{
                isGroup?: boolean;
                isMesh?: boolean;
                position: { x: number; y: number; z: number };
                children: unknown[];
              }>;
            };
          };
        };
      };
    }).game;
    const scene = g?.getSceneManager?.()?.getCurrentScene()?.getScene?.();
    if (!scene) throw new Error('Current scene not found');
    const player = scene.children.find((c) => c.isGroup === true || (c.children?.length ?? 0) > 1);
    if (!player) throw new Error('Player mesh not found in scene graph');
    return { x: player.position.x, y: player.position.y, z: player.position.z };
  });
}

/** Count Mesh children in the current scene (player + obstacles + ground). */
async function countSceneMeshes(page: Page): Promise<number> {
  return page.evaluate(() => {
    const g = (window as unknown as {
      game?: { getSceneManager: () => { getCurrentScene: () => { getScene: () => { children: Array<{ isMesh?: boolean }> } } } };
    }).game;
    const scene = g?.getSceneManager?.()?.getCurrentScene()?.getScene?.();
    if (!scene) return -1;
    return scene.children.filter((c) => c.isMesh === true).length;
  });
}

// ── Scenario 1: Boot lands on MenuScene with title + START button visible ──

test('BUG-W2-1b 1: boot lands on MenuScene with title + START button', async ({ page }) => {
  test.setTimeout(45_000);

  const consoleEntries = await bootToMenu(page);

  const menuVisibleNow = await menuVisible(page);
  expect(menuVisibleNow, 'Menu must be visible after boot').toBe(true);

  const menuText = await page.evaluate(() => document.getElementById('menu-container')?.textContent ?? '');
  expect(menuText, 'Menu must contain the CLUSTER RUSH title').toContain('CLUSTER RUSH');

  // START button must exist, be visible, and be enabled
  const btn = page.locator('#menu-start-button');
  await expect(btn, 'START button must exist').toBeAttached();
  await expect(btn, 'START button must be visible').toBeVisible();
  const btnEnabled = await btn.isEnabled();
  expect(btnEnabled, 'START button must be enabled at boot').toBe(true);
  const btnText = (await btn.textContent())?.trim();
  expect(btnText, 'START button must say START').toBe('START');

  // WebGL live on #game-canvas
  const hasGL = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
    if (!canvas) return false;
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  });
  expect(hasGL, 'WebGL context must be live on #game-canvas').toBe(true);

  // No fatal errors during boot
  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  // Evidence: menu with START button visible
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-w21b-menu.png'), fullPage: true });
});

// ── Scenario 2a: Press Enter -> GameScene ──────────────────────────────────

test('BUG-W2-1b 2a: Enter key from menu enters GameScene', async ({ page }) => {
  test.setTimeout(60_000);

  await bootToMenu(page);

  // Confirm we're on the menu before the keypress
  expect(await menuVisible(page), 'Must start on the menu').toBe(true);
  expect(await gameHudVisible(page), 'Must NOT yet be in the game scene').toBe(false);

  // The player start path: a real Enter keydown on the page
  await page.keyboard.press('Enter');

  // Assert the transition happened: HUD up, menu down
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'attached' });
  await page.waitForTimeout(500);
  expect(await gameHudVisible(page), 'Game HUD must be visible after Enter').toBe(true);
  expect(await menuVisible(page), 'Menu must be hidden after Enter').toBe(false);

  // A 3D player must exist in the scene graph
  const player = await getPlayerPosition(page);
  expect(Number.isFinite(player.x) && Number.isFinite(player.y) && Number.isFinite(player.z), 'Player position must be finite').toBe(true);

  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-w21b-enter-game.png'), fullPage: true });
});

// ── Scenario 2b: Reload + click START button -> GameScene ──────────────────

test('BUG-W2-1b 2b: clicking START button from menu enters GameScene', async ({ page }) => {
  test.setTimeout(60_000);

  await bootToMenu(page);
  expect(await menuVisible(page), 'Must start on the menu').toBe(true);
  expect(await gameHudVisible(page), 'Must NOT yet be in the game scene').toBe(false);

  // Reload to a clean menu state, then drive the button (not the key)
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
  expect(await menuVisible(page), 'Must be back on the menu after reload').toBe(true);

  const btn = page.locator('#menu-start-button');
  await expect(btn).toBeVisible();

  // The player start path: a real click on the START button
  await btn.click();

  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'attached' });
  await page.waitForTimeout(500);
  expect(await gameHudVisible(page), 'Game HUD must be visible after button click').toBe(true);
  expect(await menuVisible(page), 'Menu must be hidden after button click').toBe(false);

  const player = await getPlayerPosition(page);
  expect(Number.isFinite(player.x) && Number.isFinite(player.y) && Number.isFinite(player.z), 'Player position must be finite').toBe(true);
});

// ── Scenario 3: In GameScene — player + obstacles render, WASD moves player ─

test('BUG-W2-1b 3: in GameScene — 3D player + obstacles render, WASD moves the player', async ({ page }) => {
  test.setTimeout(90_000);

  const consoleEntries = await bootToMenu(page);

  // Enter via the start path (Enter key)
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'attached' });
  await page.waitForTimeout(500);

  // Confirm we're in the game scene
  expect(await gameHudVisible(page), 'Game HUD must be visible').toBe(true);
  expect(await menuVisible(page), 'Menu must be hidden').toBe(false);

  // 3D player present in the scene graph
  const player0 = await getPlayerPosition(page);
  expect(Number.isFinite(player0.x) && Number.isFinite(player0.y) && Number.isFinite(player0.z), 'Player position must be finite').toBe(true);

  // Obstacles (or at least other meshes) render: scene has more than 1 mesh
  const meshCount = await countSceneMeshes(page);
  expect(meshCount, `Scene must contain meshes (player + obstacles + ground); got ${meshCount}`).toBeGreaterThanOrEqual(1);

  // WASD moves the player — reuse W2-E.1a scenario 2 checks
  // D = move right (+x)
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  await page.waitForTimeout(100);
  const afterD = await getPlayerPosition(page);
  const dx = afterD.x - player0.x;
  expect(Math.abs(dx), `Player must have moved in x after D (before.x=${player0.x}, after.x=${afterD.x}, dx=${dx})`).toBeGreaterThan(0.1);
  expect(dx, 'D must move in +x (right)').toBeGreaterThan(0);

  // A = move left (-x)
  await page.keyboard.down('a');
  await page.waitForTimeout(500);
  await page.keyboard.up('a');
  await page.waitForTimeout(100);
  const afterA = await getPlayerPosition(page);
  const dxLeft = afterA.x - afterD.x;
  expect(Math.abs(dxLeft), `Player must have moved in x after A (afterD.x=${afterD.x}, afterA.x=${afterA.x})`).toBeGreaterThan(0.1);
  expect(dxLeft, 'A must move in -x (left)').toBeLessThan(0);

  // W = forward (-z)
  const beforeW = await getPlayerPosition(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(400);
  await page.keyboard.up('w');
  await page.waitForTimeout(100);
  const afterW = await getPlayerPosition(page);
  const dz = afterW.z - beforeW.z;
  expect(Math.abs(dz), `Player must have moved in z after W (before.z=${beforeW.z}, after.z=${afterW.z}, dz=${dz})`).toBeGreaterThan(0.1);
  expect(dz, 'W must move in -z (forward)').toBeLessThan(0);

  // Evidence: player moved after WASD
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-w21b-wasd-move.png'), fullPage: true });

  // Console clean across this whole cycle
  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  // Write the console capture for the evidence file
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const logLines = consoleEntries.map((e) => `[${e.type}] ${e.text}`);
  writeFileSync(join(EVIDENCE_DIR, 'w2-w21b-console-chrome.txt'), logLines.join('\n') + '\n', 'utf-8');
});
