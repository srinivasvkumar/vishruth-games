# W3-A.9: DRY high-score read (3x readStoredHighScore -> 1 canonical)

## Task Summary
Consolidate 3 copies of high-score read logic into 1 canonical pure helper in
src/systems/Score.ts, with 2 deliberate bug fixes:
- Fix A (crash): add try/catch so ScoreManager no longer throws on storage-unavailable
- Fix B (cap): clamp via clampScore so menu/gameover display caps at MAX_SAFE_SCORE

## Parent Commits (both branched from main @ eb3cc82)
- A7 (t_c3a4bd20): 843a66e — fixes MenuScene.onExit() start-guard re-arm
- A8 (t_e0b86767): 41c7cfd — fixes GameOverScene to read LEVEL_START payload

## Merge Plan
1. Merge A8 (41c7cfd) into wt/t_9d8237a9
2. Merge A7 (843a66e) into wt/t_9d8237a9
3. Verify merge is clean (check for conflicts)
4. TDD RED: add test for canonical readStoredHighScore() semantics
5. Implement canonical helper in Score.ts
6. Wire all 3 sites to use it; delete private scene methods
7. TDD GREEN: all tests pass
8. Full suite + tsc + eslint
9. Update TDD_PLAN.md tracker
10. Write evidence files
11. Commit + push

## Key Files (A7+A8 merged state)
- src/systems/Score.ts — add canonical readStoredHighScore() helper
- src/scenes/MenuScene.ts — delete private readStoredHighScore(), call helper
- src/scenes/GameOverScene.ts — delete private readStoredHighScore(), call helper
- tests/unit/score.test.ts — add RED test for canonical semantics
- tests/evidence/w3/W3A9-RED.txt, W3A9-GREEN.txt
- TDD_PLAN.md — update tracker

## Errors
| # | Error | Resolution |
|---|-------|-----------|

## Phases
- [ ] Phase 1: Merge A7+A8 into working branch
- [ ] Phase 2: TDD RED — write failing test
- [ ] Phase 3: TDD GREEN — implement canonical helper + wire all sites
- [ ] Phase 4: Verify — full suite, tsc, eslint, build
- [ ] Phase 5: Documentation — TDD_PLAN.md + evidence files
- [ ] Phase 6: Commit + push
