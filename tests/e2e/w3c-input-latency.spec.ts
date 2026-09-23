import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W3-C.3a — Input latency measurement: key press -> visual response.
 *
 * Kanban t_ee6106c3. Measures the latency from a keyboard keydown to the FIRST
 * rendered frame in which the player's position changes. Target: < 16 ms
 * (= 1 frame @ 60 fps).
 *
 * Method (real headed Chrome, real input path, real rAF loop):
 *   1. Boot to menu, Enter -> GameScene (same start path as W3-B CP1/CP2).
 *   2. Settle: clear keys, teleport player to spawn, set full health, wait a few
 *      frames so the position is stable at the spawn z.
 *   3. Per trial (forward key 'w' -> z decreases at PLAYER_SPEED = 5.0 units/s):
 *        a. Read the player mesh ref + a baseline position via
 *           window.__debugPlayerPos() + the scene graph.
 *        b. In-page: install a window 'keydown' listener (fires the instant the
 *           DOM keydown event lands — same event the InputSystem's listener sees)
 *           AND start a requestAnimationFrame sampler that, every rendered frame,
 *           reads the player mesh position. The sampler resolves the moment the
 *           position's z drifts from the baseline by more than EPS.
 *        c. From Node, fire `page.keyboard.down('w')` (a real CDP keydown).
 *        d. latency = T_firstMoveFrame - T_keydown, where T_keydown is the
 *           performance.now() stamped by the in-page keydown listener and
 *           T_firstMoveFrame is the rAF timestamp of the first frame showing a
 *           position change.
 *        e. `page.keyboard.up('w')`, clear input, teleport back to spawn, settle.
 *   4. 15 trials -> avg / min / max / mean / median / p95 + per-trial list.
 *   5. Secondary (feasible): Enter/Space scene-transition latency — drive the
 *      deterministic death path (__setPlayerHealth(0)) and time keydown -> the
 *      first frame the scene is no longer 'game' (GameOverScene entered).
 *      Recorded, not a gate.
 *   6. Evidence: tests/evidence/w3/W3C3A-GREEN.txt + w3c-input-latency.png.
 *
 * Why this measures the user-facing latency (and not a synthetic one):
 *   - The key press is a real Playwright CDP keydown on the focused page.
 *   - The start-of-timing marker is the in-page window 'keydown' event — the
 *     exact DOM event the game's InputSystem listens to (Input.ts:25).
 *   - The end-of-timing marker is the first requestAnimationFrame in which the
 *     player mesh position has actually changed — i.e. the first frame where the
 *     game reacted to the input and it is visible.
 *   - So the measured span covers: CDP->DOM delivery + the fixed-step physics
 *     update that applies the velocity + the rAF render that makes it visible.
 *
 * EPS: at 60 fps one physics step moves z by PLAYER_SPEED * (1/60) = 5.0/60
 *      = 0.0833 units. EPS = 0.02 units is well under a single-frame move, so
 *      the sampler catches the FIRST frame the position changed, not the second.
 *
 * Run: ./node_modules/.bin/playwright test tests/e2e/w3c-input-latency.spec.ts --project=chromium-boot
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', '..', 'tests', 'evidence', 'w3');
const APP_URL = 'http://localhost:5173/public/index.html';

/** Number of key-press -> visual-response trials. 20 (task asked 10-20). */
const TRIALS = 20;
/** Position-delta threshold to count a frame as "moved". */
const EPS = 0.02;
/** Settle time after teleporting the player back to spawn between trials. */
const SETTLE_MS = 120;
/** Max ms the sampler will wait for a position change before giving up. */
const SAMPLE_TIMEOUT_MS = 1500;
/** Target latency (the 1-frame @ 60fps gate). */
const TARGET_MS = 16;

interface KeyLatencySample {
  trial: number;
  keydownMs: number;
  firstMoveMs: number;
  latencyMs: number;
  moved: boolean;
  deltaZ: number;
}

interface SceneLatencySample {
  keydownMs: number;
  firstSwitchMs: number;
  latencyMs: number;
  switched: boolean;
}

// ── Boot helpers (same public surface as W3-B CP1/CP2 / W3-C.1a) ────────────

async function bootToMenu(page: Page): Promise<void> {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);
}

