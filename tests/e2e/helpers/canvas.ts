/**
 * Canvas helpers for Cluster Rush E2E (PLAN.md §4 — E2E Standard).
 *
 * Godot WebGL renders everything on a single `<canvas id="canvas">` that the
 * engine sizes to the 1280x720 project resolution (canvasResizePolicy=2) and
 * stretches to 100vw/100vh. The `#status` splash overlay is REMOVED from the
 * DOM (`statusOverlay.remove()`) once the engine starts — it is not merely
 * hidden — so boot detection must treat "element gone" as success.
 *
 * The export uses preserveDrawingBuffer=true, so the last rendered frame stays
 * readable: we can blit the WebGL canvas into a temp 2d canvas and sample it.
 */
import { expect, type Page } from '@playwright/test';

export interface CanvasStats {
  /** Canvas backing-store width in device px (engine sets >= 1280 at 1280x720). */
  cw: number;
  /** Canvas backing-store height in device px. */
  ch: number;
  /** Percent of sampled pixels that are not black (0-100, 2 decimals). */
  nonBlackPct: number;
}

/**
 * Wait for engine boot: `#status` overlay gone/hidden AND canvas resized to
 * >= 1280px wide (proves the engine took ownership of the canvas).
 *
 * On timeout: captures a screenshot to tests/e2e/screenshots/boot-failure.png
 * and fails with a canvas-state JSON so the cause is diagnosable without a
 * second run.
 *
 * Note: does not navigate — call page.goto() first (or reuse a live page).
 */
export async function bootWait(page: Page, timeoutMs = 45_000): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const c = document.getElementById('canvas') as HTMLCanvasElement | null;
        const s = document.getElementById('status');
        const overlayDone = !s || s.style.visibility === 'hidden';
        return !!c && c.width >= 1280 && overlayDone;
      },
      undefined,
      { timeout: timeoutMs, polling: 300 },
    );
  } catch (err) {
    // Diagnose: dump canvas + overlay state and grab a screenshot.
    let state: unknown = null;
    try {
      state = await page.evaluate(() => {
        const c = document.getElementById('canvas') as HTMLCanvasElement | null;
        const s = document.getElementById('status');
        return {
          canvasWidth: c?.width ?? null,
          canvasHeight: c?.height ?? null,
          statusOverlay: s ? {
            inDOM: true,
            visibility: s.style.visibility,
            display: s.style.display,
            text: s.textContent?.trim().slice(0, 200) ?? '',
          } : 'removed',
        };
      });
    } catch {
      state = { unreachable: true };
    }
    try {
      await page.screenshot({ path: 'tests/e2e/screenshots/boot-failure.png' });
    } catch {
      // screenshot may fail on about:blank etc. — state JSON is the real payload.
    }
    throw new Error(
      `bootWait: engine did not boot within ${timeoutMs}ms. canvas state: ${JSON.stringify(state)}. Screenshot: tests/e2e/screenshots/boot-failure.png`,
    );
  }
}

/**
 * Sample canvas pixels: blit the (WebGL) canvas into a temp 2d canvas and
 * return backing-store size + percentage of non-black pixels.
 *
 * Sampling is downscaled to at most ~400 device px wide so the getImageData
 * cost stays small; the menu (dark bg + light title + button column) still
 * samples well above the threshold, while an unrendered/crashed canvas reads
 * ~0% (black) or a flat solid color.
 */
export async function canvasStats(page: Page): Promise<CanvasStats> {
  const stats = await page.evaluate((): CanvasStats => {
    const c = document.getElementById('canvas') as HTMLCanvasElement | null;
    if (!c) return { cw: 0, ch: 0, nonBlackPct: 0 };
    const cw = c.width;
    const ch = c.height;
    if (!cw || !ch) return { cw, ch, nonBlackPct: 0 };

    const scale = Math.min(1, 400 / cw);
    const sw = Math.max(1, Math.floor(cw * scale));
    const sh = Math.max(1, Math.floor(ch * scale));
    const tmp = document.createElement('canvas');
    tmp.width = sw;
    tmp.height = sh;
    const ctx = tmp.getContext('2d');
    if (!ctx) return { cw, ch, nonBlackPct: 0 };
    ctx.drawImage(c, 0, 0, sw, sh);

    let nonBlack = 0;
    try {
      const data = ctx.getImageData(0, 0, sw, sh).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 0 || data[i + 1] > 0 || data[i + 2] > 0) nonBlack++;
      }
    } catch {
      return { cw, ch, nonBlackPct: 0 };
    }
    return { cw, ch, nonBlackPct: (nonBlack / (sw * sh)) * 100 };
  });
  return stats;
}

/**
 * Click the game canvas at CSS viewport coordinates.
 *
 * The canvas fills 100vw/100vh and the viewport is 1280x720 (project
 * resolution), so canvas pixel coords == viewport coords. Use this instead of
 * DOM locators — there are no HTML buttons in a WebGL game.
 */
export async function clickCanvas(page: Page, x: number, y: number): Promise<void> {
  await expect(page.locator('#canvas')).toBeVisible();
  await page.mouse.click(x, y);
}
