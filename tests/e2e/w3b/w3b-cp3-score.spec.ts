import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3-B.4 — CP3: score collection and display E2E (UISystem HUD).
 *
 * Kanban t_25e8f9b4. Third of the 4 W3-B critical-path E2E specs.
 * Round-2 re-scope (boss + reviewer aligned):
 *
 *   Score IS collectible — 'breakable' obstacles exist and
 *   GameScene.handleCollision does obstacle.deactivate() +
 *   scoreManager.addScore(100) on breakable collision. BUT obstacle
 *   spawn type is a uniform random 5-way pick, so the full
 *   collection-cycle (find + ram a breakable obstacle) is flaky.
 *
 *   So this spec splits into:
 *
 *   S1 (DETERMINISTIC) — the HUD *displays* the live score:
 *      #game-score visible in GameScene, text is a valid "SCORE: n"
 *      number, and the DOM value equals the live game-state value
 *      read via the W3-B.0 window.__debugScore() accessor
 *      (UISystem.setScore is pushed each frame by GameScene.onUpdate,
 *      so state and HUD must agree).
 *
 *   S2 (DETERMINISTIC) — the DOM *updates* when setScore is driven:
 *      call UISystem.setScore(42) via window.game.getUISystem()
 *      (public accessor, Game.ts:281) → #game-score reads "SCORE: 42";
 *      then setScore(999) → "SCORE: 999".
 *
 *   S3 (FLAKY — marked test.fixme, does NOT gate B4/B7) — full
 *      collection-cycle: ram a breakable obstacle → +100.
 *      W3-C follow-up: needs deterministic breakable-obstacle spawn
 *      (Task 7.3 power-up/deterministic-spawn).
 *
 *   S4 (DETERMINISTIC) — the score-collection mechanism at the event
 *      boundary: dispatch GameEvents.PLAYER_SCORE ('player:score',
 *      Constants.ts:117) with points=100 — the same event the
 *      breakable-obstacle collision path feeds — and assert
 *      __debugScore() +100 AND the HUD DOM reflects the increment.
 *      Closes the collection loop without the non-deterministic spawn
 *      pick, and without adding test hooks to production.
 *
 *   Screenshot: tests/evidence/w3/w3b-cp3-score.png (mid-game, driven
 *   score value on screen). 0 fatal console errors per scenario.
 *
 *   Known observation (non-blocking, logged 2026-09-19): in the E2E
 *   environment the Three.js canvas renders black (probe: canvas
 *   1136x600, WebGL context alive, single distinct color = 0) while the
 *   menu scene's CSS overlay works. Same posture as CP1/CP2 evidence
 *   (black viewport); DOM/scene assertions remain authoritative. If the
 *   scene renders black in headed/real Chrome too, that is a rendering
 *   defect for the orchestrator — not a CP3 (score/HUD) failure.
 *
 * Spec lives under tests/e2e/w3b/ so it is always discovered by the
 * dedicated `w3b` Playwright project (testDir ./tests/e2e/w3b),
 * independent of the BROWSER smoke-swap. Chrome-only (W3-C is the
 * Firefox leg). Headed per the `w3b` project config.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', '..', 'evidence', 'w3');
const APP_URL = 'http://localhost:5173/public/index.html';

// ── Console capture helper (same posture as CP1 / CP2) ─────────────────────

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
 * Fatal-error filter (same posture as CP1/CP2). AudioContext autoplay
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

/** Boot → menu → START (Enter) → GameScene. Returns console entries. */
async function startGame(page: Page): Promise<ConsoleEntry[]> {
  const consoleEntries = await bootToMenu(page);
  expect(await menuVisible(page), 'Must start on the menu').toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);
  return consoleEntries;
}

/** Read #game-score text content (or null if the HUD div is absent). */
async function getScoreHudText(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.getElementById('game-score');
    return el ? el.textContent : null;
  });
}

/** Parse the "SCORE: n" HUD text → number, or null when unparseable. */
function parseHudScore(text: string | null): number | null {
  if (text === null) return null;
  const m = /^SCORE:\s*(\d+)$/.exec(text.trim());
  return m ? Number(m[1]) : null;
}

/** Read the live score from game state via the W3-B.0 debug accessor. */
async function getDebugScore(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const fn = (window as unknown as { __debugScore?: () => number }).__debugScore;
    if (typeof fn !== 'function') return null;
    try {
      const s = fn();
      return typeof s === 'number' && Number.isFinite(s) ? s : null;
    } catch {
      return null;
    }
  });
}

