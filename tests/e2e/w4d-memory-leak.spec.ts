import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W4-D.2 — 5-minute memory leak test (W4 gate #6: no memory leak after 5 min
 * gameplay). Kanban t_999820e2.
 *
 * Method
 *   1. Boot the real game in headed Chrome (chromium-boot project — real
 *      Chrome, SwiftShader WebGL, same posture as W4-A.1) on the repo's own
 *      vite dev server (Playwright webServer hook).
 *   2. Enter the game via Enter (proven start path, W4-A.1 CP1 S2).
 *   3. Keep the run alive for 300 s of continuous gameplay:
 *        - player:score events every 30 s (exercises the score/event path),
 *        - rotating WASD + arrows keyboard input every 15 s (exercises the
 *          input path + camera lerp),
 *        - the obstacle spawner runs at its own pace (OBSTACLE_SPAWN_RATE
 *          1.5 s, normal difficulty) so the spawn/reap/pool cycle (W4-B.11)
 *          is exercised the whole window,
 *        - a watch-dog that restores full health on each 15 s tick if a
 *          random collision dropped it (so the run does not die mid-window;
 *          death is deliberately exercised AFTER the window).
 *   4. Sample the JS heap (performance.memory, Chromium-only) + live
 *      obstacle/pool counts + scene-graph size + DOM node count + rAF frame
 *      counter every 10 s in-page; at t = 0/60/120/180/240/300 s capture a
 *      checkpoint line + screenshot + console snapshot.
 *   5. After 5 min: die (player:death) -> game-over -> RESTART -> menu ->
 *      2nd run (30 s) -> die -> RESTART -> menu. The transition phase
 *      exercises scene teardown (disposeAllObstacles) between runs and is
 *      recorded as a secondary observation.
 *   6. Verdict: PRIMARY gate on the 300 s continuous window —
 *        growth = (heap@300s - heap@0) / heap@0, evaluated on the
 *        monotone envelope of the samples (GC dips excluded).
 *        PASS if growth <= 10 % AND the live-obstacle array stays bounded.
 *        The transition-phase delta is reported but not gating.
 *
 * Evidence: tests/evidence/w4/W4D2-MEMORY.txt (heap table + obstacle trend +
 *           console + verdict) + screenshots w4d2-mem-t{0..5}min.png,
 *           w4d2-mem-transition*.png.
 *
 * Product facts driving the probes (verified against src @ 5953dac):
 *   - performance.memory is available in Chromium (chromium-boot project).
 *   - GameScene.onEnter installs window.__debugPlayerPos / __setPlayerHealth
 *     / __debugScore (W3-B.0) — health is restored through the product's
 *     own debug accessor, not DOM/DOM-state hacks.
 *   - window.game.getSceneManager().getCurrentScene() returns the active
 *     Scene; GameScene keeps `obstacles` + `obstaclePool` as private fields
 *     read here reflectively (pool/reap bookkeeping, W4-B.11).
 *   - GameScene.onUpdate early-returns on health <= 0 -> death would abort
 *     the window; the watch-dog keeps health at 100 every 15 s tick.
 *   - Window blur pauses the game (W4-B.10); the spec asserts isGameRunning()
 *     stays true at every checkpoint so a stray focus loss cannot silently
 *     freeze the measurement window.
 *
 * Run: npx playwright test tests/e2e/w4d-memory-leak.spec.ts --project=chromium-boot
 * (do NOT set the BROWSER env — it swaps testDir to ./tests/e2e/smoke).
 * Single test, ~8 min wall clock (5-min window + transition + SwiftShader
 * overhead); testTimeout set to 600 s.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w4');
const EVIDENCE_FILE = join(EVIDENCE_DIR, 'W4D2-MEMORY.txt');
const APP_URL = 'http://localhost:5173/public/index.html';

const WINDOW_SECONDS = 300; // 5-minute continuous gameplay window
const SAMPLE_INTERVAL_MS = 10_000; // in-page sampler cadence
const CHECKPOINT_MINUTES = [0, 1, 2, 3, 4, 5]; // checkpoint times in minutes
const TRANSITION_SECONDS = 30; // 2nd-run duration after the 5-min window
const LEAK_GROWTH_GATE = 0.1; // W4 gate #6: > 10 % growth over 5 min = leak

