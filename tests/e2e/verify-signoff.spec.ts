import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W2-E.3 reviewer verification probe — criteria #4 + #5 (NOT a TDD spec).
 *
 * Week-2 success criteria under verification (fresh reviewer run):
 *   #4. Score persists via LocalStorage
 *   #5. Shield power-up collectible with visual effect (Task 7.3 Phase 1)
 *
 * #4 drives the LIVE ScoreManager through the app's real event surface
 * (Player.addScore -> player:score -> GameScene listener -> ScoreManager)
 * and verifies the raw localStorage value that saveHighScore() writes
 * — the exact persistence mechanism GameScene invokes on game over —
 * then proves the value survives a full page reload.
 *
 * #5 drives the LIVE Player.addPowerUp('invincibility', 5000) through
 * the running game (the shield effect is 5 s of invincibility) and
 * observes: state.powerUps contains the entry, damage is absorbed while
 * invincible, and the timed expiry clears both after the duration.
 *
 * This file is a VERIFICATION PROBE: it observes and records what the
 * current implementation does. It is NOT a TDD RED spec — it will be
 * committed alongside W2-signoff.md and replaced by a formal Task 7.3
 * Phase 1 spec in the follow-up work it documents.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w2');
const APP_URL = 'http://localhost:5173/public/index.html';

async function bootToGame(page: Page): Promise<void> {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  // Give the boot sequence a moment before driving the scene switch
  // (same 500ms settle the W2-E.1a smoke suite uses).
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const w = window as unknown as {
      game?: { getSceneManager?: () => { loadScene: (n: string) => Promise<void> } };
    };
    if (!w.game?.getSceneManager) throw new Error('window.game.getSceneManager not available');
    await w.game.getSceneManager().loadScene('game');
  });
  for (let i = 0; i < 10; i++) {
    const has = await page.evaluate(() => !!document.getElementById('game-score'));
    if (has) break;
    await page.waitForTimeout(500);
  }
}

test('W2-E.3 probe #4: score persists via LocalStorage', async ({ page }) => {
  test.setTimeout(45_000);
  await bootToGame(page);

  // 1) The app's score path: dispatch the player:score window event
  //    (the same event surface GameScene listens on, src/scenes/
  //    GameScene.ts:363) and confirm the live HUD reflects it.
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('player:score', { detail: { points: 1234 } }));
  });
  await page.waitForTimeout(500);
  const hudText = await page.evaluate(() => document.getElementById('game-score')?.textContent ?? '');
  const hudScore = Number.parseInt(hudText.match(/SCORE:\s*(\d+)/)?.[1] ?? '0', 10);
  expect(hudScore).toBeGreaterThanOrEqual(1234);

  // 2) Drive the live app's REAL persistence trigger: the game-over
  //    event. GameScene's PLAYER_DEATH listener runs gameOver(), which
  //    calls scoreManager.saveHighScore() — the exact production path
  //    (src/scenes/GameScene.ts:370, :378, :382). Then read the RAW
  //    localStorage value that saveHighScore() writes.
  await page.evaluate(() => {
    window.dispatchEvent(new Event('player:death'));
  });
  await page.waitForTimeout(300);
  const persisted = await page.evaluate(() => {
    const raw = window.localStorage.getItem('cluster-rush-high-score');
    const parsed = raw === null ? null : Number.parseInt(raw, 10);
    return { raw, high: parsed };
  });
  expect(persisted.high, 'saveHighScore() must have written the high score on game-over').toBeGreaterThanOrEqual(1234);

  // 3) Prove the value survives a full page reload (real persistence,
  //    not in-memory): the high score rehydrates from localStorage.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  const afterReload = await page.evaluate(() => {
    const raw = window.localStorage.getItem('cluster-rush-high-score');
    return raw === null ? null : Number.parseInt(raw, 10);
  });
  expect(afterReload, 'high score must survive a full page reload').toBeGreaterThanOrEqual(1234);

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(
    join(EVIDENCE_DIR, 'w2-e3-localstorage.txt'),
    [
      'W2-E.3 probe #4 — score persistence via LocalStorage (fresh reviewer run)',
      `hud after +1234 player:score: "${hudText}"`,
      `localStorage['cluster-rush-high-score'] after player:death -> saveHighScore(): ${persisted.raw}`,
      `parsed high score: ${persisted.high}`,
      `localStorage value after full page reload: ${afterReload}`,
      'verdict: PASS — value written by live app on game-over, survives reload'
    ].join('\n') + '\n',
    'utf-8'
  );
});

