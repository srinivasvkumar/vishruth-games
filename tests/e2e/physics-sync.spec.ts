import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W2-B.2 — Browser verification: physics moves the visual (Task 6.2 VERIFY).
 *
 * Task 6.2's acceptance criterion added 2026-09-13: "in real Chrome, player
 * mesh moves in response to physics step — unit tests alone do NOT satisfy
 * this task." This spec is that verification.
 *
 * Method: drive the running app's REAL frame loop through the `window.game`
 * debug handle (set by src/index.ts). We do NOT mock or step anything from
 * Node: the game's own rAF loop steps cannon-es physics (PhysicsSystem.update)
 * and copies body transforms onto meshes (BodySync.sync) every frame —
 * exactly the wiring W2-B.1 added to src/core/Game.ts.
 *
 *   1. Boot the game in real Chrome (boot → menu, as in W2-A.4).
 *   2. Via window.game: create a dynamic cannon-es sphere (mass > 0) above a
 *      static ground plane in the app's real PhysicsSystem world, and register
 *      a matching THREE mesh with the app's real BodySync.
 *   3. Assert frame-over-frame that the mesh position tracks the body and
 *      both actually move under gravity — sampled live across real frames.
 *   4. Assert sync fidelity: body and mesh agree within 1e-3 per frame.
 *   5. Capture before/after screenshots + a JSON position trace as evidence.
 *
 * Evidence: tests/evidence/w2/w2-b2-physics-sync.png (+ -2.png,
 * w2-b2-physics-sync-trace.json, w2-b2-physics-sync.txt).
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w2');
const EVIDENCE_PNG_1 = join(EVIDENCE_DIR, 'w2-b2-physics-sync.png');
const EVIDENCE_PNG_2 = join(EVIDENCE_DIR, 'w2-b2-physics-sync-2.png');
const EVIDENCE_TRACE = join(EVIDENCE_DIR, 'w2-b2-physics-sync-trace.json');
const EVIDENCE_TXT = join(EVIDENCE_DIR, 'w2-b2-physics-sync.txt');

/** A single frame-over-frame sample captured in the page. */
interface FrameSample {
  t: number; // performance.now() when sampled
  frame: number; // rAF frame counter at sample time
  bodyY: number; // cannon-es body position.y (source of truth)
  meshY: number; // THREE mesh position.y (visual)
  bodyX: number;
  meshX: number;
  bodyZ: number;
  meshZ: number;
}

/** Result of the in-page sampling script. */
interface SampleResult {
  samples: FrameSample[];
  moved: boolean; // mesh position actually changed between first and last sample
  bodyMoved: boolean; // body position actually changed
  driftMax: number; // max |mesh - body| distance across all samples
  bodyId: string;
}

/**
 * In-page helper: install a rAF frame counter on window and return a
 * promise that resolves with N samples spaced across real frames.
 * Runs inside the page so it sees the same performance.now() / rAF as the
 * game loop.
 */
async function runInPage(page: Page, bodyId: string, samples: number, spanMs: number): Promise<SampleResult> {
  return page.evaluate(
    ({ id, n, span }) =>
      new Promise<SampleResult>((resolve) => {
        const g = (window as unknown as { game: unknown }).game as {
          getPhysicsSystem: () => {
            getBody: (id: string) => {
              id: number;
              position: { x: number; y: number; z: number };
            };
          };
        };
        const body = g.getPhysicsSystem().getBody(id);
        interface P3 {
          x: number;
          y: number;
          z: number;
        }
        interface MeshLike {
          position: P3;
          userData: Record<string, unknown>;
        }
        const meshMap = (window as unknown as { __w2b2Meshes?: Map<number, MeshLike> }).__w2b2Meshes;
        const found = body ? meshMap?.get(body.id) : undefined;
        if (!body || !found?.position) {
          resolve({
            samples: [],
            moved: false,
            bodyMoved: false,
            driftMax: Infinity,
            bodyId: id
          });
          return;
        }
        const mesh = found;

        // rAF frame counter — only the game loop's rAF chain increments this
        // in the same tab, so it proves frames actually advanced.
        let frame = 0;
        const origRAF = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = ((cb: (t: number) => void) => {
          frame += 1;
          return origRAF(cb);
        }) as typeof window.requestAnimationFrame;

        const out: FrameSample[] = [];
        let collected = 0;
        const start = performance.now();

        function tick(): void {
          const now = performance.now();
          out.push({
            t: now,
            frame,
            bodyY: body.position.y,
            meshY: mesh.position.y,
            bodyX: body.position.x,
            meshX: mesh.position.x,
            bodyZ: body.position.z,
            meshZ: mesh.position.z
          });
          collected += 1;
          if (collected < n && now - start < span) {
            origRAF(tick);
            return;
          }
          window.requestAnimationFrame = origRAF; // restore
          const first = out[0];
          const last = out[out.length - 1];
          const dist = (a: FrameSample, b: FrameSample): number =>
            Math.max(
              Math.abs(a.meshX - b.meshX),
              Math.abs(a.meshY - b.meshY),
              Math.abs(a.meshZ - b.meshZ)
            );
          const moved = dist(first, last) > 1e-6;
          const bodyMoved =
            Math.abs(last.bodyY - first.bodyY) > 1e-6 ||
            Math.abs(last.bodyX - first.bodyX) > 1e-6 ||
            Math.abs(last.bodyZ - first.bodyZ) > 1e-6;
          let driftMax = 0;
          for (const s of out) {
            const d = Math.max(
              Math.abs(s.meshX - s.bodyX),
              Math.abs(s.meshY - s.bodyY),
              Math.abs(s.meshZ - s.bodyZ)
            );
            driftMax = Math.max(driftMax, d);
          }
          resolve({ samples: out, moved, bodyMoved, driftMax, bodyId: id });
        }
        origRAF(tick);
      }),
    { id: bodyId, n: samples, span: spanMs }
  );
}