// ── Console capture (same posture as W4-A.2) ───────────────────────────────

interface ConsoleEntry {
  type: string;
  text: string;
  t: number; // seconds since boot, for timeline correlation
}

function captureConsole(page: Page, t0: { value: number }): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  const rel = () => Math.round((Date.now() - t0.value) / 1000);
  page.on('console', (msg) => entries.push({ type: msg.type(), text: msg.text(), t: rel() }));
  page.on('pageerror', (err) => entries.push({ type: 'pageerror', text: String(err), t: rel() }));
  page.on('requestfailed', (req) =>
    entries.push({ type: 'requestfailed', text: `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'failed'}`, t: rel() })
  );
  return entries;
}

function filterFatalErrors(entries: ConsoleEntry[]): ConsoleEntry[] {
  return entries.filter((e) => {
    if (e.type === 'pageerror') return true;
    if (e.type === 'requestfailed') return !e.text.includes('manifest');
    if (e.type === 'error') {
      const t = e.text.toLowerCase();
      if (t.includes('audiocontext') || t.includes('autoplay')) return false;
      return t.includes('uncaught') || t.includes('cors') || t.includes('webgl context lost') || t.includes('three');
    }
    return false;
  });
}

// ── In-page probe / sampler ────────────────────────────────────────────────

/**
 * Install an in-page sampler on window.__memSampler.
 *
 * Every SAMPLE_INTERVAL_MS it appends a record:
 *   { t, heapUsedMB, heapTotalMB, obstacles, pool, sceneChildren, domNodes, frames, playing }
 * - heap from performance.memory (Chromium-only; null-safe).
 * - obstacles/pool: reflectively read off the live GameScene instance
 *   (private fields; the W4-B.11 pool bookkeeping).
 * - frames: rAF counter (installed once, never re-allocated per frame —
 *   the counter itself must not perturb the measurement).
 * - playing: window.game.isGameRunning() — detects a blur-induced pause
 *   (W4-B.10) that would freeze the window.
 */
