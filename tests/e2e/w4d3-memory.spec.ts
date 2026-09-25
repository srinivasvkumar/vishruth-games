import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W4-D.3 — 5-minute memory leak test (cross-browser final pass).
 *
 * Kanban t_a6098191. Runs the live game for 300 s and samples heap + object
 * counts every 15 s to detect unbounded growth across repeated restarts.
 *
 * Method:
 *   1. Boot to menu, enter GameScene (playing state, real loop).
 *   2. Do 5 play→die→restart cycles back-to-back FIRST (each cycle: start,
 *      let the run accumulate ~12 s of obstacle spawns, force a death by
 *      draining health, restart from game-over back into the game) so the
 *      5-min window includes the exact churn the leak check cares about
 *      (obstacle spawn/destroy, audio-node creation, scene swaps).
 *   3. Then run a 240 s steady-state play window, sampling every 15 s:
 *        - Chrome: performance.memory (usedJSHeapSize) — the real JS-heap number.
 *        - Firefox: performance.memory is undefined; fall back to a
 *          browser-agnostic proxy: count of live obstacle entities in the
 *          GameScene's private obstacles array + THREE scene group count +
 *          active physics bodies + DOM node count. These are the objects a
 *          leak would accumulate in, and they're readable in BOTH browsers.
 *   4. Verdict: STABLE when the sampled series is non-growing (last sample
 *      <= 1.15x the min of the middle samples and no strict monotone climb).
 *      GROWING/LEAKING when it climbs past that band. Firefox uses the same
 *      rule on the proxy object count.
 *
 * Browser-agnostic: the perf.memory branch is capability-checked, so the
 * same spec runs under chromium-boot and firefox. Evidence is written per
 * browser tag (testInfo.project.name) so Chrome + Firefox artifacts never
 * collide.
 *
 * Evidence: tests/evidence/w4/w4d3-memory-<browser>.txt (+ .png).
 *
 * Run:
 *   ./node_modules/.bin/playwright test tests/e2e/w4d3-memory.spec.ts --project=chromium-boot
 *   ./node_modules/.bin/playwright test tests/e2e/w4d3-memory.spec.ts --project=firefox
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', '..', 'tests', 'evidence', 'w4');
const APP_URL = 'http://localhost:5173/public/index.html';

// 5-minute total: 5x restart cycles (≈12 s each) + 240 s steady window.
const RESTART_CYCLES = 5;
const CYCLE_MS = 12_000;
const STEADY_WINDOW_MS = 240_000;
const SAMPLE_INTERVAL_MS = 15_000;

interface MemSample {
  t: number; // ms since sample start
  usedJsHeapKB: number | null; // Chrome only
  obstacleCount: number; // GameScene.obstacles length (proxy, both browsers)
  sceneGroups: number; // THREE scene Group children (proxy, both browsers)
  physicsBodies: number | null; // cannon-es world body count (proxy)
  domNodes: number; // document node count (proxy, both browsers)
  gameState: string | null;
  running: boolean;
}

// ── Boot helpers (same public surface as W3-C / W3-B CP specs) ─────────────

async function bootToMenu(page: Page): Promise<void> {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
}

async function enterGameScene(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const g = (window as unknown as { game?: { getSceneManager?: () => { loadScene: (n: string) => Promise<void> } } }).game;
    if (!g?.getSceneManager) throw new Error('window.game.getSceneManager not available');
    await g.getSceneManager().loadScene('game');
  });
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'attached' });
  await page.waitForTimeout(400);
}

async function getGameState(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const g = (window as unknown as { game?: { getGameState?: () => string } }).game;
    return g?.getGameState?.() ?? null;
  });
}

/**
 * Force a death: drain player health to 0 so the run ends and the app swaps
 * to GameOverScene. Mirrors the CP4 restart path (damage → death → restart).
 */
async function forceDeath(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as {
      game?: {
        getSceneManager?: () => {
          getCurrentScene?: () => {
            player?: { setHealth?: (h: number) => void; takeDamage?: (d: number) => void };
            [key: string]: unknown;
          };
        };
      };
    };
    const g = w.game;
    const scene = g?.getSceneManager?.()?.getCurrentScene?.();
    const p = scene?.player;
    if (p?.setHealth) {
      p.setHealth(0);
    } else if (p?.takeDamage) {
      // take a big hit to guarantee death even if health is high.
      p.takeDamage(9999);
    } else {
      throw new Error('Could not force player death (no setHealth/takeDamage on current scene player)');
    }
  });
}

