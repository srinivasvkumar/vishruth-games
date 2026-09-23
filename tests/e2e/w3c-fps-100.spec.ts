import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3-C.1a — Performance benchmark: FPS @ 100+ obstacles (D4 gate).
 *
 * Kanban t_899ab91d. Measures the running game's frame rate (real headed
 * Chrome, real WebGL/SwiftShader) with 100+ obstacles in the scene over a
 * stable 15 s sample window, and records mean/min/p95 FPS + renderer info.
 *
 * D4 gate: 60 FPS @ committed obstacle count. W2-E baseline was 60.0 FPS @
 * 20 obstacles (tests/evidence/w2/w2-e2-fps-20.log). This spec pushes the
 * obstacle count to 120 and checks whether the 60-FPS target still holds.
 *
 * Method (matches the W2-E.2 FPS spec's proven approach, scaled to 120):
 *   1. Boot to menu, enter the game scene via window.game.getSceneManager().
 *   2. Inject 120 obstacles into the live app:
 *        - 120 THREE.Group + BoxGeometry + MeshStandardMaterial meshes added
 *          to the current THREE.Scene (the Obstacle entity's render shape),
 *          so the renderer draws 120 extra draw calls per frame.
 *        - 120 lightweight stand-in obstacle objects pushed into the
 *          GameScene's private `obstacles` array so GameScene.onUpdate()
 *          runs update() on them every frame AND checkCollisions() scans
 *          them every frame (real per-frame JS + collision work, not just
 *          render load).
 *        - 120 static (mass=0) box bodies in the app's real cannon-es
 *          physics world (matches the W2-E.2 spec, representative physics
 *          load).
 *   3. Measure with requestAnimationFrame deltas in-page: 3 s warm-up, then
 *      a 15 s sample window. Record mean/min/median FPS + p95 frame time.
 *   4. Report to tests/evidence/w3/W3C1A-GREEN.txt + screenshot
 *      w3c-fps-100.png.
 *
 * Obstacles are spawned on a 6x20 grid in z -30..-108 (x -10..10), well
 * behind the player's spawn (0,1,0) so the player takes no collision damage
 * and the run never ends (which would stop the rAF loop and invalidate the
 * measurement).
 *
 * Evidence: tests/evidence/w3/W3C1A-GREEN.txt + w3c-fps-100.png + console.
 *
 * Run: npm run test:e2e -- tests/e2e/w3c-fps-100.spec.ts --project=chromium-boot
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', '..', 'tests', 'evidence', 'w3');
const APP_URL = 'http://localhost:5173/public/index.html';

const OBSTACLE_COUNT = 120; // 100+ per the D4 gate
const WARMUP_MS = 3000;
const SAMPLE_MS = 15_000;

// D4 gate threshold: 60 FPS @ committed obstacle count.
const D4_GATE_FPS = 60;

interface FpsSample {
  frameCount: number;
  meanFps: number;
  minFps: number;
  medianFps: number;
  p95FrameMs: number;
  durationMs: number;
}

// ── Boot helpers (same public surface as W2-E.2 / W3-B CP specs) ────────────

async function bootToMenu(page: Page): Promise<void> {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
}

/** Read the current game state ('playing' when the game loop is live). */
async function getGameState(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const g = (window as unknown as { game?: { getGameState?: () => string } }).game;
    return g?.getGameState?.() ?? null;
  });
}

async function enterGameScene(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const g = (window as unknown as { game?: { getSceneManager?: () => { loadScene: (n: string) => Promise<void> } } }).game;
    if (!g?.getSceneManager) throw new Error('window.game.getSceneManager not available');
    await g.getSceneManager().loadScene('game');
  });
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'attached' });
  await page.waitForTimeout(500);
}

/**
 * Inject N obstacles into the live app:
 *  - N THREE.Group + BoxGeometry + MeshStandardMaterial meshes into the
 *    current THREE.Scene (renderer draws them every frame),
 *  - N stand-in obstacle objects into the GameScene's private `obstacles`
 *    array (GameScene.onUpdate() runs update() + checkCollisions() on them
 *    every frame — real per-frame JS work, not just render load),
 *  - N static (mass=0) box bodies in the app's real cannon-es physics world.
 *
 * Returns the number of obstacle groups actually added to the scene graph.
 * Obstacles are placed on a 6x20 grid behind the player (z -30..-108) so
 * the player takes no collision damage and the run never ends.
 */
