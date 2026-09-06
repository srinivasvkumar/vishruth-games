/**
 * Debug script to check what's happening on the page
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:8765';
const DEBUG_DIR = '../../test-plan/evidence/smoke/debug';

if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Debugging page load...\n');
  
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
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  try {
    console.log('Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('Page loaded');
    
    // Wait and check state every 2 seconds
    for (let i = 0; i < 25; i++) {
      await sleep(2000);
      
      const state = await page.evaluate(() => {
        const c = document.getElementById('canvas');
        const s = document.getElementById('status');
        return {
          canvasExists: !!c,
          canvasWidth: c?.width ?? null,
          canvasHeight: c?.height ?? null,
          statusOverlay: s ? 'exists' : 'removed',
          bodyText: document.body.innerText.substring(0, 200),
        };
      });
      
      console.log(`[${i * 2}s] Canvas: ${state.canvasWidth}x${state.canvasHeight}, Status: ${state.statusOverlay}`);
      
      if (state.canvasWidth >= 1280 && state.statusOverlay === 'removed') {
        console.log('Boot conditions met!');
        break;
      }
    }
    
    // Take screenshot
    const screenshotPath = path.join(DEBUG_DIR, 'debug_state.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Screenshot saved to:', screenshotPath);
    
    // Get console logs
    const consoleLogPath = path.join(DEBUG_DIR, 'console_log.txt');
    fs.writeFileSync(consoleLogPath, 'Console logs captured above');
    
  } catch (err) {
    console.error('Error:', err.message);
    const errorPath = path.join(DEBUG_DIR, 'error.txt');
    fs.writeFileSync(errorPath, err.stack);
  } finally {
    await browser.close();
  }
}

main();
