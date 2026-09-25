# Cluster Rush — Testing Guide

How to run, structure, interpret, and extend the test suite for Cluster Rush
(a Three.js + TypeScript 3D endless runner, Vite, TDD methodology).

Verified live on 2026-09-25 (AEST) against the working tree:

- **Unit**: `38 files, 756 tests, all passing` (`npm run test:run`, 5.8 s)
- **Coverage**: `95.19% statements / 90.76% branch / 95.2% functions / 95.19% lines` over `src/**`
- **E2E**: `npx playwright test --project=chromium-boot tests/e2e/w3b/w3b-cp1-start.spec.ts` → `3 passed (10.7s)`

---

## 1. How to run tests

### Prerequisites

| Requirement | Note
|---|---|
| Node.js **>= 20.11** | `package.json` `engines`; Playwright specifically refuses Node 18. The system `/usr/bin/node` on this box is 18.19.1 — use `~/.nvm/versions/node/v22.22.2/bin` (or `nvm use 22`) before running Playwright. Vitest 1.6 also runs fine on 22. |
| `npm install` | `preinstall` enforces `npm` only; `prepare` installs husky (git hooks). |
| A display (`DISPLAY` set) | All Playwright projects run **headed** (`headless: false`) with real WebGL. On this host: `DISPLAY=:1`. Headless Chrome on this host has **no WebGL2 context** — that is a known environment limitation, not a game bug; the headed + SwiftShader flag posture below is the workaround. |

### Unit tests (Vitest)

```bash
# Run once (CI / pre-commit mode) — the suite the pre-commit hook runs:
npm run test:run

# Watch mode (development):
npm run test:watch

# Coverage (v8 provider; thresholds currently all 0 — see §3):
npm run test:coverage

# Interactive UI (vitest --ui):
npm run test:ui
```