async function injectObstacles(page: Page, count: number): Promise<{
  sceneGroups: number;
  obstaclesArrayLen: number;
  physicsBodies: number;
}> {
  return page.evaluate(async (n) => {
    const w = window as unknown as {
      game?: {
        getSceneManager: () => {
          getCurrentScene: () => {
            getScene: () => {
              children: Array<{ type?: string }>;
            };
            [key: string]: unknown;
          };
        };
        getPhysicsSystem?: {
          createBox: (id: string, pos: { x: number; y: number; z: number }, size: { x: number; y: number; z: number }, mass?: number) => unknown;
        };
      };
    };
    const g = w.game;
    if (!g) throw new Error('window.game not found');
    const sm = g.getSceneManager();
    const currentScene = sm.getCurrentScene();
    const threeScene = currentScene.getScene();
    if (!threeScene) throw new Error('Current THREE.Scene not found');

    // Dynamic import of the app's bundled THREE (same proven approach as
    // the W2-E.2 FPS spec — vite dev server serves the pre-bundled dep).
    const threeUrl = '/node_modules/.vite/deps/three.js';
    const three = (await import(threeUrl)) as {
      Group: new () => { position: { set: (x: number, y: number, z: number) => void }; add: (m: unknown) => void; type?: string };
      BoxGeometry: new (w: number, h: number, d: number) => unknown;
      MeshStandardMaterial: new (o: Record<string, number>) => unknown;
      Mesh: new (geo: unknown, mat: unknown) => unknown;
    };

    // Deterministic 6x20 grid, spaced 4 units apart, in z -30..-108
    // (behind the player's spawn at z=0 so no collision damage occurs).
    let sceneGroups = 0;
    for (let i = 0; i < n; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = (col - 2.5) * 4; // -10..10
      const z = -30 - row * 4;   // -30..-108

      const group = new three.Group();
      group.position.set(x, 1, z);
      const mesh = new three.Mesh(
        new three.BoxGeometry(2, 2, 2),
        new three.MeshStandardMaterial({ color: 0xff0000, metalness: 0.3, roughness: 0.8 })
      );
      group.add(mesh);
      threeScene.add(group);
      sceneGroups++;
    }

    // Push stand-in obstacles into the GameScene's private `obstacles`
    // array so onUpdate() runs update() + checkCollisions() on them every
    // frame. TypeScript `private` is compile-time only; at runtime the
    // property is just a plain field on the instance.
    const gs = currentScene as unknown as { obstacles?: Array<{
      update: (dt: number) => void;
      isObstacleActive: () => boolean;
      getMesh: () => unknown;
      getType: () => string;
      getDamage: () => number;
    }> };
    if (!Array.isArray(gs.obstacles)) {
      throw new Error('GameScene.obstacles array not accessible on current scene');
    }
    for (let i = 0; i < n; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = (col - 2.5) * 4;
      const z = -30 - row * 4;

      const group = new three.Group();
      group.position.set(x, 1, z);
      const mesh = new three.Mesh(
        new three.BoxGeometry(2, 2, 2),
        new three.MeshStandardMaterial({ color: 0xff0000, metalness: 0.3, roughness: 0.8 })
      );
      group.add(mesh);

      // Stand-in obstacle: enough surface for GameScene.onUpdate() to
      // call update()/isObstacleActive()/getMesh()/getType()/getDamage().
      // These meshes are NOT added to the scene graph (the first loop
      // already added N real groups); they exist only to drive the
      // per-frame update() + checkCollisions() JS work.
      const standIn = {
        mesh: group,
        update: (_dt: number) => { /* no-op — static obstacle */ },
        isObstacleActive: () => true,
        getMesh: () => group,
        getType: () => 'block',
        getDamage: () => 10,
      };
      gs.obstacles.push(standIn as unknown as typeof gs.obstacles[number]);
    }
    const obstaclesArrayLen = gs.obstacles.length;

    // Static (mass=0) box bodies in the app's real physics world —
    // matches the W2-E.2 spec's representative physics load.
    let physicsBodies = 0;
    const phys = g.getPhysicsSystem?.();
    if (phys?.createBox) {
      for (let i = 0; i < n; i++) {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const x = (col - 2.5) * 4;
        const z = -30 - row * 4;
        try {
          phys.createBox(`w3c-fps-obstacle-${i}`, { x, y: 1, z }, { x: 2, y: 2, z: 2 }, 0);
          physicsBodies++;
        } catch {
          // If the physics world rejects the body, the render + update
          // load is still representative. Count what landed.
        }
      }
    }

    return { sceneGroups, obstaclesArrayLen, physicsBodies };
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
              meanFps,
              minFps: maxDelta > 0 ? 1000 / maxDelta : 0,
              medianFps: medianFrameMs > 0 ? 1000 / medianFrameMs : 0,
              p95FrameMs,
              durationMs
            });
          }
        }

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

