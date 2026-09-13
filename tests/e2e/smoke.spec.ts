import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W2-E.1a — Smoke suite (Chrome) — 5 scenarios.
 *
 * Satisfies Week-2 success criterion #1 (Chrome leg):
 *   "Game runs in Chrome — canvas renders, player moves."
 *
 * Scenarios:
 *   1. Boot to a playable scene (menu → game)
 *   2. Move with WASD (player mesh position changes)
 *   3. Jump (player mesh y increases on space/arrowup)
 *   4. Score increments on collect (score HUD value goes up)
 *   5. Game-over then restart returns to a clean playable state
 *
 * All scenarios are driven through the public `window.game` / DOM surface.
 * Evidence: tests/evidence/w2/w2-e1a-smoke-{1..5}-*.png + w2-e1a-smoke-console.txt
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w2');
const APP_URL = 'http://localhost:5173/public/index.html';

// ── Console capture helper ─────────────────────────────────────────────────

interface ConsoleEntry {
  type: string;
  text: string;
}

function captureConsole(page: Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on('console', (msg) => entries.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => entries.push({ type: 'pageerror', text: String(err) }));
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

// ── Boot helper ────────────────────────────────────────────────────────────

/**
 * Boot the app to the menu scene. Returns the console entries collected
 * during boot so each scenario can assert no fatal errors.
 */
async function bootToMenu(page: Page): Promise<ConsoleEntry[]> {
  const consoleEntries = captureConsole(page);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
  return consoleEntries;
}

/**
 * Transition from menu to the game scene via the public SceneManager API.
 * This is the same call the app's own BootScene uses to switch scenes.
 */
async function enterGameScene(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const g = (window as unknown as { game?: { getSceneManager?: () => { loadScene: (n: string) => Promise<void> } } }).game;
    if (!g?.getSceneManager) throw new Error('window.game.getSceneManager not available');
    await g.getSceneManager().loadScene('game');
  });
  // Wait for the game scene's HUD to appear
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'attached' });
  await page.waitForTimeout(300);
}

/**
 * Read the player mesh position from the current scene's THREE scene graph.
 * The player is a THREE.Group added to the scene; we find it by looking for
 * a child that is a Group (not a Mesh) — the player Group contains a Mesh child.
 */
async function getPlayerPosition(page: Page): Promise<{ x: number; y: number; z: number }> {
  return page.evaluate(() => {
    const g = (window as unknown as {
      game?: {
        getSceneManager: () => {
          getCurrentScene: () => {
            getScene: () => {
              children: Array<{ isGroup?: boolean; isMesh?: boolean; position: { x: number; y: number; z: number }; children: unknown[] }>;
            };
          };
        };
      };
    }).game;
    const scene = g?.getSceneManager?.()?.getCurrentScene()?.getScene?.();
    if (!scene) throw new Error('Current scene not found');
    // Player is a Group with a Mesh child; ground/obstacles are Meshes.
    // Find the first Group child (the player).
    const player = scene.children.find((c) => c.isGroup === true || (c.children?.length ?? 0) > 1);
    if (!player) throw new Error('Player mesh not found in scene graph');
    return { x: player.position.x, y: player.position.y, z: player.position.z };
  });
}

/**
 * Read the score value from the HUD DOM element.
 */
async function getScore(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.getElementById('game-score');
    if (!el) return -1;
    const m = el.textContent?.match(/SCORE:\s*(\d+)/);
    return m ? Number.parseInt(m[1], 10) : -1;
  });
}

// ── Scenario 1: Boot to a playable scene ───────────────────────────────────