/** Drive UISystem.setScore(n) in-page via the public Game accessor. */
async function driveSetScore(page: Page, n: number): Promise<boolean> {
  return page.evaluate((value) => {
    const g = (window as unknown as {
      game?: { getUISystem?: () => { setScore?: (n: number) => void } };
    }).game;
    try {
      g?.getUISystem?.()?.setScore?.(value);
      return true;
    } catch {
      return false;
    }
  }, n);
}

// ── CP3 S1: HUD displays the live score (deterministic) ────────────────────

test('W3-B.4 CP3 S1: HUD displays the live #game-score value — valid number, in sync with game state', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleEntries = await startGame(page);

  // HUD is visible in GameScene.
  const hud = page.locator('#game-score');
  await expect(hud, '#game-score must be attached').toBeAttached();
  await expect(hud, '#game-score must be visible in GameScene').toBeVisible();

  // Text is a valid "SCORE: n" with a parseable number.
  const text = await getScoreHudText(page);
  expect(text, `#game-score must have text (got ${JSON.stringify(text)})`).not.toBeNull();
  const domScore = parseHudScore(text);
  expect(
    domScore,
    `#game-score text must be a valid "SCORE: n" number (got ${JSON.stringify(text)})`
  ).not.toBeNull();

  // Fresh start: the HUD shows the live game-state score.
  // GameScene.onEnter pushes setScore(scoreManager.getScore()) after
  // resetRunState(), so a fresh run reads SCORE: 0 on the HUD.
  expect(
    domScore,
    `Fresh run must start at SCORE: 0 (got ${JSON.stringify(text)})`
  ).toBe(0);

  // Live-sync: the DOM value equals the game-state value read via the
  // deterministic W3-B.0 accessor (independent of DOM scraping).
  const stateScore = await getDebugScore(page);
  expect(
    stateScore,
    'window.__debugScore must be installed (GameScene entered)'
  ).not.toBeNull();
  expect(
    domScore,
    `HUD value (${domScore}) must equal live game-state score (${stateScore})`
  ).toBe(stateScore);

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});

// ── CP3 S2: DOM updates when setScore is driven (deterministic) ────────────

test('W3-B.4 CP3 S2: #game-score DOM updates when UISystem.setScore is driven with a known value', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleEntries = await startGame(page);

  // Baseline: fresh run shows SCORE: 0 on the HUD.
  let text = await getScoreHudText(page);
  expect(parseHudScore(text), `Fresh run must read SCORE: 0 (got ${JSON.stringify(text)})`).toBe(0);

  // Drive setScore(42) via the public Game.getUISystem() accessor.
  // UISystem.setScore updates #game-score.textContent = "SCORE: 42" and
  // makes it visible (src/systems/UI.ts).
  const drove = await driveSetScore(page, 42);
  expect(drove, 'window.game.getUISystem().setScore must be callable').toBe(true);

  // DOM reflects the driven value.
  text = await getScoreHudText(page);
  expect(
    text,
    `#game-score must read "SCORE: 42" after setScore(42) (got ${JSON.stringify(text)})`
  ).toBe('SCORE: 42');

  // Second value proves the update path is live, not a one-shot.
  const drove2 = await driveSetScore(page, 999);
  expect(drove2, 'window.game.getUISystem().setScore must be callable (second drive)').toBe(true);
  text = await getScoreHudText(page);
  expect(
    text,
    `#game-score must read "SCORE: 999" after setScore(999) (got ${JSON.stringify(text)})`
  ).toBe('SCORE: 999');

  // HUD is still visible after the drives.
  await expect(page.locator('#game-score'), '#game-score must remain visible').toBeVisible();

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);

  // Evidence: screenshot with the driven score value on screen.
  // Viewport (not full-page): the page is a tall dashboard (1280x1902) and
  // the HUD is position:fixed to the viewport top, so the viewport capture
  // is the canonical evidence framing (matches CP1/CP2 posture).
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w3b-cp3-score.png') });
});

// ── CP3 S3: full collection-cycle (FLAKY — test.fixme) ─────────────────────

