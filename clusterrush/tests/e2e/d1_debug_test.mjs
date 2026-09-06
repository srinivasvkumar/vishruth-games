/**
 * D1 Verification Test - Debug Mode
 * Captures console output and HUD state during Retry flow
 * 
 * Run: node d1_debug_test.mjs (from tests/e2e/, server on :8765)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:8765';
const EVIDENCE_DIR = '../../test-plan/evidence/d1-debug';
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const consoleLogs = [];
const results = {};

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

async function getHUDState(page) {
  return await page.evaluate(() => {
    const body = document.body.innerText;
    const hearts = (body.match(/❤|♥/g) || []).length;
    const livesMatch = body.match(/lives?[:\s]+(\d+)/i);
    const lives = livesMatch ? parseInt(livesMatch[1]) : null;
    return {
      bodyText: body.substring(0, 500),
      hearts,
      lives,
      hasGameOver: body.toLowerCase().includes('game over'),
      hasLevelComplete: body.toLowerCase().includes('level complete'),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// D1 Verification Test
// ─────────────────────────────────────────────────────────────────────────────
async function testD1Verification(page) {
  console.log('\n=== D1 VERIFICATION TEST ===');
  console.log('Objective: Verify Retry flow resets lives correctly\n');
  
  // Step 1: Boot to main menu
  console.log('[Step 1] Booting to main menu...');
  await page.goto(BASE_URL);
  await bootWait(page);
  await sleep(1000);
  
  const menuStats = await canvasStats(page);
  console.log(`  Canvas: ${menuStats.cw}x${menuStats.ch}, nonBlackPct: ${menuStats.nonBlackPct.toFixed(2)}%`);
  
  const menuScreenshot = path.join(SCREENSHOTS_DIR, 'd1_menu.png');
  await page.screenshot({ path: menuScreenshot, fullPage: false });
  console.log(`  Screenshot: ${menuScreenshot}`);
  
  // Step 2: Start Game
  console.log('[Step 2] Clicking "Start Game"...');
  await clickCanvas(page, 640, 200);
  await sleep(2000);
  
  const startStats = await canvasStats(page);
  console.log(`  Canvas: ${startStats.cw}x${startStats.ch}, nonBlackPct: ${startStats.nonBlackPct.toFixed(2)}%`);
  
  const startScreenshot = path.join(SCREENSHOTS_DIR, 'd1_start_game.png');
  await page.screenshot({ path: startScreenshot, fullPage: false });
  console.log(`  Screenshot: ${startScreenshot}`);
  
  // Step 3: Get initial HUD state (should show 3 lives)
  console.log('[Step 3] Checking initial HUD state...');
  let hudState = await getHUDState(page);
  console.log(`  Hearts: ${hudState.hearts}, Lives: ${hudState.lives}`);
  results.initialHUD = hudState;
  
  // Step 4: Kill player (walk into truck) - Death 1
  console.log('[Step 4] Killing player (Death 1)...');
  await clickCanvas(page, 800, 400);
  await sleep(3000);
  
  const death1Screenshot = path.join(SCREENSHOTS_DIR, 'd1_death1.png');
  await page.screenshot({ path: death1Screenshot, fullPage: false });
  console.log(`  Screenshot: ${death1Screenshot}`);
  
  hudState = await getHUDState(page);
  console.log(`  After Death 1 - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}`);
  results.death1HUD = hudState;
  
  // Step 5: Kill player again - Death 2
  console.log('[Step 5] Killing player (Death 2 - Game Over)...');
  await clickCanvas(page, 900, 400);
  await sleep(3000);
  
  const death2Screenshot = path.join(SCREENSHOTS_DIR, 'd1_death2_gameover.png');
  await page.screenshot({ path: death2Screenshot, fullPage: false });
  console.log(`  Screenshot: ${death2Screenshot}`);
  
  hudState = await getHUDState(page);
  console.log(`  After Death 2 - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}, Has GameOver: ${hudState.hasGameOver}`);
  results.death2HUD = hudState;
  
  // Step 6: Click Retry button
  console.log('[Step 6] Clicking "Retry" button...');
  await clickCanvas(page, 640, 500);
  await sleep(3000);
  
  const retryScreenshot = path.join(SCREENSHOTS_DIR, 'd1_retry_clicked.png');
  await page.screenshot({ path: retryScreenshot, fullPage: false });
  console.log(`  Screenshot: ${retryScreenshot}`);
  
  // Step 7: Check HUD state after Retry
  console.log('[Step 7] Checking HUD state after Retry...');
  hudState = await getHUDState(page);
  console.log(`  After Retry - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}`);
  results.retryHUD = hudState;
  
  // Step 8: Final screenshot
  const finalScreenshot = path.join(SCREENSHOTS_DIR, 'd1_final_state.png');
  await page.screenshot({ path: finalScreenshot, fullPage: false });
  console.log(`  Screenshot: ${finalScreenshot}`);
  
  // Analyze results
  console.log('\n=== D1 VERIFICATION ANALYSIS ===');
  const expectedLives = 3;
  const actualLives = hudState.lives ?? hudState.hearts;
  
  if (actualLives === expectedLives) {
    console.log(`✓ PASS: Lives correctly reset to ${expectedLives}`);
    results.d1Status = 'PASS';
  } else {
    console.log(`✗ FAIL: Lives = ${actualLives} (expected ${expectedLives})`);
    console.log('  This confirms D1 defect: Retry does not reset lives');
    results.d1Status = 'FAIL';
  }
  
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting D1 Verification Test with Console Capture...\n');
  
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
  
  // Capture all console messages
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString(),
    };
    consoleLogs.push(logEntry);
    console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]: ${err.message}`);
    consoleLogs.push({ type: 'error', text: err.message, timestamp: new Date().toISOString() });
  });
  
  try {
    await testD1Verification(page);
    
    // Save console logs
    const logsPath = path.join(EVIDENCE_DIR, 'console_logs.json');
    fs.writeFileSync(logsPath, JSON.stringify(consoleLogs, null, 2));
    console.log(`\nConsole logs saved to: ${logsPath}`);
    
    // Save results summary
    const summaryPath = path.join(EVIDENCE_DIR, 'd1_verification_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      consoleLogCount: consoleLogs.length,
    }, null, 2));
    console.log(`Results summary saved to: ${summaryPath}`);
    
    console.log('\n=== D1 VERIFICATION TEST COMPLETE ===');
    console.log(`Status: ${results.d1Status}`);
    console.log(`Evidence: ${EVIDENCE_DIR}/`);
    
  } catch (err) {
    console.error('Test error:', err.message);
    const errorPath = path.join(EVIDENCE_DIR, 'error.txt');
    fs.writeFileSync(errorPath, err.stack);
  } finally {
    await browser.close();
  }
}

main();