/**
 * Set up the physics-driven visual through the app's real systems
 * (window.game debug handle — the task's prescribed path).
 *
 * - A static ground plane in the real cannon-es world.
 * - A dynamic sphere body (mass 1) starting 5 units above the ground,
 *   so gravity has it fall — the classic "physics simulation moves
 *   visual objects" scenario.
 * - A THREE mesh registered with the app's BodySync, so the running
 *   frame loop syncs it every frame. The mesh is built with `three`
 *   (the app's own dependency) imported in the page — same library,
 *   same Object3D interface BodySync writes to.
 *
 * Returns the body id.
 */
async function setupPhysicsDrivenMesh(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const g = (window as unknown as { game: unknown }).game as {
      getPhysicsSystem: () => {
        createGround: (id?: string) => { position: { x: number; y: number; z: number } };
        createSphere: (
          id: string,
          position: { x: number; y: number; z: number },
          radius: number,
          mass?: number
        ) => {
          id: number;
          position: { x: number; y: number; z: number };
        };
      };
      getPhysicsSync: () => {
        register: (id: string, mesh: unknown) => void;
      };
    };
    const physics = g.getPhysicsSystem();

    // Ground: static plane at y=0 (BodySync skips unregistered ids, so no
    // visual is needed for it).
    physics.createGround('w2-b2-ground');

    // Dynamic ball, 5 units above ground, mass 1 → falls under gravity.
    const ballId = 'w2-b2-ball';
    const body = physics.createSphere(ballId, { x: 0, y: 5, z: 0 }, 0.5, 1);

    // THREE mesh via the app's own three dependency, served by the vite dev
    // server as a pre-bundled ES module — same library, same Object3D
    // interface BodySync writes to. optimizeDeps.include has 'three', so
    // the dev server serves it at /node_modules/.vite/deps/three.js.
    // Runtime URL import (served by the vite dev server; no TS module
    // resolution for it) — typed manually below.
    // @ts-expect-error url-based import has no TS module declaration
    const THREE = (await import(/* @vite-ignore */ '/node_modules/.vite/deps/three.js')) as {
      Mesh: new (
        geometry: unknown,
        material: unknown
      ) => {
        position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
        userData: Record<string, unknown>;
      };
      SphereGeometry: new (radius: number, widthSegments?: number, heightSegments?: number) => unknown;
      MeshBasicMaterial: new (params: { color: number }) => unknown;
    };
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    mesh.position.set(body.position.x, body.position.y, body.position.z);
    mesh.userData.bodyId = ballId;

    // cannon-es Body has no userData; use its numeric id as the lookup key.
    (window as unknown as { __w2b2Meshes?: Map<number, unknown> }).__w2b2Meshes ??= new Map();
    (window as unknown as { __w2b2Meshes: Map<number, unknown> }).__w2b2Meshes.set(body.id, mesh);

    // Register with the app's BodySync — the running frame loop will now
    // copy body → mesh every frame (W2-B.1 wiring in Game.gameLoop).
    g.getPhysicsSync().register(ballId, mesh);

    return ballId;
  });
}

