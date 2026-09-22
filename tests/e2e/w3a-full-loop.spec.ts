import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3A.6 — In-browser verify of the FULL game loop (headed Chromium).
 *
 * Kanban t_b08d3752. Verifies in a REAL browser:
 *   menu -> game (HUD) -> game-over -> menu -> game
 * with a screenshot at every stage, plus:
 *   (1) HIGH-SCORE RELOAD-PERSISTENCE (boss-mandated): a run that sets a
 *       new high score must survive a full page reload in the menu panel.
 *   (2) UISYSTEM-OWNERSHIP probe (boss-mandated): document.createElement is
 *       spied so we can prove whether the HUD divs come from GameScene's
 *       hand-rolled setupUI() (D2 violation) or from UISystem.
 *
 * Evidence (tests/evidence/w3/):
 *   w3a6-menu.png / w3a6-game-hud.png / w3a6-gameover.png / w3a6-restart.png
 *   w3a6-console-chrome.txt
 *
 * Design notes (from reading the source at 6955226):
 *   - The FSM (src/core/State.ts) transitions are NOT called by scene
 *     switches: MenuScene->game, death->gameover, restart->menu all go
 *     through SceneManager.loadScene() and the FSM stays 'playing'.
 *     isGameRunning() therefore stays true across the whole loop. The
 *     spec asserts that explicitly (loop liveness), not the FSM string.
 *   - GameOverScene.onEnter() never reads the switchScene data payload —
 *     #gameover-final-score displays the default 0. The spec captures the
 *     level:start data (which DOES carry {score, highScore}) and records
 *     the data-vs-display mismatch as defect D-A6-1.
 *   - GameScene.setupUI() creates the HUD divs in the CONSTRUCTOR (before
 *     boot reaches the menu), so the in-page createElement spy (installed
 *     via addInitScript before app scripts run) captures their origin.
 *
 * IMPORTANT: the addInitScript spy is installed per page BEFORE navigation.
 * The test-ordering below matters: each test boots a fresh page, so the
 * spy is re-registered on page creation via a beforeAll hook on `page`.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w3');
const APP_URL = 'http://localhost:5173/public/index.html';
const BROWSER = process.env.BROWSER ?? 'chrome';
const HIGH_SCORE_KEY = 'cluster-rush-high-score';

// The in-page spy: wraps document.createElement to log every created
// element's tag + id + creator stack frame. Runs before any app script.
const INIT_SPY = `(() => {
  if (window.__w3a6Installed) return;
  window.__w3a6Installed = true;
  const log = [];
  window.__w3a6 = log;
  const orig = document.createElement.bind(document);
  document.createElement = function (tag, opts) {
    const el = orig(tag, opts);
    try {
      // The HUD divs get their id stamped AFTER createElement
      // (scoreElement.id = 'game-score'), so capture a delayed snapshot:
      // record the node now, and also re-read its id on the next tick.
      const stack = new Error('w3a6').stack || '';
      const entry = { tag: String(tag), ids: [], stack: stack.slice(0, 2000) };
      log.push(entry);
      requestAnimationFrame(() => {
        const id = el.id ? String(el.id) : '';
        if (id) entry.ids = [id];
      });
    } catch (e) { /* never break page code */ }
    return el;
  };
})();`;

function installSpy(page: Page): void {
  page.addInitScript(INIT_SPY);
}

// ── Console capture ────────────────────────────────────────────────────────

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

function filterFatalErrors(entries: ConsoleEntry[]): ConsoleEntry[] {
  return entries.filter((e) => {
    if (e.type === 'pageerror') return true;
    if (e.type === 'requestfailed') {
      // The boot manifest fetch 404s by design (asset manifests land in W3
      // Day 8); everything else failing is fatal.
      return !e.text.includes('manifest');
    }
    if (e.type === 'error') {
      const t = e.text.toLowerCase();
      return t.includes('uncaught') || t.includes('cors') || t.includes('webgl context lost');
    }
    return false;
  });
}

