import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W4-A.2 — E2E full-loop extended: settings + high-scores + 2nd run cycle.
 *
 * Kanban t_fd1738cd. Extends W4-A.1's 4 core CPs with three extended
 * scenarios, each in its own test on a fresh page (workers=1, so the
 * three tests run sequentially):
 *
 *   S1 — Settings volume: boot -> menu -> open settings panel ->
 *        volume slider to 50 -> close -> start game. Verifies the NEW
 *        value is actually used by the game:
 *          a) localStorage['cluster-rush-settings'].volume === 50
 *          b) live AudioSystem master gain === 0.5  (50/100, clamped)
 *          c) slider label shows 50
 *   S2 — High scores: clear the stored high score, play a run
 *        (score 500 via the product's own player:score event), die,
 *        verify the high score is (a) persisted to LocalStorage and
 *        (b) displayed — in the game-over panel AND back in the menu
 *        after RESTART.
 *   S3 — 2nd run cycle: one page, no reload —
 *        menu -> start -> play -> die -> game-over -> RESTART -> menu
 *        (start button re-armed) -> 2nd start -> 2nd play (fresh state).
 *
 * Runs in both real browsers (chromium-boot + firefox projects), headed,
 * via the default ./tests/e2e testDir (do NOT set the BROWSER env var).
 *
 * Evidence: tests/evidence/w4/W4A2-RED.txt + W4A2-GREEN.txt
 *           + w4a2-s{1,2,3}-<browser>.png screenshots.
 *
 * Product facts driving the asserts (verified against src @ c8bcead):
 *   - Settings: SettingsManager ('cluster-rush-settings'); the slider's
 *     'input' handler calls settingsManager.setVolume(v) +
 *     game.getAudioSystem().setMasterVolume(v/100) (MenuScene.ts:559-563).
 *     AudioSystem.applyVolume clamps to 0..1 -> 50 => 0.5.
 *   - High score: ScoreManager.saveHighScore() on GameScene.gameOver()
 *     (GameScene.ts:427) -> 'cluster-rush-high-score' (string int).
 *     MenuScene.onEnter() refreshes #menu-high-score-value from storage.
 *   - Death trigger: window CustomEvent 'player:death' — the exact path
 *     GameScene.setupEventListeners() subscribes to (proven in CP4).
 *   - Score trigger: window CustomEvent 'player:score' {detail:{points}}
 *     -> scoreManager.addScore(points) (proven in CP3 S4: HUD + state).
 *   - Re-arm guard: #menu-start-button.disabled === false after RESTART
 *     (BUG-W2-1a / W3-A.7, proven in CP4 S2).
 *   - window.game.getGameState() stays 'playing' across scene switches
 *     (FSM not driven by SceneManager — proven in W3A.6 S4).
 *   - Debug accessors: window.__debugPlayerPos (W3-B.0).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w4');
const APP_URL = 'http://localhost:5173/public/index.html';
/**
 * Evidence naming: screenshots are suffixed with testInfo.project.name
 * ('chromium-boot' / 'firefox') so the two legs never collide. NOTE: do
 * NOT run with the BROWSER env var set — the Playwright config uses it to
 * swap testDir to ./tests/e2e/smoke (W2-E.1b smoke-swap), which would hide
 * this spec from discovery.
 */
const SETTINGS_KEY = 'cluster-rush-settings';
const HIGH_SCORE_KEY = 'cluster-rush-high-score';
const PLAYER_DEATH_EVENT = 'player:death';
const PLAYER_SCORE_EVENT = 'player:score';

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

/**
 * Fatal-error filter (same posture as W3A.6 / CP4). The AudioContext
 * autoplay warning is non-fatal + expected (W3-C.2 lazy context); the
 * boot-manifest 404 is by design. Everything else in
 * error/pageerror/requestfailed is fatal.
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

async function bootToMenu(page: Page): Promise<ConsoleEntry[]> {
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

async function startGame(page: Page, via?: 'keyboard' | 'button'): Promise<void> {
  if (via === 'button') {
    await page.click('#menu-start-button');
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);
}

async function readScoreFromHud(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.getElementById('game-score');
    const m = el?.textContent?.match(/SCORE:\s*(\d+)/);
    return m ? Number.parseInt(m[1], 10) : -1;
  });
}

async function readHudText(page: Page): Promise<{ score: string; health: string; level: string }> {
  return page.evaluate(() => ({
    score: document.getElementById('game-score')?.textContent ?? '',
    health: document.getElementById('game-health')?.textContent ?? '',
    level: document.getElementById('game-level')?.textContent ?? '',
  }));
}

async function dispatchPlayerDeath(page: Page): Promise<void> {
  await page.evaluate((evtName) => {
    window.dispatchEvent(new CustomEvent(evtName));
  }, PLAYER_DEATH_EVENT);
}

async function dispatchPlayerScore(page: Page, points: number): Promise<void> {
  await page.evaluate(([evtName, pts]) => {
    window.dispatchEvent(new CustomEvent(evtName, { detail: { points: pts } }));
  }, [PLAYER_SCORE_EVENT, points] as const);
}

async function waitGameOver(page: Page): Promise<void> {
  await page.waitForSelector('#gameover-restart-button', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(300);
}

async function readLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

/**
 * Read the live AudioSystem's master gain value (0..1). The gain node is a
 * private field (created lazily in ensureContext() on first user gesture),
 * so we read it reflectively. Returns null when the context has not been
 * created yet (degraded mode / no gesture yet).
 */
async function readAudioMasterGain(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const g = (window as unknown as {
      game?: { getAudioSystem?: () => { context?: unknown; masterGain?: { gain?: { value?: number } } } };
    }).game;
    const audio = g?.getAudioSystem?.();
    if (!audio) return null;
    // ensureContext() is private; the gain exists once ANY gesture has run
    // (S1's menu click/keys count). Read the private field reflectively.
    const gain = (audio as Record<string, unknown>).masterGain as
      | { gain?: { value?: number } }
      | null
      | undefined;
    const v = gain?.gain?.value;
    return typeof v === 'number' ? v : null;
  });
}