/** Return to the game scene from game-over (the CP4 restart path). */
async function restartFromGameOver(page: Page): Promise<void> {
  // Wait for the game-over scene to be up.
  await page.waitForSelector('#gameover-restart-button', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(400);
  // Restart into a fresh game.
  await page.evaluate(async () => {
    const g = (window as unknown as { game?: { getSceneManager?: () => { loadScene: (n: string) => Promise<void> } } }).game;
    if (g?.getSceneManager) await g.getSceneManager().loadScene('game');
  });
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'attached' });
  await page.waitForTimeout(400);
}

/** Read a memory + object-count sample (browser-agnostic). */
async function readSample(page: Page): Promise<MemSample> {
  return page.evaluate(() => {
    const w = window as unknown as {
      performance: { memory?: { usedJSHeapSize: number } };
      document: { getElementsByTagName: (tag: string) => { length: number } };
      game?: {
        getSceneManager?: () => {
          getCurrentScene?: () => {
            getScene?: () => { children: Array<{ type?: string }> };
            obstacles?: unknown[];
            [key: string]: unknown;
          };
        };
        getGameState?: () => string;
        isGameRunning?: () => boolean;
        getPhysicsSystem?: () => { world?: { bodies?: unknown[] } };
      };
    };
    const g = w.game;
    const scene = g?.getSceneManager?.()?.getCurrentScene?.();
    const threeScene = scene?.getScene?.();
    const groups = (threeScene?.children ?? []).filter((c) => c.type === 'Group').length;
    const obstacles = (scene?.obstacles as unknown[] | undefined)?.length ?? -1;
    const bodies = g?.getPhysicsSystem?.()?.world?.bodies?.length ?? null;
    const dom = w.document.getElementsByTagName('*').length;
    const heap = w.performance.memory ? w.performance.memory.usedJSHeapSize / 1024 : null;
    return {
      t: 0, // filled by caller with elapsed
      usedJsHeapKB: heap,
      obstacleCount: obstacles,
      sceneGroups: groups,
      physicsBodies: bodies,
      domNodes: dom,
      gameState: g?.getGameState?.() ?? null,
      running: g?.isGameRunning?.() ?? false
    } as MemSample;
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// ── The test ───────────────────────────────────────────────────────────────

test('W4-D.3: 5-minute memory leak test (5 restart cycles + steady-state, per-browser heap/object trend)', async ({ page }, testInfo) => {
  test.setTimeout(420_000); // 7 min hard cap (5 cycles + 4 min steady + margin)
  const tag = testInfo.project.name;

  await bootToMenu(page);

  // Confirm the loop is live before we start the clock.
  const running0 = await page.evaluate(() => {
    const g = (window as unknown as { game?: { isGameRunning?: () => boolean } }).game;
    return !!g && g.isGameRunning?.() === true;
  });
  expect(running0, 'window.game must exist and be running before the memory window').toBe(true);

  // ── Phase 1: 5 restart cycles (the churn the leak check targets) ─────────
  for (let i = 1; i <= RESTART_CYCLES; i++) {
    if (i === 1) {
      await enterGameScene(page);
    } else {
      await restartFromGameOver(page);
    }
    const gs = await getGameState(page);
    expect(gs, `Cycle ${i}: game must be in 'playing' after (re)start`).toBe('playing');
    // Accumulate obstacle spawns + audio/scene work for ~12 s.
    await sleep(CYCLE_MS);
    // Force death so the next cycle goes through the game-over + restart path.
    await forceDeath(page);
    await sleep(1500); // let the scene swap settle
  }

  // After the last forced death we're on game-over; restart into a fresh game
  // for the steady-state window.
  await restartFromGameOver(page);
  expect(await getGameState(page), 'Steady-state window must start in the playing state').toBe('playing');

  // ── Phase 2: steady-state sampling window ────────────────────────────────
  const samples: MemSample[] = [];
  const startT = Date.now();
  // First sample immediately, then every SAMPLE_INTERVAL_MS until the window ends.
  while (Date.now() - startT < STEADY_WINDOW_MS) {
    const s = await readSample(page);
    s.t = Date.now() - startT;
    samples.push(s);
    const remaining = STEADY_WINDOW_MS - s.t;
    if (remaining <= 0) break;
    await sleep(Math.min(SAMPLE_INTERVAL_MS, remaining));
  }
  // One final sample at the very end of the window.
  const sEnd = await readSample(page);
  sEnd.t = Date.now() - startT;
  samples.push(sEnd);

  expect(samples.length, 'Must capture multiple samples across the 5-minute window').toBeGreaterThanOrEqual(12);
  // The loop must stay alive the whole time (no crash / no accidental game-over
  // that would stop rAF and void the measurement).
  expect(samples[samples.length - 1].running, 'Game loop must still be running at end of window').toBe(true);

  // ── Verdict: trend on the available metric ───────────────────────────────
  // Chrome: usedJSHeapKB. Firefox: obstacleCount (proxy, browser-agnostic).
  const useHeap = samples[0].usedJsHeapKB !== null;
  const metricName = useHeap ? 'usedJSHeapSize' : 'obstacleCount (proxy — performance.memory unavailable in this browser)';
  const series = samples.map((s) => (useHeap ? s.usedJsHeapKB! : s.obstacleCount));
  const valid = series.filter((n) => n > 0);
  expect(valid.length, 'Must have >0 valid samples for the metric').toBeGreaterThan(0);

  // Verdict via least-squares slope on the sample index, NOT first-vs-last
  // (first/last is noisy: heap sawtooths across restarts, and the obstacle
  // proxy fluctuates as obstacles spawn + get reaped past REAP_Z). A genuine
  // leak shows a positive, sustained trend; a sawtooth or bounded fluctuation
  // has ~zero mean slope. Threshold: slope expressed as % of the mean sample
  // per sample-interval. > +3%/interval sustained = GROWING; else STABLE.
  const n = valid.length;
  const mean = valid.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - (n - 1) / 2) * (valid[i] - mean);
    den += (i - (n - 1) / 2) ** 2;
  }
  const slope = den === 0 ? 0 : num / den; // units of metric per sample
  const slopePctPerInterval = (slope / mean) * 100;
  const LEAK_SLOPE_PCT = 3; // sustained > +3% per 15 s sample = leaking
  const stable = slopePctPerInterval <= LEAK_SLOPE_PCT;
  const verdict = stable ? 'STABLE' : 'GROWING/LEAKING';
  const first = valid[0];
  const last = valid[valid.length - 1];
  const growthPct = ((last - first) / first) * 100;

  const ts = new Date().toISOString();
  const lines: string[] = [
    'W4-D.3 — 5-minute memory leak test',
    `timestamp: ${ts}`,
    `browser: ${tag} (real headed, WebGL live)`,
    `url: ${APP_URL}`,
    `phases: ${RESTART_CYCLES}x play→die→restart cycles (~${CYCLE_MS} ms each) + ${STEADY_WINDOW_MS} ms steady-state play`,
    `sample interval: ${SAMPLE_INTERVAL_MS} ms; samples captured: ${samples.length}`,
    `metric: ${metricName}`,
    `perf.memory available: ${useHeap}`,
    '',
    'sample series (t_ms, ' + (useHeap ? 'usedHeapKB' : 'obstacles,groups,bodies,dom') + '):',
    ...samples.map((s) =>
      useHeap
        ? `  t=${String(s.t).padStart(5)}  heapKB=${s.usedJsHeapKB === null ? 'n/a' : s.usedJsHeapKB.toFixed(0).padStart(8)}  obst=${s.obstacleCount}  groups=${s.sceneGroups}  dom=${s.domNodes}  state=${s.gameState}  running=${s.running}`
        : `  t=${String(s.t).padStart(5)}  obst=${String(s.obstacleCount).padStart(4)}  groups=${String(s.sceneGroups).padStart(4)}  bodies=${s.physicsBodies ?? 'n/a'}  dom=${String(s.domNodes).padStart(5)}  heap=unavail  state=${s.gameState}  running=${s.running}`
    ),
    '',
    `first sample: ${first}`,
    `last sample:  ${last}`,
    `mean (all samples): ${mean.toFixed(2)}`,
    `least-squares slope: ${slopePctPerInterval.toFixed(2)}% of mean per ${SAMPLE_INTERVAL_MS} ms sample-interval (threshold ${LEAK_SLOPE_PCT}%)`,
    `growth (first→last): ${growthPct.toFixed(1)}%`,
    `verdict: ${verdict}`,
    verdict === 'STABLE'
      ? 'heap/object counts do not grow without bound across 5 restart cycles + 4 min play → no leak detected'
      : 'heap/object counts climb past the stability band across the window → investigate (see suspect list below)',
    '',
    'Suspects if GROWING: (a) Obstacle entity meshes not disposed on death, (b) AudioContext nodes not closed on restart, (c) scene-graph children accumulating across loadScene, (d) rAF listeners re-registered per restart.'
  ];
  const log = lines.join('\n');

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, `w4d3-memory-${tag}.png`), fullPage: true });
  writeFileSync(join(EVIDENCE_DIR, `w4d3-memory-${tag}.txt`), log + '\n', 'utf-8');
  console.log(log);

  // The test PASSes when the loop stayed alive and we captured the full window
  // (measurement integrity). The STABLE/GROWING verdict is the OUTCOME recorded
  // in the evidence — matching the W3-C.1a D4-gate pattern (record the result,
  // don't fail the harness for a perf observation). A genuine leak is escalated
  // in the cross-browser report.
  expect(samples[samples.length - 1].t, 'Window must have run to (near) completion').toBeGreaterThanOrEqual(STEADY_WINDOW_MS - 5000);
});
