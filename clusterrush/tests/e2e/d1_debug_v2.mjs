/**
 * D1 Debug Instrumentation Test (v2)
 * Captures ALL console output to identify exact failure point in Retry flow
 * 
 * Run: node d1_debug_v2.mjs (from tests/e2e/, server on :8765)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:8765';
const EVIDENCE_DIR = '../../test-plan/evidence/d1-debug-v2';
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const consoleLogs = [];
let retryClickTime = null;

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
      bodyText: body.substring(0, 1000),
      hearts,
      lives,
      hasGameOver: body.toLowerCase().includes('game over'),
      hasLevelComplete: body.toLowerCase().includes('level complete'),
      hasCredits: body.toLowerCase().includes('credits'),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// D1 Debug Instrumentation Test
// ─────────────────────────────────────────────────────────────────────────────
async function testD1DebugInstrumentation(page) {
  console.log('\n' + '='.repeat(60));
  console.log('D1 DEBUG INSTRUMENTATION TEST (v2)');
  console.log('Objective: Capture ALL debug prints to pinpoint failure point');
  console.log('='.repeat(60) + '\n');
  
  // Step 1: Boot to main menu
  console.log('[Step 1] Booting to main menu...');
  await page.goto(BASE_URL);
  await bootWait(page);
  await sleep(1000);
  
  const menuStats = await canvasStats(page);
  console.log(`  Canvas: ${menuStats.cw}x${menuStats.ch}, nonBlackPct: ${menuStats.nonBlackPct.toFixed(2)}%`);
  
  const menuScreenshot = path.join(SCREENSHOTS_DIR, 'd1v2_menu.png');
  await page.screenshot({ path: menuScreenshot, fullPage: false });
  console.log(`  Screenshot: ${menuScreenshot}\n`);
  
  // Step 2: Start Game
  console.log('[Step 2] Clicking "Start Game"...');
  await clickCanvas(page, 640, 200);
  await sleep(2000);
  
  const startStats = await canvasStats(page);
  console.log(`  Canvas: ${startStats.cw}x${startStats.ch}, nonBlackPct: ${startStats.nonBlackPct.toFixed(2)}%`);
  
  const startScreenshot = path.join(SCREENSHOTS_DIR, 'd1v2_start_game.png');
  await page.screenshot({ path: startScreenshot, fullPage: false });
  console.log(`  Screenshot: ${startScreenshot}\n`);
  
  // Step 3: Get initial HUD state
  console.log('[Step 3] Checking initial HUD state...');
  let hudState = await getHUDState(page);
  console.log(`  Hearts: ${hudState.hearts}, Lives: ${hudState.lives}\n`);
  
  // Step 4: Kill player - Death 1
  console.log('[Step 4] Killing player (Death 1)...');
  await clickCanvas(page, 800, 400);
  await sleep(3000);
  
  const death1Screenshot = path.join(SCREENSHOTS_DIR, 'd1v2_death1.png');
  await page.screenshot({ path: death1Screenshot, fullPage: false });
  hudState = await getHUDState(page);
  console.log(`  After Death 1 - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}\n`);
  
  // Step 5: Kill player - Death 2 (Game Over)
  console.log('[Step 5] Killing player (Death 2 - Game Over)...');
  await clickCanvas(page, 900, 400);
  await sleep(3000);
  
  const death2Screenshot = path.join(SCREENSHOTS_DIR, 'd1v2_death2_gameover.png');
  await page.screenshot({ path: death2Screenshot, fullPage: false });
  hudState = await getHUDState(page);
  console.log(`  After Death 2 - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}, Has GameOver: ${hudState.hasGameOver}\n`);
  
  // Step 6: CRITICAL - Click Retry button and capture ALL console output
  console.log('[Step 6] Clicking "Retry" button - CAPTURING ALL CONSOLE OUTPUT...\n');
  console.log('-'.repeat(60));
  console.log('CONSOLE OUTPUT AFTER RETRY CLICK:');
  console.log('-'.repeat(60));
  
  retryClickTime = Date.now();
  await clickCanvas(page, 640, 500);
  
  // Monitor console for 10 seconds after retry click
  const consoleWindow = [];
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const recentLogs = consoleLogs.filter(log => 
      new Date(log.timestamp).getTime() > retryClickTime - 100
    );
    for (const log of recentLogs) {
      if (!consoleWindow.find(l => l.text === log.text)) {
        consoleWindow.push(log);
        console.log(`  [${new Date(log.timestamp).toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.text}`);
      }
    }
  }
  
  console.log('-'.repeat(60));
  console.log(`Total console messages after retry: ${consoleWindow.length}\n`);
  
  const retryScreenshot = path.join(SCREENSHOTS_DIR, 'd1v2_retry_clicked.png');
  await page.screenshot({ path: retryScreenshot, fullPage: false });
  
  // Step 7: Check HUD state after Retry
  console.log('[Step 7] Checking HUD state after Retry...');
  await sleep(2000);
  hudState = await getHUDState(page);
  console.log(`  After Retry - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}`);
  console.log(`  Has Credits: ${hudState.hasCredits}\n`);
  
  const finalScreenshot = path.join(SCREENSHOTS_DIR, 'd1v2_final_state.png');
  await page.screenshot({ path: finalScreenshot, fullPage: false });
  console.log(`  Screenshot: ${finalScreenshot}\n`);
  
  // Analyze debug output
  console.log('='.repeat(60));
  console.log('D1 DEBUG INSTRUMENTATION ANALYSIS');
  console.log('='.repeat(60));
  
  const debugPrints = {
    retryButtonConnected: consoleLogs.some(log => 
      log.text.includes('Retry button connected to _on_retry')
    ),
    onRetryCalled: consoleLogs.some(log => 
      log.text.includes('_on_retry() CALLED')
    ),
    currentLevelPrinted: consoleLogs.some(log => 
      log.text.includes('GameManager.current_level =')
    ),
    livesBeforePrinted: consoleLogs.some(log => 
      log.text.includes('GameManager.lives before =')
    ),
    d1FixExecuting: consoleLogs.some(log => 
      log.text.includes('[D1 FIX]')
    ),
    livesAfterFix: consoleLogs.some(log => 
      log.text.includes('After start_level, lives=')
    ),
    showingCredits: consoleLogs.some(log => 
      log.text.includes('Showing credits')
    ),
  };
  
  console.log('\nDebug Print Detection:');
  console.log(`  [DEBUG] Retry button connected:     ${debugPrints.retryButtonConnected ? '✓' : '✗'}`);
  console.log(`  [DEBUG] _on_retry() CALLED:         ${debugPrints.onRetryCalled ? '✓' : '✗'}`);
  console.log(`  [DEBUG] GameManager.current_level:  ${debugPrints.currentLevelPrinted ? '✓' : '✗'}`);
  console.log(`  [DEBUG] GameManager.lives before:   ${debugPrints.livesBeforePrinted ? '✓' : '✗'}`);
  console.log(`  [D1 FIX] Calling start_level:       ${debugPrints.d1FixExecuting ? '✓' : '✗'}`);
  console.log(`  [D1 FIX] After start_level, lives=  ${debugPrints.livesAfterFix ? '✓' : '✗'}`);
  console.log(`  Showing credits (wrong handler):    ${debugPrints.showingCredits ? '✗ WRONG HANDLER' : '✓'}`);
  
  // Determine failure point
  let failurePoint = 'UNKNOWN';
  if (!debugPrints.retryButtonConnected) {
    failurePoint = 'RETRY BUTTON NOT CONNECTED TO _on_retry()';
  } else if (!debugPrints.onRetryCalled) {
    failurePoint = '_on_retry() NOT BEING CALLED (possibly blocked by _is_transitioning)';
  } else if (debugPrints.showingCredits && !debugPrints.onRetryCalled) {
    failurePoint = 'WRONG HANDLER: Retry triggers Credits instead of _on_retry()';
  } else if (!debugPrints.d1FixExecuting) {
    failurePoint = 'D1 FIX NOT EXECUTING (start_level not called)';
  } else if (!debugPrints.livesAfterFix) {
    failurePoint = 'FIX NOT WORKING (lives not reset after start_level)';
  } else {
    failurePoint = 'D1 APPEARS TO BE FIXED';
  }
  
  console.log(`\nFAILURE POINT: ${failurePoint}`);
  console.log(`HUD Hearts After Retry: ${hudState.hearts}`);
  console.log(`HUD Lives After Retry: ${hudState.lives ?? 'N/A'}`);
  
  const d1Status = failurePoint === 'D1 APPEARS TO BE FIXED' ? 'PASS' : 'FAIL';
  console.log(`\nD1 Status: ${d1Status}`);
  
  return {
    debugPrints,
    failurePoint,
    hudState,
    d1Status,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting D1 Debug Instrumentation Test (v2)...\n');
  
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
  
  // Capture ALL console messages
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString(),
    };
    consoleLogs.push(logEntry);
  });
  
  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]: ${err.message}`);
    consoleLogs.push({ type: 'error', text: err.message, timestamp: new Date().toISOString() });
  });
  
  const results = {};
  
  try {
    Object.assign(results, await testD1DebugInstrumentation(page));
    
    // Save console logs
    const logsPath = path.join(EVIDENCE_DIR, 'console_logs.json');
    fs.writeFileSync(logsPath, JSON.stringify(consoleLogs, null, 2));
    console.log(`\nConsole logs saved to: ${logsPath}`);
    
    // Save detailed results
    const summaryPath = path.join(EVIDENCE_DIR, 'd1_debug_v2_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      debugPrints: results.debugPrints,
      failurePoint: results.failurePoint,
      hudState: results.hudState,
      d1Status: results.d1Status,
      consoleLogCount: consoleLogs.length,
    }, null, 2));
    console.log(`Results summary saved to: ${summaryPath}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('D1 DEBUG INSTRUMENTATION TEST COMPLETE');
    console.log('='.repeat(60));
    console.log(`Status: ${results.d1Status}`);
    console.log(`Failure Point: ${results.failurePoint}`);
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