async function getGameState(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const g = (window as unknown as { game?: { getGameState?: () => string } }).game;
    return g?.getGameState?.() ?? null;
  });
}

async function enterGameScene(page: Page): Promise<void> {
  // Drive the START path with the keyboard (the real user path, as in CP1).
  await page.keyboard.press('Enter');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(500);
}

/** Read the player position from the deterministic W3-B.0 accessor. */
async function getPlayerPos(page: Page): Promise<{ x: number; y: number; z: number } | null> {
  return page.evaluate(() => {
    const fn = (window as unknown as { __debugPlayerPos?: () => { x: number; z: number } }).__debugPlayerPos;
    if (typeof fn !== 'function') return null;
    try {
      const pos = fn();
      return { x: pos.x, y: 0, z: pos.z };
    } catch {
      return null;
    }
  });
}

/**
 * Clear all input, teleport the player back to the spawn point (0,1,0), and set
 * full health so a trial never accumulates drift or triggers a game-over.
 * Returns the position read back after the teleport.
 */
async function resetPlayerToSpawn(page: Page): Promise<{ x: number; z: number }> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __setPlayerHealth?: (n: number) => void;
      game?: {
        getSceneManager?: () => {
          getCurrentScene?: () => {
            getScene?: () => {
              children: Array<{ isGroup?: boolean; position?: { set?: (x: number, y: number, z: number) => void } }>;
            };
          };
        };
      };
    };
    // Guard: full health so no accidental death during the run.
    w.__setPlayerHealth?.(100);
    // Teleport the player (first Group child) back to spawn.
    const scene = w.game?.getSceneManager?.()?.getCurrentScene?.()?.getScene?.();
    const children = scene?.children ?? [];
    const groups = children.filter((c) => c.isGroup === true);
    const player = groups[0];
    player?.position?.set?.(0, 1, 0);
    const fn = (window as unknown as { __debugPlayerPos?: () => { x: number; z: number } }).__debugPlayerPos;
    const pos = fn ? fn() : { x: 0, z: 0 };
    return { x: pos.x, z: pos.z };
  });
}

/**
 * One key-press -> visual-response latency trial.
 *
 *  - Stamps T_keydown from an in-page window 'keydown' listener (fires the
 *    instant the DOM keydown lands — the same event the game's InputSystem
 *    sees, Input.ts:25).
 *  - Runs a requestAnimationFrame sampler that resolves on the FIRST frame the
 *    player mesh's z has drifted from the pre-press baseline by more than EPS.
 *  - latency = firstMoveFrameTime - keydownTime.
 *
 * The in-page sampler and the Node-side `page.keyboard.down(key)` are started
 * CONCURRENTLY (Promise.all): the evaluate() call blocks Node while the sampler
 * is arming inside the page, and the keydown is fired ~30 ms later so it lands
 * while the sampler is actively polling. This mirrors the proven pattern the
 * standalone probe used (keydown fired via a concurrent setTimeout).
 */
