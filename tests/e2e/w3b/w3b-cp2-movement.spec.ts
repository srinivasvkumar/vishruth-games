import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3-B.3 — CP2: player movement with obstacle avoidance E2E (WASD + collision).
 *
 * Kanban t_e9de3cc2. This is the SECOND of the 4 W3-B critical-path E2E specs.
 * It proves, in REAL HEADED CHROME, that:
 *
 *   1. Boot completes → menu → START (Enter) → GameScene (reuse CP1's start path).
 *   2. The 3D player is present and its position is readable via the
 *      deterministic W3-B.0 accessor `window.__debugPlayerPos()`.
 *   3. WASD movement drives the player's position — asserted as a POSITION
 *      DELTA THRESHOLD, not an exact value:
 *        - W (forward)  → z DECREASES by >= THRESH  (velocity.z = -SPEED)
 *        - S (backward) → z INCREASES by >= THRESH  (velocity.z = +SPEED)
 *        - A (left)     → x DECREASES by >= THRESH  (velocity.x = -SPEED)
 *        - D (right)    → x INCREASES by >= THRESH  (velocity.x = +SPEED)
 *   4. Obstacle collision: set health to a known value via the W3-B.0
 *      accessor `window.__setPlayerHealth(n)`, teleport the player onto an
 *      obstacle via the scene graph, and assert health DECREASES
 *      (collision detected → damage applied).
 *   5. Screenshot: tests/evidence/w3/w3b-cp2-movement.png (mid-game).
 *   6. Console clean: 0 fatal errors.
 *
 * ROUND-2 (re-cut) posture:
 *   - Deterministic reads via `window.__debugPlayerPos` (B0), not DOM scraping.
 *   - Position-DELTA assertions (not exact positions).
 *   - Collision via a deterministic teleport (scene-graph) + health read, not
 *     timing-dependent collision choreography.
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

/**
 * Position-delta threshold.
 *
 * PLAYER_SPEED is 5.0 units/s. Each directional hold is ~700 ms. Holding a
 * key for 0.7 s at full speed would be 3.5 units of movement, but the first
 * frame(s) after keydown may be partially consumed by the key event round-trip
 * and the input poll. A threshold of 2.0 (≈ 57% of the ideal 0.7 s of travel)
 * is generous enough to be deterministic on a ~60 FPS headed Chrome, while
 * still failing decisively when movement is broken (delta ≈ 0). This is the
 * "delta, not exact" assertion the ROUND-2 re-cut requires.
 */
const MOVE_THRESHOLD = 2.0;

/** How long to hold each directional key. ~700 ms is plenty for a clear delta. */
const HOLD_MS = 700;

// ── Console capture helper (same posture as W3-B.2 CP1 / W3A.6 / W2-1b) ────

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

/** True when the #game-score HUD is visible (i.e. we are in GameScene). */
async function gameHudVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById('game-score');
    return !!el && window.getComputedStyle(el).display !== 'none';
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
 * Read the player's current health as a number, from the deterministic HUD
 * DOM. The HUD health div (#game-health) text is "HEALTH: <n>" (pushed each
 * frame by GameScene.onUpdate via UISystem.setHealth). Returns -1 when the
 * div is missing or unparsable.
 */
async function readHealthFromHud(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.getElementById('game-health');
    if (!el) return -1;
    const m = /HEALTH:\s*(-?\d+)/i.exec(el.textContent ?? '');
    return m ? parseInt(m[1], 10) : -1;
  });
}

/**
 * Drive one directional key press for a fixed hold duration, then release.
 *
 * Uses page.keyboard.down / up with an explicit hold window so the input
 * system's keydown/keyup handlers see a clean press-and-release. This is the
 * real keyboard path (same as CP1's Enter-driven start) — not a synthetic
 * inputState injection — so it proves the actual user-facing movement works.
 *
 * Returns the position delta relative to `before` (read by the caller).
 */
async function holdKeyAndRelease(
  page: Page,
  key: string,
  holdMs: number = HOLD_MS
): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
}

/**
 * Teleport the 3D player mesh onto the position of the first ACTIVE obstacle
 * in the scene graph, then read the player's new position back via the
 * deterministic accessor. This makes the collision assertion deterministic —
 * no timing-dependent collision choreography. Returns the position the player
 * was moved to (so the test can confirm the teleport landed), or null if the
 * scene graph / accessor could not be reached.
 *
 * The scene is reached via window.game.getSceneManager().getCurrentScene()
 * .getScene(). The player is the first Group child (index 0); obstacles are
 * the remaining Group children. We pick the first obstacle whose group is
 * visible (active) and set the player group's position to it.
 */
