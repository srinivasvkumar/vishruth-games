import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3-B.5 — CP4: game over and restart cycle E2E (death → GameOver →
 * RESTART → 2nd run).
 *
 * Kanban t_7eb54b12. Fourth of the 4 W3-B critical-path E2E specs. It
 * proves, in REAL HEADED CHROME, that the full restart cycle works
 * end-to-end:
 *
 *   1. Boot → menu → START (Enter) → GameScene (CP1's start path).
 *   2. DEATH → GameOverScene active (#gameover-restart-button visible,
 *      #gameover-final-score + #gameover-high-score both valid integers).
 *   3. RESTART (click #gameover-restart-button — primary user-facing
 *      path) → MenuScene active again (#menu-start-button attached +
 *      visible + ENABLED — the W3-A.7 / BUG-W2-1a re-arm guard).
 *   4. 2nd run (Enter) → GameScene active again (HUD up, player in the
 *      scene graph via __debugPlayerPos, fresh full health).
 *   5. Screenshot: tests/evidence/w3/w3b-cp4-restart.png (mid-2nd-run).
 *   6. 0 fatal console errors across the whole cycle.
 *
 * ── DEATH-TRIGGER NOTE (round-2 verification, 2026-09-19) ──────────────
 * The task designates `window.__setPlayerHealth(0)` (B0) as the PRIMARY
 * deterministic death path. S1 uses exactly that path. ROUND-2 in-browser
 * verification found a BLOCKER at the B0 level: `Player.setHealth(0)` →
 * `die()` sets isAlive=false but (a) only decrements `lives` (3→2) and
 * (b) never dispatches `GameEvents.PLAYER_DEATH`; `GameScene.onUpdate()`
 * then early-returns on `!isPlayerAlive()` before its own health-0 check
 * ever runs. Result: the designated path never transitions to
 * GameOverScene (verified in headed Chrome: no "game over" log, scene
 * stays GameScene, #gameover-restart-button absent). The downstream
 * restart cycle (S2/S3) is therefore driven to GameOver via the
 * `player:death` event — the path `GameScene.setupEventListeners()`
 * actually subscribes to (`this.gameOver()` on `PLAYER_DEATH`). That path
 * IS verified working in headed Chrome (gameOver() fires, transition
 * resolves, GameOverScene active with scores displayed).
 *
 * Net: S1 RED = the designated death trigger does not reach GameOver
 * (B0 blocker, evidence for the fix card). S2/S3 GREEN = the restart
 * cycle itself (RESTART → menu re-arm → 2nd run) works end-to-end when
 * GameOver is reached by any trigger.
 *
 * Spec lives under tests/e2e/w3b/ (the dedicated `w3b` Playwright
 * project, testDir ./tests/e2e/w3b). Chrome-only, headed.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', '..', 'evidence', 'w3');
const APP_URL = 'http://localhost:5173/public/index.html';

// The window event name GameScene.setupEventListeners() subscribes to for
// game-over. Kept literal (not imported from Constants) so the spec stays
// a pure browser-side driver with no build-time coupling to src/.
const PLAYER_DEATH_EVENT = 'player:death';

// ── Console capture helper (same posture as CP1 / CP2 / CP3) ───────────────

interface ConsoleEntry {
  type: string;
  text: string;
}

/**
 * Capture console + pageerror + requestfailed on `page` into a closure
 * array. The CP4 cycle is long (boot → start → death → gameover → restart
 * → menu → 2nd run), so S3 mirrors the entries into window.__cp4Console
 * (via mirrorConsoleToWindow) after the cycle, letting the fatal-error
 * assertion re-read the full cycle via page.evaluate().
 */
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
 * Fatal-error filter (same posture as CP1/CP2/CP3). AudioContext autoplay
 * warning is NON-FATAL + expected (AudioContext lazily created on first
 * input); the boot-manifest fetch 404 is by-design until asset manifests
 * land. Everything else in error/pageerror/requestfailed is fatal.
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

// ── Boot + state helpers ────────────────────────────────────────────────────

/**
 * Boot to the menu scene; return console entries for fatal-error checks.
 * Arms the in-page store window.__cp4Console = [] so mirrorConsoleToWindow
 * can accumulate the full cycle's entries where S3 reads them back.
 */
async function bootToMenu(page: Page): Promise<ConsoleEntry[]> {
  await page.addInitScript(() => {
    (window as unknown as { __cp4Console?: ConsoleEntry[] }).__cp4Console = [];
  });
  const consoleEntries = captureConsole(page);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
  return consoleEntries;
}

/**
 * Mirror closure-captured console entries into the in-page store
 * (window.__cp4Console) so S3 can read the full cycle back via
 * page.evaluate() after the restart cycle completes.
 */
async function mirrorConsoleToWindow(page: Page, entries: ConsoleEntry[]): Promise<void> {
  await page.evaluate((list) => {
    const store = (window as unknown as { __cp4Console?: ConsoleEntry[] }).__cp4Console;
    if (Array.isArray(store)) store.push(...list);
  }, entries);
}

/** Read the in-page console store (window.__cp4Console), or [] if absent. */
async function collectPageConsole(page: Page): Promise<ConsoleEntry[]> {
  return page.evaluate(() => {
    const store = (window as unknown as { __cp4Console?: ConsoleEntry[] }).__cp4Console;
    return store ?? [];
  });
}

/** True when the menu container is attached AND visible. */
async function menuVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById('menu-container');
    return !!el && window.getComputedStyle(el).display !== 'none';
  });
}

