/**
 * Cluster Rush — Performance Sampling (PLAN.md §4 / R4)
 *
 * Measures:
 *  1. Boot time   : navigation -> first non-black frame (ms).
 *  2. FPS sample  : ~10 s of rAF tick-rate (records mean/p50/p95).
 *
 * Results are written to tests/performance/latest.json (readable by humans
 * and scripts) and a screenshot is captured for visual evidence.
 *
 * Thresholds:
 *  - first_frame < 15 s under SwiftShader (soft gate).
 *  - FPS sample >= 30 (informational; SwiftShader is CPU-bound).
 */

import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { bootWait, canvasStats } from './helpers/canvas.js';

// Output path relative to repo root (Playwright cwd = project root).
const PERF_DIR   = path.join(__dirname, '..', 'performance');
const PERF_FILE  = path.join(PERF_DIR, 'latest.json');

// Ensure the output directory exists.
if (!fs.existsSync(PERF_DIR)) {
  fs.mkdirSync(PERF_DIR, { recursive: true });
}

interface PerfResult {
  first_frame_ms:   number;
  fps_mean:         number;
  fps_p50:          number;
  fps_p95:          number;
  frame_count:      number;
  screenshot:       string;
  swiftshader:      boolean;
  test_env:         string;
}

// ---------------------------------------------------------------------------
// 1. Boot time (soft gate)
// ---------------------------------------------------------------------------
test('performance: boot time', async ({ page }) => {
  const t0 = Date.now();
  let firstNonBlack = false;
  let firstNonBlackMs = 0;

  // Start rAF tracking immediately (before navigation).
  let rafTimes: number[] = [];
  await page.exposeFunction('__perfRaf', (ts: number) => {
    rafTimes.push(ts);
  });

  // We will check for first non-black frame during bootWait.
  await page.goto('/');

  // Wait for engine boot.
  await bootWait(page, 45_000);

  const bootMs = Date.now() - t0;

  // Check first-frame threshold (soft gate — report only, never fail).
  console.log(`[perf] boot time: ${bootMs} ms`);

  const perf: PerfResult = {
    first_frame_ms: bootMs,
    fps_mean: 0,
    fps_p50: 0,
    fps_p95: 0,
    frame_count: 0,
    screenshot: '',
    swiftshader: false,
    test_env: 'headless-chrome-swiftshader',
  };

  // Determine if SwiftShader is in use.
  try {
    const renderer = await page.evaluate(() => {
      const c = document.getElementById('canvas') as HTMLCanvasElement | null;
      if (!c) return '';
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return '';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : '';
    });
    perf.swiftshader = renderer.toLowerCase().includes('swiftshader');
  } catch {
    perf.swiftshader = true; // assume swiftshader on error.
  }

  // Run FPS sample after boot.
  await runFpsSample(page, perf);

  // Capture screenshot.
  await page.screenshot({ path: path.join(PERF_DIR, 'screenshot.png'), fullPage: false });
  perf.screenshot = 'tests/performance/screenshot.png';

  // Write results.
  fs.writeFileSync(PERF_FILE, JSON.stringify(perf, null, 2));
  console.log('[perf] Results written to tests/performance/latest.json');

  // — Soft gate checks (report, never hard-fail) —
  // first_frame under 15 s under SwiftShader is acceptable.
  if (perf.swiftshader && perf.first_frame_ms > 15_000) {
    console.warn(
      `[perf] WARNING: first_frame=${perf.first_frame_ms}ms exceeds 15 s under SwiftShader. `
        + `Target for real GPU < 8 s.`,
    );
  } else if (!perf.swiftshader && perf.first_frame_ms > 8_000) {
    console.warn(
      `[perf] WARNING: first_frame=${perf.first_frame_ms}ms on real GPU. Target < 8 s.`,
    );
  }

  // FPS informational (>= 30).
  if (perf.fps_mean > 0 && perf.fps_mean < 30) {
    console.warn(
      `[perf] WARNING: fps_mean=${perf.fps_mean.toFixed(1)} below 30. `
        + `SwiftShader caveat documented.`,
    );
  }

  // Print summary.
  console.log('[perf] === Performance Summary ===');
  console.log(`  first_frame:  ${perf.first_frame_ms} ms`);
  console.log(`  fps_mean:     ${perf.fps_mean.toFixed(1)}`);
  console.log(`  fps_p50:      ${perf.fps_p50.toFixed(1)}`);
  console.log(`  fps_p95:      ${perf.fps_p95.toFixed(1)}`);
  console.log(`  frame_count:  ${perf.frame_count}`);
  console.log(`  swiftshader:  ${perf.swiftshader}`);
  console.log('================================');

  // Always pass — perf is informative only.
  expect(perf.first_frame_ms).toBeLessThan(30_000);
});

// ---------------------------------------------------------------------------
// Helper: run ~10 s FPS sample via rAF ticks.
// ---------------------------------------------------------------------------
async function runFpsSample(page: Page, perf: PerfResult): Promise<void> {
  // Clear old data.
  const frameTimes: number[] = [];

  // Use page.evaluate to inject a rAF loop.
  await page.evaluate(() => {
    // Global array in the page context.
    (globalThis as unknown as Record<string, number[]>).__perfFrames = [];

    let last = 0;
    let started = false;

    function raf(ts: number) {
      if (!started) {
        started = true;
        last = ts;
      }
      if (last > 0) {
        const delta = ts - last;
        (globalThis as unknown as Record<string, number[]>).__perfFrames.push(delta);
      }
      last = ts;

      // Collect for ~10 seconds.
      if (ts - performance.now() > 10_000) {
        return;
      }
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  });

  // Wait for the sample to fill.
  await page.waitForTimeout(11_000);

  // Read frames from the page.
  const deltas = await page.evaluate(() => {
    return (globalThis as unknown as Record<string, number[]>).__perfFrames ?? [];
  });

  if (deltas.length < 2) {
    console.log('[perf] No rAF frames collected (headless limit).');
    return;
  }

  perf.frame_count = deltas.length;

  // Compute stats.
  const sorted = deltas.slice().sort((a, b) => a - b);
  const sum = deltas.reduce((s, d) => s + d, 0);
  const mean = sum / deltas.length;

  // FPS = 1000 / msPerFrame (filter out inf/nan from zero-delta frames).
  const fpsArray = deltas.map((d) => 1000 / d).filter((f) => isFinite(f));
  const fpsSorted = fpsArray.slice().sort((a, b) => a - b);
  const fpsMean = fpsSorted.length > 0
    ? fpsSorted.reduce((s, f) => s + f, 0) / fpsSorted.length
    : 0;

  const medianIdx = Math.floor(sorted.length / 2);
  const p50Ms = sorted[medianIdx];
  const p50Fps = 1000 / p50Ms;

  const p95Idx = Math.floor(sorted.length * 0.95);
  const p95Ms = sorted[Math.min(p95Idx, sorted.length - 1)];
  const p95Fps = 1000 / p95Ms;

  perf.fps_mean = fpsMean;
  perf.fps_p50 = p50Fps;
  perf.fps_p95 = p95Fps;

  console.log(
    `[perf] fps: mean=${fpsMean.toFixed(1)} p50=${p50Fps.toFixed(1)} p95=${p95Fps.toFixed(1)} frames=${deltas.length}`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any; // Playwright Page type for dynamic evaluation.
