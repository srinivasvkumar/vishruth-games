# T5 Hook Block Evidence — Pre-commit hook falsely reports scenes.test.ts as failing

**Date:** 2026-09-11 21:25 AEST  
**Task:** t_e14de10c (T0.2.2b verification)

## Problem

The pre-commit hook (`scripts/red-gate-check.mjs`) blocks the T4 evidence commit, claiming `tests/unit/scenes.test.ts` is a failing file NOT on the allowlist. This is FALSE — scenes.test.ts passes 25/25 in all runs.

## Evidence

### 1. Hook standalone — PASSES
```
$ node scripts/red-gate-check.mjs
[red-gate] suite result: 1 failing file(s) | allowlisted (tolerated): 1 | not allowlisted (blocking): 0
[red-gate] PASS — all failing test files are on the D0.2 RED allowlist
```

### 2. Git-triggered hook — FAILS
```
$ git commit -m "..."
[red-gate] suite result: 2 failing file(s) | allowlisted (tolerated): 1 | not allowlisted (blocking): 1
[red-gate] Failing test files NOT on the D0.2 RED allowlist:
  - tests/unit/scenes.test.ts
```

### 3. Direct test run — only hello-three fails
```
$ ./node_modules/.bin/vitest run tests/unit/scenes.test.ts
✓ tests/unit/scenes.test.ts  (25 tests) 46ms
Test Files  1 passed (1)
Tests  25 passed (25)
```

### 4. Full suite standalone — only hello-three fails
```
$ node tmp-scopes.cjs
❯ tests/unit/hello-three.test.ts  (11 tests | 1 failed | 4 skipped) 9ms
✓ tests/unit/scenes.test.ts  (25 tests) 326ms
Test Files  1 failed | 15 passed (16)
Tests  1 failed | 348 passed | 4 skipped (353)
```

### 5. Hook debug output (stdout=pipe, stderr=pipe — same as git)
Saved to `/tmp/hook-debug-output.txt` — shows only hello-three matching FAIL/❯ regexes. No line matches for scenes.test.ts.

## Root Cause Hypothesis

When git triggers the hook, environment variables differ (GIT_DIR, GIT_WORK_TREE, etc.). The `execSync` call captures stdout from both the vitest process AND any security scanner middleware that intercepts `npx` calls. The scanner's injected output (error/warning about "BLOCKED: Security scan...") may contain lines matching the hook's FAIL regex or the unhandled error regex, causing false-positive detection of scenes.test.ts as failing.

Specifically, the hook's parser:
1. Scans for lines matching `^\s*FAIL\s+tests/[\w./-]+\.test\.ts`
2. Scans for lines matching `^This error originated in "([^"]+)" test file`
3. Falls back to `^\s*(✓|❯)\s+tests/[\w./-]+\.test\.ts\s*\(`

A security scanner injected line could match one of these patterns. The hook works standalone because `npx` output goes directly to the terminal (not piped through scanner middleware).

## Resolution

This is NOT a test failure — it is a pre-commit hook parsing bug triggered by security scanner output injection through git's pre-commit context. The fix should be in the hook's parser (add more specific regex anchors, strip non-test output lines), OR the security scanner should not inject stdout into piped command output.

## Status

**BLOCKED.** Cannot commit T4 evidence. Escalating to orchestrator for hook fix before T4 completion can proceed.

---

## UPDATE (2026-09-12) — Root cause CORRECTION

**The "false positive" conclusion above is WRONG. The hook was working
correctly; `scenes.test.ts` WAS intermittently failing.** No hook parser fix
was needed or made.

### Verified root cause

The test `GameScene > update() damages the player on collision with an
obstacle` (tests/unit/scenes.test.ts) is a **flake**:

1. It picks the first scene group at `y === 0.5` (always obstacle 0, spawned
   at `z = -10`) and moves it to `(0.4, 1, 0)`.
2. Obstacle **type is random at spawn** (`getRandomObstacleType()`, 1 in 5
   each of block/spike/moving/rotating/breakable).
3. For the `'moving'` type, `Obstacle.update()` overwrites
   `mesh.position.x = originalPosition.x + sin(...) * 3` — and
   `GameScene.onUpdate()` calls `obstacle.update(deltaTime)` **before**
   `checkCollisions()`.
4. So when the picked obstacle happened to be `'moving'` (~20% of runs), it
   was teleported back to its spawn position (z = -10, 10+ units from the
   player) before the collision check → no damage → test failed with
   `expected 100 to be less than 100`.

### Verification trail

- Worktree at `248151d` (pre-5b916a6): scenes.test.ts **25/25 pass**.
- Post-5b916a6 runs: failed twice (full-suite run ~01:57, single-file run
  ~01:58), then passed 3× in a row (~02:10) — consistent with a ~20% flake
  rate, not a deterministic regression.
- The 21:25 AEST commit block in §2 above was the hook catching this flake in
  a full-suite run; the 21:25 standalone re-run in §3 passed on a different
  random seed, which is what produced the incorrect "false positive"
  diagnosis. The "security scanner injection" hypothesis (§ Root Cause
  Hypothesis) was never substantiated.

### Fix (committed with the 2026-09-12 infra fix)

In `tests/unit/scenes.test.ts`, the collision test now pins
`Math.random` to `0.1` for the duration of scene spawn, making obstacle 0
deterministically a static `'block'` type (`types[floor(0.1 * 5)] =
types[0]`); the mock `switchScene` now returns a `Promise` matching the real
`Game.switchScene` contract. The test is no longer dependent on spawn
randomness. Full-suite runs since the fix: stable 25/25.