All invocations pass `--config config/vite.config.ts` (the test config lives
in the Vite config's `test` block, not in a standalone vitest.config).

- Environment: **happy-dom** (no real browser, no WebGL — that's why
  `three` and `cannon-es` are mocked, see §4.4).
- Include: `tests/**/*.test.ts` (unit only — `*.spec.ts` is e2e-only).
- `mockReset: true` — mocks are reset between every test.
- `testTimeout: 10000` (10 s per test).
- Setup files run before each test file: `tests/setup/mock-three.ts`,
  `tests/setup/mock-cannon.ts` (plus `mock-audio.ts` used per-spec where
  needed).

Scoped runs:

```bash
npx vitest run --config config/vite.config.ts tests/unit/score.test.ts      # one file
npx vitest run --config config/vite.config.ts -t "multiplier"                # by test name
npx vitest run --config config/vite.config.ts tests/unit --watch            # whole dir, watch
```

### E2E tests (Playwright)

```bash
# Full e2e suite (default testDir = tests/e2e, both headed browser legs):
npx playwright test

# One project (leg):
npx playwright test --project=chromium-boot
npx playwright test --project=firefox
npx playwright test --project=w3b

# One spec file:
npx playwright test tests/e2e/w3b/w3b-cp1-start.spec.ts

# One test by title fragment:
npx playwright test -g "boot completes"

# Headed debugging of a single test (projects are already headed; keep the UI
# mode for step-through + trace viewing):
npx playwright test --ui

# Show the HTML report for the last run:
npx playwright show-report tests/evidence/w3/playwright-report-html
```

Key config facts (`playwright.config.ts`):

- `workers: 1`, `fullyParallel: false`, `retries: 0`, per-test `timeout: 60_000` —
  the suite is deliberately serial and flake-deterministic; a single failing
  test fails the run, no retry papering.
- `screenshot: 'on'` — every test end captures a screenshot (visual-regression
  baselines live next to each spec as `*.spec.ts-snapshots/`).
- `webServer` hook auto-starts `npm run dev -- --no-open` on
  `http://localhost:5173/public/index.html` (reuses an existing server locally;
  `reuseExistingServer: !process.env.CI` forces a fresh one in CI).
- `testDir` swap: **setting the `BROWSER` env var** (e.g. `BROWSER=firefox`)
  changes `testDir` to `./tests/e2e/smoke` — the W2-E.1b smoke-swap. Use it
  only for the smoke suite; for anything else, do NOT set it or your spec
  will be invisible to discovery.

Projects:

| Project | Browser | Posture | testDir |
|---|---|---|---|
| `chromium-boot` | Desktop Chrome | headed, `--enable-unsafe-webgl --use-gl=angle --use-angle=swiftshader` | `tests/e2e` |
| `firefox` | Desktop Firefox | headed, no extra flags (Firefox WebGL works out of the box here) | `tests/e2e` |
| `w3b` | Desktop Chrome | same WebGL flags as chromium-boot, `timeout: 60_000` | `tests/e2e/w3b` (dedicated, always discoverable) |

Per-browser evidence naming: specs suffix artifacts with
`testInfo.project.name` (`chromium-boot` / `firefox`) so the two legs never
collide.

### Quality gates that run around tests

- **Pre-commit hook** (`.husky/pre-commit`): runs `npm run test:run` (full
  unit suite — not just staged files) on every commit, plus a **tracker
  drift check**: if you stage anything under `tests/evidence/`, the commit
  MUST also stage all four trackers — `tracker/task_registry.json`,
  `tracker/tdd_tracker_config.json`, `tasks/plan.md`, `tasks/todo.md`.
  Otherwise the hook exits 1. No `--no-verify` — that bypasses the gate
  and is prohibited by project rules.
- **Type-check** before committing: `npm run type-check` (tsc --noEmit).
- **Lint**: `npm run lint` (eslint flat config over `src config scripts`).

---

## 2. Test structure overview

```
tests/
├── unit/                      # Vitest, happy-dom, three/cannon mocked
│   ├── score.test.ts                # systems/Score — pure fns + persistence
│   ├── player.test.ts               # entities/Player (48 tests, largest file)
│   ├── game.test.ts                 # core/Game bootstrap + wiring
│   ├── game-loop.test.ts,
│   ├── game-loop-wiring.test.ts
│   ├── scene-manager.test.ts,
│   ├── scenes.test.ts,
│   ├── menu-scene.test.ts,
│   ├── menu-scene-full.test.ts,
│   ├── menu-scene-keyboard.test.ts,
│   ├── game-scene-ui.test.ts,
│   ├── gameover-scene.test.ts
│   ├── audio-system.test.ts         # systems/Audio (31 tests)
│   ├── settings-panel.test.ts,
│   ├── settings-state.test.ts,
│   ├── settings-keyboard.test.ts
│   ├── ui-system.test.ts            # systems/UI (incl. HUD aria-live)
│   ├── aria-labels.test.ts,
│   ├── blur-focus.test.ts,
│   ├── scene-announcements.test.ts  # systems/Accessibility
│   ├── physics-system.test.ts,
│   ├── body-sync.test.ts            # systems/Physics + BodySync
│   ├── input-system.test.ts         # systems/Input
│   ├── state.test.ts,
│   ├── renderer.test.ts,
│   ├── logger.test.ts,
│   ├── constants.test.ts,
│   ├── asset-loader.test.ts,
│   ├── resize-handling.test.ts,
│   ├── memory-leak.test.ts
│   ├── mock-strategy.test.ts            # 54 tests pinning the mock surface
│   ├── retroactive-core.test.ts,
│   ├── cicd-pipeline.test.ts,
│   ├── debug-accessors.test.ts,
│   ├── hello-three.test.ts,
│   ├── index.test.ts,
│   ├── systems-stub.test.ts,
│   └── obstacle.test.ts
├── e2e/                         # Playwright, real headed browsers + WebGL
│   ├── smoke/
│   │   ├── smoke.spec.ts              # W2-E.1a/b: 5 scenarios × per-browser
│   │   └── w3c2-verify.spec.ts
│   ├── boot.smoke.spec.ts             # WebGL context live on #game-canvas
│   ├── w2-w21b-start-path.spec.ts
│   ├── w3a-full-loop.spec.ts          # S1..S6 boot→play→die→menu loop
│   ├── w3b/                           # dedicated `w3b` project testDir
│   │   ├── w3b-cp1-start.spec.ts      # CP1: boot + START (Enter/click)
│   │   ├── w3b-cp2-movement.spec.ts   # CP2: WASD movement
│   │   ├── w3b-cp3-score.spec.ts      # CP3: score handoff
│   │   ├── w3b-cp4-restart.spec.ts   # CP4: death → restart re-arm
│   │   ├── w3b-visual-baseline.spec.ts + *.ts-snapshots/
│   │   └── .gitkeep
│   ├── w3c-fps-100.spec.ts            # performance leg
│   ├── w3c-input-latency.spec.ts
│   ├── w4a-full-loop-extended.spec.ts # settings/high-score/2nd-run cycle
│   ├── w4a-visual-regression.spec.ts + *.ts-snapshots/
│   ├── settings-panel.spec.ts
│   ├── audio.spec.ts
│   ├── physics-sync.spec.ts
│   ├── fps.spec.ts
│   └── verify-signoff.spec.ts
├── setup/                       # Vitest global setup (auto-loaded)
│   ├── mock-three.ts              # stub three.js surface (documented, additive)
│   ├── mock-cannon.ts             # stub cannon-es
│   └── mock-audio.ts              # per-spec audio mocks (imported, not global)
├── baseline/                    # recorded baseline data (perf etc.)
│   └── INVENTORY.md
└── evidence/                    # task evidence, one dir per week
    ├── d02/                       # day-0.2 signoff + gate outputs
    ├── w2/                        # W2 screenshots + txt evidence
    ├── w3/                        # W3 evidence + playwright-report-html/
    │   │                          #      + playwright-artifacts/
    └── w4/                        # W4 evidence: W4A1-*.txt, W4B{n}-RED/GREEN.txt,
                                   #      W4B{n}-VERIFY.txt, w4a*-*.png
```

Evidence conventions:

- Each task writes `W4B1-RED.txt` / `W4B1-GREEN.txt`-style files into
  `tests/evidence/<week>/` — the TDD red/green cycle, with env, commands,
  and observed output. In-browser verification adds a `-VERIFY.txt` with
  observed DOM/canvas facts and screenshot paths.
- Screenshots: Playwright artifacts in `tests/evidence/w3/playwright-artifacts/`;
  per-scene stills written by specs into `tests/evidence/w4/` (project-suffixed).
- Commits that stage `tests/evidence/**` MUST also update the four trackers
  (pre-commit hook enforces this — see §1).

---

## 3. Coverage report interpretation

Run with `npm run test:coverage`. The `v8` provider reports against
`include: ['src/**/*.ts']` only (tests, node_modules, dist, `*.d.ts` excluded).

Reports written to `./coverage/`:

| Format | File | Use |
|---|---|---|
| `text` | stdout table | quick per-file % + uncovered line numbers |
| `json` | `coverage/coverage-final.json` | machine processing, dashboards |
| `html` | `coverage/index.html` | click-through per-file view (open locally) |
| `lcov` | `coverage/lcov.info` | coverage-aware editors/CI integrations |

Reading the table (current live numbers, 2026-09-25):

```
All files          |   95.19 |    90.76 |   95.2 |   95.19 |
 src/core          |   95.22 |    92.98 |   95.31|   95.22 |
  Game.ts          |   97.83 |    95.45 |    96 |   97.83 | 81,125,168-170,311-312
  SceneManager.ts  |   86.36 |    85.71 | 92.85 |   86.36 | 37-39,51-54,92-101,107-111,165-169
 src/scenes        |   97.32 |    84.5 |   95.45|   97.32 |
  GameScene.ts     |   96.17 |    80.76 | 97.14 |   96.17 | 198-200,220,282-284,...
 src/systems       |   97.57 |    93.41 |  94.39 |   97.57 |
```

- **Columns**: `% Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s`.
  Uncovered line numbers are the fastest path to the next test to write.
- **0% rows are structural, not gaps**: `src/core/index.ts` and
  `src/types/GameTypes.ts` report 0% — they are pure re-export / type
  declaration files with no executable statements. Don't chase them.
- **Thresholds are currently all 0** (`thresholds.global` in
  `config/vite.config.ts`), so coverage can never fail a run. When raising
  them, start from the live numbers above (e.g. `lines: 95`) rather than
  guessing.

---

## 4. Common test patterns

### 4.1 TDD cycle (red → green → refactor → evidence)

The project runs strict TDD (see `TDD_PLAN.md`). Per task:

1. **RED** — write the failing test first; capture the failure output into
   `tests/evidence/<week>/W4Bx-RED.txt` (command + env + observed failure).
2. **GREEN** — implement the minimum code; capture the passing output into
   `W4Bx-GREEN.txt`.
3. **REFAC** — restructure without changing test outcomes; re-run the suite.
4. **VERIFY** (when the task has an observable UI/behavior change) — verify in
   a real browser (headed Chromium, `DISPLAY=:1`) and write
   `W4Bx-VERIFY.txt` + screenshots into the week's evidence dir.

The pre-commit hook runs the FULL unit suite on every commit — a commit that
breaks any test will not land.

### 4.2 Unit-test anatomy (example: `tests/unit/score.test.ts`)

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScoreManager,
  computeScore,
  clampScore
} from '@/systems/Score';

class InMemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
}

describe('ScoreManager', () => {
  let storage: InMemoryStorage;
  beforeEach(() => {
    storage = new InMemoryStorage();          // deterministic, per-test
  });

  it('clamps score to 0 on underflow', () => {
    const s = new ScoreManager(storage);
    s.subtractScore(5);                        // 0 - 5 -> 0, not -5
    expect(s.getScore()).toBe(0);
  });

  it('persists the high score under the storage key', () => {
    const s = new ScoreManager(storage);
    s.addScore(500);
    s.saveHighScore();
    expect(storage.getItem('cluster-rush-high-score')).toBe('500');
  });
});
```

Patterns to copy:

- **Pure functions first**: core math is exported as stateless functions
  (`computeScore`, `clampScore`) so they are trivially deterministic; the
  stateful manager wraps them.
- **Dependency injection**: constructors accept a `Storage`-like (or similar)
  for testability, defaulting to the real thing.
- **happy-dom** provides `document`/`window` for UI-touching unit tests
  (e.g. `ui-system.test.ts` asserts on real DOM nodes).
- **Aliases**: import via `@/`, `@core/`, `@entities/`, `@systems/`,
  `@scenes/`, `@utils/` (Vite aliases, see `config/vite.config.ts`).

### 4.3 E2E-test anatomy (example: `tests/e2e/w4a-full-loop-extended.spec.ts`)

```ts
import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(__dirname, '..', 'evidence', 'w4');
const APP_URL = 'http://localhost:5173/public/index.html';

