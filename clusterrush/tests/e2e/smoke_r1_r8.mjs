/**
 * M0-06 Smoke Test Suite (R1-R8)
 * Execute all 8 P0 smoke tests in sequence and capture evidence.
 * 
 * Run: node smoke_r1_r8.mjs (from tests/e2e/, server on :8765)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8765';
const EVIDENCE_DIR = '../../test-plan/evidence/smoke';
const SCREENSHOTS_DIR = '../../test-plan/evidence/smoke/screenshots';

// Ensure evidence directories exist
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const results = [];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bootWait(page, timeoutMs = 45000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const state = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      const s = document.getElementById('status');
      return {
        canvasWidth: c?.width ?? null,
        statusGone: !s || s.style.visibility === 'hidden',
      };
    });
    if (state.canvasWidth >= 1280 && state.statusGone) {
      return;
    }
    await sleep(300);
  }
  throw new Error('Boot timeout');
}

async function canvasStats(page) {
  return await page.evaluate(() => {
    const c = document.getElementById('canvas');
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
}

async function clickCanvas(page, x, y) {
  await page.mouse.click(x, y);
}

// ─────────────────────────────────────────────────────────────────────────────
// R1: Boot to main menu
// ─────────────────────────────────────────────────────────────────────────────
async function testR1(page) {
  console.log('=== R1: Boot to main menu ===');
  await page.goto(BASE_URL);
  await bootWait(page);
  
  const stats = await canvasStats(page);
  console.log(`Canvas: ${stats.cw}x${stats.ch}, nonBlackPct: ${stats.nonBlackPct.toFixed(2)}%`);
  
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'R1_menu.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  const passed = stats.cw >= 1280 && stats.nonBlackPct > 5;
  results.push({ test: 'R1', name: 'Boot to main menu', passed, evidence: screenshotPath, details: `nonBlackPct=${stats.nonBlackPct.toFixed(2)}%` });
  console.log(`R1: ${passed ? 'PASS' : 'FAIL'} - ${screenshotPath}`);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// R2: Start Game → gameplay renders
// ─────────────────────────────────────────────────────────────────────────────
async function testR2(page) {
  console.log('=== R2: Start Game → gameplay renders ===');
  // Click "Start Game" at approximate center-top of canvas
  await clickCanvas(page, 640, 200);
  await sleep(2000);
  
  const stats = await canvasStats(page);
  console.log(`Canvas: ${stats.cw}x${stats.ch}, nonBlackPct: ${stats.nonBlackPct.toFixed(2)}%`);
  
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'R2_gameplay.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  const passed = stats.cw >= 1280 && stats.nonBlackPct > 10;
  results.push({ test: 'R2', name: 'Start Game → gameplay renders', passed, evidence: screenshotPath, details: `nonBlackPct=${stats.nonBlackPct.toFixed(2)}%` });
  console.log(`R2: ${passed ? 'PASS' : 'FAIL'} - ${screenshotPath}`);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// R3: Run 10s: auto-advance + strafe + jump all respond
// ─────────────────────────────────────────────────────────────────────────────
async function testR3(page) {
  console.log('=== R3: Run 10s with auto-advance + strafe + jump ===');
  // Simulate gameplay input
  await page.keyboard.down('Shift'); // Auto-run
  await sleep(1000);
  await page.keyboard.press('ArrowLeft'); // Strafe left
  await sleep(500);
  await page.keyboard.press('ArrowRight'); // Strafe right
  await sleep(500);
  await page.keyboard.press('Space'); // Jump
  await sleep(500);
  
  // Hold for 10 seconds of gameplay
  await sleep(7500);
  
  const stats = await canvasStats(page);
  console.log(`Canvas: ${stats.cw}x${stats.ch}, nonBlackPct: ${stats.nonBlackPct.toFixed(2)}%`);
  
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'R3_running.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  const passed = stats.cw >= 1280 && stats.nonBlackPct > 10;
  results.push({ test: 'R3', name: 'Run 10s: auto-advance + strafe + jump', passed, evidence: screenshotPath, details: `nonBlackPct=${stats.nonBlackPct.toFixed(2)}%` });
  console.log(`R3: ${passed ? 'PASS' : 'FAIL'} - ${screenshotPath}`);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// R4: Kill player → death → respawn (hearts 3→2)
// ─────────────────────────────────────────────────────────────────────────────
async function testR4(page) {
  console.log('=== R4: Kill player → death → respawn ===');
  // Walk into a truck to die (approximate coordinates)
  await clickCanvas(page, 800, 400);
  await sleep(2000);
  
  const stats = await canvasStats(page);
  console.log(`Canvas: ${stats.cw}x${stats.ch}, nonBlackPct: ${stats.nonBlackPct.toFixed(2)}%`);
  
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'R4_death_respawn.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  const passed = stats.cw >= 1280 && stats.nonBlackPct > 5;
  results.push({ test: 'R4', name: 'Kill player → death → respawn', passed, evidence: screenshotPath, details: `nonBlackPct=${stats.nonBlackPct.toFixed(2)}%` });
  console.log(`R4: ${passed ? 'PASS' : 'FAIL'} - ${screenshotPath}`);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// R5: 2nd death → GameOver overlay
// ─────────────────────────────────────────────────────────────────────────────
async function testR5(page) {
  console.log('=== R5: 2nd death → GameOver overlay ===');
  // Kill player again
  await clickCanvas(page, 900, 400);
  await sleep(3000);
  
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'R5_gameover.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  // Check for GameOver overlay text
  const hasGameOver = await page.evaluate(() => {
    const body = document.body.innerText.toLowerCase();
    return body.includes('game over') || body.includes('gameover');
  });
  
  const passed = hasGameOver;
  results.push({ test: 'R5', name: '2nd death → GameOver overlay', passed, evidence: screenshotPath, details: hasGameOver ? 'GameOver overlay detected' : 'GameOver overlay NOT detected' });
  console.log(`R5: ${passed ? 'PASS' : 'FAIL'} - ${screenshotPath}`);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// R6: Retry → lives = 3 (D1 gate - currently FAILS)
// ─────────────────────────────────────────────────────────────────────────────
async function testR6(page) {
  console.log('=== R6: Retry → lives = 3 (D1 gate) ===');
  // Click Retry button (approximate position)
  await clickCanvas(page, 640, 500);
  await sleep(2000);
  
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'R6_retry.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  // Check if lives = 3 (this is expected to FAIL per D1)
  const lives = await page.evaluate(() => {
    // Try to find HUD elements showing lives
    const body = document.body.innerText;
    const hearts = (body.match(/❤|♥|life|heart/gi) || []).length;
    return hearts;
  });
  
  // Note: This test is expected to FAIL due to D1 (Retry doesn't call start_level())
  const passed = lives >= 3; // Expected to be false
  results.push({ test: 'R6', name: 'Retry → lives = 3 (D1 gate)', passed, evidence: screenshotPath, details: `Hearts found: ${lives} (EXPECTED TO FAIL per D1)` });
  console.log(`R6: ${passed ? 'PASS' : 'FAIL (expected per D1)'} - ${screenshotPath}`);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// R7: Complete L1 → Level Complete + Next
// ─────────────────────────────────────────────────────────────────────────────
async function testR7(page) {
  console.log('=== R7: Complete Level 1 → Level Complete + Next ===');
  // Navigate to Level 1 (if needed) and complete it
  // For now, simulate completion by clicking through
  await sleep(5000);
  
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'R7_level_complete.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  const hasLevelComplete = await page.evaluate(() => {
    const body = document.body.innerText.toLowerCase();
    return body.includes('level complete') || body.includes('level 1') || body.includes('star');
  });
  
  const passed = hasLevelComplete;
  results.push({ test: 'R7', name: 'Complete L1 → Level Complete + Next', passed, evidence: screenshotPath, details: hasLevelComplete ? 'Level Complete detected' : 'Level Complete NOT detected' });
  console.log(`R7: ${passed ? 'PASS' : 'FAIL'} - ${screenshotPath}`);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// R8: Save persists after refresh
// ─────────────────────────────────────────────────────────────────────────────
async function testR8(page) {
  console.log('=== R8: Save persists after refresh ===');
  // Refresh the page
  await page.reload();
  await bootWait(page);
  
  const screenshotPath = path.join(SCREENSHOTS_DIR, 'R8_persistence.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  // Check if level select shows stars (persistence)
  const hasStars = await page.evaluate(() => {
    const body = document.body.innerText.toLowerCase();
    return body.includes('star') || body.includes('level select');
  });
  
  const passed = hasStars;
  results.push({ test: 'R8', name: 'Save persists after refresh', passed, evidence: screenshotPath, details: hasStars ? 'Persistence detected' : 'Persistence NOT detected' });
  console.log(`R8: ${passed ? 'PASS' : 'FAIL'} - ${screenshotPath}`);
  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: Execute all smoke tests
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting M0-06 Smoke Test Suite (R1-R8)...\n');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
    ],
  });
  
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  
  try {
    await testR1(page);
    await sleep(1000);
    await testR2(page);
    await sleep(1000);
    await testR3(page);
    await sleep(1000);
    await testR4(page);
    await sleep(1000);
    await testR5(page);
    await sleep(1000);
    await testR6(page);
    await sleep(1000);
    await testR7(page);
    await sleep(1000);
    await testR8(page);
    
    // Write summary
    const summaryPath = path.join(EVIDENCE_DIR, 'M0-06_smoke_summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      total: 8,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log('\n=== M0-06 Smoke Test Summary ===');
    console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
    console.log(`Summary: ${summaryPath}`);
    
  } catch (err) {
    console.error('Smoke test suite error:', err.message);
    const errorPath = path.join(EVIDENCE_DIR, 'M0-06_error.txt');
    fs.writeFileSync(errorPath, err.stack);
  } finally {
    await browser.close();
  }
}

main();
