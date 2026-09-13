import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W2-E.2 — FPS baseline at 20 obstacles (D4 gate). Week-2 success criterion #7.
 *
 * Measure the frame rate of the running game (real headed Chrome, real
 * WebGL) with 20 obstacles in the scene, over a fixed sample window, and
 * record the number in evidence. D4 gate: if the baseline is <30 FPS the
 * W3 performance scope must be re-scoped BEFORE W3 starts (60-FPS/100-
 * objects is a W4 target, not a W2 gate).
 *
 * Method (must be valid, not just a number):
 *   1. Boot to menu, enter the game scene via window.game (same public
 *      surface the W2-E.1 smoke suite uses).
 *   2. Inject 20 static obstacles into the live app: 20 THREE.Group +
 *      BoxGeometry + MeshStandardMaterial meshes (the Obstacle entity's
 *      render shape) added to the current scene graph, and 20 static
 *      (mass=0) box bodies in the app's real cannon-es world, so both
 *      render load and per-frame physics load are representative.
 *   3. Measure with requestAnimationFrame timestamps over a 10 s window
 *      after a 3 s warm-up, sampling the rAF counter in-page; also
 *      verify the frame counter actually advances (renderer is live).
 *   4. Report mean/min/median FPS + frame-time percentiles to
 *      tests/evidence/w2/w2-e2-fps-20.log, plus a screenshot of the
 *      scene with the 20 obstacles (w2-e2-fps-20.png).
 *
 * Evidence: tests/evidence/w2/w2-e2-fps-20.log + w2-e2-fps-20.png.
 *
 * Known repo finding (out of scope, flagged for W3-A/W3-C): the game canvas
 * renders BLACK in every W2 e2e screenshot (this spec's w2-e2-fps-20.png
 * included). The W2-E.1a/E.1b/E.2 e2e asserts (WebGL context live,
 * scene-graph positions, rAF loop cadence, DOM HUD) all pass, so the
 * frame loop and scene graph are real — but the on-canvas pixels are not
 * visible. Root cause hypothesis: SceneManager.render() delegates to
 * Scene.render() which uses each scene's OWN detached THREE.WebGLRenderer
 * (src/scenes/Scene.ts:20), not the Game's shared renderer on
 * #game-canvas (src/core/Renderer.ts, created per W2-A.1/A.2). The
 * W2-A.2 "shared renderer" wiring therefore draws to a detached canvas
 * that is not in the DOM. Does NOT invalidate this FPS number: the
 * measured rAF cadence is the app's real frame-loop tick rate with the
 * 20 injected obstacles present in the scene graph + physics world, and
 * the renderer still runs a WebGL context per frame. Revisit in W3-A
 * (renderer/scene wiring) before trusting FPS as a visual-performance
 * gate.
 *
 * Note: run WITHOUT the BROWSER env var so playwright's testDir stays
 * `./tests/e2e` (the W2-E.1b per-browser env switch would re-point testDir
 * to ./tests/e2e/smoke and exclude this spec).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
/* W2-E.2: evidence must land under <repo>/tests/evidence/w2/.
 * This spec lives at <repo>/tests/e2e/fps.spec.ts, so __dirname is
 * <repo>/tests/e2e: '..' → tests, '..' → repo root, then
 * 'tests/evidence/w2'. (The smoke spec lives one level deeper, at
 * tests/e2e/smoke/, and needs '..','..' before 'evidence/w2' — hence the
 * W2-E.1b BROWSER-env testDir switch doesn't affect this path.) */
const EVIDENCE_DIR = join(__dirname, '..', '..', 'tests', 'evidence', 'w2');
const APP_URL = 'http://localhost:5173/public/index.html';

const OBSTACLE_COUNT = Number(process.env.FPS_OBSTACLES ?? 20);
const WARMUP_MS = 3000;
const SAMPLE_MS = 10_000;

interface FpsSample {
  frameCount: number;
  frameTimes: number[]; // per-frame deltas in ms
  meanFps: number;
  minFps: number;
  medianFps: number;
  p95FrameMs: number;
  durationMs: number;
}

// ── Boot helpers (same public surface as tests/e2e/smoke/smoke.spec.ts) ────

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
  await page.waitForTimeout(300);
}

/**
 * Inject N static obstacles into the live app's scene + physics world.
 * Returns the number of obstacle groups actually added to the scene graph.
 */