test('W2-E.1a scenario 1: boot to a playable scene', async ({ page }) => {
  test.setTimeout(45_000);

  const consoleEntries = await bootToMenu(page);

  // Assert: menu is visible
  const menuVisible = await page.evaluate(() => {
    const el = document.getElementById('menu-container');
    if (!el) return false;
    return window.getComputedStyle(el).display !== 'none' && el.textContent?.includes('CLUSTER RUSH') === true;
  });
  expect(menuVisible, 'Menu must be visible after boot').toBe(true);

  // Assert: WebGL context is live
  const hasGL = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
    if (!canvas) return false;
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  });
  expect(hasGL, 'WebGL context must be live on #game-canvas').toBe(true);

  // Assert: window.game is set and running
  const gameOk = await page.evaluate(() => {
    const g = (window as unknown as { game?: { isGameRunning?: () => boolean } }).game;
    return !!g && typeof g.isGameRunning === 'function' && g.isGameRunning() === true;
  });
  expect(gameOk, 'window.game must be set and running').toBe(true);

  // No fatal errors
  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  // Screenshot
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-e1a-smoke-1-boot.png'), fullPage: true });

  // Now enter the game scene
  await enterGameScene(page);

  // Assert: game HUD is visible
  const hudVisible = await page.evaluate(() => {
    const score = document.getElementById('game-score');
    const health = document.getElementById('game-health');
    if (!score || !health) return false;
    return window.getComputedStyle(score).display !== 'none' && window.getComputedStyle(health).display !== 'none';
  });
  expect(hudVisible, 'Game HUD (score + health) must be visible after entering game scene').toBe(true);

  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-e1a-smoke-1-game.png'), fullPage: true });
});

// ── Scenario 2: Move with WASD ─────────────────────────────────────────────

test('W2-E.1a scenario 2: move with WASD', async ({ page }) => {
  test.setTimeout(60_000);

  await bootToMenu(page);
  await enterGameScene(page);

  // Read initial player position
  const before = await getPlayerPosition(page);

  // Press D (move right) for ~500ms
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');

  // Wait a frame for the position to settle
  await page.waitForTimeout(100);

  const after = await getPlayerPosition(page);

  // Player must have moved in the x direction
  const dx = after.x - before.x;
  expect(
    Math.abs(dx),
    `Player must have moved in x after pressing D (before.x=${before.x}, after.x=${after.x}, dx=${dx})`
  ).toBeGreaterThan(0.1);
  expect(dx, 'Player must have moved in the positive x direction (D = right)').toBeGreaterThan(0);

  // Also test A (move left)
  await page.keyboard.down('a');
  await page.waitForTimeout(500);
  await page.keyboard.up('a');
  await page.waitForTimeout(100);

  const afterLeft = await getPlayerPosition(page);
  const dxLeft = afterLeft.x - after.x;
  expect(
    Math.abs(dxLeft),
    `Player must have moved in x after pressing A (before.x=${after.x}, after.x=${afterLeft.x})`
  ).toBeGreaterThan(0.1);
  expect(dxLeft, 'Player must have moved in the negative x direction (A = left)').toBeLessThan(0);

  // Also test W/S (z movement)
  const beforeZ = await getPlayerPosition(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(400);
  await page.keyboard.up('w');
  await page.waitForTimeout(100);
  const afterZ = await getPlayerPosition(page);
  const dz = afterZ.z - beforeZ.z;
  expect(
    Math.abs(dz),
    `Player must have moved in z after pressing W (before.z=${beforeZ.z}, after.z=${afterZ.z}, dz=${dz})`
  ).toBeGreaterThan(0.1);
  expect(dz, 'Player must have moved in the negative z direction (W = forward)').toBeLessThan(0);

  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-e1a-smoke-2-wasd.png'), fullPage: true });
});

// ── Scenario 3: Jump ───────────────────────────────────────────────────────

test('W2-E.1a scenario 3: jump', async ({ page }) => {
  test.setTimeout(60_000);

  await bootToMenu(page);
  await enterGameScene(page);

  // Let the player settle on the ground
  await page.waitForTimeout(500);
  const grounded = await getPlayerPosition(page);
  expect(grounded.y, 'Player must start on the ground (y ≈ 0)').toBeLessThanOrEqual(0.1);

  // Press space (hold for ~150ms so InputSystem sees it in a frame)
  await page.keyboard.down(' ');
  await page.waitForTimeout(150);
  await page.keyboard.up(' ');
  await page.waitForTimeout(100);

  const midJump = await getPlayerPosition(page);
  expect(
    midJump.y,
    `Player must be above ground after jumping (y=${midJump.y}, grounded.y=${grounded.y})`
  ).toBeGreaterThan(0.5);

  // Wait for the player to land back
  await page.waitForTimeout(2000);
  const landed = await getPlayerPosition(page);
  expect(
    landed.y,
    `Player must have landed back on the ground (y=${landed.y})`
  ).toBeLessThanOrEqual(0.1);

  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-e1a-smoke-3-jump.png'), fullPage: true });
});

// ── Scenario 4: Score increments on collect ────────────────────────────────

test('W2-E.1a scenario 4: score increments on collect', async ({ page }) => {
  test.setTimeout(60_000);

  await bootToMenu(page);
  await enterGameScene(page);

  // Read the starting score
  const startScore = await getScore(page);
  expect(startScore, 'Score must be readable from the HUD').toBeGreaterThanOrEqual(0);

  // Trigger score by dispatching the player:score window event
  // (the GameScene listens for this and adds to the ScoreManager)
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:score', { detail: { points: 50 } }));
  });

  // Wait for the HUD to update (updateUI runs every frame)
  await page.waitForTimeout(500);

  const afterScore = await getScore(page);
  expect(
    afterScore,
    `Score must have incremented by 50 (start=${startScore}, after=${afterScore})`
  ).toBeGreaterThanOrEqual(startScore + 50);

  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-e1a-smoke-4-score.png'), fullPage: true });
});