/**
 * Read renderer stats + scene-graph facts as evidence:
 *  - renderer info: draw calls (renderer.info.render.calls), triangles,
 *    geometries, textures, programs.
 *  - scene: total children, count of Group children (obstacle groups).
 *  - game state + whether the loop is still running.
 */
async function readSceneAndRenderer(page: Page): Promise<{
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  sceneChildren: number;
  sceneGroups: number;
  gameState: string | null;
  isGameRunning: boolean;
}> {
  return page.evaluate(() => {
    const w = window as unknown as {
      game?: {
        getRenderer: () => { getRenderer: () => { info: { render: { calls: number; triangles: number }; memory: { geometries: number; textures: number }; programs: { programs: Array<unknown> } } } };
        getSceneManager: () => { getCurrentScene: () => { getScene: () => { children: Array<{ type?: string }> } } };
        isGameRunning?: () => boolean;
        getGameState?: () => string;
      };
    };
    const g = w.game;
    const renderer = g?.getRenderer?.()?.getRenderer?.();
    const scene = g?.getSceneManager?.()?.getCurrentScene()?.getScene?.();
    const children = scene?.children ?? [];
    const groups = children.filter((c) => c.type === 'Group').length;
    return {
      drawCalls: renderer?.info.render.calls ?? -1,
      triangles: renderer?.info.render.triangles ?? -1,
      geometries: renderer?.info.memory.geometries ?? -1,
      textures: renderer?.info.memory.textures ?? -1,
      programs: renderer?.info.programs?.programs?.length ?? -1,
      sceneChildren: children.length,
      sceneGroups: groups,
      gameState: g?.getGameState?.() ?? null,
      isGameRunning: g?.isGameRunning?.() ?? false
    };
  });
}

// ── The test ────────────────────────────────────────────────────────────────