function captureConsole(page: Page) { /* page.on('console'/'pageerror'/'requestfailed') */ }
async function bootToMenu(page: Page) { /* navigate + wait for #menu-start-button */ }
async function enterGameScene(page: Page) { /* keyboard Enter on the start button */ }

test('W4A.2 S1: settings volume 50 is actually used by the audio system', async ({ page }) => {
  await bootToMenu(page);
  // open settings, move slider to 50, close, start game...
  const volume = await page.evaluate(() =>
    (window as any).game.getAudioSystem().getMasterVolume());
  expect(volume).toBeCloseTo(0.5, 5);           // 50/100, clamped
});
```

Recurring helpers worth reusing (they already exist in the smoke/w3b/w4a specs):

- `captureConsole(page)` — collects `console` + `pageerror` + `requestfailed`
  entries; assert `filterFatalErrors(entries)` is empty on critical paths.
- `bootToMenu(page)` / `enterGameScene(page)` — the two universal entry moves.
- **Drive the game through its public surface**, not internals:
  - `window.game` — the live game instance (scene/state/audio accessors).
  - `window.__debugPlayerPos` — debug accessor (W3-B.0).
  - `window` `CustomEvent`s: `'player:death'`, `'player:score' {detail:{points}}`
    — the exact paths `GameScene.setupEventListeners()` subscribes to; use
    them to script deterministic runs (score a 500, force a death) without
    flaky physics timing.
  - DOM: `#menu-start-button`, `#game-score`, `#game-health`,
    `#menu-high-score-value`, the settings panel.
- **Fresh page per scenario** (`workers: 1` + sequential): each test gets a
  clean app state; do not leak state between tests in one file.
- **Evidence inside the test**: write screenshots/console dumps to
  `tests/evidence/<week>/` with project-suffixed names
  (`w4a2-s1-settings-chromium-boot.png`).

### 4.4 Mock strategies