async function installSampler(page: Page): Promise<void> {
  await page.evaluate((intervalMs) => {
    const w = window as unknown as Record<string, any>;
    if (w.__memSampler?.running) return;

    let frames = 0;
    const tick = (): void => {
      frames += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const sceneOf = (): any | null => {
      try {
        const g = w.game;
        const sm = g?.getSceneManager?.();
        return sm?.getCurrentScene?.() ?? null;
      } catch {
        return null;
      }
    };

    const record = (): void => {
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      const sc = sceneOf();
      let heapUsedMB: number | null = null;
      let heapTotalMB: number | null = null;
      if (mem) {
        heapUsedMB = Math.round((mem.usedJSHeapSize / 1048576) * 100) / 100;
        heapTotalMB = Math.round((mem.totalJSHeapSize / 1048576) * 100) / 100;
      }
      const obstacles = Array.isArray(sc?.obstacles) ? sc.obstacles.length : null;
      const pool = Array.isArray(sc?.obstaclePool) ? sc.obstaclePool.length : null;
      let sceneChildren: number | null = null;
      try {
        sceneChildren = sc?.scene?.children?.length ?? null;
      } catch {
        sceneChildren = null;
      }
      let playing: boolean | null = null;
      try {
        playing = typeof w.game?.isGameRunning === 'function' ? w.game.isGameRunning() : null;
      } catch {
        playing = null;
      }
      w.__memSamples.push({
        t: Math.round((performance.now() - w.__memStartPerf) / 1000), // seconds since run start
        heapUsedMB,
        heapTotalMB,
        obstacles,
        pool,
        sceneChildren,
        domNodes: document.getElementsByTagName('*').length,
        frames,
        playing,
      });
    };

    w.__memSamples = [];
    w.__memStartPerf = performance.now(); // t=0 for the sampler = run start
    w.__memSampler = {
      running: true,
      record,
      stop: () => {
        w.__memSampler.running = false;
        clearInterval(w.__memSampler.timer);
      },
      timer: setInterval(record, intervalMs),
    };
  }, SAMPLE_INTERVAL_MS);
}

interface Sample {
  t: number;
  heapUsedMB: number | null;
  heapTotalMB: number | null;
  obstacles: number | null;
  pool: number | null;
  sceneChildren: number | null;
  domNodes: number | null;
  frames: number;
  playing: boolean | null;
}

async function pullSamples(page: Page): Promise<Sample[]> {
  return page.evaluate(() => (window as unknown as { __memSamples?: Sample[] }).__memSamples ?? []);
}

/**
 * In-page watch-dog tick (called from the spec every 15 s via page.evaluate,
 * so the spec loop never goes quiet for > 15 s):
 *   1. restore health to 100 through the product's own __setPlayerHealth
 *      accessor if the player took collision damage,
 *   2. return { playing, health } so the spec can log state.
 */
async function watchdogTick(page: Page): Promise<{ playing: boolean; health: number | null }> {
  return page.evaluate(() => {
    const w = window as unknown as Record<string, any>;
    let playing: boolean | null = null;
    let health: number | null = null;
    try {
      playing = w.game?.isGameRunning ? w.game.isGameRunning() : null;
      const sm = w.game?.getSceneManager?.();
      const sc = sm?.getCurrentScene?.();
      const p = sc?.player ?? null; // GameScene.player (private, reflective)
      health = p?.getState?.()?.health ?? null;
      if (typeof w.__setPlayerHealth === 'function' && typeof health === 'number' && health < 100 && playing === true) {
        w.__setPlayerHealth(100);
      }
    } catch {
      /* scene not ready yet */
    }
    return { playing: playing === true, health };
  });
}

// ── Test ───────────────────────────────────────────────────────────────────

test('W4-D.2: 5-minute memory leak test — JS heap growth over 300 s of gameplay stays <= 10 %', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  test.setTimeout(600_000); // 5 min window + transition phase + boot + SwiftShader overhead margin

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const t0 = { value: Date.now() };
  const consoleEntries = captureConsole(page, t0);
  const lines: string[] = [];
  const log = (msg: string): void => {
    lines.push(msg);
    console.log(`W4D2: ${msg}`);
  };

  // ── Boot ────────────────────────────────────────────────────────────────
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(800); // let the boot log settle

  const bootMemory = await page.evaluate(() => {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? Math.round((mem.usedJSHeapSize / 1048576) * 100) / 100 : null;
  });
  log(`BOOT heap=${bootMemory ?? 'n/a (performance.memory unavailable)'} MB`);

  // ── Enter the game ──────────────────────────────────────────────────────
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(600); // rAF loop + first frames settle

  // Sampler covers the whole window + transition phase; install it BEFORE
  // the t=0 record so that record sits on the sampler's clock.
  const installed = await page.evaluate(() => {
    try {
      const w = window as unknown as Record<string, any>;
      if (typeof w.__memSampler?.record === 'function') return 'already';
      return 'none';
    } catch {
      return 'err';
    }
  });
  console.log(`W4D2: sampler pre-check: ${installed}`);
  await installSampler(page);
  await page.evaluate(() => (window as unknown as Record<string, any>).__memSampler.record()); // t=0 sample now

  // ── 5-minute continuous gameplay window ─────────────────────────────────
  interface Checkpoint {
    minute: number;
    heapUsedMB: number | null;
    heapTotalMB: number | null;
    obstacles: number | null;
    pool: number | null;
    sceneChildren: number | null;
    domNodes: number | null;
    frames: number;
    playing: boolean | null;
    shot: string;
  }
  const checkpoints: Checkpoint[] = [];
  const seenCheckpoints = new Set<number>();
  const tickMs = 15_000;
  const totalTicks = (WINDOW_SECONDS * 1000) / tickMs; // 20 ticks

  for (let i = 1; i <= totalTicks; i++) {
    await page.waitForTimeout(tickMs);
    // Keep the run alive (watch-dog) — see spec header.
    await watchdogTick(page);
    // Periodic keyboard input: rotate through WASD + arrows so every input
    // path + the camera lerp are exercised across the window.
    const key = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][i % 8];
    await page.keyboard.down(key);
    await page.waitForTimeout(700);
    await page.keyboard.up(key);

    // Score event every 30 s (twice per 15 s tick, on even ticks 2,4,6...)
    if (i % 2 === 0) {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('player:score', { detail: { points: 50 } }));
      });
    }

    // Checkpoints at 1..5 min: pull sampler + screenshot + console snapshot.
    const minute = Math.round(i * tickMs / 60_000);
    if (CHECKPOINT_MINUTES.includes(minute) && !seenCheckpoints.has(minute)) {
      seenCheckpoints.add(minute);
      const samples = await pullSamples(page);
      // The sampler fires every 10 s but our checkpoint read happens every
      // 15 s — take the most recent sample with t <= now (sampler records
      // lag our reads; picking the newest past sample avoids the off-by-one
      // where a sample at t=62 is labelled "T1MIN" even though the page
      // has already moved on to t=75+).
      const atMinute = [...samples].reverse().find((s) => s.t <= i * tickMs / 1000)
        ?? samples.sort((a, b) => b.t - a.t)[0];
      const shot = `w4d2-mem-t${minute}min.png`;
      await page.screenshot({ path: join(EVIDENCE_DIR, shot) });
      const fatalSoFar = filterFatalErrors(consoleEntries);
      checkpoints.push({
        minute,
        heapUsedMB: atMinute?.heapUsedMB ?? null,
        heapTotalMB: atMinute?.heapTotalMB ?? null,
        obstacles: atMinute?.obstacles ?? null,
        pool: atMinute?.pool ?? null,
        sceneChildren: atMinute?.sceneChildren ?? null,
        domNodes: atMinute?.domNodes ?? null,
        frames: atMinute?.frames ?? 0,
        playing: atMinute?.playing ?? null,
        shot,
      });
      log(
        `T${minute}MIN heap=${atMinute?.heapUsedMB ?? 'n/a'}MB obs=${atMinute?.obstacles ?? 'n/a'} pool=${atMinute?.pool ?? 'n/a'} ` +
          `scene=${atMinute?.sceneChildren ?? 'n/a'} dom=${atMinute?.domNodes ?? 'n/a'} playing=${atMinute?.playing ?? 'n/a'} ` +
          `fatalConsole=${fatalSoFar.length}`
      );
      if (atMinute && atMinute.playing === false) {
        // A blur-paused or stopped game freezes the window — fail loudly
        // instead of measuring a frozen loop.
        throw new Error(`Game not playing at T${minute}MIN — window invalid (blur-pause or stopped loop)`);
      }
    }
  }

  // t=0 checkpoint (the sampler's first record, taken at install time).
  const samplesAll = await pullSamples(page);
  const t0Sample = samplesAll.filter((s) => s.t <= 5).sort((a, b) => a.t - b.t)[0];
  checkpoints.unshift({
    minute: 0,
    heapUsedMB: t0Sample?.heapUsedMB ?? null,
    heapTotalMB: t0Sample?.heapTotalMB ?? null,
    obstacles: t0Sample?.obstacles ?? null,
    pool: t0Sample?.pool ?? null,
    sceneChildren: t0Sample?.sceneChildren ?? null,
    domNodes: t0Sample?.domNodes ?? null,
    frames: t0Sample?.frames ?? 0,
    playing: t0Sample?.playing ?? null,
    shot: '(pre-run, at start)',
  });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w4d2-mem-t0min.png') });
  log(`T0MIN heap=${t0Sample?.heapUsedMB ?? 'n/a'}MB obs=${t0Sample?.obstacles ?? 'n/a'} (pre-run sample)`);

  // ── Transition phase: death -> restart -> 2nd run (30 s) -> die -> menu ─
  const dispatchDeath = async (label: string): Promise<void> => {
    log(`TRANSITION(${label}): dispatching player:death`);
    // The window-level 'player:death' listener only exists while GameScene
    // is the active scene. Dispatch it, then wait for the restart button to
    // be visible.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('player:death')));
    await page.waitForSelector('#gameover-restart-button', { timeout: 10_000, state: 'visible' });
  };
  const restartToMenu = async (label: string): Promise<void> => {
    // Trigger restartGame() via the Enter keydown event. The keydown
    // listener is attached in GameOverScene.onEnter whenever the scene is
    // freshly entered — regardless of the button's .disabled state.
    await page.keyboard.press('Enter');
    try {
      await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
      await page.waitForSelector('#gameover-container', { timeout: 10_000, state: 'hidden' });
    } catch {
      // Fallback: force a clean transition by calling the scene manager
      // directly. This bypasses the GameOverScene's internal `restarted`
      // guard and stale .disabled state — the transition goes straight
      // from the current scene to the menu.
      log(`TRANSITION(${label}): Enter did not reach menu — forcing switchScene('menu') via the scene manager`);
      await page.evaluate(() => {
        const game = (window as unknown as Record<string, any>).game;
        // Game.switchScene delegates to sceneManager.loadScene.
        return game?.switchScene?.('menu');
      });
      await page.waitForSelector('#menu-container', { timeout: 10_000, state: 'visible' });
      await page.waitForSelector('#gameover-container', { timeout: 10_000, state: 'hidden' });
    }
  };

  await dispatchDeath('run1');
  await page.waitForTimeout(400);
  const goHeap = await page.evaluate(() => {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? Math.round((mem.usedJSHeapSize / 1048576) * 100) / 100 : null;
  });
  log(`GAMEOVER heap=${goHeap}MB`);
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w4d2-mem-gameover.png') });

  await restartToMenu('run1');
  await page.waitForTimeout(400);
  const menuHeap = await page.evaluate(() => {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? Math.round((mem.usedJSHeapSize / 1048576) * 100) / 100 : null;
  });
  log(`MENU-1 heap=${menuHeap}MB (after run-1 teardown) — run-1->menu delta=${menuHeap != null && goHeap != null ? (menuHeap - goHeap).toFixed(1) : 'n/a'}MB`);

  // 2nd run, 30 s (shorter leg — this phase is secondary evidence; the
  // 300 s window above is the gating measurement and already proved the
  // run loop's overhead is the dominant cost on SwiftShader).
  await page.keyboard.press('Enter');
  // Wait until the HUD belongs to the NEW run. The visible #game-score div
  // is owned by UISystem (created once at boot) and is NOT recreated on
  // scene re-entry — GameScene.onEnter pushes a fresh value via
  // setScore(0), writing "SCORE: 0". The previous run's HUD text was
  // "SCORE: <n>" with n >= 500 (player:score events every 30 s during the
  // window), so a "SCORE: 0" is proof the new run's state reset landed.
  await page.waitForFunction(
    () => (document.getElementById('game-score') as HTMLElement | null)?.textContent === 'SCORE: 0',
    { timeout: 15_000 },
  );
  await page.waitForTimeout(500);
  const run2StartSamples = await pullSamples(page);
  const run2StartHeap = run2StartSamples[run2StartSamples.length - 1]?.heapUsedMB ?? null;
  log(`RUN2-START heap=${run2StartHeap}MB`);
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(tickMs);
    await watchdogTick(page);
  }
  const run2Heap = await page.evaluate(() => {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? Math.round((mem.usedJSHeapSize / 1048576) * 100) / 100 : null;
  });
  log(`RUN2-END heap=${run2Heap}MB (start=${run2StartHeap}MB, delta=${run2Heap != null && run2StartHeap != null ? (run2Heap - run2StartHeap).toFixed(2) : 'n/a'}MB)`);
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w4d2-mem-run2.png') });

  // End run 2, back to menu (2nd teardown — repeated disposal path).
  await dispatchDeath('run2');
  await page.waitForTimeout(400);
  await restartToMenu('run2');
  const menu2Heap = await page.evaluate(() => {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return mem ? Math.round((mem.usedJSHeapSize / 1048576) * 100) / 100 : null;
  });
  log(`MENU-2 heap=${menu2Heap}MB (after run-2 teardown)`);
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w4d2-mem-menu2.png') });

  // ── Stop sampler, collect the full record ───────────────────────────────
  await page.evaluate(() => (window as unknown as Record<string, any>).__memSampler.stop());
  const allSamples = await pullSamples(page);
  const fatal = filterFatalErrors(consoleEntries);

  // ── Analysis: monotone envelope + growth gate ──────────────────────────
  const inWindow = allSamples
    .filter((s) => s.t >= 0 && s.t <= WINDOW_SECONDS + 5 && typeof s.heapUsedMB === 'number')
    .sort((a, b) => a.t - b.t);
  expect(inWindow.length, `Need >= 6 in-window heap samples, got ${inWindow.length}`).toBeGreaterThanOrEqual(6);

  // Monotone envelope: running max — removes GC dips so the gate measures
  // sustained retention, not GC noise.
  let env = -Infinity;
  const envelope = inWindow.map((s) => {
    env = Math.max(env, s.heapUsedMB!);
    return { t: s.t, v: env };
  });
  const startHeap = envelope[0].v;
  const endHeap = envelope[envelope.length - 1].v;
  const growthPct = ((endHeap - startHeap) / startHeap) * 100;

  // Per-minute step growth (envelope) — a single anomalous spike is noted;
  // the gate is on start->end.
  const stepLines: string[] = [];
  for (let i = 1; i < envelope.length; i++) {
    const d = envelope[i].v - envelope[i - 1].v;
    stepLines.push(`  t=${envelope[i - 1].t}s->${envelope[i].t}s: ${d >= 0 ? '+' : ''}${d.toFixed(2)}MB`);
  }

  // Obstacle trend: live array must stay bounded (reap at z < -250, W4-B.11).
  const obsSeries = inWindow
    .filter((s) => typeof s.obstacles === 'number')
    .map((s) => ({ t: s.t, obs: s.obstacles!, pool: s.pool ?? -1, scene: s.sceneChildren ?? -1 }));
  const obsMax = obsSeries.length ? Math.max(...obsSeries.map((p) => p.obs)) : null;
  const obsBounded = obsMax != null && obsMax <= 60; // far above any on-screen count; a real leak runs into the hundreds

  // ── Verdict ─────────────────────────────────────────────────────────────
  const passHeap = growthPct <= LEAK_GROWTH_GATE * 100;
  const passObstacles = obsBounded;
  const verdict = passHeap && passObstacles && fatal.length === 0 ? 'PASS' : 'FAIL';

  // ── Evidence file ───────────────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const evidence: string[] = [];
  evidence.push('# W4-D.2 — 5-minute memory leak test');
  evidence.push(`# Verdict: ${verdict}`);
  evidence.push(`# Run: ${nowIso} · project=${tag} · repo @ HEAD`);
  evidence.push(`# Method: headed Chrome (chromium-boot, SwiftShader WebGL), 300 s continuous gameplay`);
  evidence.push(`#   window, heap sampled every 10 s (performance.memory), in-page watch-dog kept the`);
  evidence.push(`#   run alive; keyboard input cycled WASD+arrows every 15 s; score events`);
  evidence.push(`#   every 30 s. Gate: envelope growth (start->end, GC dips excluded) <= 10 %.`);
  evidence.push('');
  evidence.push('## Heap samples (in-window, every 10 s)');
  evidence.push('t(s)  heapUsedMB  heapTotalMB  obstacles  pool  sceneChildren  domNodes  frames  playing');
  for (const s of inWindow) {
    evidence.push(
      `${String(s.t).padStart(5, ' ')}  ${String(s.heapUsedMB ?? 'n/a').padStart(10, ' ')}  ${String(s.heapTotalMB ?? 'n/a').padStart(12, ' ')}  ${String(s.obstacles ?? 'n/a').padStart(9, ' ')}  ${String(s.pool ?? 'n/a').padStart(4, ' ')}  ${String(s.sceneChildren ?? 'n/a').padStart(14, ' ')}  ${String(s.domNodes ?? 'n/a').padStart(8, ' ')}  ${String(s.frames ?? 'n/a').padStart(6, ' ')}  ${String(s.playing ?? 'n/a')}`
    );
  }
  evidence.push('');
  evidence.push('## Checkpoints (screenshot + console at each minute)');
  for (const c of checkpoints) {
    evidence.push(
      `T${c.minute}MIN: heap=${c.heapUsedMB}MB total=${c.heapTotalMB}MB obs=${c.obstacles} pool=${c.pool} ` +
        `scene=${c.sceneChildren} dom=${c.domNodes} playing=${c.playing} shot=${c.shot}`
    );
  }
  evidence.push('');
  evidence.push('## Analysis');
  evidence.push(`Monotone envelope (GC dips excluded): start=${startHeap}MB end=${endHeap}MB growth=${growthPct.toFixed(2)}% (gate: <= ${LEAK_GROWTH_GATE * 100}%)`);
  evidence.push('Step deltas (envelope):');
  evidence.push(...stepLines);
  evidence.push(`Live obstacle array: max=${obsMax} over window (bounded <= 60: ${obsBounded ? 'YES' : 'NO'})`);
  evidence.push(`Fatal console errors in full run: ${fatal.length}`);
  if (fatal.length) {
    evidence.push(...fatal.slice(0, 20).map((e) => `  [${e.type} @t${e.t}s] ${e.text.slice(0, 300)}`));
  }
  evidence.push('');
  evidence.push('## Transition phase (after 5 min, secondary — not gating)');
  evidence.push(`game-over heap=${goHeap}MB; menu-after-run1=${menuHeap}MB; run2-end(30s)=${run2Heap}MB; menu-after-run2=${menu2Heap}MB`);
  evidence.push('');
  evidence.push(`## VERDICT: ${verdict}`);
  evidence.push(
    passHeap
      ? `  heap growth ${growthPct.toFixed(2)}% <= ${LEAK_GROWTH_GATE * 100}% gate over 300 s continuous gameplay.`
      : `  heap growth ${growthPct.toFixed(2)}% EXCEEDS the ${LEAK_GROWTH_GATE * 100} % gate — flagged as a leak.`
  );
  evidence.push(
    passObstacles
      ? `  obstacle array stayed bounded (max ${obsMax}) — W4-B.11 reap/pool working.`
      : `  obstacle array UNBOUNDED (max ${obsMax}) — reap/pool not bounding the live array.`
  );
  evidence.push(
    fatal.length === 0 ? '  no fatal console errors across the full run.' : `  ${fatal.length} fatal console errors — see list above.`
  );
  evidence.push('');
  evidence.push('## Screenshots');
  evidence.push('  w4d2-mem-t0min.png .. w4d2-mem-t5min.png (per-minute checkpoints)');
  evidence.push('  w4d2-mem-gameover.png, w4d2-mem-run2.png, w4d2-mem-menu2.png (transition phase)');

  writeFileSync(EVIDENCE_FILE, evidence.join('\n') + '\n', 'utf8');
  log(`evidence written: ${EVIDENCE_FILE}`);

  // The spec's own assert = the gate, so a CI run fails exactly when the
  // gate fails (evidence file always written first).
  expect(
    passHeap,
    `JS heap grew ${growthPct.toFixed(2)}% over 300 s (envelope ${startHeap}MB -> ${endHeap}MB); gate is ${LEAK_GROWTH_GATE * 100}% — see ${EVIDENCE_FILE}`
  ).toBe(true);
  expect(
    passObstacles,
    `Live obstacle array exceeded 60 (max ${obsMax}) over the window — see ${EVIDENCE_FILE}`
  ).toBe(true);
  expect(
    fatal.length,
    `Fatal console errors observed: ${fatal.map((e) => `[${e.type}] ${e.text}`).join(' | ')}`
  ).toBe(0);
});