// ── Boot + transition helpers ──────────────────────────────────────────────

async function bootToMenu(page: Page): Promise<ConsoleEntry[]> {
  installSpy(page);
  const consoleEntries = captureConsole(page);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
  return consoleEntries;
}

async function menuVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById('menu-container');
    return !!el && window.getComputedStyle(el).display !== 'none';
  });
}

async function gameHudVisible(page: Page): Promise<{ score: boolean; health: boolean; level: boolean }> {
  return page.evaluate(() => {
    const vis = (id: string): boolean => {
      const el = document.getElementById(id);
      return !!el && window.getComputedStyle(el).display !== 'none';
    };
    return { score: vis('game-score'), health: vis('game-health'), level: vis('game-level') };
  });
}

async function gameoverVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById('gameover-container');
    return !!el && window.getComputedStyle(el).display !== 'none';
  });
}

async function getGameState(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const g = (window as unknown as { game?: { getGameState?: () => string } }).game;
    return g?.getGameState ? g.getGameState() : null;
  });
}

async function getHudText(page: Page): Promise<{ score: string; health: string; level: string }> {
  return page.evaluate(() => ({
    score: document.getElementById('game-score')?.textContent ?? '',
    health: document.getElementById('game-health')?.textContent ?? '',
    level: document.getElementById('game-level')?.textContent ?? '',
  }));
}

async function readScoreFromHud(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.getElementById('game-score');
    const m = el?.textContent?.match(/SCORE:\s*(\d+)/);
    return m ? Number.parseInt(m[1], 10) : -1;
  });
}

// ── Scenario 1: boot to menu ───────────────────────────────────────────────

test('W3A.6 S1: boot lands on the menu with title + START + HIGH SCORES', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleEntries = await bootToMenu(page);

  const menu = await menuVisible(page);
  expect(menu, 'Menu container must be visible after boot').toBe(true);

  const parts = await page.evaluate(() => ({
    title: document.querySelector('#menu-container')?.textContent?.includes('CLUSTER RUSH') ?? false,
    start: !!document.getElementById('menu-start-button'),
    high: !!document.getElementById('menu-high-score'),
    webgl: (() => {
      const c = document.getElementById('game-canvas') as HTMLCanvasElement | null;
      return !!c && !!(c.getContext('webgl2') || c.getContext('webgl'));
    })(),
    running: (() => {
      const g = (window as unknown as { game?: { isGameRunning?: () => boolean } }).game;
      return !!g?.isGameRunning?.();
    })(),
  }));
  expect(parts.title, 'Menu must show the CLUSTER RUSH title').toBe(true);
  expect(parts.start, 'Menu must have a START button').toBe(true);
  expect(parts.high, 'Menu must have the HIGH SCORES panel').toBe(true);
  expect(parts.webgl, 'WebGL context must be live on #game-canvas').toBe(true);
  expect(parts.running, 'window.game must be running after boot').toBe(true);

  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors on boot.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, `w3a6-menu-${BROWSER}.png`), fullPage: true });
});

// ── Scenario 2: menu -> game (keyboard start) + HUD + ownership probe ─────