async function readPlayerPos(page: Page): Promise<{ x: number; z: number } | null> {
  return page.evaluate(() => {
    const fn = (window as unknown as { __debugPlayerPos?: () => { x: number; z: number } | null }).__debugPlayerPos;
    if (typeof fn !== 'function') return null;
    try {
      const pos = fn();
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.z)) return { x: pos.x, z: pos.z };
      return null;
    } catch {
      return null;
    }
  });
}

async function getGameState(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const g = (window as unknown as { game?: { getGameState?: () => string } }).game;
    return g?.getGameState ? g.getGameState() : null;
  });
}

// ── S1: settings panel — volume 50 must be used by the live game ──────────

test('W4A.2 S1: boot -> settings volume=50 -> close -> start -> AudioSystem master gain is 0.5', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  test.setTimeout(60_000);
  const consoleEntries = await bootToMenu(page);
  expect(await menuVisible(page), 'Menu must be visible after boot').toBe(true);

  // 1. Open the settings panel.
  await page.click('#menu-settings-button');
  await page.waitForTimeout(200);
  const panelOpen = await page.evaluate(() => {
    const el = document.getElementById('settings-panel');
    return !!el && window.getComputedStyle(el).display !== 'none';
  });
  expect(panelOpen, 'Settings panel must open on SETTINGS click').toBe(true);

  // 2. Change volume to 50 (slider fill + input event, the exact DOM path
  //    MenuScene's listener uses).
  const slider = page.locator('#settings-volume-slider');
  await slider.fill('50');
  await slider.dispatchEvent('input');
  await page.waitForTimeout(150);

  // 2a. Persisted to localStorage with volume=50.
  const stored = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, SETTINGS_KEY);
  expect(stored, 'Settings must be persisted to localStorage').not.toBeNull();
  expect(stored?.volume, `localStorage volume must be 50 (got ${JSON.stringify(stored)})`).toBe(50);

  // 2b. The slider label reflects the new value.
  const label = await page.evaluate(() => document.getElementById('settings-volume-label')?.textContent ?? null);
  expect(label, `Volume label must read 50 (got ${JSON.stringify(label)})`).toBe('50');

  // 3. Close the panel.
  await page.click('#settings-close-button');
  await page.waitForTimeout(200);
  const panelClosed = await page.evaluate(() => {
    const el = document.getElementById('settings-panel');
    return !!el && window.getComputedStyle(el).display === 'none';
  });
  expect(panelClosed, 'Settings panel must close on CLOSE click').toBe(true);

  // 4. Start the game. The Enter keydown on the menu is a user gesture,
  //    which makes AudioSystem lazily create its context + gain chain and
  //    apply the persisted volume (MenuScene.onEnter already applied
  //    setMasterVolume(50/100) at menu entry; the context only materializes
  //    now, on the gesture).
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  // Let the async init() (context.resume()) settle so the gain node exists.
  await page.waitForTimeout(600);

  // 5. VERIFY the new value is what the game actually uses:
  //    the live AudioSystem's master gain must be 0.5 (50/100).
  const masterGain = await readAudioMasterGain(page);
  expect(
    masterGain,
    'AudioSystem masterGain must be readable (context created on the Enter gesture)'
  ).not.toBeNull();
  expect(
    Math.abs(masterGain! - 0.5) < 1e-6,
    `Live AudioSystem master gain must equal 0.5 for volume=50 (got ${masterGain})`
  ).toBe(true);

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal console errors expected in S1.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, `w4a2-s1-settings-${tag}.png`), fullPage: true });
  console.log(`W4A2 S1 ok: stored=${JSON.stringify(stored)} label=${label} masterGain=${masterGain}`);
});