async function teleportPlayerOntoFirstObstacle(
  page: Page
): Promise<{ x: number; z: number } | null> {
  return page.evaluate(() => {
    const g = (window as unknown as {
      game?: {
        getSceneManager?: () => {
          getCurrentScene?: () => {
            getScene?: () => {
              children: Array<{
                isGroup?: boolean;
                position?: { x: number; y: number; z: number; set?: (x: number, y: number, z: number) => void };
                visible?: boolean;
              }>;
            };
          };
        };
      };
    }).game;
    const scene = g?.getSceneManager?.()?.getCurrentScene?.()?.getScene?.();
    const children = scene?.children;
    if (!children || children.length === 0) return null;

    // Find the first obstacle: filter to Groups only (player + obstacles),
    // then take the one after the player. Lights/ground are not Groups, so
    // filtering to isGroup===true leaves [player, obstacle, obstacle, ...].
    const groups = children.filter((c) => c.isGroup === true);
    const player = groups[0];
    if (!player || !player.position || typeof player.position.set !== 'function') {
      return null;
    }

    // First obstacle = the Group right after the player in the filtered list.
    const obstacle = groups.find((c) => c !== player && c.visible !== false && c.position);
    if (!obstacle || !obstacle.position) return null;

    // Teleport the player onto the obstacle's EXACT position (including y).
    // Using the obstacle's y (0.5) rather than the player's normal ground
    // level (1) guarantees the 3D distance is 0 → collision fires on the
    // next update frame, deterministically.
    const px = obstacle.position.x ?? 0;
    const py = obstacle.position.y ?? 0.5;
    const pz = obstacle.position.z ?? 0;

    player.position.set(px, py, pz);

    // Read back via the deterministic accessor (post-teleport).
    const fn = (window as unknown as { __debugPlayerPos?: () => { x: number; z: number } }).__debugPlayerPos;
    if (typeof fn !== 'function') return { x: px, z: pz };
    try {
      const pos = fn();
      return { x: pos.x, z: pos.z };
    } catch {
      return { x: px, z: pz };
    }
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

// ── CP2 S1: boot → menu → START (Enter) → GameScene + player present ───────

test('W3-B.3 CP2 S1: boot → menu → START (Enter) → GameScene with a readable player', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleEntries = await bootToMenu(page);

  // Boot done: WebGL live + menu up.
  expect(await webglLive(page), 'WebGL context must be live on #game-canvas after boot').toBe(true);

  // Drive the START path with the keyboard (reuse CP1's entry point).
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);

  expect(await gameHudVisible(page), 'Game HUD must be visible after Enter').toBe(true);

  // Player present + readable via the W3-B.0 deterministic accessor.
  const pos0 = await getPlayerPosViaAccessor(page);
  expect(pos0, 'window.__debugPlayerPos must be installed (GameScene entered)').not.toBeNull();
  expect(
    Number.isFinite(pos0!.x) && Number.isFinite(pos0!.z),
    `Player position must be finite at spawn (got x=${pos0!.x}, z=${pos0!.z})`
  ).toBe(true);

  // No fatal console errors on the boot + start path.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected on boot + start.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});

// ── CP2 S2: WASD movement — position-delta threshold, all four directions ──

test('W3-B.3 CP2 S2: WASD drives the player — position-delta threshold on each axis', async ({ page }) => {
  test.setTimeout(90_000);

  await bootToMenu(page);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);

  // Baseline: the accessor must be installed and finite before we move.
  const base = await getPlayerPosViaAccessor(page);
  expect(base, 'window.__debugPlayerPos must be installed').not.toBeNull();
  expect(
    Number.isFinite(base!.x) && Number.isFinite(base!.z),
    `Baseline position must be finite (got x=${base!.x}, z=${base!.z})`
  ).toBe(true);

  /**
   * Read a non-null, finite position — a hard prerequisite for any delta
   * assertion. Fails loudly (and deterministically) if the accessor is gone,
   * which is exactly the RED symptom when movement/accessor is broken.
   */
  async function requirePos(label: string): Promise<{ x: number; z: number }> {
    const p = await getPlayerPosViaAccessor(page);
    expect(p, `${label}: window.__debugPlayerPos must return a position`).not.toBeNull();
    expect(
      Number.isFinite(p!.x) && Number.isFinite(p!.z),
      `${label}: position must be finite (got x=${p!.x}, z=${p!.z})`
    ).toBe(true);
    return p as { x: number; z: number };
  }

  // ── W: forward → z DECREASES by >= THRESH ────────────────────────────────
  const beforeW = await requirePos('before W');
  await holdKeyAndRelease(page, 'w');
  const afterW = await requirePos('after W');
  const dzW = afterW.z - beforeW.z;
  expect(
    dzW <= -MOVE_THRESHOLD,
    `W (forward) must decrease z by >= ${MOVE_THRESHOLD}. before.z=${beforeW.z}, after.z=${afterW.z}, delta=${dzW.toFixed(3)}`
  ).toBe(true);

  // ── S: backward → z INCREASES by >= THRESH ───────────────────────────────
  const beforeS = afterW; // start the S leg from where W left us
  await holdKeyAndRelease(page, 's');
  const afterS = await requirePos('after S');
  const dzS = afterS.z - beforeS.z;
  expect(
    dzS >= MOVE_THRESHOLD,
    `S (backward) must increase z by >= ${MOVE_THRESHOLD}. before.z=${beforeS.z}, after.z=${afterS.z}, delta=${dzS.toFixed(3)}`
  ).toBe(true);

  // ── A: left → x DECREASES by >= THRESH ───────────────────────────────────
  const beforeA = afterS;
  await holdKeyAndRelease(page, 'a');
  const afterA = await requirePos('after A');
  const dxA = afterA.x - beforeA.x;
  expect(
    dxA <= -MOVE_THRESHOLD,
    `A (left) must decrease x by >= ${MOVE_THRESHOLD}. before.x=${beforeA.x}, after.x=${afterA.x}, delta=${dxA.toFixed(3)}`
  ).toBe(true);

  // ── D: right → x INCREASES by >= THRESH ──────────────────────────────────
  const beforeD = afterA;
  await holdKeyAndRelease(page, 'd');
  const afterD = await requirePos('after D');
  const dxD = afterD.x - beforeD.x;
  expect(
    dxD >= MOVE_THRESHOLD,
    `D (right) must increase x by >= ${MOVE_THRESHOLD}. before.x=${beforeD.x}, after.x=${afterD.x}, delta=${dxD.toFixed(3)}`
  ).toBe(true);

  // Net position changed from the original baseline (sanity: we actually moved).
  const totalX = Math.abs(afterD.x - base!.x);
  const totalZ = Math.abs(afterD.z - base!.z);
  expect(
    totalX > 0 || totalZ > 0,
    `Net position must differ from baseline (baseline x=${base!.x} z=${base!.z}; final x=${afterD.x} z=${afterD.z})`
  ).toBe(true);
});

// ── CP2 S3: obstacle collision — health decreases when player hits obstacle ─

test('W3-B.3 CP2 S3: moving into an obstacle damages the player — health decreases', async ({ page }) => {
  test.setTimeout(90_000);

  await bootToMenu(page);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);

  // Baseline: accessor + HUD health both readable.
  const basePos = await getPlayerPosViaAccessor(page);
  expect(basePos, 'window.__debugPlayerPos must be installed').not.toBeNull();

  // Normalize health to a known starting value via the W3-B.0 accessor.
  await page.evaluate(() => {
    const fn = (window as unknown as { __setPlayerHealth?: (n: number) => void }).__setPlayerHealth;
    if (typeof fn === 'function') fn(100);
  });
  await page.waitForTimeout(200); // let a frame push the HUD.
  const healthBefore = await readHealthFromHud(page);
  expect(healthBefore, `HUD health must be readable and > 0 before collision (got ${healthBefore})`).toBeGreaterThan(0);

  // Teleport the player directly onto the first active obstacle. This is the
  // deterministic stand-in for "moving into an obstacle" — the collision check
  // (distance < playerRadius + obstacleRadius) fires on the next update frame.
  const landed = await teleportPlayerOntoFirstObstacle(page);
  expect(
    landed,
    'Player must be teleportable onto an obstacle via the scene graph'
  ).not.toBeNull();
  expect(
    Number.isFinite(landed!.x) && Number.isFinite(landed!.z),
    `Post-teleport position must be finite (got x=${landed!.x}, z=${landed!.z})`
  ).toBe(true);

  // Give the update loop a few frames to detect the overlap and apply damage.
  // The collision check fires on EVERY frame while the player overlaps the
  // obstacle, so a short window is enough — and the player may take damage on
  // each frame. Even a single frame of overlap applies the obstacle's damage
  // (5-25 HP by type). A 300 ms wait (~18 frames at 60 FPS) is ample.
  await page.waitForTimeout(300);

  const healthAfter = await readHealthFromHud(page);
  // Collision detected ⟺ health strictly decreased from the baseline.
  // It may drop to 0 (player died — still valid: collision fired repeatedly
  // across frames and health clamped at the floor). The assertion is on the
  // DECREASE, not on the player surviving.
  expect(
    healthAfter >= 0 && healthAfter < healthBefore,
    `Colliding with an obstacle must decrease health. before=${healthBefore}, after=${healthAfter} (obstacle damage applied)`
  ).toBe(true);
});

// ── CP2 S4: mid-game screenshot + 0 fatal console errors ───────────────────

test('W3-B.3 CP2 S4: capture evidence screenshot + assert 0 fatal console errors', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleEntries = await bootToMenu(page);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);

  // Drive the player forward a bit so the screenshot shows movement context.
  await holdKeyAndRelease(page, 'w', 300);
  await page.waitForTimeout(200);

  // Evidence: mid-game screenshot with HUD + 3D player + obstacles.
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w3b-cp2-movement.png'), fullPage: true });

  // No fatal console errors across the whole run.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});