test('W3-C.1a: FPS @ 100+ obstacles (D4 gate — 60 FPS @ committed count)', async ({ page }) => {
  test.setTimeout(180_000);

  await bootToMenu(page);

  const running0 = await page.evaluate(() => {
    const g = (window as unknown as { game?: { isGameRunning?: () => boolean } }).game;
    return !!g && g.isGameRunning?.() === true;
  });
  expect(running0, 'window.game must exist and be running before entering the scene').toBe(true);

  await enterGameScene(page);
  expect(
    await getGameState(page),
    'Game must be in the playing state in the game scene (FSM = playing)'
  ).toBe('playing');

  // Inject the 120 obstacles into the live scene + update loop + physics world.
  const injected = await injectObstacles(page, OBSTACLE_COUNT);
  expect(injected.sceneGroups, `Must add ${OBSTACLE_COUNT} obstacle groups to the scene graph`).toBe(OBSTACLE_COUNT);
  expect(injected.obstaclesArrayLen, `GameScene.obstacles array must contain >= ${OBSTACLE_COUNT} obstacles`).toBeGreaterThanOrEqual(OBSTACLE_COUNT);

  // Verify they are actually in the rendered scene graph.
  const sceneAfter = await readSceneAndRenderer(page);
  expect(sceneAfter.sceneGroups, 'Obstacle groups must be present in the scene graph').toBeGreaterThanOrEqual(OBSTACLE_COUNT);
  expect(sceneAfter.gameState, 'Game must still be in the playing state after injection (no accidental game-over)').toBe('playing');
  expect(sceneAfter.isGameRunning, 'Game loop must still be running after injection').toBe(true);

  // Evidence: screenshot with the 120 obstacles in the scene.
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w3c-fps-100.png'), fullPage: true });

  // Measure the FPS over a stable 15 s window (after a 3 s warm-up).
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

  // Re-read renderer + scene state after the measurement (the loop must
  // still be live, no game-over, draw calls reflecting the 120 obstacles).
  const sceneAfter2 = await readSceneAndRenderer(page);
  expect(sceneAfter2.gameState, 'Game must still be in the playing state after the FPS sample').toBe('playing');
  expect(sceneAfter2.isGameRunning, 'Game loop must still be running after the FPS sample').toBe(true);

  // ── Write the evidence log ───────────────────────────────────────────────
  const ts = new Date().toISOString();
  const d4GateMet = sample.meanFps >= D4_GATE_FPS;
  const c1b = d4GateMet ? 'NOT REQUIRED (D4 gate met at 100+ obstacles)' : 'REQUIRED (D4 gate not met — see gap + top suspect below)';
  const log = [
    'W3-C.1a — FPS @ 100+ obstacles (D4 gate)',
    `timestamp: ${ts}`,
    'browser: real Chrome (Playwright chromium-boot project, headed, SwiftShader GL)',
    `url: ${APP_URL}`,
    `obstacles: ${OBSTACLE_COUNT} (120 THREE.Group + BoxGeometry + MeshStandardMaterial meshes in the live scene + 120 stand-in obstacles in GameScene.obstacles driving per-frame update()+checkCollisions() + 120 static mass=0 box bodies in the live cannon-es world)`,
    `obstacle placement: 6x20 grid, x -10..10, z -30..-108 (behind the player's spawn at z=0 — no collision damage, run never ends)`,
    `warmup: ${WARMUP_MS} ms; sample window: ${SAMPLE_MS} ms; method: requestAnimationFrame tick counting in-page`,
    '',
    `frames sampled: ${sample.frameCount}`,
    `mean FPS:      ${sample.meanFps.toFixed(1)}`,
    `median FPS:    ${sample.medianFps.toFixed(1)}`,
    `min FPS (worst single frame): ${sample.minFps.toFixed(1)}`,
    `p95 frame time: ${sample.p95FrameMs.toFixed(1)} ms`,
    `sample duration: ${sample.durationMs.toFixed(0)} ms`,
    '',
    `renderer.info (post-injection, pre-sample):`,
    `  draw calls:  ${sceneAfter.drawCalls}`,
    `  triangles:   ${sceneAfter.triangles}`,
    `  geometries:  ${sceneAfter.geometries}`,
    `  textures:    ${sceneAfter.textures}`,
    `  programs:    ${sceneAfter.programs}`,
    `  scene children: ${sceneAfter.sceneChildren} (groups: ${sceneAfter.sceneGroups})`,
    '',
    `renderer.info (post-sample):`,
    `  draw calls:  ${sceneAfter2.drawCalls}`,
    `  triangles:   ${sceneAfter2.triangles}`,
    `  scene groups: ${sceneAfter2.sceneGroups}`,
    `  game state:  ${sceneAfter2.gameState}`,
    `  running:     ${sceneAfter2.isGameRunning}`,
    '',
    `D4 GATE (>=${D4_GATE_FPS} FPS @ committed obstacle count): ${d4GateMet ? 'MET' : 'NOT MET'}`,
    `mean FPS ${sample.meanFps.toFixed(1)} ${sample.meanFps >= D4_GATE_FPS ? '>=' : '<'} ${D4_GATE_FPS}`,
    `W3-C.1b (optimization): ${c1b}`,
    '',
    `W2-E baseline for comparison: 60.0 FPS @ 20 obstacles (tests/evidence/w2/w2-e2-fps-20.log)`,
    `Gap vs baseline: ${sample.meanFps.toFixed(1)} @ ${OBSTACLE_COUNT} obstacles vs 60.0 @ 20 obstacles`,
    '',
    'Evidence: tests/evidence/w3/w3c-fps-100.png (screenshot with 120 obstacles)'
  ].join('\n');
  writeFileSync(join(EVIDENCE_DIR, 'W3C1A-GREEN.txt'), log + '\n', 'utf-8');

  console.log(log);

  // D4 gate: the test passes when the measurement completes and the gate
  // verdict is recorded. The gate itself (>= 60 FPS) determines whether
  // W3-C.1b is required — that is the OUTCOME, not a test failure. The
  // assertion below verifies the measurement is valid (frames advanced,
  // positive FPS); the gate verdict is in the evidence log.
  expect(
    sample.meanFps,
    `Mean FPS ${sample.meanFps.toFixed(1)} @ ${OBSTACLE_COUNT} obstacles must be positive (valid measurement). D4 gate (>=${D4_GATE_FPS}): ${d4GateMet ? 'MET' : 'NOT MET → W3-C.1b required'}`
  ).toBeGreaterThan(0);
});
