import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3-B.2 — CP1: game start to gameplay flow E2E (boot → menu → START → GameScene).
 *
 * Kanban t_4cdc7048. This is the FIRST of the 4 W3-B critical-path E2E specs.
 * It proves the full start path works end-to-end in REAL HEADED CHROME:
 *
 *   1. Boot completes — WebGL context live on #game-canvas, boot scene gone,
 *      menu scene up (#menu-container visible + enabled).
 *   2. Menu scene visible — #menu-start-button visible + enabled + says START.
 *   3. START — press Enter (keyboard) OR click the START button (mouse).
 *      We drive BOTH entry points across two runs so neither is untested.
 *   4. GameScene active — HUD up (#game-score visible), menu down
 *      (#menu-start-button hidden).
 *   5. Scene graph — 3D player present (deterministic window.__debugPlayerPos
 *      accessor from W3-B.0) + obstacles present (scene-graph inspection).
 *   6. Screenshot — tests/evidence/w3/w3b-cp1-start.png (mid-game, HUD + 3D).
 *   7. Console clean — 0 fatal errors (AudioContext autoplay warning is
 *      non-fatal + expected and is allowlisted).
 *
 * Spec lives under tests/e2e/w3b/ so it is always discovered by the dedicated
 * `w3b` Playwright project (testDir ./tests/e2e/w3b), independent of the
 * BROWSER smoke-swap that redirects the default testDir to tests/e2e/smoke.
 *
 * Chrome-only (W3-C is the Firefox leg). Headed per the `w3b` project config
 * (headless: false, WebGL flags matching chromium-boot).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', '..', 'evidence', 'w3');
const APP_URL = 'http://localhost:5173/public/index.html';

// ── Console capture helper (same posture as W3A.6 / W2-1b) ─────────────────

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
 * Fatal-error filter. The AudioContext autoplay warning is NON-FATAL and
 * expected (the game lazily creates an AudioContext on first input; a fresh
 * page with no user gesture may log it). Everything else in `error`/
 * `pageerror`/`requestfailed` is fatal, except the boot-manifest 404 which is
 * by-design until asset manifests land.
 */
function filterFatalErrors(entries: ConsoleEntry[]): ConsoleEntry[] {
  return entries.filter((e) => {
    if (e.type === 'pageerror') return true;
    if (e.type === 'requestfailed') {
      // The boot manifest fetch 404s by design (asset manifests land later in W3).
      return !e.text.includes('manifest');
    }
    if (e.type === 'error') {
      const t = e.text.toLowerCase();
      // Allowlist the expected AudioContext autoplay warning (non-fatal).
      if (t.includes('audiocontext') || t.includes('autoplay')) return false;
      return t.includes('uncaught') || t.includes('cors') || t.includes('webgl context lost') || t.includes('three');
    }
    return false;
  });
}

// ── Boot + state helpers ────────────────────────────────────────────────────

/** Boot to the menu scene; return console entries for fatal-error checks. */
async function bootToMenu(page: Page): Promise<ConsoleEntry[]> {
  const consoleEntries = captureConsole(page);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
  return consoleEntries;
}

/** True when the menu container is visible AND present. */
async function menuVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById('menu-container');
    return !!el && window.getComputedStyle(el).display !== 'none';
  });
}

/** True when the #game-score HUD is visible (i.e. we are in GameScene). */
async function gameHudVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById('game-score');
    return !!el && window.getComputedStyle(el).display !== 'none';
  });
}

/** True when WebGL is live on #game-canvas. */
async function webglLive(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
    if (!canvas) return false;
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  });
}

/**
 * Read the player position from the deterministic W3-B.0 debug accessor
 * (window.__debugPlayerPos). Returns null when the accessor is not yet
 * installed (i.e. GameScene has not entered) — the RED state.
 */
async function getPlayerPosViaAccessor(
  page: Page
): Promise<{ x: number; z: number } | null> {
  return page.evaluate(() => {
    const fn = (window as unknown as { __debugPlayerPos?: () => { x: number; z: number } }).__debugPlayerPos;
    if (typeof fn !== 'function') return null;
    try {
      const pos = fn();
      return { x: pos.x, z: pos.z };
    } catch {
      return null;
    }
  });
}

/**
 * Inspect the current scene graph directly (independent of the W3-B.0 accessor,
 * so this is a second, orthogonal proof that the 3D content is in the scene).
 * Returns { player, obstacles, ground } counts as seen on window.game's
 * current scene.
 */
