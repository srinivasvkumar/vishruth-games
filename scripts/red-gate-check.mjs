#!/usr/bin/env node
/**
 * D0.2 pre-commit gate with documented-RED allowlist.
 *
 * Boss ruling option (b) (2026-09-10 20:28 AEST) + T1 commit pre-ruling
 * (2026-09-10 20:35 AEST, approved with guardrails). Wired into
 * .husky/pre-commit in place of the plain `npx lint-staged` for D0.2 only.
 *
 * Behavior (what `npx lint-staged` ran, kept — "full suite + lint, coverage
 * unchanged"):
 *   1. Runs the FULL vitest suite: `npx vitest run --config config/vite.config.ts`
 *      — allowlisted files are still RUN; their failures are merely tolerated.
 *   2. Runs the lint stage: `npm run lint` — reported, but NOT a commit-gate
 *      during D0.2 (pre-existing defect: ESLint 8.57.1 cannot load the
 *      flat-format config/eslint.config.js via --config; flagged to
 *      orchestrator; see tests/baseline/INVENTORY.md).
 *   3. Exit criterion (per boss spec): the commit is blocked ONLY if a
 *      failing test file is not in .husky/red-allowlist.txt.
 *
 * Fail-safe: if the suite output cannot be parsed reliably, the commit is
 * blocked — never allow on uncertainty.
 *
 * Removal (end of D0.2 / Week 1): see REMOVAL PROCEDURE in
 * .husky/red-allowlist.txt — when the allowlist is empty, restore
 * .husky/pre-commit to `npx lint-staged` and delete this script.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ALLOWLIST_REL = path.join('.husky', 'red-allowlist.txt')
const MAX_BUFFER = 64 * 1024 * 1024

function block(msg) {
  console.error('')
  console.error(`[red-gate] COMMIT BLOCKED: ${msg}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 1. Load the D0.2 RED allowlist (exact file paths; no wildcards allowed)
// ---------------------------------------------------------------------------
const allowlistPath = path.join(ROOT, ALLOWLIST_REL)
if (!existsSync(allowlistPath)) {
  block(
    `allowlist not found at ${ALLOWLIST_REL} — refusing to gate without an explicit allowlist.`
  )
}
const allowlist = new Set()
for (const raw of readFileSync(allowlistPath, 'utf8').split(/\r?\n/)) {
  const line = raw.split('#')[0].trim() // strip whole-line and inline comments
  if (!line) continue
  if (!/^tests\/[\w.-]+\/[\w.-]+\.test\.ts$/.test(line)) {
    block(
      `malformed allowlist entry: ${JSON.stringify(line)} — expected a repo-relative ` +
        `tests/<dir>/<file>.test.ts path (one per line, no wildcards, no globs).`
    )
  }
  allowlist.add(line)
}
console.log(
  `[red-gate] D0.2 RED allowlist: ${allowlist.size} entr${allowlist.size === 1 ? 'y' : 'ies'} (${[...allowlist].join(', ') || 'empty'})`
)

// ---------------------------------------------------------------------------
// 2. Run the FULL vitest suite (allowlisted tests are still run)
// ---------------------------------------------------------------------------
console.log('[red-gate] running FULL vitest suite (npx vitest run --config config/vite.config.ts) ...')
let suiteOutput
try {
  suiteOutput = execSync('npx vitest run --config config/vite.config.ts 2>&1', {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch (e) {
  // Non-zero exit is expected while allowlisted RED files exist.
  suiteOutput = String(e.stdout ?? e.stderr ?? e.message ?? '')
}

// ---------------------------------------------------------------------------
// 3. Parse which test files failed
// ---------------------------------------------------------------------------
const failing = new Set()
for (const line of suiteOutput.split(/\r?\n/)) {
  // Per failing test:  " FAIL  tests/unit/foo.test.ts > suite > test"
  // Suite-level fail:  " FAIL  tests/unit/foo.test.ts [ tests/unit/foo.test.ts ]"
  const m = line.match(/^\s*FAIL\s+((?:tests|clusterrush)\/[\w./-]+\.test\.ts)/)
  if (m) failing.add(m[1])
  // Unhandled errors attributed to a file:
  // 'This error originated in "tests/unit/foo.test.ts" test file.'
  const u = line.match(/^This error originated in "([^"]+)" test file/)
  if (u) failing.add(u[1])
}

// Cross-check against the vitest summary line; fail-safe if unparseable.
let expectedFailed = null
const s = suiteOutput.match(/Test Files\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed/)
if (s) {
  expectedFailed = Number(s[1])
} else if (/Test Files\s+\d+\s+passed/.test(suiteOutput)) {
  expectedFailed = 0
}
if (expectedFailed === null) {
  block('could not parse the vitest "Test Files" summary line — commit blocked (fail-safe).')
}
if (failing.size < expectedFailed) {
  // Second pass: per-file reporter lines, e.g.
  //   " ❯ tests/unit/game.test.ts  (0 test)"
  //   " ❯ tests/unit/foo.test.ts  (12 tests | 4 failed) 19ms"
  //   " ✓ tests/unit/bar.test.ts  (10 tests) 12ms"
  for (const line of suiteOutput.split(/\r?\n/)) {
    const pm = line.match(
      /^\s*(✓|❯)\s+(tests\/[\w./-]+\.test\.ts)\s*\((\d+)\s*tests?(?:\s*\|\s*\d+\s*failed)?\)/
    )
    if (pm && pm[1] !== '✓') failing.add(pm[2])
  }
}
if (failing.size < expectedFailed) {
  block(
    `parsed only ${failing.size} failing file(s) but the vitest summary reports ${expectedFailed} failed — ` +
      'cannot verify the complete failing-file list; commit blocked (fail-safe).'
  )
}

// ---------------------------------------------------------------------------
// 4. Lint stage — run + report, NOT a commit-gate during D0.2
// ---------------------------------------------------------------------------
console.log('[red-gate] running lint stage (npm run lint) ...')
let lintOutput
let lintOk = true
try {
  lintOutput = execSync('npm run lint 2>&1', {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch (e) {
  lintOutput = String(e.stdout ?? e.stderr ?? e.message ?? '')
  lintOk = false
}
if (lintOk) {
  console.log('[red-gate] lint stage passed.')
} else {
  console.error(
    '[red-gate] WARNING: lint stage FAILED — pre-existing defect (ESLint 8.57.1 cannot load the flat-format config/eslint.config.js via --config).'
  )
  console.error(
    '[red-gate] Lint is NOT a commit-gate during D0.2 (boss spec exit criterion = failing test files only); flagged to orchestrator.'
  )
  console.error(lintOutput.split('\n').slice(-6).join('\n'))
}

// ---------------------------------------------------------------------------
// 5. Decision: block only if a failing file is NOT on the D0.2 allowlist
// ---------------------------------------------------------------------------
const tolerated = [...failing].filter((f) => allowlist.has(f)).sort()
const blocking = [...failing].filter((f) => !allowlist.has(f)).sort()

console.log('')
console.log(
  `[red-gate] suite result: ${failing.size} failing file(s) | allowlisted (tolerated): ${tolerated.length} | not allowlisted (blocking): ${blocking.length}`
)
if (tolerated.length) {
  console.log(`[red-gate] tolerated via D0.2 RED allowlist: ${tolerated.join(', ')}`)
}
if (blocking.length === 0) {
  console.log('[red-gate] PASS — all failing test files are on the D0.2 allowlist (or the suite is green). Commit allowed.')
  process.exit(0)
}
console.error('[red-gate] Failing test files NOT on the D0.2 RED allowlist:')
for (const f of blocking) console.error(`  - ${f}`)
console.error(
  '[red-gate] Fix these failures, or obtain an explicit per-commit boss ruling to extend .husky/red-allowlist.txt (TEMP entries are T1-only per the 2026-09-10 20:35 AEST pre-ruling — no new TEMP entries after T1).'
)
process.exit(1)