| What | How | Where |
|---|---|---|
| **three.js** | `tests/setup/mock-three.ts` — global stub of the used surface (`Vector3`, `Scene`, `WebGLRenderer` with `setClearColor`/`dispose`, etc.). Loaded for every unit test via `setupFiles`. Purely additive; `mock-strategy.test.ts` (54 tests) pins the surface so product code can't silently drift from it. | auto (Vitest) |
| **cannon-es** | `tests/setup/mock-cannon.ts` — same approach. | auto (Vitest) |
| **Audio** | `tests/setup/mock-audio.ts` — imported explicitly where a spec needs to control/observe the Web Audio surface. | per-spec |
| **Storage** | `InMemoryStorage implements Storage` — injected into `ScoreManager` etc. | per-test |
| **Browser (e2e)** | No mocks — real headed Chrome/Firefox + SwiftShader WebGL flags. Mocks would defeat the purpose of the WebGL/scene asserts. | n/a |

When extending the three/cannon mocks: keep them additive, document the new
symbols in the mock file header (the pattern in `mock-three.ts`), and add a
pinning test in `tests/unit/mock-strategy.test.ts`.

### 4.5 Playwright helpers & tips

- **Project choice = which specs run**: `--project=w3b` only discovers
  `tests/e2e/w3b/`; the default projects discover `tests/e2e/` (both browser
  legs × every spec).
- **Never set `BROWSER`** except for the smoke-swap; it silently redirects
  `testDir` to `tests/e2e/smoke`.
- **WebGL asserts**: the `chromium-boot` args
  (`--enable-unsafe-webgl --use-gl=angle --use-angle=swiftshader`) are what
  make the "WebGL context live on #game-canvas" asserts pass. Don't "fix"
  them away on a flake — the flake is usually a display/launch issue (see §5).
- **Headed on a headless host**: needs `DISPLAY` (here `:1`). If a test fails
  at browser launch with a display error, that's the cause, not the game.
- **Snapshots**: visual baselines live as
  `*.spec.ts-snapshots/*.png` next to the spec; regenerate deliberately with
  `npx playwright test --update-snapshots` and diff before committing.
