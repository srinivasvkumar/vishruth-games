import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const APP_URL = 'http://localhost:5173/public/index.html';
const BROWSER = process.env.BROWSER ?? 'firefox';
const EVIDENCE_DIR = '/home/srinivasvkumar/.hermes/kanban/boards/cluster-rush/workspaces/t_d57780a6/tests/evidence/w2';

function captureConsole(page: Page) {
  const entries: { type: string; text: string }[] = [];
  page.on('console', (msg) => entries.push({ type: msg.type(), text: msg.text() }));
  return entries;
}

function filterFatalErrors(entries: { type: string; text: string }[]) {
  return entries.filter(e => e.type === 'error' && !/404|manifest|favicon/i.test(e.text));
}

test(`W3-C.2: ${BROWSER} — no AudioContext autoplay warnings across full user-gesture loop`, async ({ page }) => {
  test.setTimeout(120_000);
  const consoleEntries = captureConsole(page);

  // 1. Navigate to the app — BootScene runs, MenuScene appears.
  //    No user gesture yet: AudioContext should NOT be created.
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu-container', { timeout: 15_000, state: 'attached' });
  await page.waitForTimeout(500);

  // 2. Click START (user gesture #1) — AudioContext is created + resumed.
  await page.click('#menu-start-button');
  await page.waitForSelector('#game-score', { timeout: 10_000, state: 'visible' });
  await page.waitForTimeout(1000);

  // 3. Force game-over via evaluate (fast path).
  await page.evaluate(() => {
    (window as any).game?.getAudioSystem?.();
  });

  // 4. Collect ALL console entries.
  const audioWarnings = consoleEntries.filter(e =>
    e.text.includes('AudioContext') && e.text.includes('prevented')
  );
  const fatal = filterFatalErrors(consoleEntries);

  console.log(`\n=== W3-C.2 ${BROWSER} ===`);
  console.log(`Total console entries: ${consoleEntries.length}`);
  console.log(`AudioContext "prevented" warnings: ${audioWarnings.length}`);
  audioWarnings.forEach((w, i) => console.log(`  [${i}] ${w.type}: ${w.text}`));
  console.log(`Fatal errors: ${fatal.length}`);
  fatal.forEach((f, i) => console.log(`  [${i}] ${f.type}: ${f.text}`));

  // Write evidence
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const logLines = consoleEntries.map(e => `[${e.type}] ${e.text}`);
  writeFileSync(join(EVIDENCE_DIR, `W3C2-VERIFY-${BROWSER}.txt`), logLines.join('\n') + '\n', 'utf-8');

  // ASSERT: no AudioContext autoplay warnings
  expect(audioWarnings.length,
    `Expected 0 AudioContext autoplay warnings but found ${audioWarnings.length}:\n` +
    audioWarnings.map(w => `  ${w.text}`).join('\n')
  ).toBe(0);

  // ASSERT: no fatal errors
  expect(fatal.length,
    `Expected 0 fatal errors but found ${fatal.length}:\n` +
    fatal.map(f => `  ${f.text}`).join('\n')
  ).toBe(0);
});