/**
 * Boot → menu → START (Enter) → GameScene (CP1's start path). Returns
 * console entries.
 */
async function startGame(page: Page): Promise<ConsoleEntry[]> {
  const consoleEntries = await bootToMenu(page);
  expect(await menuVisible(page), 'Must start on the menu').toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);
  return consoleEntries;
}

/**
 * Read the W3-B.0 debug accessors' state: whether __setPlayerHealth and
 * __debugPlayerPos are installed, the player's aliveness, and the HUD
 * health. Used by S1 to capture the exact post-death state as evidence
 * (proving the accessor ran and marked the player dead, even though the
 * scene transition — the thing under test — did not happen).
 */
async function readDeathState(page: Page): Promise<{
  setPlayerHealthInstalled: boolean;
  debugPlayerPosInstalled: boolean;
  isPlayerAlive: boolean | null;
  hudHealth: number;
  gameScoreVisible: boolean;
  gameoverRestartVisible: boolean;
}> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __setPlayerHealth?: (n: number) => void;
      __debugPlayerPos?: () => { x: number; z: number } | null;
      game?: {
        getSceneManager?: () => {
          getCurrentScene?: () => {
            getPlayer?: () => { isPlayerAlive?: () => boolean } | null;
          } | null;
        } | null;
      };
    };
    const setInstalled = typeof w.__setPlayerHealth === 'function';
    const posInstalled = typeof w.__debugPlayerPos === 'function';
    // Reach the live player via the SceneManager's current scene.
    let alive: boolean | null = null;
    try {
      const sm = w.game?.getSceneManager?.();
      const gs = sm?.getCurrentScene?.();
      const p = gs?.getPlayer?.();
      if (p && typeof p.isPlayerAlive === 'function') alive = p.isPlayerAlive();
    } catch {
      alive = null;
    }
    const healthEl = document.getElementById('game-health');
    const m = healthEl ? /HEALTH:\s*(-?\d+)/i.exec(healthEl.textContent ?? '') : null;
    const hudHealth = m ? parseInt(m[1], 10) : -1;
    const scoreEl = document.getElementById('game-score');
    const restartEl = document.getElementById('gameover-restart-button');
    const vis = (el: Element | null) => !!el && window.getComputedStyle(el).display !== 'none';
    return {
      setPlayerHealthInstalled: setInstalled,
      debugPlayerPosInstalled: posInstalled,
      isPlayerAlive: alive,
      hudHealth,
      gameScoreVisible: vis(scoreEl),
      gameoverRestartVisible: vis(restartEl),
    };
  });
}

/**
 * Trigger DETERMINISTIC death via the W3-B.0 accessor (the task's
 * designated PRIMARY path). Returns true when the accessor was installed
 * and called; false otherwise.
 */
async function setPlayerHealthZero(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const fn = (window as unknown as { __setPlayerHealth?: (n: number) => void }).__setPlayerHealth;
    if (typeof fn !== 'function') return false;
    try {
      fn(0);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Drive the GameOver transition via the `player:death` window event — the
 * path GameScene.setupEventListeners() actually subscribes to. This is the
 * round-2 workaround for the B0 blocker (see DEATH-TRIGGER NOTE). It exists
 * so the downstream restart cycle (S2/S3) can be tested in real Chrome
 * despite the designated accessor path not reaching GameOver.
 */
async function dispatchPlayerDeath(page: Page): Promise<void> {
  await page.evaluate((evtName) => {
    window.dispatchEvent(new CustomEvent(evtName));
  }, PLAYER_DEATH_EVENT);
}

/** Read #gameover-final-score text (or null when absent). */
async function getGameOverFinalScore(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.getElementById('gameover-final-score');
    return el ? el.textContent : null;
  });
}