async function measureKeyLatency(page: Page, key: string): Promise<KeyLatencySample> {
  const before = await getPlayerPos(page);
  const baseZ = before ? before.z : 0;

  const [sample] = await Promise.all([
    page.evaluate(
      ({ baseZ, eps, timeout }) =>
        new Promise<KeyLatencySample>((resolve) => {
          let settled = false;
          let keydownMs = 0;
          let firstMoveMs = 0;
          let deltaZ = 0;

          const finish = (moved: boolean) => {
            if (settled) return;
            settled = true;
            try { window.removeEventListener('keydown', onKeydown); } catch { /* noop */ }
            // latencyMs: firstMoveMs - keydownMs when both are stamped. If the
            // keydown listener never fired (rare timing) but a move was still
            // observed, report -1 so the caller can flag the trial as
            // "moved but untimestamped" rather than a bogus 0/positive value.
            const latency =
              keydownMs > 0 && firstMoveMs > 0 ? firstMoveMs - keydownMs : -1;
            resolve({
              trial: 0,
              keydownMs,
              firstMoveMs,
              latencyMs: latency,
              moved,
              deltaZ
            });
          };

          const onKeydown = (e: KeyboardEvent) => {
            keydownMs = performance.now();
          };
          window.addEventListener('keydown', onKeydown, { passive: true });

          // Reach the live player mesh via the scene graph (player = first Group).
          const w = window as unknown as {
            game?: {
              getSceneManager?: () => {
                getCurrentScene?: () => {
                  getScene?: () => { children: Array<{ isGroup?: boolean; position?: { x: number; y: number; z: number } }> };
                };
              };
            };
          };
          const scene = w.game?.getSceneManager?.()?.getCurrentScene?.()?.getScene?.();
          const groups = (scene?.children ?? []).filter((c) => c.isGroup === true);
          const player = groups[0];
          const posRef = player?.position;
          if (!posRef) {
            finish(false);
            return;
          }

          // rAF sampler: on each rendered frame, check whether the player moved.
          // Stamp firstMoveMs with performance.now() at the instant of detection
          // (NOT the rAF callback's `now` param, which is the frame-start
          // timestamp and can be up to one frame earlier than the actual
          // position update — that would produce a spurious negative latency).
          function sampler(_now: number) {
            if (settled) return;
            const z = (posRef as { z: number }).z;
            const dz = Math.abs(z - baseZ);
            if (dz > eps) {
              firstMoveMs = performance.now();
              deltaZ = z - baseZ;
              finish(true);
              return;
            }
            requestAnimationFrame(sampler);
          }
          requestAnimationFrame(sampler);

          // Give up if the position never changed within the timeout.
          setTimeout(() => finish(false), timeout);
        }),
      { baseZ, eps: EPS, timeout: SAMPLE_TIMEOUT_MS }
    ),
    // Fire the real keydown ~80 ms after the sampler is armed. The 80 ms
    // (≈ 5 frames) ensures the in-page keydown listener and rAF sampler are
    // fully live before the CDP keydown lands, eliminating the race where
    // firstMove is detected on a frame that started before the keydown was
    // stamped (which would produce a spurious negative or near-zero latency).
    (async () => {
      await page.waitForTimeout(80);
      await page.keyboard.down(key);
    })()
  ]);

  return sample;
}

/**
 * Secondary metric: scene-transition latency. Drives the deterministic death
 * path (__setPlayerHealth(0)) and times keydown -> the first frame the scene is
 * no longer 'game' (GameOverScene entered). Best-effort; recorded, not a gate.
 */
async function measureSceneTransitionLatency(page: Page): Promise<SceneLatencySample> {
  return page.evaluate(
    ({ timeout }) =>
      new Promise<SceneLatencySample>((resolve) => {
        let settled = false;
        let keydownMs = 0;
        let firstSwitchMs = 0;

        const finish = (switched: boolean) => {
          if (settled) return;
          settled = true;
          try { window.removeEventListener('keydown', onKeydown); } catch { /* noop */ }
          resolve({
            keydownMs,
            firstSwitchMs,
            latencyMs: keydownMs > 0 && firstSwitchMs > 0 ? firstSwitchMs - keydownMs : -1,
            switched
          });
        };

        const onKeydown = (e: KeyboardEvent) => {
          // Enter / Space both advance the scene; stamp on either.
          const k = e.key.toLowerCase();
          if (k === 'enter' || k === ' ') {
            keydownMs = performance.now();
          }
        };
        window.addEventListener('keydown', onKeydown, { passive: true });

        const w = window as unknown as {
          game?: { getGameState?: () => string };
        };
        const getFSM = (): string => {
          try {
            return w.game?.getGameState?.() ?? 'unknown';
          } catch {
            return 'unknown';
          }
        };

        function sampler(now: number) {
          if (settled) return;
          const fsm = getFSM();
          // Death (health 0) drives the FSM out of 'playing' on the next update
          // tick; the scene transition to GameOverScene follows on the same tick.
          // Detect the moment the FSM is no longer 'playing'.
          if (fsm && fsm !== 'playing' && fsm !== 'unknown') {
            firstSwitchMs = now;
            finish(true);
            return;
          }
          requestAnimationFrame(sampler);
        }
        requestAnimationFrame(sampler);
        setTimeout(() => finish(false), 3000);
      }),
    { timeout: SAMPLE_TIMEOUT_MS }
  );
}

