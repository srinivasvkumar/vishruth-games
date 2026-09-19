# Findings — t_9819ee0b (W3-B.1b)

## Current state (verified against main @ 6e4c45a)
- `playwright.config.ts` has 2 projects: `chromium-boot` and `firefox`
- `testDir` is `./tests/e2e` (or `./tests/e2e/smoke` when BROWSER is set)
- `tests/e2e/w3b/` does NOT exist
- No `w3b` project in the config

## Design decision
- Add a dedicated `w3b` project (not extend `chromium-boot`)
- `testDir: './tests/e2e/w3b'` on the project so w3b specs are always discoverable
- Use `devices['Desktop Chrome']` with same launch args as `chromium-boot` (headed, WebGL flags)
- This keeps W3-B specs independent of the BROWSER smoke-swap
