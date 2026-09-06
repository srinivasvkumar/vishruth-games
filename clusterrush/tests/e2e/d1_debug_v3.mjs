/**
 * D1 Empirical Verification Test (v3)
 * Checks specific debug points to pinpoint exact failure cause
 * 
 * Run: node d1_debug_v3.mjs (from tests/e2e/, server on :8765)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:8765';
const EVIDENCE_DIR = '../../test-plan/evidence/d1-debug-v3';
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
// D1 Empirical Verification Test (v3)
// ─────────────────────────────────────────────────────────────────────────────
async function testD1EmpiricalVerification(page) {
  console.log('\n' + '='.repeat(70));
  console.log('D1 EMPIRICAL VERIFICATION TEST (v3) - Specific Debug Points');
  console.log('='.repeat(70));
  console.log('\nObjective: Determine EXACTLY why _on_retry() is not being called');
  console.log('='.repeat(70) + '\n');
  
  // Step 1: Boot to main menu
  console.log('[Step 1] Booting to main menu...');
  await page.goto(BASE_URL);
  await bootWait(page);
  await sleep(1000);
  
  const menuStats = await canvasStats(page);
  console.log(`  Canvas: ${menuStats.cw}x${menuStats.ch}, nonBlackPct: ${menuStats.nonBlackPct.toFixed(2)}%`);
  
  const menuScreenshot = path.join(SCREENSHOTS_DIR, 'd1v3_menu.png');
  await page.screenshot({ path: menuScreenshot, fullPage: false });
  console.log(`  Screenshot: ${menuScreenshot}\n`);
  
  // Step 2: Start Game
  console.log('[Step 2] Clicking "Start Game"...');
  await clickCanvas(page, 640, 200);
  await sleep(2000);
  
  const startStats = await canvasStats(page);
  console.log(`  Canvas: ${startStats.cw}x${startStats.ch}, nonBlackPct: ${startStats.nonBlackPct.toFixed(2)}%`);
  
  const startScreenshot = path.join(SCREENSHOTS_DIR, 'd1v3_start_game.png');
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
  
  const death1Screenshot = path.join(SCREENSHOTS_DIR, 'd1v3_death1.png');
  await page.screenshot({ path: death1Screenshot, fullPage: false });
  hudState = await getHUDState(page);
  console.log(`  After Death 1 - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}\n`);
  
  // Step 5: Kill player - Death 2 (Game Over)
  console.log('[Step 5] Killing player (Death 2 - Game Over)...');
  await clickCanvas(page, 900, 400);
  await sleep(3000);
  
  const death2Screenshot = path.join(SCREENSHOTS_DIR, 'd1v3_death2_gameover.png');
  await page.screenshot({ path: death2Screenshot, fullPage: false });
  hudState = await getHUDState(page);
  console.log(`  After Death 2 - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}, Has GameOver: ${hudState.hasGameOver}\n`);
  
  // Step 6: CRITICAL - Click Retry button and capture ALL console output
  console.log('[Step 6] Clicking "Retry" button - CAPTURING ALL CONSOLE OUTPUT...\n');
  console.log('-'.repeat(70));
  console.log('CONSOLE OUTPUT AFTER RETRY CLICK (Last 10 seconds):');
  console.log('-'.repeat(70));
  
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
  
  console.log('-'.repeat(70));
  console.log(`Total console messages after retry: ${consoleWindow.length}\n`);
  
  const retryScreenshot = path.join(SCREENSHOTS_DIR, 'd1v3_retry_clicked.png');
  await page.screenshot({ path: retryScreenshot, fullPage: false });
  
  // Step 7: Check HUD state after Retry
  console.log('[Step 7] Checking HUD state after Retry...');
  await sleep(2000);
  hudState = await getHUDState(page);
  console.log(`  After Retry - Hearts: ${hudState.hearts}, Lives: ${hudState.lives}`);
  console.log(`  Has Credits: ${hudState.hasCredits}\n`);
  
  const finalScreenshot = path.join(SCREENSHOTS_DIR, 'd1v3_final_state.png');
  await page.screenshot({ path: finalScreenshot, fullPage: false });
  console.log(`  Screenshot: ${finalScreenshot}\n`);
  
  // ───────────────────────────────────────────────────────────────────────────
  // ANALYSIS: Check for specific debug prints
  // ───────────────────────────────────────────────────────────────────────────
  console.log('='.repeat(70));
  console.log('D1 EMPIRICAL VERIFICATION ANALYSIS - Specific Debug Points');
  console.log('='.repeat(70));
  
  const debugChecks = {
    gameSceneReady: consoleLogs.some(log => 
      log.text.includes('[DEBUG] game_scene.gd _ready()') ||
      log.text.includes('_ready() called')
    ),
    retryButtonConnected: consoleLogs.some(log => 
      log.text.includes('Retry button connected to _on_retry')
    ),
    onRetryCalled: consoleLogs.some(log => 
      log.text.includes('_on_retry() CALLED')
    ),
    d1FixExecuting: consoleLogs.some(log => 
      log.text.includes('[D1 FIX] Calling GameManager.start_level')
    ),
    showingCredits: consoleLogs.some(log => 
      log.text.includes('Showing credits')
    ),
  };
  
  console.log('\n--- Debug Print Checklist ---\n');
  console.log(`[DEBUG] game_scene.gd _ready() called!        ${debugChecks.gameSceneReady ? '✓ PRESENT' : '✗ MISSING'}`);
  console.log(`[DEBUG] Retry button connected to _on_retry   ${debugChecks.retryButtonConnected ? '✓ PRESENT' : '✗ MISSING'}`);
  console.log(`[DEBUG] _on_retry() CALLED!                   ${debugChecks.onRetryCalled ? '✓ PRESENT' : '✗ MISSING'}`);
  console.log(`[D1 FIX] Calling GameManager.start_level...   ${debugChecks.d1FixExecuting ? '✓ PRESENT' : '✗ MISSING'}`);
  console.log(`LOG: Showing credits                          ${debugChecks.showingCredits ? '✗ UNEXPECTED (wrong handler)' : '✓ NOT PRESENT'}`);
  
  // Determine root cause
  console.log('\n--- Root Cause Analysis ---\n');
  
  let rootCause = 'UNKNOWN';
  let rootCauseCategory = '';
  
  if (!debugChecks.gameSceneReady) {
    rootCause = 'game_scene.gd script NOT loaded';
    rootCauseCategory = 'SCRIPT NOT LOADED';
  } else if (!debugChecks.retryButtonConnected) {
    rootCause = 'Retry button node path incorrect OR connection failed';
    rootCauseCategory = 'NODE PATH WRONG';
  } else if (!debugChecks.onRetryCalled) {
    if (debugChecks.showingCredits) {
      rootCause = 'Wrong handler bound - Retry triggers Credits instead of _on_retry()';
      rootCauseCategory = 'WRONG HANDLER BOUND';
    } else {
      rootCause = 'Signal not connected - _on_retry() never triggered';
      rootCauseCategory = 'SIGNAL NOT CONNECTED';
    }
  } else if (!debugChecks.d1FixExecuting) {
    rootCause = 'Fix code not executing - start_level() not called';
    rootCauseCategory = 'FIX NOT EXECUTING';
  } else {
    rootCause = 'All debug prints present - D1 fix appears to be working';
    rootCauseCategory = 'D1 FIXED';
  }
  
  console.log(`ROOT CAUSE: ${rootCause}`);
  console.log(`Category: ${rootCauseCategory}\n`);
  
  console.log('--- Console Output Summary ---\n');
  if (consoleWindow.length === 0) {
    console.log('NO console output after clicking Retry');
  } else {
    for (const log of consoleWindow) {
      console.log(`  ${log.type.toUpperCase()}: ${log.text}`);
    }
  }
  
  console.log('\n--- HUD State After Retry ---\n');
  console.log(`Hearts: ${hudState.hearts}`);
  console.log(`Lives: ${hudState.lives ?? 'N/A'}`);
  
  const d1Status = rootCauseCategory === 'D1 FIXED' ? 'PASS' : 'FAIL';
  console.log(`\nD1 Status: ${d1Status}`);
  
  return {
    debugChecks,
    rootCause,
    rootCauseCategory,
    hudState,
    d1Status,
    consoleWindow,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting D1 Empirical Verification Test (v3)...\n');
  
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
    Object.assign(results, await testD1EmpiricalVerification(page));
    
    // Save console logs
    const logsPath = path.join(EVIDENCE_DIR, 'console_logs.json');
    fs.writeFileSync(logsPath, JSON.stringify(consoleLogs, null, 2));
    console.log(`\nConsole logs saved to: ${logsPath}`);
    
    // Save detailed results
    const summaryPath = path.join(EVIDENCE_DIR, 'd1_debug_v3_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      debugChecks: results.debugChecks,
      rootCause: results.rootCause,
      rootCauseCategory: results.rootCauseCategory,
      hudState: results.hudState,
      d1Status: results.d1Status,
      consoleLogCount: consoleLogs.length,
    }, null, 2));
    console.log(`Results summary saved to: ${summaryPath}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('D1 EMPIRICAL VERIFICATION TEST (v3) COMPLETE');
    console.log('='.repeat(70));
    console.log(`Status: ${results.d1Status}`);
    console.log(`Root Cause: ${results.rootCause}`);
    console.log(`Category: ${results.rootCauseCategory}`);
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
