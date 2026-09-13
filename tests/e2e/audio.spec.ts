import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * W2-C.2 — Real-Chrome audio verification (Task 6.5.2 VERIFY).
 *
 * Loads the dev server, reaches the menu, then:
 *   1. AudioContext exists and is 'running' in headless Chromium
 *      (playwright.config.ts passes --autoplay-policy=no-user-gesture-required).
 *   2. window.game.getAudioSystem().isAvailable() is true
 *      (WebAudio is present; the AudioSystem constructor succeeded).
 *   3. game.pause() / game.resume() complete without throwing
 *      (the audio wiring — stopMusic on game:pause, startMusic on
 *      game:resume — must not crash the real browser).
 *   4. No THREE / CORS / uncaught-error / page-error entries.
 *
 * Evidence: tests/evidence/w2/w2-c2-audio.log
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w2');
const EVIDENCE_LOG = join(EVIDENCE_DIR, 'w2-c2-audio.log');

interface ConsoleEntry {
  type: string;
  text: string;
}

function captureConsole(page: Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on('console', (msg) => {
    entries.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    entries.push({ type: 'pageerror', text: String(err) });
  });
  return entries;
}

/**
 * Check that a fresh AudioContext exists and is 'running' (autoplay
 * policy satisfied via launch args).
 */
async function getAudioContextState(
  page: Page
): Promise<{ exists: boolean; state: string }> {
  return page.evaluate(() => {
    const AC = window as unknown as {
      AudioContext?: new () => AudioContext;
      webkitAudioContext?: new () => AudioContext;
    };
    const Ctor = AC.AudioContext ?? AC.webkitAudioContext;
    if (!Ctor) return { exists: false, state: 'no-constructor' };
    const ctx = new Ctor();
    const state = ctx.state;
    void ctx.close(); // don't leak the probe context
    return { exists: true, state };
  });
}

/**
 * Read the AudioSystem's availability flag from the running game.
 */
async function getAudioSystemAvailable(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const g = window as unknown as {
      game?: { getAudioSystem?: () => { isAvailable?: () => boolean } };
    };
    const audio = g.game?.getAudioSystem?.();
    return audio?.isAvailable?.() ?? false;
  });
}

/**
 * Pause the game (game:pause -> stopMusic), wait, then resume
 * (game:resume -> startMusic). Returns whether either call threw.
 */
async function pauseAndResumeGame(
  page: Page
): Promise<{ pauseThrew: boolean; resumeThrew: boolean; msg: string }> {
  const pauseResult = await page.evaluate(() => {
    const g = window as unknown as { game?: { pause?: () => void } };
    try {
      g.game?.pause();
      return { threw: false, msg: '' };
    } catch (e) {
      return { threw: true, msg: String(e) };
    }
  });
  await page.waitForTimeout(300); // let stopMusic() settle
  const resumeResult = await page.evaluate(() => {
    const g = window as unknown as { game?: { resume?: () => void } };
    try {
      g.game?.resume();
      return { threw: false, msg: '' };
    } catch (e) {
      return { threw: true, msg: String(e) };
    }
  });
  return {
    pauseThrew: pauseResult.threw,
    resumeThrew: resumeResult.threw,
    msg: pauseResult.msg || resumeResult.msg
  };
}

test('W2-C.2 audio: AudioContext running, AudioSystem available, pause/resume without errors', async ({ page }) => {
  test.setTimeout(45_000);

  const consoleEntries = captureConsole(page);

  // The dev server serves public/index.html at /index.html (vite publicDir
  // serves files at the root path, NOT under /public/).
  await page.goto('http://localhost:5173/index.html', { waitUntil: 'domcontentloaded' });

  // Wait for boot -> menu
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(1_000);

  // 1. AudioContext exists and is running (autoplay policy)
  const ctxState = await getAudioContextState(page);
  expect(ctxState.exists, 'AudioContext must exist in headless Chromium').toBe(true);
  expect(ctxState.state, `AudioContext must be 'running' (autoplay policy), got '${ctxState.state}'`).toBe('running');

  // 2. window.game.getAudioSystem().isAvailable() is true
  const available = await getAudioSystemAvailable(page);
  expect(available, 'AudioSystem.isAvailable() must be true in real Chrome').toBe(true);

  // 3. pause() -> resume() must not throw (audio wiring:
  //    stopMusic on game:pause, startMusic on game:resume)
  const result = await pauseAndResumeGame(page);
  expect(result.pauseThrew, `pause() must not throw. Got: ${result.msg}`).toBe(false);
  expect(result.resumeThrew, `resume() must not throw. Got: ${result.msg}`).toBe(false);

  // 4. No THREE / CORS / uncaught / page errors
  const errors = consoleEntries.filter((e) => {
    if (e.type === 'pageerror') return true;
    if (e.type === 'error') {
      const t = e.text.toLowerCase();
      return t.includes('three') || t.includes('cors') || t.includes('uncaught') || t.includes('webgl');
    }
    return false;
  });
  const errorText = errors.map((e) => `[${e.type}] ${e.text}`).join('\n');
  expect(errorText, `No THREE/CORS/uncaught errors expected.\nGot:\n${errorText}`).toBe('');

  // Evidence
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const logLines = consoleEntries.map((e) => `[${e.type}] ${e.text}`);
  logLines.push(`[test] AudioContext state: ${ctxState.state}`);
  logLines.push(`[test] AudioSystem.isAvailable(): ${available}`);
  logLines.push(`[test] pause() threw: ${result.pauseThrew}`);
  logLines.push(`[test] resume() threw: ${result.resumeThrew}`);
  writeFileSync(EVIDENCE_LOG, logLines.join('\n') + '\n', 'utf-8');
});