- **Failure forensics**: artifacts (screenshot per test end, `trace: 'off'`)
  land in `tests/evidence/w3/playwright-artifacts/`; HTML report in
  `tests/evidence/w3/playwright-report-html/` (`npx playwright show-report`
  to browse).

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Playwright requires Node.js 20 or higher` | system node is 18.19.1 | `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"` (or `nvm use 22`) before Playwright commands. Vitest works on either. |
| E2E fails at browser launch, display/X11 error | headed projects need a display | `export DISPLAY=:1` (this host's X session). |
| `WebGL context is null` in a smoke assert | headless Chrome has no WebGL2 on this host, or missing launch flags | run the headed `chromium-boot` project with its stock launch args (§4.5). This is an environment limitation, not a game regression. |
| Pre-commit hook fails: `TRACKER DRIFT` | you staged `tests/evidence/**` without the four trackers | add `tracker/task_registry.json`, `tracker/tdd_tracker_config.json`, `tasks/plan.md`, `tasks/todo.md` to the same commit (boss rule 2026-09-13), or split the evidence commit if it's interim. Do NOT use `--no-verify`. |
| Pre-commit hook fails on unit tests | a test broke | `npm run test:run` to see which; fix before committing. The hook always runs the full suite — a green local partial run doesn't guarantee the hook passes. |
| Coverage numbers differ between machines | v8 coverage is engine-version-sensitive | treat numbers as directional; pin CI to one Node version for stable reporting. |
| Vitest picks up a spec file or misses a unit file | include/exclude patterns: `tests/**/*.test.ts` only | unit tests MUST be `*.test.ts`; e2e specs are `*.spec.ts` (Vitest never collects them). |
| A spec "vanished" from Playwright | `BROWSER` env var set → testDir swapped to `tests/e2e/smoke` | unset `BROWSER` (W2-E.1b smoke-swap semantics). |
| Port 5173 already in use | stale dev server | Playwright's webServer reuses it locally; kill it (`fuser -k 5173/tcp`) if it's serving stale code, or run with `CI=1` to force a fresh server. |
| Stale `dist/` confuses manual verification | committed `public/index.html` points at a dev-only script path | verify against `npm run dev` (live source), not the old build — the W4B5 evidence hit exactly this. |
| Flaky death/restart timing under SwiftShader | software rendering is slow | the `w3b` project already raises the per-test timeout to 60 s; keep e2e state transitions event-driven (`player:death` etc.) rather than time-sleep-driven. |
| `npx lint-staged` config discovery error | legacy tracked `geometry-dash/node_modules/bs-logger` carries a lint-staged v0 `linters` field that lint-staged 17 rejects | known tracked defect; the pre-commit hook has been replaced with a full deterministic test run instead — don't try to restore the lint-staged gate until the untrack lands (see `.husky/pre-commit` header). |

---

## 6. Worked examples

### 6.1 Adding a unit test for a new system

Say `src/systems/Spawn.ts` gains `computeSpawnInterval(speed): number`
(returning the seconds between obstacles, clamped to `[0.5, 5]`).

1. `tests/unit/spawn.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeSpawnInterval } from '@/systems/Spawn';

describe('computeSpawnInterval', () => {
  it('shrinks interval as speed rises', () => {
    expect(computeSpawnInterval(2)).toBeGreaterThan(computeSpawnInterval(8));
  });
  it('clamps to a minimum of 0.5s', () => {
    expect(computeSpawnInterval(1000)).toBe(0.5);
  });
  it('clamps to a maximum of 5s', () => {
    expect(computeSpawnInterval(0)).toBe(5);
  });
});
```

2. RED: `npx vitest run --config config/vite.config.ts tests/unit/spawn.test.ts`
   → fails (module/function missing). Save output → `W4Cx-RED.txt`.
3. Implement `computeSpawnInterval` in `src/systems/Spawn.ts`.
4. GREEN: same command → 3 passed. Save → `W4Cx-GREEN.txt`.
5. `npm run test:run` (full suite still green) + `npm run type-check` → commit
   with evidence + trackers.

### 6.2 Adding an E2E scenario to an existing spec

Append to `tests/e2e/w4a-full-loop-extended.spec.ts` (fresh page per test,
project-suffixed evidence):

```ts
test('W4A.2 S4: reload mid-game returns to a clean menu', async ({ page, testInfo }) => {
  const console = captureConsole(page);
  await bootToMenu(page);
  await enterGameScene(page);
  await page.reload();                                  // hard reload in game
  await page.waitForSelector('#menu-start-button');       // boots back to menu
  expect(await page.locator('#menu-start-button').isDisabled()).toBe(false);
  expect(filterFatalErrors(console)).toEqual([]);
  const evidence = join(EVIDENCE_DIR,
    `w4a2-s4-reload-${testInfo.project.name}.png`);
  await page.screenshot({ path: evidence, fullPage: true });
});
```

Run just that test on one leg first:

```bash
npx playwright test --project=chromium-boot -g "reload mid-game"
```

then both legs: `npx playwright test tests/e2e/w4a-full-loop-extended.spec.ts`.

### 6.3 Interpreting a failing e2e run

```
✗ [chromium-boot] › tests/e2e/w3b/w3b-cp3-score.spec.ts › CP3 S4: score handoff
    Expectation failed ...
```

1. Open the HTML report: `npx playwright show-report
   tests/evidence/w3/playwright-report-html` — the failing step has its
   screenshot attached.
2. Read the spec's evidence dump (specs write console captures to
   `tests/evidence/<week>/`; `requestfailed`/`pageerror` entries appear in
   them).
3. Check the environment first (display, node version, port 5173) before
   suspecting the game — §5's table is ordered by frequency.
4. If the failure is real: write the RED evidence, fix, GREEN evidence, and
   keep the spec as a regression guard.

### 6.4 Weekly evidence ritual (what reviewers expect)

```
tests/evidence/w4/
  W4B1-RED.txt        # command, env, failing output, timestamp
  W4B1-GREEN.txt      # passing output, test count, duration
  W4B1-VERIFY.txt     # in-browser verification: env, observed DOM/canvas
  w4b1-<scene>-chromium-boot.png   # project-suffixed screenshots
```

Every task that touches observable behavior produces at minimum RED + GREEN;
tasks with a UI surface add VERIFY + screenshots. Evidence commits update the
four trackers in the same commit (§1, §5).