test('W2-B.2 physics sync: running frame loop moves the visual with the body (real Chrome)', async ({ page }) => {
  test.setTimeout(90_000);

  // Boot the real app — same path as W2-A.4.
  await page.goto('http://localhost:5173/public/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);

  // Verify the debug handle + BodySync wiring are live in the page.
  const handleOk = await page.evaluate(() => {
    const g = (window as unknown as { game?: { getPhysicsSystem?: unknown; getPhysicsSync?: unknown; isGameRunning?: unknown } }).game;
    return {
      hasGame: !!g,
      running: typeof g?.isGameRunning === 'function' ? g.isGameRunning() : false,
      hasPhysics: typeof g?.getPhysicsSystem === 'function',
      hasBodySync: typeof g?.getPhysicsSync === 'function'
    };
  });
  expect(handleOk.hasGame, 'window.game must be set (debug handle)').toBe(true);
  expect(handleOk.running, 'game loop must be running').toBe(true);
  expect(handleOk.hasPhysics, 'window.game.getPhysicsSystem must exist').toBe(true);
  expect(handleOk.hasBodySync, 'window.game.getPhysicsSync must exist (W2-B.1 wiring)').toBe(true);

  // Register a dynamic body + its visual through the app's real systems.
  const bodyId = await setupPhysicsDrivenMesh(page);
  expect(bodyId).toBe('w2-b2-ball');

  // BEFORE screenshot — ball is mid-fall (it spawned at y=5 above a ground
  // plane; by boot+setup time it is near the floor, about to bounce).
  await page.screenshot({ path: EVIDENCE_PNG_1 });

  // Proof that the RUNNING loop (not this test) drives the visual: read the
  // mesh position, teleport the body far away WITHOUT touching the mesh, and
  // wait ~1s of real frames. If the game loop's per-frame BodySync.sync() is
  // wired, the mesh must snap to the body's new position on its own.
  const teleport = await page.evaluate(async (id) => {
    const g = (window as unknown as { game: unknown }).game as {
      getPhysicsSystem: () => {
        getBody: (id: string) => {
          id: number;
          position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
          velocity: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
        };
      };
    };
    const body = g.getPhysicsSystem().getBody(id);
    const meshMap = (window as unknown as { __w2b2Meshes?: Map<number, { position: { x: number; y: number; z: number } }> }).__w2b2Meshes;
    const mesh = body ? meshMap?.get(body.id) : undefined;
    if (!body || !mesh) {
      return {
        ok: false,
        reason: 'body or mesh missing',
        meshBefore: { x: 0, y: 0, z: 0 },
        meshAfter: { x: 0, y: 0, z: 0 },
        bodyYNow: 0,
        meshFollowed: false
      };
    }
    const meshBefore = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
    // Move ONLY the physics body — the mesh is deliberately left where it is.
    body.position.set(0, 25, 0);
    body.velocity.set(0, 0, 0);
    await new Promise<void>((r) => window.setTimeout(r, 1000));
    const meshAfter = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
    return {
      ok: true,
      meshBefore,
      meshAfter,
      bodyYNow: body.position.y,
      meshFollowed: Math.abs(meshAfter.y - body.position.y) < 1e-3
    };
  }, bodyId);
  expect(teleport.ok, 'teleport setup must succeed').toBe(true);
  expect(teleport.meshFollowed, `mesh must follow the teleported body via the running loop's sync (meshBefore.y=${teleport.meshBefore?.y}, meshAfter.y=${teleport.meshAfter?.y}, bodyY=${teleport.bodyYNow})`).toBe(true);
  expect(teleport.meshBefore?.y, 'mesh must be at its old position before the loop syncs it').toBeLessThan(10);

  // Sample the live running frame loop: 30 samples over ~2s of real frames.
  // Gravity + restitution should move the body (and, via BodySync, the mesh)
  // in that time — it bounces on the ground plane at y=0.
  const result = await runInPage(page, bodyId, 30, 2_000);

  // AFTER screenshot — ball has fallen.
  await page.screenshot({ path: EVIDENCE_PNG_2 });

  // --- Assertions: the visual moved, driven by the physics step ---
  expect(result.samples.length, 'must have collected frame samples').toBeGreaterThanOrEqual(10);
  expect(result.bodyMoved, 'cannon-es body must have moved (gravity)').toBe(true);
  expect(result.moved, 'THREE mesh (the visual) must have moved frame-over-frame').toBe(true);

  // Sync fidelity: every sample, mesh == body within 1e-3 (BodySync copies
  // exact values, so any drift would be a real desync).
  expect(result.driftMax, `mesh/body drift must be ~0 (got ${result.driftMax})`).toBeLessThan(1e-3);

  // Frame counter must have advanced between samples — proves these were
  // distinct real frames of the running loop, not one paused frame.
  const frames = result.samples.map((s) => s.frame);
  expect(new Set(frames).size, 'rAF frame counter must advance across samples').toBeGreaterThan(1);

  // --- Evidence ---
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(
    EVIDENCE_TRACE,
    JSON.stringify({ task: 'W2-B.2', ...result, samples: result.samples }, null, 2),
    'utf-8'
  );

  const first = result.samples[0];
  const last = result.samples[result.samples.length - 1];
  const lines = [
    `W2-B.2 browser verification — physics moves the visual (Task 6.2)`,
    `date: ${new Date().toISOString()}`,
    `bodyId: ${bodyId}`,
    `samples: ${result.samples.length} frames over ${Math.round(last.t - first.t)} ms`,
    `body:   start(${first.bodyX}, ${first.bodyY}, ${first.bodyZ}) -> end(${last.bodyX}, ${last.bodyY}, ${last.bodyZ})  moved=${result.bodyMoved}`,
    `mesh:   start(${first.meshX}, ${first.meshY}, ${first.meshZ}) -> end(${last.meshX}, ${last.meshY}, ${last.meshZ})  moved=${result.moved}`,
    `mesh/body drift max: ${result.driftMax}`,
    `frame counter advanced: ${new Set(frames).size} distinct frame values`,
    `verdict: PASS`
  ];
  writeFileSync(EVIDENCE_TXT, lines.join('\n') + '\n', 'utf-8');
});