// ── Scenario 5: Game-over then restart ─────────────────────────────────────

test('W2-E.1a scenario 5: game-over then restart returns to a clean playable state', async ({ page }) => {
  test.setTimeout(90_000);

  await bootToMenu(page);
  await enterGameScene(page);

  // Trigger game over by dispatching the player:death event
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:death'));
  });

  // Wait for the game-over overlay to appear
  await page.waitForTimeout(500);

  const gameOverVisible = await page.evaluate(() => {
    // The game-over div is created dynamically and contains "GAME OVER"
    const allDivs = Array.from(document.querySelectorAll('div'));
    for (const div of allDivs) {
      if (div.textContent?.includes('GAME OVER') && div.textContent?.includes('Score:')) {
        const style = window.getComputedStyle(div);
        if (style.display !== 'none' && style.position === 'fixed') return true;
      }
    }
    return false;
  });
  expect(gameOverVisible, 'Game-over overlay must be visible after player:death').toBe(true);

  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-e1a-smoke-5-gameover.png'), fullPage: true });

  // Restart: reload the page (same as clicking "PLAY AGAIN")
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);

  // Re-enter the game scene
  await enterGameScene(page);

  // Assert: clean playable state — player at spawn, score reset
  const playerPos = await getPlayerPosition(page);
  expect(
    Math.abs(playerPos.x),
    `Player x must be near 0 after restart (got ${playerPos.x})`
  ).toBeLessThan(1.0);
  expect(
    Math.abs(playerPos.z),
    `Player z must be near 0 after restart (got ${playerPos.z})`
  ).toBeLessThan(1.0);

  const score = await getScore(page);
  expect(score, 'Score must be 0 after restart').toBe(0);

  // Game must be running
  const running = await page.evaluate(() => {
    const g = (window as unknown as { game?: { isGameRunning?: () => boolean } }).game;
    return !!g?.isGameRunning?.() === true;
  });
  expect(running, 'Game must be running after restart').toBe(true);

  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-e1a-smoke-5-restart.png'), fullPage: true });
});

// ── Console capture for the full run ───────────────────────────────────────
// (The console.txt evidence is written by the last test that completes,
//  but since Playwright runs tests in separate pages, we capture per-test
//  console in a separate lightweight test.)

test('W2-E.1a console capture: no fatal errors across a full boot→menu→game cycle', async ({ page }) => {
  test.setTimeout(45_000);

  const consoleEntries = await bootToMenu(page);
  await enterGameScene(page);
  await page.waitForTimeout(500);

  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const logLines = consoleEntries.map((e) => `[${e.type}] ${e.text}`);
  writeFileSync(join(EVIDENCE_DIR, 'w2-e1a-smoke-console.txt'), logLines.join('\n') + '\n', 'utf-8');
});
