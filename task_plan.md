# W3-B.1 — Playwright config harden for W3-B critical-path specs

Task ID: t_9927d746
Branch: wt/t_9927d746
Worktree: .worktrees/t_9927d746
Base: main @ 5370860

## Objective
Extend playwright.config.ts to support W3-B's 4 critical-path E2E tests + visual-regression baseline.

## Changes to playwright.config.ts
1. outputDir: ./tests/evidence/w2/playwright-artifacts → ./tests/evidence/w3/playwright-artifacts
2. HTML reporter outputFolder: tests/evidence/w2/playwright-report-html → tests/evidence/w3/playwright-report-html
3. Add to use: screenshot: { mode: 'on' } (for visual-regression baselines)
4. Update docstring to reference W3-B scope
5. testDir stays ./tests/e2e (W3-B specs will be added as new files w3b-cp1..cp4 + w3b-visual-baseline)

## TDD Evidence
- RED: W3B1-RED.txt — capture current config state (w2/ paths, no screenshot mode)
- GREEN: W3B1-GREEN.txt — verify new config (w3/ paths, screenshot mode 'on', playwright --list discovers specs)

## Phases
- [ ] Phase 1: RED — capture current config state as evidence
- [ ] Phase 2: GREEN — update playwright.config.ts
- [ ] Phase 3: VERIFY — npx playwright test --list confirms spec discovery; tsc clean

## Files
- playwright.config.ts (primary edit)
- TDD_PLAN.md (tracker touch — W3-B line)
- tests/evidence/w3/W3B1-RED.txt
- tests/evidence/w3/W3B1-GREEN.txt

## Errors
| # | Error | Fix |
|---|-------|-----|