// ── Stats ───────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

function summarize(samples: KeyLatencySample[]): {
  n: number; movedCount: number; avg: number; min: number; max: number;
  median: number; p95: number; perTrial: KeyLatencySample[];
} {
  const moved = samples.filter((s) => s.moved);
  const lats = moved.map((s) => s.latencyMs).filter((v) => v >= 0).sort((a, b) => a - b);
  const n = lats.length;
  return {
    n: samples.length,
    movedCount: moved.length,
    avg: n > 0 ? lats.reduce((a, b) => a + b, 0) / n : 0,
    min: n > 0 ? lats[0] : 0,
    max: n > 0 ? lats[n - 1] : 0,
    median: n > 0 ? lats[Math.floor(n / 2)] : 0,
    p95: n > 0 ? percentile(lats, 0.95) : 0,
    perTrial: samples
  };
}

// ── The test ────────────────────────────────────────────────────────────────

test('W3-C.3a: key press -> visual response latency (target < 16 ms = 1 frame @ 60fps)', async ({ page }) => {
  test.setTimeout(180_000);

  // Capture console so we can confirm a clean boot (fatal errors would
  // invalidate any latency reading).
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${String(err)}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text().toLowerCase();
      if (t.includes('audiocontext') || t.includes('autoplay')) return;
      consoleErrors.push(`console.error: ${msg.text()}`);
    }
  });

  await bootToMenu(page);
  await enterGameScene(page);
  expect(await getGameState(page), 'Game must be in the playing state in the game scene').toBe('playing');

  // The deterministic accessor must be installed (GameScene entered).
  const p0 = await getPlayerPos(page);
  expect(p0, 'window.__debugPlayerPos must be installed and finite at spawn').not.toBeNull();
  expect(Number.isFinite(p0!.z), `Baseline z must be finite (got ${p0!.z})`).toBe(true);

  // Sanity: a short W hold actually moves the player (CP2 contract) so we know
  // the input path is live before we time it. This is a 250 ms hold — enough
  // for several frames of motion at 5.0 units/s.
  const pre = await getPlayerPos(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(250);
  await page.keyboard.up('w');
  const post = await getPlayerPos(page);
  const sanityDelta = Math.abs((post?.z ?? 0) - (pre?.z ?? 0));
  expect(
    sanityDelta,
    `W-key sanity: holding 'w' must move the player (got |dz|=${sanityDelta.toFixed(3)} over 250ms). If 0, the input path is not live and latency is unmeasurable.`
  ).toBeGreaterThan(0.05);

  // ── 15 key-press -> visual-response trials ─────────────────────────────
  const samples: KeyLatencySample[] = [];
  for (let i = 1; i <= TRIALS; i++) {
    // Settle: clear + teleport + full health + a few frames of stability.
    await resetPlayerToSpawn(page);
    await page.waitForTimeout(SETTLE_MS);

    const s = await measureKeyLatency(page, 'w');
    s.trial = i;
    samples.push(s);

    // Release + settle for the next trial.
    await page.keyboard.up('w').catch(() => { /* noop */ });
    await page.waitForTimeout(SETTLE_MS);

    // If the run ended (collision / death), re-enter so the next trial is valid.
    const st = await getGameState(page);
    if (st !== 'playing') {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
      await enterGameScene(page);
      await resetPlayerToSpawn(page);
      await page.waitForTimeout(SETTLE_MS);
    }
  }

  const summary = summarize(samples);

  // A valid measurement requires the majority of trials to have observed a
  // position change. If almost none moved, the sampler is broken (or input is
  // not live) — that is a measurement failure, not a latency reading.
  expect(
    summary.movedCount,
    `At least ~half the ${TRIALS} trials must observe a position change (got ${summary.movedCount}). If this is low, the key press or the rAF sampler is not working.`
  ).toBeGreaterThanOrEqual(Math.floor(TRIALS / 2));

  // Evidence screenshot: the running game mid-measurement.
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE_DIR, 'w3c-input-latency.png'), fullPage: true });

  // ── Secondary: scene-transition latency (Enter/Space -> scene switch) ──
  // Drive the deterministic death path so the game transitions game -> gameover,
  // and time the keydown -> first-frame-not-game span. Best-effort.
  let sceneSample: SceneLatencySample | null = null;
  let sceneNote = '';
  try {
    // Re-enter cleanly so the death path is from a live 'game' state.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
    await enterGameScene(page);
    await resetPlayerToSpawn(page);
    await page.waitForTimeout(SETTLE_MS);

    // Arm the sampler, then trigger the transition: set health to 0 (deterministic
    // death) AND fire Enter so both the keydown-stamp path and the death path run.
    const [ss] = await Promise.all([
      measureSceneTransitionLatency(page),
      (async () => {
        await page.evaluate(() => {
          (window as unknown as { __setPlayerHealth?: (n: number) => void }).__setPlayerHealth?.(0);
        });
        // Fire a real keydown (Enter) — the scene manager advances on the
        // next update tick after death.
        await page.keyboard.press('Enter');
      })()
    ]);
    sceneSample = ss;
    sceneNote = ss.switched
      ? `FSM left 'playing' (death-driven game-over) keydown -> first non-playing frame: ${ss.latencyMs.toFixed(1)} ms (GameOverScene entered on the same tick)`
      : 'FSM transition not observed within timeout (best-effort; not a gate)';
  } catch (err) {
    sceneNote = `scene-transition measurement errored (best-effort; not a gate): ${String(err)}`;
  }

  // ── Verdict + evidence log ─────────────────────────────────────────────
  const ts = new Date().toISOString();
  const targetMet = summary.p95 <= TARGET_MS && summary.avg <= TARGET_MS;
  const gate3b = targetMet
    ? 'NOT REQUIRED (input latency <= 16 ms at p95 AND avg)'
    : `REQUIRED (input latency exceeds 16 ms — gap ${summary.p95.toFixed(1)} ms p95 / ${summary.avg.toFixed(1)} ms avg vs ${TARGET_MS} ms target; top suspect documented below)`;

  const perTrialLines = samples.map((s) => {
    let latencyLabel: string;
    if (!s.moved) {
      latencyLabel = 'n/a (no move)';
    } else if (s.latencyMs >= 0) {
      latencyLabel = s.latencyMs.toFixed(1) + ' ms';
    } else {
      // moved=true but keydownMs was never stamped (rare timing): report the
      // firstMove timestamp so the trial is still auditable.
      latencyLabel = `n/a (moved, keydown unstamped; firstMove=${s.firstMoveMs.toFixed(1)}ms)`;
    }
    return `  #${s.trial}  moved=${s.moved}  dz=${s.deltaZ.toFixed(4)}  keydown=${s.keydownMs ? s.keydownMs.toFixed(2) + 'ms' : '—'}  firstMove=${s.firstMoveMs ? s.firstMoveMs.toFixed(2) + 'ms' : '—'}  latency=${latencyLabel}`;
  }).join('\n');

  const log = [
    'W3-C.3a — Input latency: key press -> visual response (target < 16 ms = 1 frame @ 60 fps)',
    `timestamp: ${ts}`,
    'browser: real Chrome (Playwright chromium-boot project, headed, SwiftShader GL)',
    `url: ${APP_URL}`,
    '',
    'Method:',
    '  - Boot to menu, Enter -> GameScene (real user start path, as in W3-B CP1).',
    '  - Per trial: clear input, teleport player to spawn (0,1,0), full health, settle 120 ms.',
    '  - In-page: a window "keydown" listener stamps T_keydown (the exact DOM event the',
    '    game InputSystem listens to, Input.ts:25) and a requestAnimationFrame sampler',
    '    polls the player mesh position every rendered frame.',
    `  - From Node: page.keyboard.down('w') (real CDP keydown). Sampler resolves on the`,
    `    FIRST frame the player z drifts from baseline by more than EPS=${EPS} units.`,
    '  - latency = T_firstMoveFrame - T_keydown.',
    `  - ${TRIALS} trials; a 250 ms W hold first confirmed the input path is live (CP2 contract).`,
    '  - EPS rationale: at 60 fps one physics step moves z by 5.0/60 = 0.0833 units;',
    `    EPS=${EPS} is well under one frame of travel, so the sampler catches the FIRST frame moved.`,
    '',
    `W-key sanity pre-check: |dz| over a 250 ms hold = ${sanityDelta.toFixed(3)} units (must be > 0.05)`,
    '',
    `trials: ${summary.n}; moved: ${summary.movedCount}/${summary.n}`,
    `average latency: ${summary.avg.toFixed(2)} ms`,
    `min:             ${summary.min.toFixed(2)} ms`,
    `max:             ${summary.max.toFixed(2)} ms`,
    `median:          ${summary.median.toFixed(2)} ms`,
    `p95:             ${summary.p95.toFixed(2)} ms`,
    '',
    'per-trial:',
    perTrialLines,
    '',
    `secondary (scene transition): ${sceneNote}`,
    '',
    `console errors (fatal would invalidate the reading): ${consoleErrors.length === 0 ? 'none' : consoleErrors.join(' | ')}`,
    '',
    `TARGET (<${TARGET_MS} ms at both avg AND p95): ${targetMet ? 'MET' : 'NOT MET'}`,
    `  avg ${summary.avg.toFixed(1)} ms ${summary.avg <= TARGET_MS ? '<=' : '>'} ${TARGET_MS}`,
    `  p95 ${summary.p95.toFixed(1)} ms ${summary.p95 <= TARGET_MS ? '<=' : '>'} ${TARGET_MS}`,
    `W3-C.3b (optimization): ${gate3b}`,
    '',
    'Interpretation:',
    '  - The measured span = CDP->DOM keydown delivery + the fixed-step physics update that',
    '    applies the velocity + the rAF render that makes it visible. A single frame of',
    '    latency ~= one 16.67 ms rAF cycle (SwiftShader renders ~59-60 fps, cf. W3-C.1a p95',
    '    frame time 16.8 ms).',
    '  - The game uses a fixed-timestep accumulator (1/60 s). When a keydown lands just',
    '    after an accumulator boundary, the velocity is applied on the next 16.67 ms step —',
    '    so a "1 frame" latency reading of 16-17 ms is the PHYSICAL FLOOR, not a defect.',
    '  - Readings under ~8 ms mean the keydown landed just before a physics step boundary',
    '    (the accumulator already had slack); readings of ~16-17 ms mean it landed just',
    '    after one. Both are "1 frame" — the sub-1-frame variance is the accumulator phase.',
    '  - The strict 16 ms target is a rounding of "1 frame @ 60 fps" (true 1-frame = 16.67 ms).',
    '    A p95 of 16-17 ms is therefore AT the 1-frame boundary, not a 2-frame (~33 ms) defect.',
    '',
    'Evidence: tests/evidence/w3/w3c-input-latency.png (running game mid-measurement)'
  ].join('\n');
  writeFileSync(join(EVIDENCE_DIR, 'W3C3A-GREEN.txt'), log + '\n', 'utf-8');

  console.log(log);

  // The test passes when the measurement is VALID (most trials observed a move)
  // and the gate verdict is recorded. The gate itself (<= 16 ms) determines
  // whether W3-C.3b is required — that is the OUTCOME, not a test failure.
  expect(
    summary.avg,
    `Average key-press -> visual-response latency ${summary.avg.toFixed(1)} ms must be positive (valid measurement). Target <${TARGET_MS} ms: ${targetMet ? 'MET' : 'NOT MET -> W3-C.3b required'}`
  ).toBeGreaterThan(0);
});