// ── S2: high scores — run, die, persisted + displayed in menu ─────────────

test('W4A.2 S2: play a run -> die -> high score saved to LocalStorage + displayed in the menu', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  test.setTimeout(90_000);
  const consoleEntries = await bootToMenu(page);

  // Clean slate: no prior high score (fresh Playwright context is clean,
  // but clear explicitly so a shared profile can't leak state in).
  await page.evaluate((key) => window.localStorage.removeItem(key), HIGH_SCORE_KEY);

  // 1. Start the run.
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(400);

  // 2. Score 500 via the product's own player:score event (CP3-S4 proven
  //    path — applied synchronously by GameScene's listener, no rAF race).
  await dispatchPlayerScore(page, 500);
  await page.waitForTimeout(400);
  const scoreBeforeDeath = await readScoreFromHud(page);
  expect(scoreBeforeDeath, `Score HUD must be >= 500 before death (got ${scoreBeforeDeath})`).toBeGreaterThanOrEqual(500);

  // 3. Die (the exact path GameScene subscribes to). gameOver() calls
  //    scoreManager.saveHighScore() BEFORE the scene transition.
  await dispatchPlayerDeath(page);
  await waitGameOver(page);
  expect(
    await page.evaluate(() => {
      const el = document.getElementById('gameover-container');
      return !!el && window.getComputedStyle(el).display !== 'none';
    }),
    'GameOver scene must be visible after death'
  ).toBe(true);

  // 4a. High score persisted to LocalStorage.
  const storedHigh = await readLocalStorage(page, HIGH_SCORE_KEY);
  expect(
    storedHigh,
    `High score must be saved to localStorage["${HIGH_SCORE_KEY}"] after a death (got ${JSON.stringify(storedHigh)})`
  ).toBe('500');

  // 4b. Game-over panel displays the new high score.
  const goHigh = await page.evaluate(() => document.getElementById('gameover-high-score')?.textContent ?? null);
  expect(
    goHigh?.trim(),
    `#gameover-high-score must display 500 (got ${JSON.stringify(goHigh)})`
  ).toBe('500');
  const goFinal = await page.evaluate(() => document.getElementById('gameover-final-score')?.textContent ?? null);
  expect(
    goFinal?.trim(),
    `#gameover-final-score must display the run's score (got ${JSON.stringify(goFinal)})`
  ).toMatch(/^\d+$/);

  // 5. RESTART -> menu; the menu's HIGH SCORES panel shows the new record.
  await page.click('#gameover-restart-button');
  await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(400);
  expect(await menuVisible(page), 'Menu must be visible after RESTART').toBe(true);

  const menuHigh = await page.evaluate(() => document.getElementById('menu-high-score-value')?.textContent ?? null);
  expect(
    menuHigh?.trim(),
    `Menu #menu-high-score-value must display 500 after a record-setting run (got ${JSON.stringify(menuHigh)})`
  ).toBe('500');

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal console errors expected in S2.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, `w4a2-s2-highscore-${tag}.png`), fullPage: true });
  console.log(`W4A2 S2 ok: storedHigh=${storedHigh} goHigh=${goHigh} menuHigh=${menuHigh}`);
});

// ── S3: full 2nd run cycle on one page (no reload) ─────────────────────────