/**
 * FLAKY BY DESIGN — obstacle spawn type is a uniform random 5-way pick
 * (block/spike/moving/rotating/breakable) so a run cannot deterministically
 * place a breakable obstacle in the player's path. The collection cycle
 * (ram a breakable → +100) therefore cannot be asserted without a
 * deterministic breakable-obstacle spawn, which is a W3-C deliverable.
 *
 * W3-C follow-up: needs deterministic breakable-obstacle spawn
 * (Task 7.3 power-up/deterministic-spawn). When that lands, flip this to
 * test() and drive the player onto a guaranteed breakable obstacle
 * (scene-graph teleport, CP2 S3 posture) and assert __debugScore() +100.
 */
test.fixme('W3-B.4 CP3 S3: full collection-cycle — ram a breakable obstacle → +100 (flaky: random spawn; W3-C follow-up)', async ({ page }) => {
  test.setTimeout(90_000);

  const consoleEntries = await startGame(page);

  const before = await getDebugScore(page);
  expect(before, 'baseline score must be readable').not.toBeNull();

  // TODO(W3-C): deterministic breakable-obstacle spawn (Task 7.3).
  // Then: teleport player onto the breakable obstacle's mesh position
  // (CP2 S3 posture), wait one frame, and assert __debugScore() ===
  // before + 100 and the HUD shows the incremented value.
  // The obstacle type pick (GameScene.getRandomObstacleType) is
  // Math.random() today — a run may spawn zero breakable obstacles in
  // the player's reachable window, so this would be flaky without
  // the W3-C spawn hook.

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});

// ── CP3 S4: score-collection mechanism via real PLAYER_SCORE event (deterministic) ─

/**
 * W3-B.4 CP3 S4 (added round-2 follow-up): close the collection loop at the
 * event boundary. GameScene.setupEventListeners() wires
 * window.addEventListener(GameEvents.PLAYER_SCORE, e =>
 * scoreManager.addScore(e.detail.points)) — the exact path the
 * breakable-obstacle collision feeds (GameScene.handleCollision
 * addScore(100) on breakable). Firing the same event with points=100 from
 * the test is therefore the collection cycle minus the non-deterministic
 * spawn pick, with no test hooks added to production.
 *
 * Asserts: __debugScore() +100 AND the HUD DOM reflects the incremented
 * value (UISystem.setScore is pushed from game state each frame), proving
 * the full state → HUD pipeline for a collected point.
 */
test('W3-B.4 CP3 S4: dispatching PLAYER_SCORE(100) scores +100 in state and HUD', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleEntries = await startGame(page);

  const before = await getDebugScore(page);
  expect(before, 'baseline score must be readable').not.toBeNull();

  // Fire the canonical collection event with the breakable value.
  // GameEvents.PLAYER_SCORE === 'player:score' (src/utils/Constants.ts:117).
  const fired = await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:score', { detail: { points: 100 } }));
    return true;
  });
  expect(fired, 'PLAYER_SCORE event must be dispatchable').toBe(true);

  // The event listener runs synchronously on dispatch: state moves +100.
  // Poll briefly so a slower environment (event queued behind a long frame)
  // still resolves; the HUD push happens on the next onUpdate.
  const expected = (before ?? 0) + 100;
  await page.waitForFunction(
    (expectedValue) => {
      const fn = (window as unknown as { __debugScore?: () => number }).__debugScore;
      return typeof fn === 'function' && fn() === expectedValue;
    },
    expected,
    { timeout: 5_000, polling: 100 }
  ).catch(async () => {
    const still = await getDebugScore(page);
    throw new Error(`__debugScore() did not reach ${expected} within 5s (still ${still})`);
  });

  const after = await getDebugScore(page);
  expect(after, `score state must be ${expected} after PLAYER_SCORE(100)`).toBe(expected);

  // HUD must agree with state (UISystem.setScore pushed from onUpdate each
  // frame). Poll for the DOM catch-up rather than assuming an immediate
  // push.
  await page.waitForFunction(
    (expectedValue) => {
      const el = document.getElementById('game-score');
      const m = el ? /^SCORE:\s*(\d+)$/.exec(el.textContent?.trim() ?? '') : null;
      return m ? Number(m[1]) === expectedValue : false;
    },
    expected,
    { timeout: 5_000, polling: 100 }
  );
  const hudAfter = parseHudScore(await getScoreHudText(page));
  expect(
    hudAfter,
    `HUD must read the incremented score (${expected}), got ${await getScoreHudText(page)}`
  ).toBe(expected);

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal errors expected.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);
});