async function injectObstacles(page: Page, count: number): Promise<number> {
  return page.evaluate(async (n) => {
    const g = (window as unknown as {
      game?: {
        getSceneManager: () => { getCurrentScene: () => { getScene: () => { children: unknown[] } } };
        getPhysicsSystem: () => { createBox: (id: string, pos: { x: number; y: number; z: number }, size: { x: number; y: number; z: number }, mass?: number) => unknown };
      };
    }).game;
    const scene = g?.getSceneManager?.()?.getCurrentScene()?.getScene?.();
    if (!scene) throw new Error('Current scene not found');

    const threeUrl = '/node_modules/.vite/deps/three.js';
    const three = (await import(threeUrl)) as {
      Group: new () => { position: { set: (x: number, y: number, z: number) => void }; add: (m: unknown) => void; type?: string };
      BoxGeometry: new (w: number, h: number, d: number) => unknown;
      MeshStandardMaterial: new (o: Record<string, number>) => unknown;
      Mesh: new (geo: unknown, mat: unknown) => unknown;
    };

    // Deterministic 4x5 grid of obstacles, spaced 4 units apart, centred
    // on the player's spawn area (z in -36..-16, x in -8..8).
    let added = 0;
    for (let i = 0; i < n; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = (col - 1.5) * 4;
      const z = -8 - row * 4;

      const group = new three.Group();
      group.position.set(x, 1, z);
      const mesh = new three.Mesh(
        new three.BoxGeometry(2, 2, 2),
        new three.MeshStandardMaterial({ color: 0xff0000, metalness: 0.3, roughness: 0.8 })
      );
      group.add(mesh);
      (scene as unknown as { add: (o: unknown) => void }).add(group);

      // Static (mass=0) box body in the app's real physics world —
      // matches how obstacles are collidable without adding mass.
      g?.getPhysicsSystem?.().createBox(
        `fps-obstacle-${i}`,
        { x, y: 1, z },
        { x: 2, y: 2, z: 2 },
        0
      );
      added++;
    }
    return added;
  }, count);
}

/**
 * Measure the running frame loop's FPS in-page:
 *  - warm up WARMUP_MS so the loop is in steady state,
 *  - then count rAF ticks for SAMPLE_MS and record per-frame deltas.
 */
async function measureFps(page: Page): Promise<FpsSample> {
  return page.evaluate(
    ({ warmup, sample }) =>
      new Promise<FpsSample>((resolve, reject) => {
        const state = { frames: 0, last: 0, deltas: [] as number[], start: 0, done: false };

        function tick(now: number) {
          if (state.done) return;
          if (state.last !== 0) {
            state.deltas.push(now - state.last);
            state.frames++;
          }
          state.last = now;
          if (now - state.start < sample) {
            requestAnimationFrame(tick);
          } else {
            state.done = true;
            const frameTimes = state.deltas;
            const sorted = [...frameTimes].sort((a, b) => a - b);
            const medianFrameMs = sorted[Math.floor(sorted.length / 2)] ?? 0;
            const p95FrameMs = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
            const durationMs = state.deltas.length > 0 ? state.deltas.reduce((a, b) => a + b, 0) : 0;
            const meanFps = durationMs > 0 ? (1000 * state.frames) / durationMs : 0;
            const maxDelta = sorted[sorted.length - 1] ?? 0;
            resolve({
              frameCount: state.frames,
              frameTimes,
              meanFps,
              minFps: maxDelta > 0 ? 1000 / maxDelta : 0,
              medianFps: medianFrameMs > 0 ? 1000 / medianFrameMs : 0,
              p95FrameMs,
              durationMs
            });
          }
        }

        // Warm-up: let the loop run steady before sampling.
        const t0 = performance.now();
        function warmupTick(now: number) {
          if (now - t0 < warmup) {
            requestAnimationFrame(warmupTick);
          } else {
            state.start = now;
            state.last = now;
            requestAnimationFrame(tick);
          }
        }
        requestAnimationFrame(warmupTick);

        // Safety: never hang the test.
        setTimeout(() => {
          if (!state.done) {
            state.done = true;
            resolve(null as unknown as FpsSample);
          }
        }, warmup + sample + 30_000);
      }),
    { warmup: WARMUP_MS, sample: SAMPLE_MS }
  );
}

// ── The test ────────────────────────────────────────────────────────────────

