# Progress — t_4298322b (BUG-W2-1a)

## Completed
- [x] Code reading: MenuScene, Scene, Game.switchScene, SceneManager,
      BootScene pattern, index.ts registration, test conventions
      (scenes.test.ts: mock three w/ importOriginal + stub WebGLRenderer,
      mock Logger, lightweight Game mock).
- [x] Baseline: 550/550 unit tests green, tsc clean.
- [x] RED: tests/unit/menu-scene.test.ts written (7 tests).
      6 failed + 1 passed (the "other keys no-op" regression guard
      passes trivially with no listener — kept as a guard, not RED
      surface).
- [x] RED evidence: tests/evidence/w2/W2-W21a-RED.txt
- [x] GREEN: src/scenes/MenuScene.ts — START button (#menu-start-button)
      in setupMenuUI; window keydown (Enter/Space) attached in onEnter,
      removed in onExit; startGame() single dispatch w/ started flag +
      listener removal + button disable + .catch re-arm; onCleanup
      detaches + clears DOM.
- [x] Target file: 7/7 green.
- [x] Full suite: 557/557 green (23 files).
- [x] tsc --noEmit: clean.
- [x] eslint (npm run lint): 0 errors; 7 pre-existing warnings in
      src/utils/Logger.ts (out of scope).
- [x] GREEN evidence: tests/evidence/w2/W2-W21a-GREEN.txt
- [x] Tracker touch: TDD_PLAN.md BUG-W2-1 status -> 'decomposed + 1a
      in flight' note added after W2-A.3 note (~line 301).

## Pending
- [ ] Commit (pre-commit hook runs full suite + tracker-drift check;
      evidence files staged => all 4 trackers must be in same commit:
      tracker/task_registry.json, tracker/tdd_tracker_config.json,
      tasks/plan.md, tasks/todo.md).
- [ ] kanban_complete with summary + metadata (+ artifacts: evidence files).

## Decisions (final)
- Listener on window (not document) — matches "keydown listener" phrasing
  and is focus-independent.
- started flag = in-flight + settled guard: set on dispatch, cleared only
  on rejection. onExit always detaches listener; onEnter re-arms when
  !started.
- Rejection path re-arms listener + button (menu stays reachable if
  'game' scene missing / load fails; SceneManager falls back to menu).
- menuContainer became optional (?) type; onCleanup sets undefined.
