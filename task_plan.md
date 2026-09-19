# W3-B.1b — Add w3b Playwright project + tests/e2e/w3b/ dir

Task ID: t_9819ee0b
Branch: wt/t_9819ee0b (to create)
Base: main @ 6e4c45a

## Objective
Add a `w3b` Playwright project to `playwright.config.ts` and create `tests/e2e/w3b/` dir
so B2-B6 can write W3-B E2E specs. TDD: RED → GREEN → VERIFY.

## Design decision
- Dedicated `w3b` project (not extending `chromium-boot`)
- `testDir: './tests/e2e/w3b'` on the project so w3b specs are always discoverable
- Use `devices['Desktop Chrome']` with same launch args as `chromium-boot` (headed, WebGL flags)
- Keeps W3-B specs independent of the BROWSER smoke-swap

## Phases
- [ ] Phase 1: RED — capture `npx playwright test --list` showing no w3b project
- [ ] Phase 2: GREEN — add w3b project to config + create tests/e2e/w3b/.gitkeep
- [ ] Phase 3: VERIFY — npx playwright test --list discovers w3b project; tsc clean
- [ ] Phase 4: Tracker — update TDD_PLAN.md W3-B section
- [ ] Phase 5: Commit

## Files
- playwright.config.ts (add w3b project)
- tests/e2e/w3b/.gitkeep (new)
- TDD_PLAN.md (tracker touch)
- tests/evidence/w3/W3B1B-RED.txt
- tests/evidence/w3/W3B1B-GREEN.txt

## Errors
| # | Error | Fix |
|---|-------|-----|
