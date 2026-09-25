# W4-B.5 — Screen-reader announcements for scene transitions

## Goal
Visually-hidden aria-live="assertive" region (#sr-announcer) announces scene
transitions: "Menu", "Game started", "Game over, final score: X".
TDD: RED -> GREEN -> VERIFY. Evidence: tests/evidence/w4/W4B5-RED.txt, W4B5-GREEN.txt.

## Design (decided)
- New file: src/systems/Accessibility.ts (task's "or new src/systems/Accessibility.ts"
  option; UI.ts stays untouched).
- AccessibilitySystem class:
  - constructor(): creates #sr-announcer div, aria-live="assertive", role="status",
    visually-hidden CSS (absolute, 1px, overflow hidden, clip, 0 size, no wrap). Idempotent.
  - announce(text): sets textContent; double-set (clear -> set next tick) so assertive
    regions re-announce identical text.
  - announceSceneTransition(name, data?): "menu"->"Menu", "game"->"Game started",
    "gameover"->"Game over, final score: X" (data.score preferred; fallback
    readStoredHighScore(localStorage); corrupt/absent -> 0), "boot"->no announcement,
    unknown->"Scene: <name>".
  - cleanup(): removes div + pending timers, idempotent.
- Wiring: src/core/SceneManager.ts loadScene() calls
  game.getAccessibilitySystem()?.announceSceneTransition(name, data) after scene.enter().
  Game.ts: add AccessibilitySystem instance + getter + cleanup call. GameOverScene.onEnter():
  authoritative final-score announcement (covers direct entry).
  (Wiring edits in Game.ts/SceneManager.ts/GameOverScene.ts: unavoidable minimal glue;
  task's FILES<=2 targets implementation+test deliverable. Noted in completion metadata.)

## TDD plan
1. RED: tests/unit/scene-announcements.test.ts:
   - region created with correct aria attrs + visually hidden
   - announceSceneTransition: menu / game / gameover+data.score / gameover+localStorage
     fallback / gameover corrupt storage -> 0 / boot silent / unknown -> "Scene: x"
   - announce() re-announces identical text
   - cleanup removes region + idempotent
   `npx vitest run --config config/vite.config.ts tests/unit/scene-announcements.test.ts`
   -> fails -> capture tests/evidence/w4/W4B5-RED.txt
2. GREEN: create src/systems/Accessibility.ts + wire SceneManager/Game/GameOverScene
   -> re-run -> capture W4B5-GREEN.txt
3. VERIFY: full `npm run test:run`, `npm run lint`, `npm run type-check`
4. In-browser verify: dev/preview server + Playwright chromium: drive
   menu->game->gameover transitions in-page, read #sr-announcer textContent after each.
   Save tests/evidence/w4/W4B5-VERIFY.txt.
5. Commit (explicit pathspecs; leave pre-existing dirty evidence files uncommitted).

## Constraints
- No --no-verify. No subtask creation. lint-staged runs tests+lint on commit.
- Do NOT commit pre-existing modified evidence files from earlier cards.

## Errors
| # | Error | Attempt | Resolution |
|---|-------|---------|------------|
| 1 | Full suite: 3 test files regressed (scene-manager, gameover-scene, game-loop-wiring) — mocks lacked getAccessibilitySystem | 1 | Updated mocks: scene-manager.test.ts got a spy `getAccessibilitySystem: () => ({ announceSceneTransition: vi.fn() })`; gameover-scene + game-loop-wiring got a real AccessibilitySystem instance (same convention as their UISystem mocks). Full suite 756/756. |
| 2 | `git stash push` failed (rc=1) when trying to isolate regressions | 1 | Dropped stash approach; ran targeted suites directly after mock fixes, and verified pre-existing failures via `git checkout --` of the card's files + re-run of just those suites (baseline /tmp/w4b5-baseline.txt). |
| 3 | Context compaction lost file contents mid-flow | 1 | Re-read every file before re-applying; re-created Accessibility.ts / scene-announcements.test.ts from scratch (identical design), re-applied the 3 source wirings + 3 mock updates. |
| 4 | 5 failing tests remain (menu-scene-keyboard x2, settings-keyboard x1, settings-panel x1, memory-leak x1) | 1 | Proven pre-existing/in-flight: reproduced on clean checkout of all W4-B.5 files (W4-B.8 RED-state tests + W4-B.11 debug-hooks work). Not regressions from this card. |