test('W2-E.2: FPS baseline @ 20 obstacles (D4 gate)', async ({ page }) => {
  test.setTimeout(120_000);

  await bootToMenu(page);

  // Sanity: the game handle + running loop must exist before we sample.
  const running = await page.evaluate(() => {
    const g = (window as unknown as { game?: { isGameRunning?: () => boolean } }).game;
    return !!g && g.isGameRunning?.() === true;
  });
  expect(running, 'window.game must exist and be running before entering the scene').toBe(true);

  // D4 gate (week-2 criterion #7): the 20-obstacle baseline must hold >=30
  // mean FPS, else W3 is re-scoped before it starts (TDD_PLAN D4). This
  // assertion makes the gate part of the test itself, not just prose in
  // the evidence log. RED-phase negative control: 61 — any rAF-capped
  // display (59–60 FPS) fails, proving the gate assertion fires; the
  // GREEN commit restores the real D4 threshold (30).
  const D4_MIN_FPS = 61;

  await enterGameScene(page);
  expect(
    await page.evaluate(() => {
      const g = (window as unknown as { game?: { isGameRunning?: () => boolean } }).game;
      return g?.isGameRunning?.() === true;
    }),
    'Game must be running in the game scene (FSM = playing)'
  ).toBe(true);

  // Inject the 20 obstacles into the live scene + physics world.
  const injected = await injectObstacles(page, OBSTACLE_COUNT);
  expect(injected, `Must inject ${OBSTACLE_COUNT} obstacles`).toBe(OBSTACLE_COUNT);

  // Verify they are actually in the rendered scene graph.
  const inScene = await page.evaluate(() => {
    const g = (window as unknown as {
      game?: { getSceneManager: () => { getCurrentScene: () => { getScene: () => { children: Array<{ type?: string }> } } } };
    }).game;
    const scene = g?.getSceneManager?.()?.getCurrentScene()?.getScene?.();
    return scene?.children.filter((c) => c.type === 'Group').length ?? 0;
  });
  expect(inScene, 'Obstacle groups must be present in the scene graph').toBeGreaterThanOrEqual(OBSTACLE_COUNT);

  await page.screenshot({ path: join(EVIDENCE_DIR, 'w2-e2-fps-20.png'), fullPage: true });

  // Measure the baseline.
  const sample = await measureFps(page);

  // The renderer must actually be producing frames (rAF advancing).
  expect(
    sample,
    'FPS measurement must complete (null means rAF did not fire within the window — tab backgrounded/throttled or loop not running)'
  ).not.toBeNull();
  expect(
    sample.frameCount,
    `Frame counter must advance during the sample window (got ${sample.frameCount} frames)`
  ).toBeGreaterThan(0);
  expect(sample.meanFps, 'Mean FPS must be a finite positive number').toBeGreaterThan(0);

  // ── Write the evidence log ───────────────────────────────────────────────
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const ts = new Date().toISOString();
  const d4 = sample.meanFps >= D4_MIN_FPS ? 'PASS' : 'FAIL — ESCALATE: re-scope W3 before it starts';
  const log = [
    'W2-E.2 — FPS baseline @ 20 obstacles (D4 gate)',
    `timestamp: ${ts}`,
    'browser: real Chrome (Playwright chromium-boot project, headed)',
    `url: ${APP_URL}`,
    `obstacles: ${OBSTACLE_COUNT} (static groups w/ BoxGeometry+MeshStandardMaterial in the live scene + static mass=0 box bodies in the live cannon-es world)`,
    `warmup: ${WARMUP_MS} ms; sample window: ${SAMPLE_MS} ms; method: requestAnimationFrame tick counting in-page`,
    '',
    `frames sampled: ${sample.frameCount}`,
    `mean FPS:      ${sample.meanFps.toFixed(1)}`,
    `median FPS:    ${sample.medianFps.toFixed(1)}`,
    `min FPS (worst single frame): ${sample.minFps.toFixed(1)}`,
    `p95 frame time: ${sample.p95FrameMs.toFixed(1)} ms`,
    `sample duration: ${sample.durationMs.toFixed(0)} ms`,
    '',
    `D4 GATE (>=${D4_MIN_FPS} FPS): ${d4}`,
    '',
    'Note: the 60-FPS / 100-objects benchmark is a W4 target, not a W2 gate (D4).'
  ].join('\n');
  writeFileSync(join(EVIDENCE_DIR, 'w2-e2-fps-20.log'), log + '\n', 'utf-8');

  // D4 gate: fail the test if the baseline is <30 FPS. If this fires,
  // W3 must be re-scoped BEFORE it starts (TDD_PLAN D4 / week-2
  // criterion #7) — do not silently proceed.
  expect(
    sample.meanFps,
    `D4 gate: mean FPS ${sample.meanFps.toFixed(1)} at ${OBSTACLE_COUNT} obstacles must be >= ${D4_MIN_FPS} — if <30, ESCALATE: re-scope W3 before it starts`
  ).toBeGreaterThanOrEqual(D4_MIN_FPS);

  console.log(log);
});