test('W2-E.3 probe #5: shield (invincibility power-up) lifecycle on the live player', async ({ page }) => {
  test.setTimeout(60_000);
  await bootToGame(page);

  // Find the live Player instance via the scene-graph walk (GameScene
  // keeps the player in a private field; the walk finds the unique
  // object exposing the Player method surface).
  const handle = await page.evaluate(() => {
    let found: { getState: () => { health: number; powerUps: string[]; isInvincible: boolean } } | null = null;
    const seen = new Set<object>();
    const walk = (o: Record<string, unknown>, depth: number): boolean => {
      if (!o || depth > 24 || seen.has(o)) return false;
      seen.add(o);
      for (const v of Object.values(o)) {
        if (v && typeof v === 'object' && typeof (v as { getState?: unknown }).getState === 'function'
          && typeof (v as { addPowerUp?: unknown }).addPowerUp === 'function'
          && typeof (v as { isPlayerAlive?: unknown }).isPlayerAlive === 'function') {
          found = v as { getState: () => { health: number; powerUps: string[]; isInvincible: boolean } };
          return true;
        }
        if (v && typeof v === 'object' && walk(v as Record<string, unknown>, depth + 1)) return true;
      }
      return false;
    };
    const start = (window as unknown as { game?: Record<string, unknown> }).game;
    const ok = start ? walk(start, 0) : false;
    if (!ok || found === null) return { found: false, health: 0, powerUps: [] as string[] };
    const st = (found as unknown as { getState: () => { health: number; powerUps: string[]; isInvincible: boolean } }).getState();
    return { found: true, health: st.health, powerUps: st.powerUps };
  });
  expect(handle.found, 'live player instance discoverable via scene-graph walk').toBe(true);

  // Collect the shield: addPowerUp('invincibility', 5000) — the 5 s
  // invincibility effect IS the shield (Task 7.3 Phase 1 mechanic).
  await page.evaluate(() => {
    let found: { addPowerUp: (t: string, d: number) => void } | null = null;
    const seen = new Set<object>();
    const walk = (o: Record<string, unknown>, depth: number): boolean => {
      if (!o || depth > 24 || seen.has(o)) return false;
      seen.add(o);
      for (const v of Object.values(o)) {
        if (v && typeof v === 'object' && typeof (v as { addPowerUp?: unknown }).addPowerUp === 'function'
          && typeof (v as { isPlayerAlive?: unknown }).isPlayerAlive === 'function') {
          found = v as { addPowerUp: (t: string, d: number) => void };
          return true;
        }
        if (v && typeof v === 'object' && walk(v as Record<string, unknown>, depth + 1)) return true;
      }
      return false;
    };
    const start = (window as unknown as { game?: Record<string, unknown> }).game;
    const ok = start ? walk(start, 0) : false;
    if (ok && found !== null) (found as unknown as { addPowerUp: (t: string, d: number) => void }).addPowerUp('invincibility', 5000);
  });
  await page.waitForTimeout(150);

  const during = await page.evaluate(() => {
    let found: { getState: () => { powerUps: string[]; isInvincible: boolean; health: number }; damage: (n: number) => void } | null = null;
    const seen = new Set<object>();
    const walk = (o: Record<string, unknown>, depth: number): boolean => {
      if (!o || depth > 24 || seen.has(o)) return false;
      seen.add(o);
      for (const v of Object.values(o)) {
        if (v && typeof v === 'object' && typeof (v as { addPowerUp?: unknown }).addPowerUp === 'function'
          && typeof (v as { isPlayerAlive?: unknown }).isPlayerAlive === 'function') {
          found = v as { getState: () => { powerUps: string[]; isInvincible: boolean; health: number }; damage: (n: number) => void };
          return true;
        }
        if (v && typeof v === 'object' && walk(v as Record<string, unknown>, depth + 1)) return true;
      }
      return false;
    };
    const start = (window as unknown as { game?: Record<string, unknown> }).game;
    const ok = start ? walk(start, 0) : false;
    if (!ok || found === null) return { health: -1, powerUps: [] as string[], isInvincible: false };
    const p = found as unknown as { getState: () => { powerUps: string[]; isInvincible: boolean; health: number }; damage: (n: number) => void };
    p.damage(50); // must be absorbed while invincible
    const st = p.getState();
    return { health: st.health, powerUps: st.powerUps, isInvincible: st.isInvincible };
  });
  expect(during.powerUps.join(','), 'power-up list must contain the shield entry').toContain('invincibility');
  expect(during.isInvincible, 'player must be invincible while shield active').toBe(true);
  expect(during.health, 'damage must be absorbed while invincible').toBe(100);

  // Visual effect probe: the HUD power-up indicator surface.
  const hudPowerup = await page.evaluate(() => {
    const el = document.getElementById('game-powerups') ?? document.getElementById('powerup-indicator');
    return el ? el.textContent ?? '(empty)' : null;
  });

  // Expiry: 5 s duration must clear the effect.
  await page.waitForTimeout(5300);
  const after = await page.evaluate(() => {
    let found: { getState: () => { powerUps: string[]; isInvincible: boolean } } | null = null;
    const seen = new Set<object>();
    const walk = (o: Record<string, unknown>, depth: number): boolean => {
      if (!o || depth > 24 || seen.has(o)) return false;
      seen.add(o);
      for (const v of Object.values(o)) {
        if (v && typeof v === 'object' && typeof (v as { addPowerUp?: unknown }).addPowerUp === 'function'
          && typeof (v as { isPlayerAlive?: unknown }).isPlayerAlive === 'function') {
          found = v as { getState: () => { powerUps: string[]; isInvincible: boolean } };
          return true;
        }
        if (v && typeof v === 'object' && walk(v as Record<string, unknown>, depth + 1)) return true;
      }
      return false;
    };
    const start = (window as unknown as { game?: Record<string, unknown> }).game;
    const ok = start ? walk(start, 0) : false;
    if (!ok || found === null) return { powerUps: [] as string[], isInvincible: null as boolean | null };
    const st = (found as unknown as { getState: () => { powerUps: string[]; isInvincible: boolean } }).getState();
    return { powerUps: st.powerUps, isInvincible: st.isInvincible };
  });
  expect(after.isInvincible, 'invincibility must expire after the 5 s duration').toBe(false);
  expect(after.powerUps.join(','), 'power-up list must be empty after expiry').not.toContain('invincibility');

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  writeFileSync(
    join(EVIDENCE_DIR, 'w2-e3-shield.txt'),
    [
      'W2-E.3 probe #5 — shield (invincibility) lifecycle on the live player (fresh reviewer run)',
      `initial state: health=${handle.health} powerUps=[${handle.powerUps}]`,
      `after addPowerUp('invincibility',5000) + damage(50): health=${during.health} (absorbed=${during.health === 100}) isInvincible=${during.isInvincible} powerUps=[${during.powerUps}]`,
      `HUD power-up indicator element: ${hudPowerup ?? 'NOT PRESENT (no visual effect surface)'}`,
      `after 5.3 s: isInvincible=${after.isInvincible} powerUps=[${after.powerUps}]`,
      'verdict: mechanic (collect/absorb/expire) PASS; collectible entity + visual effect NOT implemented (see W2-signoff.md #5)'
    ].join('\n') + '\n',
    'utf-8'
  );
});