/** Read #gameover-high-score text (or null when absent). */
async function getGameOverHighScore(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.getElementById('gameover-high-score');
    return el ? el.textContent : null;
  });
}

/**
 * Read the player position from the W3-B.0 debug accessor. Returns null
 * when the accessor is not installed or not finite (i.e. GameScene has
 * not entered, or the run state is broken).
 */
async function getPlayerPosViaAccessor(
  page: Page
): Promise<{ x: number; z: number } | null> {
  return page.evaluate(() => {
    const fn = (window as unknown as { __debugPlayerPos?: () => { x: number; z: number } }).__debugPlayerPos;
    if (typeof fn !== 'function') return null;
    try {
      const pos = fn();
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.z)) {
        return { x: pos.x, z: pos.z };
      }
      return null;
    } catch {
      return null;
    }
  });
}

/** Read HUD health from #game-health ("HEALTH: n"); -1 when unreadable. */
async function readHealthFromHud(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.getElementById('game-health');
    if (!el) return -1;
    const m = /HEALTH:\s*(-?\d+)/i.exec(el.textContent ?? '');
    return m ? parseInt(m[1], 10) : -1;
  });
}

/**
 * The W3-A.7 / BUG-W2-1a guard: #menu-start-button must be attached,
 * visible, and ENABLED. After a full run the MenuScene start-guard is
 * disarmed (disabled) at start time; MenuScene.onExit() must re-arm it
 * when we return from the game. A stuck-disabled button is exactly the
 * BUG-W2-1a symptom (second run completely broken) that S2 exists to
 * catch.
 */
async function menuStartButtonState(
  page: Page
): Promise<{ attached: boolean; visible: boolean; disabled: boolean | null }> {
  return page.evaluate(() => {
    const el = document.getElementById('menu-start-button') as HTMLButtonElement | null;
    if (!el) return { attached: false, visible: false, disabled: null };
    return {
      attached: true,
      visible: window.getComputedStyle(el).display !== 'none',
      disabled: el.disabled,
    };
  });
}

// ── CP4 S1: designated death trigger (__setPlayerHealth(0)) → GameOver ────
//
// PRIMARY path per task design. ROUND-2 VERIFICATION: this is expected to
// RED because the B0 death trigger does not transition to GameOver (see
// DEATH-TRIGGER NOTE). The failure is captured as evidence for the B0 fix
// card; the test is written to assert the intended behavior so it will go
// GREEN once the trigger is fixed.