test('W3A.6 S2: START via Enter enters game; HUD visible; HUD divs originate from GameScene (D2 probe)', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleEntries = await bootToMenu(page);

  // Press Enter on the menu to start (MenuScene keydown -> switchScene('game')).
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(400);

  const hud = await gameHudVisible(page);
  expect(hud.score, '#game-score must be visible in game').toBe(true);
  expect(hud.health, '#game-health must be visible in game').toBe(true);
  expect(hud.level, '#game-level must be visible in game').toBe(true);
  expect(await menuVisible(page), 'Menu must be hidden in game').toBe(false);

  const hudText = await getHudText(page);
  expect(hudText.score, 'Score HUD must read "SCORE: 0"').toMatch(/^SCORE:\s*0\b/);
  expect(hudText.health, 'Health HUD must read "HEALTH: 100"').toMatch(/^HEALTH:\s*100\b/);
  expect(hudText.level, 'Level HUD must read "LEVEL: 1"').toMatch(/^LEVEL:\s*1\b/);

  // UISYSTEM-OWNERSHIP probe (boss #2): read the in-page spy log. HUD divs
  // were created in GameScene's constructor (during initGame), so their ids
  // have been stamped by now and the rAF re-read has populated entry.ids.
  const origin = await page.evaluate(() => {
    const log = (window as unknown as { __w3a6?: Array<{ tag: string; ids: string[]; stack: string }> }).__w3a6;
    if (!log) return null;
    const hudIds = ['game-score', 'game-health', 'game-level'];
    const attributed = new Map<string, string>();
    for (const entry of log) {
      for (const id of entry.ids) {
        if (hudIds.includes(id) && !attributed.has(id)) {
          attributed.set(id, entry.stack.slice(0, 500));
        }
      }
    }
    return {
      logLength: log.length,
      hudIdsFound: Array.from(attributed.keys()),
      stacks: Object.fromEntries(attributed),
    };
  });
  expect(origin, 'createElement spy log missing — addInitScript did not install').not.toBeNull();
  expect(origin!.logLength, 'Spy must have captured DOM creations').toBeGreaterThan(0);
  // The three HUD divs must all be present in the spy log with ids stamped.
  expect(origin!.hudIdsFound, `Spy must have captured the HUD div creations (got: ${JSON.stringify(origin!.hudIdsFound)})`).toEqual(
    expect.arrayContaining(['game-score', 'game-health', 'game-level'])
  );
  // D2 check (UPDATED 2026-09-22, post W3-A.1): HUD ownership moved to
  // UISystem by design (D2 ruling at commit time was superseded — W3-A.1
  // introduced UISystem.createHud() and GameScene delegates to it). The
  // probe now asserts the OPPOSITE of the original: HUD divs ARE created
  // by UISystem and NOT by GameScene. The creation happens at Game
  // construction (initGame), so the stacks point into UISystem/Game.
  const allStacks = Object.values(origin!.stacks).join('\n');
  const uiSystemInHudStacks = allStacks.includes('UISystem');
  const gameSceneInHudStacks = allStacks.includes('GameScene');
  expect(uiSystemInHudStacks, 'HUD divs ARE owned by UISystem (W3-A.1 D2) — creation must attribute to UISystem').toBe(true);
  expect(gameSceneInHudStacks, 'GameScene must NOT create the HUD divs (UISystem owns them)').toBe(false);
  console.log(`W3A6 S2 ownership: hudIds=${origin!.hudIdsFound.join(',')} log=${origin!.logLength} gameScene=${gameSceneInHudStacks} uiSystem=${uiSystemInHudStacks}`);

  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors in S2.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  await page.screenshot({ path: join(EVIDENCE_DIR, `w3a6-game-hud-${BROWSER}.png`), fullPage: true });
});

// ── Scenario 2b: W2-1b regression — START path re-arms after a run ─────────

test('W2-1b regression: START button works after returning from a run (BUG-W2-1a guard re-arms)', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleEntries = await bootToMenu(page);

  // First run: start via keyboard.
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(400);

  // End the run via death (transitions to gameover).
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:death'));
  });
  await page.waitForSelector('#gameover-container', { timeout: 10_000, state: 'visible' });

  // Back to the menu.
  await page.click('#gameover-restart-button');
  await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(400);

  // BUG-W2-1a: the start guard should have re-armed. The START button
  // must be enabled again and a second Enter/click must start a fresh run.
  const btnEnabled = await page.evaluate(() => {
    const b = document.getElementById('menu-start-button') as HTMLButtonElement | null;
    return !!(b && !b.disabled);
  });
  expect(btnEnabled, 'START button must be re-enabled after returning to the menu (BUG-W2-1a guard re-arm)').toBe(true);

  // Second run: start via the BUTTON this time (mouse path).
  await page.click('#menu-start-button');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(400);

  const hud = await gameHudVisible(page);
  expect(hud.score && hud.health && hud.level, 'HUD must be visible in the second run').toBe(true);
  const fresh = await getHudText(page);
  expect(fresh.score, 'Second run must start at score 0').toMatch(/^SCORE:\s*0\b/);
  expect(fresh.level, 'Second run must start at level 1').toMatch(/^LEVEL:\s*1\b/);

  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors in W2-1b regression.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  await page.screenshot({ path: join(EVIDENCE_DIR, `w2-1b-rearm-${BROWSER}.png`), fullPage: true });
});

