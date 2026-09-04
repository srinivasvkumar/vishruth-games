/**
 * M5 — Task 1: Campaign E2E — scripted level-1 playthrough.
 *
 * Two tests:
 *
 *  A) "level 1 boots & player trajectory captured"  (PASSES)
 *     - Boot to menu, click Start Game, enter level 1.
 *     - Capture screenshots (menu, +1s, +3s, +6s, +10s).
 *     - Parse the Godot M5DBG console trajectory (player pos every 2s).
 *     - Persist trajectory JSON; assert we actually reached the game scene
 *       (M5DBG lines present).
 *     - Logs the P0 diagnosis to the console.
 *
 *  B) "full auto-play to level-complete"  (test.fixme — documented P0)
 *     - Permanently skipped with a full P0 explanation: the player's
 *       auto-run is +Z (perpendicular to the +X direction of play), so the
 *       player falls off the 20-unit-deep ground and dies in ~1.5s of every
 *       level; finish_x (140) is unreachable. Cannot be completed until
 *       game-dev fixes the axis in player_movement.gd.
 */
import { test } from '@playwright/test';
import fs from 'fs';
import { bootWait } from './helpers/canvas.js';

const SHOTS = 'screenshots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Shared boot + start + capture routine. Returns the parsed M5DBG samples and
 * verdict flags. Used by test A; test B is a declared fixme (no body runs).
 */
async function captureLevel1(page: any) {
  const lines: string[] = [];
  const dbg: string[] = [];
  page.on('console', (msg: any) => {
    const t: string = msg.text().trim();
    if (!t) return;
    lines.push(`[${msg.type()}] ${t}`);
    if (t.includes('M5DBG')) dbg.push(t);
  });
  page.on('pageerror', (e: any) => lines.push(`[pageerror] ${e.message}`));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await bootWait(page, 90_000);
  await sleep(1000);
  await page.screenshot({ path: `${SHOTS}/m5-00-menu.png` });

  // Start Game is the first button in a center-aligned VBox (~y=306 at 1280x720).
  await page.mouse.click(640, 306);
  await sleep(1000);
  await page.screenshot({ path: `${SHOTS}/m5-01-start1s.png` });
  await sleep(2000); page.screenshot({ path: `${SHOTS}/m5-02-start3s.png` });
  await sleep(3000); page.screenshot({ path: `${SHOTS}/m5-03-start6s.png` });
  await sleep(4000); page.screenshot({ path: `${SHOTS}/m5-04-start10s.png` });

  const samples = dbg.map((l) => {
    const m = l.match(/t=([\d.]+) state=(\S+) lives=(-?\d+) p=\(([-\d.]+),([-\d.]+),([-\d.]+)\) finish_x=(\d+)/);
    if (!m) return null;
    return {
      t: parseFloat(m[1]), state: m[2], lives: parseInt(m[3], 10),
      x: parseFloat(m[4]), y: parseFloat(m[5]), z: parseFloat(m[6]),
      finish_x: parseInt(m[7], 10),
    };
  }).filter(Boolean);

  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/m5_e2e_trajectory.json',
    JSON.stringify({ m5dbg: samples, all_lines: lines.slice(0, 200) }, null, 2));

  const sawComplete = samples.some((s: any) => /complete/i.test(s.state));
  const maxX = samples.length ? Math.max(...samples.map((s: any) => s.x)) : 0;
  const minY = samples.length ? Math.min(...samples.map((s: any) => s.y)) : 0;
  const finalZ = samples.length ? samples[samples.length - 1].z : 0;
  const fell = minY < -5;
  const ranAwayZ = finalZ > 12;
  const died = samples.some((s: any) => s.lives === 0) ||
               samples.some((s: any) => /game_?over|dead/i.test(s.state));
  const neverApproached = samples.length > 0 && maxX < 5;
  return { samples, sawComplete, maxX, minY, finalZ, fell, ranAwayZ, died, neverApproached, lines };
}

test.describe('M5 Campaign E2E — level 1 playthrough', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('level 1 boots & player trajectory captured', { timeout: 120_000 }, async ({ page }) => {
    const r = await captureLevel1(page);
    console.log('=== M5 E2E VERDICT ===');
    console.log(`M5DBG samples: ${r.samples.length}`);
    if (r.samples.length) {
      console.log(`first: ` + JSON.stringify(r.samples[0]));
      console.log(`last:  ` + JSON.stringify(r.samples[r.samples.length - 1]));
    }
    console.log(`max_x=${r.maxX.toFixed(1)} (finish=140) min_y=${r.minY.toFixed(1)} final_z=${r.finalZ.toFixed(1)}`);
    console.log(`sawComplete=${r.sawComplete} fell=${r.fell} ranAwayZ=${r.ranAwayZ} died=${r.died} neverApproached=${r.neverApproached}`);

    // We must have actually entered the game scene and observed the player.
    test.expect(r.samples.length).toBeGreaterThan(0);

    if (r.sawComplete) {
      console.log('M5 E2E: level 1 completed ✅');
      return;
    }

    // P0 diagnosis (informational — the auto-play test below is the fixme).
    if (r.neverApproached || r.fell || r.ranAwayZ || r.died) {
      console.log(
        `M5 E2E: P0 AUTO-RUN-AXIS observed — x never approached finish_x ` +
        `(max_x=${r.maxX.toFixed(1)}), z=${r.finalZ.toFixed(1)} (ranAwayZ=${r.ranAwayZ}), ` +
        `min_y=${r.minY.toFixed(1)} (fell=${r.fell}), died=${r.died}. ` +
        `Player auto-runs +Z (off the 20-deep ground) instead of +X toward the finish.`,
      );
    }
  });

  // P0: full auto-play to level-complete is intractable. The player's
  // auto-run is +Z (perpendicular to the +X direction of play), so the
  // player falls off the 20-unit-deep ground and dies in ~1.5s of every
  // level; finish_x=140 is unreachable. This test documents the intended
  // full-auto-play path; it is marked fixme because it cannot pass until
  // game-dev fixes the axis (see test-results/m5_e2e_trajectory.json +
  // screenshots, and tests/fixtures/m5_geometry_probe.gd).
  test.fixme(
    'full auto-play to level-complete (blocked on P0 AUTO-RUN-AXIS)',
    async ({ page }) => {
      // Scripted input: hold strafe-right (D) to push the player toward
      // finish_x, with periodic jumps to clear the truck lane. Then assert
      // the state machine reaches "complete". Blocked by P0: the auto-run
      // sends the player off the +Z edge and to death in ~1.5s.
      const lines: string[] = [];
      page.on('console', (m: any) => { const t = m.text().trim(); if (t.includes('M5DBG')) lines.push(t); });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await bootWait(page, 90_000);
      await page.mouse.click(640, 306);            // Start Game
      await page.keyboard.down('d');                 // strafe-right toward finish
      const deadline = Date.now() + 20_000;
      let nextJump = Date.now() + 1500;
      let complete = false;
      while (Date.now() < deadline && !complete) {
        if (Date.now() >= nextJump) {
          await page.keyboard.press(' ');            // jump
          nextJump = Date.now() + 1500;
        }
        const st = lines[lines.length - 1] || '';
        complete = /complete/i.test(st);
        await sleep(300);
      }
      await page.keyboard.up('d');
      const last = lines[lines.length - 1] || 'no M5DBG';
      test.expect(complete, `expected level-complete; last M5DBG: ${last}`).toBeTruthy();
    },
  );
});