test('W3-B.5 CP4 S1: __setPlayerHealth(0) → GameOverScene active (final + high score displayed)', async ({ page }) => {
  test.setTimeout(90_000);

  const consoleEntries = await startGame(page);
  const pos0 = await getPlayerPosViaAccessor(page);
  expect(pos0, 'window.__debugPlayerPos must be installed (GameScene entered)').not.toBeNull();

  // DETERMINISTIC DEATH (designated primary path): drive the B0 accessor.
  await page.evaluate(() => window.focus());
  const applied = await setPlayerHealthZero(page);
  expect(applied, 'window.__setPlayerHealth must be installed (B0 accessor)').toBe(true);

  // Give the update loop generous settle time for the transition to
  // complete (the scene transition is async).
  await page.waitForTimeout(2000);

  // Capture the post-death state as evidence regardless of outcome.
  const deathState = await readDeathState(page);
  console.log(
    `[CP4 S1] post-death state: ${JSON.stringify(deathState)}`
  );

  // GameOverScene must be active (async transition; selector waits).
  await page.waitForSelector('#gameover-restart-button', { timeout: 8_000, state: 'visible' });
  await page.waitForTimeout(300); // let setupUI + LEVEL_START handler settle.

  // GameOverScene DOM: container + restart button visible.
  const containerVisible = await page.evaluate(() => {
    const el = document.getElementById('gameover-container');
    return !!el && window.getComputedStyle(el).display !== 'none';
  });
  expect(containerVisible, '#gameover-container must be visible (GameOverScene active)').toBe(true);
  await expect(page.locator('#gameover-restart-button'), 'RESTART button must be visible').toBeVisible();

  // W3-A.8: final score + high score displayed as valid integers.
  const finalScore = await getGameOverFinalScore(page);
  expect(
    finalScore !== null && /^\d+$/.test(finalScore.trim()),
    `#gameover-final-score must display a valid integer (got ${JSON.stringify(finalScore)})`
  ).toBe(true);

  const highScore = await getGameOverHighScore(page);
  expect(
    highScore !== null && /^\d+$/.test(highScore.trim()),
    `#gameover-high-score must display a valid integer (got ${JSON.stringify(highScore)})`
  ).toBe(true);

  // No fatal console errors on the boot → start → death path.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected up to GameOver.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});

// ── CP4 S2: RESTART → MenuScene active + start button re-armed ─────────────
//
// Drives GameOver via the player:death event (round-2 workaround; the
// designated accessor path is broken at the B0 level). Tests the RESTART →
// menu re-arm cycle that S1's failure leaves untested.

test('W3-B.5 CP4 S2: RESTART → MenuScene active, #menu-start-button re-armed (W3-A.7 guard)', async ({ page }) => {
  test.setTimeout(90_000);

  // Fresh page; reach GameOver via the working death path.
  const consoleEntries = await startGame(page);
  const pos0 = await getPlayerPosViaAccessor(page);
  expect(pos0, 'window.__debugPlayerPos must be installed (GameScene entered)').not.toBeNull();
  await page.evaluate(() => window.focus());
  await dispatchPlayerDeath(page);
  await page.waitForSelector('#gameover-restart-button', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(300);

  // Click the RESTART button (primary user-facing path).
  await page.click('#gameover-restart-button');

  // MenuScene must be active again.
  await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(300);
  expect(await menuVisible(page), '#menu-container must be visible after RESTART').toBe(true);

  // W3-A.7 / BUG-W2-1a guard: the start button must be re-armed.
  const startBtn = await menuStartButtonState(page);
  expect(startBtn.attached, '#menu-start-button must be attached').toBe(true);
  expect(startBtn.visible, '#menu-start-button must be visible').toBe(true);
  expect(
    startBtn.disabled === false,
    `#menu-start-button must be ENABLED after a full run (W3-A.7 re-arm; BUG-W2-1a). got disabled=${JSON.stringify(startBtn.disabled)}`
  ).toBe(true);

  // No fatal console errors on the cycle up to menu re-entry.
  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected on the RESTART cycle.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});

// ── CP4 S3: 2nd run → GameScene active again + evidence + console clean ────
//
// Full cycle: boot → start → death (player:death) → gameover → restart →
// menu → 2nd start → game. Screenshots mid-2nd-run; asserts 0 fatal console
// errors across the ENTIRE cycle.

test('W3-B.5 CP4 S3: 2nd run after RESTART → GameScene active again (fresh run, HUD up, screenshot)', async ({ page }) => {
  test.setTimeout(120_000);

  // Full cycle on one page: boot → start → death (working path) → gameover.
  const consoleEntries = await startGame(page);
  await page.evaluate(() => window.focus());
  await dispatchPlayerDeath(page);
  await page.waitForSelector('#gameover-restart-button', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(300);

  // RESTART → menu.
  await page.click('#gameover-restart-button');
  await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(300);

  // The start button MUST be enabled for the 2nd run to be startable
  // (W3-A.7 re-arm — the regression this whole card guards).
  const startBtn = await menuStartButtonState(page);
  expect(
    startBtn.disabled === false,
    `#menu-start-button must be ENABLED for the 2nd run (got disabled=${JSON.stringify(startBtn.disabled)})`
  ).toBe(true);

  // Start the 2nd run via the keyboard (Enter — same entry point as run 1).
  await page.keyboard.press('Enter');

  // GameScene must be active again: HUD up.
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);

  const hudVisible = await page.evaluate(() => {
    const el = document.getElementById('game-score');
    return !!el && window.getComputedStyle(el).display !== 'none';
  });
  expect(hudVisible, 'Game HUD (#game-score) must be visible in the 2nd run').toBe(true);

  // Player in the scene graph + readable (fresh run state).
  const pos1 = await getPlayerPosViaAccessor(page);
  expect(pos1, 'window.__debugPlayerPos must be installed in the 2nd run').not.toBeNull();
  expect(
    Number.isFinite(pos1!.x) && Number.isFinite(pos1!.z),
    `2nd-run player position must be finite (got x=${pos1!.x}, z=${pos1!.z})`
  ).toBe(true);

  // Fresh run: full health on the HUD (resetRunState() restores it).
  const health = await readHealthFromHud(page);
  expect(
    health > 0,
    `2nd-run HUD health must be > 0 after reset (got ${health})`
  ).toBe(true);

  // Evidence: screenshot with the 2nd run live on screen.
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w3b-cp4-restart.png') });

  // No fatal console errors across the ENTIRE cycle (boot → start → death
  // → gameover → restart → menu → 2nd start → game). Mirror the closure
  // entries into the in-page store first, then filter.
  await mirrorConsoleToWindow(page, consoleEntries);
  const cycleEntries = await collectPageConsole(page);
  const fatal = filterFatalErrors(cycleEntries);
  expect(
    fatal.length,
    `No fatal console errors expected across the full restart cycle.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});