// ── Scenario 3: death -> game-over scene + score handoff probe ─────────────

test('W3A.6 S3: player:death transitions to the GameOver scene; final-score handoff recorded', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleEntries = await bootToMenu(page);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });

  // Score something so the death carries a non-zero score.
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:score', { detail: { points: 150 } }));
  });
  await page.waitForTimeout(500);
  const scoreBeforeDeath = await readScoreFromHud(page);
  expect(scoreBeforeDeath, 'Score must have been added before death').toBeGreaterThanOrEqual(150);

  // Capture the level:start data payload that GameScene.gameOver() passes
  // to switchScene('gameover', {score, highScore}).
  await page.evaluate(() => {
    (window as unknown as { __w3a6LevelStart?: unknown }).__w3a6LevelStart = null;
    window.addEventListener('level:start', (e) => {
      const ev = e as CustomEvent;
      const detail = ev.detail as { name?: string; data?: Record<string, unknown> } | undefined;
      if (detail?.name === 'gameover') {
        (window as unknown as { __w3a6LevelStart?: unknown }).__w3a6LevelStart = detail.data ?? null;
      }
    });
  });

  // Trigger the death path exactly as the game does.
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:death'));
  });

  await page.waitForSelector('#gameover-container', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(300);
  expect(await gameoverVisible(page), 'GameOver scene must be visible after death').toBe(true);
  expect(await menuVisible(page), 'Menu must be hidden in the game-over scene').toBe(false);
  const hud = await gameHudVisible(page);
  expect(hud.score, 'Game HUD must be hidden in the game-over scene').toBe(false);

  const display = await page.evaluate(() => ({
    final: document.getElementById('gameover-final-score')?.textContent ?? null,
    high: document.getElementById('gameover-high-score')?.textContent ?? null,
    restart: !!document.getElementById('gameover-restart-button'),
  }));
  expect(display.restart, 'GameOver must have a RESTART button').toBe(true);

  const handoff = await page.evaluate(() => {
    const data = (window as unknown as { __w3a6LevelStart?: { score?: number; highScore?: number } }).__w3a6LevelStart;
    return data ?? null;
  });

  // The transition MUST carry the run's score in the data payload.
  expect(handoff, 'level:start data for the gameover scene must have been captured').not.toBeNull();
  expect((handoff as { score?: number }).score, 'Switch data must carry the run score').toBe(scoreBeforeDeath);

  // DEFECT D-A6-1 (FIXED 2026-09-22 by W3-A.8, commit 41c7cfd):
  // GameOverScene now reads {score} from the LEVEL_START payload via
  // handleLevelStart(), so the displayed final score MATCHES the data.
  // The original spec asserted the mismatch was still present; post-fix
  // we assert the match (regression guard: if someone re-breaks the
  // payload read, display != data again and this test fails).
  const displayFinal = Number.parseInt(display.final ?? '0', 10);
  const mismatch = displayFinal !== scoreBeforeDeath;
  console.log(`W3A6 S3 handoff: data.score=${(handoff as { score?: number }).score} displayed=${display.final} mismatch=${mismatch}`);
  expect(mismatch, 'D-A6-1 is FIXED: displayed final score must equal the data payload score').toBe(false);

  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors in S3.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  await page.screenshot({ path: join(EVIDENCE_DIR, `w3a6-gameover-${BROWSER}.png`), fullPage: true });
});