test('W4A.2 S3: 2nd run cycle — menu -> start -> play -> die -> game-over -> restart -> menu -> 2nd start -> 2nd play', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  test.setTimeout(120_000);
  const consoleEntries = await bootToMenu(page);
  expect(await menuVisible(page), 'Menu must be visible after boot').toBe(true);

  // ── RUN 1 (keyboard start) ────────────────────────────────────────────
  await startGame(page, 'keyboard');
  const hud1 = await readHudText(page);
  expect(hud1.score, `Run 1 must start at SCORE: 0 (got "${hud1.score}")`).toMatch(/^SCORE:\s*0\b/);
  expect(hud1.level, `Run 1 must start at LEVEL: 1 (got "${hud1.level}")`).toMatch(/^LEVEL:\s*1\b/);
  const pos1 = await readPlayerPos(page);
  expect(pos1, 'Run 1: window.__debugPlayerPos must be installed (GameScene entered)').not.toBeNull();

  // Play a little, then die.
  await dispatchPlayerScore(page, 80);
  await page.waitForTimeout(300);
  await dispatchPlayerDeath(page);
  await waitGameOver(page);
  expect(
    await page.evaluate(() => {
      const el = document.getElementById('gameover-restart-button');
      return !!el && window.getComputedStyle(el).display !== 'none';
    }),
    'Run 1: RESTART button must be visible in the game-over scene'
  ).toBe(true);

  // ── RESTART -> MENU ───────────────────────────────────────────────────
  await page.click('#gameover-restart-button');
  await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(400);
  expect(await menuVisible(page), 'Menu must be visible after RESTART').toBe(true);
  expect(
    await page.evaluate(() => {
      const el = document.getElementById('gameover-container');
      return !!el && window.getComputedStyle(el).display === 'none';
    }),
    'GameOver must be hidden after RESTART'
  ).toBe(true);

  // BUG-W2-1a / W3-A.7 re-arm guard: the start button must be usable again.
  const startBtn = await page.evaluate(() => {
    const b = document.getElementById('menu-start-button') as HTMLButtonElement | null;
    return b ? { attached: true, disabled: b.disabled } : { attached: false, disabled: null };
  });
  expect(startBtn.attached, '#menu-start-button must be attached after RESTART').toBe(true);
  expect(
    startBtn.disabled === false,
    `#menu-start-button must be ENABLED for the 2nd run (BUG-W2-1a re-arm; got disabled=${JSON.stringify(startBtn.disabled)})`
  ).toBe(true);

  // ── RUN 2 (mouse start — different input path than run 1) ────────────
  await startGame(page, 'button');
  const hud2 = await readHudText(page);
  expect(hud2.score, `Run 2 must start at SCORE: 0 (got "${hud2.score}")`).toMatch(/^SCORE:\s*0\b/);
  expect(hud2.level, `Run 2 must start at LEVEL: 1 (got "${hud2.level}")`).toMatch(/^LEVEL:\s*1\b/);
  expect(hud2.health, `Run 2 must start with full health (got "${hud2.health}")`).toMatch(/^HEALTH:\s*100\b/);
  const pos2 = await readPlayerPos(page);
  expect(pos2, 'Run 2: window.__debugPlayerPos must be installed').not.toBeNull();
  expect(
    Number.isFinite(pos2!.x) && Number.isFinite(pos2!.z),
    `Run 2 player position must be finite (got x=${pos2!.x}, z=${pos2!.z})`
  ).toBe(true);

  // The 2nd run must actually PLAY: score via the product event and confirm
  // the HUD reflects it (proves the loop is live, not a frozen scene).
  await dispatchPlayerScore(page, 100);
  await page.waitForTimeout(400);
  const liveScore = await readScoreFromHud(page);
  expect(liveScore, `Run 2 must be live: HUD score must reach >= 100 (got ${liveScore})`).toBeGreaterThanOrEqual(100);

  // Loop liveness: the FSM stays 'playing' across the whole cycle
  // (proven posture in W3A.6 S4 — scene switches do not drive the FSM).
  expect(
    await getGameState(page),
    'Loop liveness: getGameState() must be "playing" mid-2nd-run'
  ).toBe('playing');

  const fatal = filterFatalErrors(consoleEntries);
  expect(
    fatal.length,
    `No fatal console errors expected across the full 2nd-run cycle.\nGot:\n${fatal.map((e) => `[${e.type}] ${e.text}`).join('\n')}`
  ).toBe(0);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, `w4a2-s3-second-run-${tag}.png`), fullPage: true });
  console.log(`W4A2 S3 ok: run2 hud=${JSON.stringify(hud2)} liveScore=${liveScore} state=${await getGameState(page)}`);
});