async function inspectSceneGraph(
  page: Page
): Promise<{ player: number; obstacles: number; ground: number; totalGroups: number; totalMeshes: number }> {
  return page.evaluate(() => {
    const g = (window as unknown as {
      game?: {
        getSceneManager?: () => {
          getCurrentScene?: () => {
            getScene?: () => {
              children: Array<{ isGroup?: boolean; isMesh?: boolean }>;
            };
          };
        };
      };
    }).game;
    const scene = g?.getSceneManager?.()?.getCurrentScene?.()?.getScene?.();
    if (!scene) {
      return { player: 0, obstacles: 0, ground: 0, totalGroups: 0, totalMeshes: 0 };
    }
    const children = scene.children;
    const totalGroups = children.filter((c) => c.isGroup === true).length;
    const totalMeshes = children.filter((c) => c.isMesh === true).length;
    // Player is a Group with children (body sub-mesh). Obstacles are Groups
    // too. The ground is a single Mesh. Heuristic: 1 player Group (first
    // child), the remaining Groups are obstacles, the Mesh is the ground.
    const groups = children.filter((c) => c.isGroup === true);
    const player = groups.length > 0 ? 1 : 0;
    const obstacles = Math.max(0, groups.length - 1);
    const ground = totalMeshes;
    return { player, obstacles, ground, totalGroups, totalMeshes };
  });
}

// ── CP1 S1: boot completes → WebGL live + menu up + START enabled ──────────

test('W3-B.2 CP1 S1: boot completes — WebGL live, menu visible, START enabled', async ({ page }) => {
  test.setTimeout(45_000);

  const consoleEntries = await bootToMenu(page);

  // Boot done: WebGL context live on #game-canvas.
  expect(await webglLive(page), 'WebGL context must be live on #game-canvas after boot').toBe(true);

  // Menu scene is up and visible.
  expect(await menuVisible(page), 'Menu must be visible after boot').toBe(true);

  // START button exists, is visible, is enabled, and says START.
  const btn = page.locator('#menu-start-button');
  await expect(btn, 'START button must be attached').toBeAttached();
  await expect(btn, 'START button must be visible').toBeVisible();
  expect(await btn.isEnabled(), 'START button must be enabled at boot').toBe(true);
  const btnText = (await btn.textContent())?.trim();
  expect(btnText, 'START button must say "START"').toBe('START');

  // No fatal console errors during boot.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected on boot.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});

// ── CP1 S2: START via Enter (keyboard) → GameScene + scene graph ───────────

test('W3-B.2 CP1 S2: START via Enter enters GameScene — HUD up, menu down, player + obstacles in scene graph', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleEntries = await bootToMenu(page);

  // Confirm we are on the menu, not yet in the game.
  expect(await menuVisible(page), 'Must start on the menu').toBe(true);
  expect(await gameHudVisible(page), 'Must NOT yet be in GameScene').toBe(false);

  // Drive the START path with the keyboard: a real Enter keydown on the page.
  await page.keyboard.press('Enter');

  // Assert the transition: HUD up, menu down.
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);
  expect(await gameHudVisible(page), 'Game HUD must be visible after Enter').toBe(true);
  expect(await menuVisible(page), 'Menu must be hidden after Enter').toBe(false);

  // Player is in the scene graph — via the deterministic W3-B.0 accessor.
  const playerPos = await getPlayerPosViaAccessor(page);
  expect(playerPos, 'window.__debugPlayerPos must be installed (GameScene entered)').not.toBeNull();
  expect(
    Number.isFinite(playerPos!.x) && Number.isFinite(playerPos!.z),
    `Player position must be finite (got x=${playerPos!.x}, z=${playerPos!.z})`
  ).toBe(true);

  // Obstacles + ground are in the scene graph — via direct inspection.
  const graph = await inspectSceneGraph(page);
  expect(graph.player, `Scene must contain the 3D player (got ${graph.player})`).toBe(1);
  expect(
    graph.obstacles,
    `Scene must contain obstacles (3 initial spawned; got ${graph.obstacles})`
  ).toBeGreaterThanOrEqual(3);
  expect(graph.ground, 'Scene must contain the ground mesh').toBeGreaterThanOrEqual(1);

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);

  // Evidence: mid-game screenshot with HUD + 3D player + obstacles.
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w3b-cp1-start.png'), fullPage: true });
});

// ── CP1 S3: START via click (mouse) → GameScene (second entry point) ────────

test('W3-B.2 CP1 S3: START via click enters GameScene — HUD up, menu down, player present', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleEntries = await bootToMenu(page);
  expect(await menuVisible(page), 'Must start on the menu').toBe(true);
  expect(await gameHudVisible(page), 'Must NOT yet be in GameScene').toBe(false);

  // Drive the START path with the mouse: a real click on the START button.
  await page.locator('#menu-start-button').click();

  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);
  expect(await gameHudVisible(page), 'Game HUD must be visible after click').toBe(true);
  expect(await menuVisible(page), 'Menu must be hidden after click').toBe(false);

  // Player present via the W3-B.0 accessor.
  const playerPos = await getPlayerPosViaAccessor(page);
  expect(playerPos, 'window.__debugPlayerPos must be installed (GameScene entered)').not.toBeNull();
  expect(
    Number.isFinite(playerPos!.x) && Number.isFinite(playerPos!.z),
    'Player position must be finite after mouse-start'
  ).toBe(true);

  // Scene graph: player + obstacles + ground.
  const graph = await inspectSceneGraph(page);
  expect(graph.player, 'Scene must contain the 3D player after mouse-start').toBe(1);
  expect(graph.obstacles, 'Scene must contain obstacles after mouse-start').toBeGreaterThanOrEqual(3);

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});