// ── Scenario 4: restart -> menu -> start again (loop closes) ───────────────

test('W3A.6 S4: RESTART returns to the menu; a second run starts cleanly', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleEntries = await bootToMenu(page);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });

  // Score + die to reach the game-over scene (in-app, no reload).
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:score', { detail: { points: 80 } }));
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:death'));
  });
  await page.waitForSelector('#gameover-container', { timeout: 10_000, state: 'visible' });

  // Click RESTART.
  await page.click('#gameover-restart-button');
  await page.waitForTimeout(400);

  // Back on the menu.
  await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
  expect(await menuVisible(page), 'Menu must be visible after RESTART').toBe(true);
  expect(await gameoverVisible(page), 'GameOver must be hidden after RESTART').toBe(false);

  // Start a second run via the START button (mouse path, not keyboard).
  await page.click('#menu-start-button');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);
  const hud = await gameHudVisible(page);
  expect(hud.score && hud.health && hud.level, 'HUD must be visible in the second run').toBe(true);

  // Fresh run state: score reset to 0, level 1, full health.
  const fresh = await getHudText(page);
  expect(fresh.score, `Second run must start at score 0 (got "${fresh.score}")`).toMatch(/^SCORE:\s*0\b/);
  expect(fresh.level, 'Second run must start at level 1').toMatch(/^LEVEL:\s*1\b/);
  expect(fresh.health, 'Second run must start with full health').toMatch(/^HEALTH:\s*100\b/);

  // The game loop must still be live after the full cycle.
  expect(await getGameState(page), 'Loop liveness: FSM stays "playing" across the loop').toBe('playing');

  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors in S4.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  await page.screenshot({ path: join(EVIDENCE_DIR, `w3a6-restart-${BROWSER}.png`), fullPage: true });
});

// ── Scenario 5: high-score reload persistence (boss #1) ────────────────────

test('W3A.6 S5: a new high score survives a full page reload in the menu panel', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleEntries = await bootToMenu(page);

  // HIGH_SCORE_KEY lives on the Node side; pass it as an argument.
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, HIGH_SCORE_KEY);

  // Run: start, score 500, die -> gameover (gameOver() calls
  // scoreManager.saveHighScore() before the transition).
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:score', { detail: { points: 500 } }));
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:death'));
  });
  await page.waitForSelector('#gameover-container', { timeout: 10_000, state: 'visible' });

  // High score must now be persisted in localStorage.
  const storedAfterRun = await page.evaluate((key) => window.localStorage.getItem(key), HIGH_SCORE_KEY);
  expect(storedAfterRun, 'High score must be persisted to localStorage after a run').toBe('500');

  // FULL PAGE RELOAD — the boss-mandated persistence check.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'visible' });
  await page.waitForTimeout(500);

  const menuHighScore = await page.evaluate(() =>
    document.getElementById('menu-high-score-value')?.textContent ?? null
  );
  expect(menuHighScore, 'Menu HIGH SCORE panel must show the persisted 500 after reload').toBe('500');

  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors in S5.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);
});

// ── Console capture for the whole loop ─────────────────────────────────────

test('W3A.6 S6: console capture across menu -> game -> gameover -> menu -> game', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleEntries = await bootToMenu(page);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:score', { detail: { points: 30 } }));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:death'));
  });
  await page.waitForSelector('#gameover-container', { timeout: 10_000, state: 'visible' });
  await page.click('#gameover-restart-button');
  await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
  await page.click('#menu-start-button');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);

  const fatal = filterFatalErrors(consoleEntries);
  expect(fatal.length, `No fatal errors across the full loop.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`).toBe(0);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const logLines = consoleEntries.map((e) => `[${e.type}] ${e.text}`);
  writeFileSync(join(EVIDENCE_DIR, `w3a6-console-${BROWSER}.txt`), logLines.join('\n') + '\n', 'utf-8');
});
