# Cluster Rush - Test-Driven Development Plan (REVISED v2)

**Status**: RETROACTIVE TDD APPROACH - Existing code will be tested first, then refactored. No deletion of working code.
**Current Coverage**: ~0% (only 1 test file with 6 passing tests)
**Target Coverage**: 90%+ overall, 100% for critical paths
**Timeline**: 4 Weeks (adjusted from 3 weeks for realistic scope)

---

## TDD Philosophy (STRICT ENFORCEMENT)

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST**
Every implementation follows strict RED→GREEN→REFACTOR cycle.

### Mandatory TDD Steps (Never Skip)
1. **RED**: Write failing test describing expected behavior
2. **VERIFY RED**: Run test to confirm failure (not error)
3. **GREEN**: Write minimal code to pass test
4. **VERIFY GREEN**: Run test to confirm pass
5. **REFACTOR**: Clean code without changing behavior
6. **VERIFY REFACTOR**: All tests still pass

### TDD Violations (Task Requires Review)
- Code written before test → Write test first, then refactor
- Test passes immediately → Fix test to fail first
- "I'll test later" attitude → Stop, follow TDD
- Modifying existing code without test → Write test first

### Retroactive TDD Strategy (For Existing Code)
1. **Test Existing Behavior First**: Write tests that pass against current code
2. **Identify Gaps**: Find untested code paths
3. **Add Failing Tests**: Write tests for missing functionality
4. **Refactor Incrementally**: Improve code while maintaining test pass
5. **Never Delete Working Code**: Only add tests, then improve

---

## COMPLETE FEATURE SPECIFICATION

### Core Gameplay Mechanics
- **Player Movement**: WASD/Arrow keys, smooth acceleration/deceleration
- **Jump Mechanics**: SPACE key, grounded state detection, double-jump capability
- **Gravity System**: Constant downward acceleration, terminal velocity
- **Collision Detection**: Player-obstacle, player-powerup, player-environment
- **Score System**: Distance-based scoring, multipliers, high score persistence
- **Game States**: Menu → Playing → Paused → Game Over → Restart

### Game Modes
1. **Endless Mode**: Infinite procedurally generated course (MVP - Priority 1)
2. **Time Attack**: Complete as much as possible in 60 seconds (Phase 2)
3. **Challenge Mode**: Specific obstacle patterns with objectives (Phase 2)

### Obstacle Types (5 types)
1. **Static Blocks**: Fixed position, simple collision
2. **Spikes**: Instant death on contact
3. **Moving Obstacles**: Horizontal/vertical movement patterns
4. **Rotating Obstacles**: Angular movement, timing-based avoidance
5. **Breakable Obstacles**: Can be destroyed with power-ups

### Power-Up Types (4 types)
1. **Shield**: Temporary invincibility (5 seconds)
2. **Speed Boost**: Increased movement speed (3 seconds)
3. **Magnet**: Attracts nearby score items (5 seconds)
4. **Score Multiplier**: 2x score for 10 seconds

### UI Components
- Main Menu (Start, Settings, High Scores)
- HUD (Score, Health, Power-up indicators)
- Pause Menu (Resume, Restart, Quit)
- Game Over Screen (Final score, High score comparison, Restart option)
- Settings (Audio levels, Controls, Graphics options)

### Audio System
- Background music (looping tracks per scene)
- Sound effects (jump, collision, power-up collection, UI interactions)
- Audio mixing and volume controls

---

## TASK DECOMPOSITION PRINCIPLES (NEW)

To prevent context overload and compression:

1. **Task Scope Rule**: No task should require more than one context window of tool output. If a task needs multiple full-suite test runs or touches >3 deliverables, decompose it.

2. **Decomposition Checklist**: Automatically decompose if task involves:
   - Multiple full-codebase test runs
   - Reading or updating >3 independent files/directories
   - 3+ distinct verification steps (unit, integration, performance)

3. **Checkpoint Discipline**: After each work item, write evidence to disk. Post-compaction re-orientation must be a file read, not a memory recall.

4. **Sub-agent Use**: For heavy, parallelizable work (bulk reads, independent test groups), spawn sub-agents to isolate I/O load.

5. **Task Size First**: Decomposition at planning time is primary; sub-agents are second-line.

## WEEK 0: INFRASTRUCTURE & BASELINE (NEW)

### Day 0.1: Testing Infrastructure Setup

**Task 0.1.1: Vitest Configuration**
- RED: Test that `npm run test` fails (no config)
- GREEN: Configure Vitest with TypeScript, browser environment, coverage
- VERIFY: `npm test` → "✓ 0 passed" (empty but running)
- Acceptance Criteria:
  - [ ] Vitest configured in `vite.config.ts`
  - [ ] Test command runs without errors
  - [ ] Coverage reporting enabled (c8 or vitest coverage)
  - [ ] Browser environment configured (happy-dom or jsdom)

**Task 0.1.2: Mocking Strategy**
- RED: Test that Three.js/Cannon-es mocks work
- GREEN: Create `tests/mocks/` directory with:
  - `mockThree.js` - Stub Three.js classes
  - `mockCannon.js` - Stub Physics classes
  - `mockAudio.js` - Stub AudioContext
- VERIFY: Unit tests run without actual WebGL context
- Acceptance Criteria:
  - [ ] Three.js classes can be mocked
  - [ ] Cannon-es physics can be stubbed
  - [ ] Audio system can be mocked
  - [ ] Mocks return predictable values

**Task 0.1.3: CI/CD Pipeline**
- RED: Test that GitHub Actions workflow fails (no workflow)
- GREEN: Create `.github/workflows/test.yml` with:
  - Run tests on push to main
  - Enforce coverage threshold (80% minimum)
  - Block merge if tests fail
- VERIFY: Push triggers CI, tests run, status check updates
- Acceptance Criteria:
  - [ ] GitHub Actions workflow exists
  - [ ] Tests run automatically on push
  - [ ] Coverage threshold enforced
  - [ ] Build status visible in PR

**Task 0.1.4: Pre-commit Hooks**
- RED: Test that commit without tests is blocked
- GREEN: Setup Husky + lint-staged to:
  - Run tests before commit
  - Block commit if tests fail
  - Show coverage report
- VERIFY: `git commit` runs tests, blocks on failure
- Acceptance Criteria:
  - [ ] Husky installed
  - [ ] Pre-commit hook runs tests
  - [ ] Commit blocked if tests fail

### Day 0.2: Existing Code Baseline

**Task 0.2.1: Code Inventory**
- RED: Test that all existing source files are documented
- GREEN: Create `tests/baseline/INVENTORY.md` listing:
  - All source files in `src/`
  - All existing tests in `tests/`
  - Coverage gaps identified
- VERIFY: Inventory matches actual file structure
- Acceptance Criteria:
  - [ ] All source files cataloged
  - [ ] Existing tests identified
  - [ ] Coverage gaps documented

**Task 0.2.2: Retroactive Tests for Existing Code**
- RED: Test that existing Game class has no tests
- GREEN: Write tests for existing `Game.ts`, `Player.ts`, `Input.ts`
- VERIFY: Tests pass against existing implementation
- Acceptance Criteria:
  - [ ] All existing public methods have tests
  - [ ] Tests verify current behavior (not desired behavior)
  - [ ] Baseline coverage established (~20% target)

---

## WEEK 1: CORE INFRASTRUCTURE (TDD VERIFIED)

### Day 1: Project Setup with Tests First

**Task 1.1: Initialize project with testing infrastructure**
- RED: Test that `npm run test` runs empty test suite
- GREEN: Configure Vitest with TypeScript support and browser environment
- VERIFY: `npm test` → "✓ 0 passed" (empty but running)
- Acceptance Criteria:
  - [ ] Vitest configured in `vite.config.ts`
  - [ ] Test command runs without errors
  - [ ] Empty test suite passes

**Task 1.2: TypeScript strict mode verification**
- RED: Test that TypeScript compilation fails with current strict settings
- GREEN: Configure `tsconfig.json` with strict options
- VERIFY: `npm run build` compiles without type errors
- Acceptance Criteria:
  - [ ] `strict: true` in tsconfig
  - [ ] No TypeScript errors on build
  - [ ] Type checking enforced in CI

**Task 1.3: WebGL renderer test (with mock)**
- RED: Test that WebGL renderer creation fails (no implementation)
- GREEN: Create minimal Three.js renderer in `core/Renderer.ts` with mock support
- VERIFY: Test passes, renderer created successfully (mocked in unit tests)
- Acceptance Criteria:
  - [ ] Renderer creates WebGL context
  - [ ] Renderer has correct dimensions
  - [ ] Renderer clears screen properly
  - [ ] Mock renderer works in unit tests

### Day 2: Core Game Loop (Test-Driven)

**Task 2.1: Game state management**
- RED: Test that Game class exists and has correct initial state
- GREEN: Implement Game class with start/stop/pause methods
- VERIFY: Game starts in STOPPED state, transitions correctly
- Acceptance Criteria:
  - [ ] Game class has all required states
  - [ ] State transitions are valid (no illegal transitions)
  - [ ] Game emits state change events
  - [ ] **Error Handling**: Invalid transitions throw descriptive errors

**Task 2.2: Frame loop timing**
- RED: Test that game loop calls update with deltaTime
- GREEN: Implement requestAnimationFrame loop in `GameLoop.ts`
- VERIFY: Update called ~60 times per second with accurate deltaTime
- Acceptance Criteria:
  - [ ] Delta time accuracy within 5%
  - [ ] Frame rate target of 60 FPS
  - [ ] Loop stops when game stops
  - [ ] **Edge Case**: Handles frame drops gracefully (step > 100ms)

**Task 2.3: Scene management system**
- RED: Test scene creation and object addition fails
- GREEN: Scene class with Three.js integration in `SceneManager.ts`
- VERIFY: Objects appear in scene when added
- Acceptance Criteria:
  - [ ] Scenes can be registered/unregistered
  - [ ] Scene transitions work correctly
  - [ ] Active scene receives update calls
  - [ ] **Error Handling**: Missing scene throws descriptive error

### Day 3: Input System Testing

**Task 3.1: Keyboard input detection**
- RED: Test keydown events trigger input state changes
- GREEN: DOM event listener with key mapping in `Input.ts`
- VERIFY: WASD keys detected in automated browser test
- Acceptance Criteria:
  - [ ] All keyboard keys mapped correctly
  - [ ] Key state persists while pressed
  - [ ] Key release detected properly
  - [ ] **Edge Case**: Key repeat handled correctly

**Task 3.2: Input buffering for frame independence**
- RED: Test input state persists across frames
- GREEN: Input buffer with frame processing
- VERIFY: Input works at high and low frame rates
- Acceptance Criteria:
  - [ ] Input not affected by frame rate variations
  - [ ] Input queue processes correctly
  - [ ] No input lag detected
  - [ ] **Edge Case**: Input lost on window blur handled

### Day 4: Asset Loading System (MOVED FROM WEEK 3)

**Task 4.1: Asset loader creation**
- RED: Test asset loading fails (no implementation)
- GREEN: `AssetLoader.ts` with async loading, caching, error handling
- VERIFY: Assets load successfully, cache works
- Acceptance Criteria:
  - [ ] GLTF models load correctly
  - [ ] Textures load with fallback
  - [ ] Audio files load with format detection
  - [ ] **Error Handling**: 404 returns fallback asset, not crash

**Task 4.2: Loading progress tracking**
- RED: Test progress events fire during load
- GREEN: Implement progress events with percentage tracking
- VERIFY: Progress bar updates during asset load
- Acceptance Criteria:
  - [ ] Progress events fire at correct intervals
  - [ ] 100% fires when all assets loaded
  - [ ] Error events fire on failure

> **Status (2026-09-13): NOT DONE in W1.** Task 4.1/4.2 were marked "MOVED FROM WEEK 3" but never executed. `AssetLoader.ts` remains a stub. Carried into W2 as Task 4.3 (D1) alongside DOM integration.

**Task 4.3: DOM / boot wiring + AssetLoader fix (W2-A, added 2026-09-13 — GATES ALL OF WEEK 2)**
- Context: `public/index.html` renders "Loading Three.js renderer..." forever because nothing calls the boot path — `initGame()` in `src/index.ts` is never connected to `#game-canvas`. Additionally `src/utils/AssetLoader.ts` is broken (mangled/unterminated braces from a failed merge) and must be fixed so the boot path and all W3 asset work have a working loader.
- RED: Browser test asserting `#game-canvas` gets a WebGL context and `window.game` is set after page load (fails today: canvas count 1 but renderer never starts); unit test asserting `AssetLoader` loads an asset without error
- GREEN: 
  1. Wire `initGame()` in `src/index.ts` to: (a) acquire `#game-canvas`, (b) create `Renderer` on it, (c) boot `BootScene` → `GameScene`, (d) start the game loop
  2. **Rewrite `src/utils/AssetLoader.ts`** to a clean, tested loader (currently broken syntax). Provide a minimal fallback-geometry path so the game boots before real assets exist (W2-C uses synthesized/placeholder audio; no external audio files required yet).
- VERIFY: Real Chrome (headed, not headless): canvas renders the scene, loading indicator clears, player mesh visible
- Acceptance Criteria:
  - [x] ~~Game loads and runs in real Chrome~~ — W2-A.1 foundation done (canvas attachment); full wiring pending
  - [ ] No `THREE`/CORS/console errors on load
  - [ ] Player mesh visible at spawn position
  - [ ] Loading indicator replaced by running game
  - [ ] `AssetLoader.ts` compiles clean (`tsc` + `eslint` green) with unit tests

> **W2-A.1 progress (2026-09-13):** `RendererOptions.canvas` + `resizeToContainer()` implemented and tested (3/3 green, full suite 390/390). This is the foundation sub-step for Task 4.3; the remaining DOM wiring (`initGame()` → `#game-canvas`) and AssetLoader fix are separate sub-tasks.

> **W2-A.2 progress (2026-09-13):** `Game` now owns a shared `Renderer` (created on `#game-canvas` when no renderer is injected), `start()` fires `AssetLoader.load('/assets/manifest/boot.json', 'json')` (DECISION D1 boot hook) and boots the first registered scene via `SceneManager.loadScene()`, `gameLoop()` calls `sceneManager.render()` at the end of every frame, `cleanup()` disposes the renderer. Evidence: `tests/evidence/w2/W2-A2-GREEN.txt`. Full suite 394/394, tsc clean, eslint clean on `src/`.

> **W2-A.3 progress (2026-09-13, DECISION D2):** Minimal `MenuScene` added (placeholder DOM only — full menu UI stays in W3 Task 8.2). `initGame()` now registers `BootScene`, `MenuScene`, and `GameScene` with the `SceneManager` (`'boot'` first so `Game.start()` boots it). Boot path lands cleanly in the active `MenuScene` with no `'Scene not found'` throw. Evidence: `tests/evidence/w2/W2-A3-GREEN.txt`. Full suite 397/397, tsc clean, eslint clean on `src/`.

> **BUG-W2-1 status (2026-09-16): decomposed + 1a in flight → 1a COMPLETE + VERIFIED IN REAL BROWSER @ 6f85f55.** BUG-W2-1 (MenuScene start path) decomposed into sub-cards (1a: player start path; remaining sub-cards follow). **BUG-W2-1a (kanban t_4298322b, 2026-09-16):** minimal player start path added to `MenuScene` — Enter/Space keydown + START button click both dispatch `game.switchScene('game')`, with a double-start guard (listener removed + button disabled on dispatch; re-armed if the transition rejects) and listener cleanup in `onExit`/`onCleanup` so the menu can be re-entered. TDD: 7 new tests in `tests/unit/menu-scene.test.ts` (RED: 6/7 failing → GREEN: 7/7). Evidence: `tests/evidence/w2/W2-W21a-RED.txt` + `W2-W21a-GREEN.txt`. Full suite 557/557, `tsc --noEmit` clean, eslint clean on `src/` (7 pre-existing `Logger.ts` warnings only). Full menu UI (settings/high scores/styled buttons) remains W3 Task 8.2. **BUG-W2-1b (kanban t_675ab2f6, 2026-09-16): in-browser verification of the 1a start path in REAL HEADED CHROME — VERIFIED @ 6f85f55.** `tests/e2e/w2-w21b-start-path.spec.ts` (4 scenarios) driven only through the player start path (Enter key + START button click; never the debug `loadScene` API): (1) boot lands on MenuScene with `#menu-start-button` visible/enabled; (2a) Enter → GameScene (HUD up, menu down, player in scene graph); (2b) reload + START-button click → GameScene; (3) in GameScene 3D player + obstacles render and WASD moves the player (+x/-x/-z, reusing W2-E.1a checks). RED negative control (pre-fix `MenuScene`, commit 8f1520a): 4/4 fail as designed. GREEN: 4/4 pass in headed Chromium (Playwright 1.63.0, display :1), 0 fatal console errors (only the expected non-fatal AudioContext autoplay warning). Evidence: `tests/evidence/w2/W2-W21b-RED.txt` + `W2-W21b-GREEN.txt` + `w2-w21b-{menu,enter-game,wasd-move}.png` + `w2-w21b-console-chrome.txt`. Verdict: PASS — no BUG-W2-1a regression.

---

## WEEK 2: GAMEPLAY SYSTEMS

### W2 GATE NOTES (added 2026-09-13 after W1 retroactive gap analysis)

**Critical lessons from W1 execution:**
1. **DOM wiring was assumed working but wasn't** — browser testing revealed the game never starts (`initGame()` not wired to `#game-canvas`). **No W2 sprint starts until W2-A passes.**
2. **"AssetLoader moved from W3" was never implemented** — `AssetLoader.ts` is still a stub. See decision D1 below.
3. **Coverage ≠ playability** — 93% coverage achieved, yet the game does not run in a real browser. Browser verification is a first-class deliverable, not a W4 afterthought.
4. **Real browser checks must happen every week, not only in W4.**
5. **Physics↔visual sync (Task 6.2) is unverified in a real browser** despite green unit tests.

**W2 execution order (sprints; A gates B–E):**
- **W2-A: DOM Integration** (Task 4.3 below) — game must load & run in real Chrome before anything else.
- **W2-B: Physics↔Visual Sync** (Task 6.2) — verify in browser, not just mocks.
- **W2-C: Audio Core** (Tasks 6.5.1–6.5.2)
- **W2-D: Gameplay Systems** (Tasks 7.1–7.3)
- **W2-E: Verification** — smoke test, cross-browser (Chrome/Firefox), FPS baseline with 20 obstacles.

**Fool-proof rules:**
- D1: **AssetLoader decision** — implement (Task 4.3 scope) OR formally descope for MVP with a tracked decision. No silent stubs.
- D2: **UI split decision (before W3)** — in-game HUD stays canvas-rendered (GameScene); menus/overlays are DOM-based per Week 3. Document the split in this plan.
- D3: **One pattern first** — implement Shield power-up fully (Task 7.3 Phase 1); only expand to the other 3 types after Shield works in-browser.
- D4: **Performance early warning** — measure FPS at end of W2-E with 20 obstacles; if <30 FPS, re-scope W3 before starting it. The 60-FPS/100-objects benchmark is a W4 target, not a W2 gate.

### Day 5: Player Entity TDD

**Cycle 1: Player creation**
- RED: Test player mesh created with proper geometry
- GREEN: Box geometry with material in `Player.ts`
- VERIFY: Player appears at starting position
- Acceptance Criteria:
  - [ ] Player mesh has correct geometry
  - [ ] Player positioned at spawn point
  - [ ] Player has proper material

**Cycle 2: Movement**
- RED: Test player position changes with velocity
- GREEN: Apply velocity based on input
- VERIFY: WASD moves player in corresponding directions
- Acceptance Criteria:
  - [ ] Player moves in all 4 directions
  - [ ] Movement speed is consistent
  - [ ] Movement stops when input released
  - [ ] **Edge Case**: Movement clamped to world bounds

**Cycle 3: Jump mechanics**
- RED: Test player jumps with SPACE when grounded
- GREEN: Apply upward impulse, track ground state
- VERIFY: Player ascends then falls back
- Acceptance Criteria:
  - [ ] Jump only works when grounded
  - [ ] Jump height is consistent
  - [ ] Gravity pulls player down after jump
  - [ ] **Edge Case**: Double-jump limited to configured count

**Cycle 4: Gravity application**
- RED: Test player falls without ground support
- GREEN: Constant downward acceleration
- VERIFY: Physics simulation matches expected trajectory
- Acceptance Criteria:
  - [ ] Gravity constant throughout
  - [ ] Terminal velocity enforced
  - [ ] Ground detection accurate
  - [ ] **Edge Case**: Falling through floor prevented

### Day 6: Physics System Integration

**Task 6.1: Cannon-es test integration**
- RED: Test physics world creation fails
- GREEN: Initialize Cannon-es world in `Physics.ts`
- VERIFY: Physics steps without errors
- Acceptance Criteria:
  - [ ] Physics world created successfully
  - [ ] Physics step function works
  - [ ] Gravity configured correctly
  - [ ] **Mocking**: Physics can be stubbed for unit tests

**Task 6.2: Body synchronization** *(W2-B, Priority 2 — runs AFTER Task 4.3)*
- RED: Test that physics body updates visual mesh
- GREEN: Mesh-Body synchronization system
- VERIFY: Physics simulation moves visual objects
- Acceptance Criteria:
  - [ ] Visual mesh follows physics body
  - [ ] Synchronization happens every frame
  - [ ] No visual lag or jitter
  - [x] **Browser verification (added 2026-09-13):** in real Chrome, player mesh moves in response to physics step — unit tests alone do NOT satisfy this task *(W2-B.2, kanban t_14c82dd1, 2026-09-13: tests/e2e/physics-sync.spec.ts drives the live app's running frame loop via the window.game debug handle — real cannon-es world, BodySync-registered THREE mesh, 30 frame-over-frame samples with 0 drift + teleport proof; evidence tests/evidence/w2/w2-b2-physics-sync.* + W2-B2-RED/GREEN.txt)*

**Task 6.3: Collision detection tests**
- RED: Test collision events trigger game logic
- GREEN: Cannon-es collision event handlers
- VERIFY: Collisions trigger score changes or damage
- Acceptance Criteria:
  - [ ] Collision events fire correctly
  - [ ] Collision types identified (player-obstacle, etc.)
  - [ ] Game logic responds appropriately
  - [ ] **Edge Case**: Multiple collisions in one frame handled

### Day 6.5: Audio System (MOVED FROM MISSING)

**Task 6.5.1: Audio system creation** *(W2-C; synthesized/placeholder audio — no external files)*
- RED: Test audio system creation fails
- GREEN: Implement audio loading, playing, mixing in `Audio.ts` (replace 26-line no-op stub). **W2 uses synthesized/placeholder audio** (WebAudio oscillator/NoiseNode) since `public/assets/sounds/` has 0 files — this proves the audio pipeline end-to-end without assets. Real asset-based audio comes in W3 once AssetLoader is fixed.
- VERIFY: SFX trigger audible in real browser; volume controls respond
- Acceptance Criteria:
  - [ ] AudioContext initialized
  - [ ] Background music loops correctly (synthesized placeholder in W2)
  - [ ] Sound effects play on trigger
  - [ ] Volume controls work (master, music, SFX)
  - [ ] **Error Handling**: Audio load failure doesn't crash game

**Task 6.5.2: Audio synchronization** *(W2-C)*
- RED: 8/8 tests failed — `AudioSystem.bindToGameEvents` is not a function
- GREEN: `AudioSystem.bindToGameEvents()` subscribes to 6 window events; `Game.start()` calls it + `init().then(startMusic)`; `Player.update()` emits `player:jump`; `GameScene.handleCollision()` emits `player:collide`
- VERIFY: `tests/e2e/audio.spec.ts` — real-Chrome: AudioContext 'running', `AudioSystem.isAvailable()===true`, `pause()`/`resume()` no-throw
- Acceptance Criteria:
  - [x] Audio events triggered correctly (W2-C.2: `bindToGameEvents()` wires player:jump/collide/powerup → playSfx)
  - [x] No audio lag or desync (SFX fired synchronously from window events, 2026-09-13)
  - [x] Audio stops when game stops (game:stop + game:pause → stopMusic, 2026-09-13)
- **Progress (2026-09-13):** W2-C.2 COMPLETE. 422/422 unit tests, 2/2 e2e tests, tsc clean, eslint 0 errors, build clean. Evidence: `tests/evidence/w2/w2-c2-audio.log`. Note: `player:powerup` listener is wired but has no emitter yet — GameScene has no powerup pickup code; that lands with Task 7.3 Phase 1 (W2 shield) or W3.

### Day 7: Scoring & Game Systems

**Task 7.1: Score manager (pure functions)**
- RED: Test score increments/decrements
- GREEN: Score manager with add/subtract methods
- VERIFY: Score calculations are deterministic
- Acceptance Criteria:
  - [ ] Score increases correctly
  - [ ] Score multipliers work
  - [ ] High score persists (LocalStorage)
  - [ ] **Edge Case**: Score overflow handled

**Task 7.2: Game state machine**
- RED: Test state transitions (menu→playing→gameOver)
- GREEN: Finite state machine implementation
- VERIFY: Only valid transitions allowed
- Acceptance Criteria:
  - [ ] All state transitions defined
  - [ ] Invalid transitions blocked
  - [ ] State change events emitted

**Task 7.3: Power-up system** *(phased per D3, added 2026-09-13)*
- RED: Test power-up collection triggers effects
- GREEN: Power-up entity with collection handlers
- VERIFY: Power-ups disappear, effects apply
- **Phase 1 (W2): Shield only** — implement, collect, 5s invincibility, visual feedback; must work in-browser before Phase 2
- **Phase 2 (W3, only after Phase 1 verified): Speed Boost, Magnet, Score Multiplier**
- Acceptance Criteria:
  - [ ] Phase 1: Shield works end-to-end in real browser
  - [ ] All 4 power-up types work (W3)
  - [ ] Effects duration correct
  - [ ] Power-up visual feedback
  - [ ] **Edge Case**: Multiple power-ups collected simultaneously

---

## WEEK 3: UI, INTEGRATION & POLISH

### W3 GATE NOTES (added 2026-09-13 after W1 retro; W3/W4 plan-hardening)

**Pre-requisites (all must be true before W3 starts):**
- W2 all 7 success criteria passed (see "Week 2 Success Criteria").
- AssetLoader works (fixed in W2-A) — W3 asset work builds on it.

**Critical lessons carried into W3:**
1. **HUD ownership decision (D2 resolved):** HUD lives in `systems/UI.ts` as a clean system. `GameScene.ts` stops hand-rolling DOM score/health divs and instead calls `UISystem`. (Current state: `UI.ts` is a 32-line no-op stub; `GameScene.ts` creates `#game-score` / health divs inline.)
2. **MenuScene / GameOverScene are still unassigned** — they live in "MISSING SYSTEMS" but have no week. **Assign both to W3 (Day 8)** as part of Task 8.2. No menu exists in `public/index.html` today (no buttons, no menu DOM).
3. **Playwright is installed** (`@playwright/test ^1.40.0`, `test:e2e` script present) **but `tests/e2e/` is empty and there is no `playwright.config`**. Day 9 integration cannot run until W2-A boots the game in-browser. E2E scaffold is a Day 9 task, not an assumption.
4. **Performance gate is conditional (D4):** the "60 FPS / 100+ obstacles" target on Day 10 is only committed if W2-E's 20-obstacle baseline was ≥30 FPS. If W2-E measured <30 FPS, W3 Day 10 re-scopes to "recover to 60 FPS at the W2-E obstacle count" before pushing to 100+.
5. **AssetLoader was broken (mangled syntax) and `public/assets/{fonts,models,sounds,textures}` contain 0 audio files.** W2-A fixes the loader; W3 Day 8 adds real assets. W2-C uses **synthesized/placeholder audio** (no external files) so audio works end-to-end without assets.

**W3 execution order (sprints; gates Day 9):**
- **W3-A: UI system (Day 8, Tasks 8.1 + 8.2)** — build `UISystem` (HUD), `MenuScene.ts`, `GameOverScene.ts`; wire menu → game → game-over → restart in-browser.
- **W3-B: Integration (Day 9)** — scaffold Playwright (`playwright.config.ts`, `tests/e2e/`), 4 critical-path E2E tests, visual-regression baseline.
  - **W3-B.1** (t_9927d746, 2026-09-19): Playwright config extended for W3-B critical-path specs —
    outputDir + HTML reporter moved to `tests/evidence/w3/`, `screenshot: 'on'` enabled for
    visual-regression baselines. tsc clean; `playwright test --list` discovers all existing specs.
    Evidence: `tests/evidence/w3/W3B1-RED.txt` + `W3B1-GREEN.txt`.
- **W3-C: Optimization & Polish (Day 10)** — performance (per D4), cross-browser (Chrome/Firefox; Safari/mobile best-effort), input latency.

**W3 success criteria (all must pass before W4 starts):**
1. HUD rendered by `UISystem` (no inline DOM in `GameScene.ts`).
2. `MenuScene` + `GameOverScene` exist; full loop: Menu → Start → Play → GameOver → Restart works in-browser.
3. Playwright scaffolded; 4 critical-path E2E tests pass in real Chrome.
4. Visual-regression baseline captured.
5. Performance target met per D4 (60 FPS @ committed obstacle count).
6. Chrome + Firefox pass basic functionality.

### Day 8: HTML UI (DOM-based, No CORS!)

**Task 8.1: DOM-based UI components** *(W3-A; D2 — HUD moves here)*
- RED: Test UI elements render and update
- GREEN: Build `UISystem` in `systems/UI.ts` (replace 32-line no-op stub) to own the HUD (score, health, power-up indicators); `GameScene.ts` calls `UISystem` instead of creating `#game-score`/health divs inline
- VERIFY: Score/health displays update in real browser, driven by `UISystem`
- **Status: GameScene migrated to UISystem** (W3A.2, kanban t_501493cf, 2026-09-16).
  `GameScene.ts` no longer hand-rolls HUD divs. `onEnter`/`onUpdate` call
  `this.game.getUISystem().setScore/setHealth/setLevel` each frame.
  `onExit`/`onCleanup` no longer touch the HUD (UISystem owns it).
  4 new unit tests (tests/unit/game-scene-ui.test.ts); 577/577 suite; build clean; lint clean.
  Evidence: tests/evidence/w3/W3A2-RED.txt + W3A2-GREEN.txt.
  W3A.1 (t_16f7e67d) delivered the UISystem core; W3A.2 completed the migration.
  **Remaining:** in-browser visual verification (UI scales on resize) —
  deferred to W3-B Playwright E2E or a manual check.
- Acceptance Criteria:
  - [x] `UISystem` renders HUD (no inline DOM in `GameScene.ts`)
  - [x] Score/health update in real-time via `UISystem`
  - [ ] UI responsive to window resize
  - [ ] **Edge Case**: UI scales correctly on resize

**Task 8.2: Menu + GameOver scenes & navigation flow** *(W3-A; MenuScene/GameOverScene assigned here)*
- RED: Test START button transitions scene
- GREEN: Create `src/scenes/MenuScene.ts` + `src/scenes/GameOverScene.ts` (both currently in "MISSING SYSTEMS", unassigned); scene transition system with UI events; add menu DOM/buttons to `public/index.html` (none exist today)
- VERIFY: Click start → game starts; game-over → restart works
- Acceptance Criteria:
  - [x] `MenuScene.ts` implemented (W3A.3, t_d2e9e91c) — MenuScene full UI done: title + START (click + Enter/Space, BUG-W2-1a preserved) + SETTINGS placeholder (non-functional, "coming in W3-C" toast) + HIGH SCORES panel (reads stored high score from LocalStorage/HIGH_SCORE_KEY) + keyboard focus/Tab nav.
  - [x] `GameOverScene.ts` implemented (W3A.4, t_de156e6e) — GameOverScene done: 'GAME OVER' heading + final score (setFinalScore) + high score (HIGH_SCORE_KEY) + RESTART button (click + Enter/Space -> switchScene('menu'), double-restart guard) + listener cleanup on exit. Registered as 'gameover' in initGame(). 12 TDD tests RED->GREEN. Evidence: tests/evidence/w3/W3A4-RED.txt + W3A4-GREEN.txt.
  - [x] High-score read DRYed + 2 bug fixes (try/catch + cap) (W3-A.9) — canonical readStoredHighScore() in Score.ts; ScoreManager.loadHighScore + MenuScene + GameOverScene all delegate to it. Fix A: try/catch (no crash on storage-unavailable). Fix B: clampScore cap (menu/gameover now cap at MAX_SAFE_INTEGER). 9 new TDD tests. Evidence: tests/evidence/w3/W3A9-RED.txt + W3A9-GREEN.txt.
  - [ ] Main menu displays; Start button works; Settings accessible (MenuScene portion done — Settings accessible as a placeholder; full settings UI deferred to W3-C)
  - [ ] Full loop: Menu → Start → Play → GameOver → Restart in-browser (W3A.5, t_77ceb449) — GameScene.gameOver() now calls switchScene('gameover', {score, highScore}) instead of inline DOM overlay. GameScene.onEnter() resets all run state (player position, score, health, obstacles, level, isGameOver). 11 TDD tests RED->GREEN. Evidence: tests/evidence/w3/W3A5-RED.txt + W3A5-GREEN.txt.
  - [ ] **Accessibility (full WCAG AA, W4)**: keyboard navigation works (basic Tab order + focus now present in MenuScene)
  - [x] Start-guard re-arm after a full run (W3A.7, t_c3a4bd20, 2026-09-17) — BUG-W2-1a: `MenuScene.onExit()` now resets `this.started=false` so the start guard re-arms when the menu stops being active; the next `onEnter()` (returning from the game-over RESTART path) re-attaches the keydown listener + re-enables START. Root cause: `startGame()` set `started=true` on dispatch and only cleared it in `.catch()` — which never fires on the normal flow because `switchScene` RESOLVES, so both start paths stayed dead for every second run. TDD: 7 new unit tests in `tests/unit/menu-scene-full.test.ts` (RED 4 fail → GREEN 17/17). In-browser: `tests/e2e/w3a-full-loop.spec.ts` (chromium-boot) — all BUG-W2-1a target scenarios now PASS: W2-1b regression (START works after returning from a run), S4 (restart → menu → 2nd run), S6 (full loop incl. 2nd run). Remaining S2/S3 failures verified pre-existing on the pre-fix baseline (stale D2 HUD-ownership probe from W3A.1+A2 + HUD-div lifecycle on game-over) — out of W3-A.7 scope. Evidence: tests/evidence/w3/W3A7-RED.txt + W3A7-GREEN.txt. Full suite 617/617, tsc clean, eslint 0 errors.

### Day 9: Integration Testing

**Integration test suite:**
1. Game start to gameplay flow
2. Player movement with obstacle avoidance
3. Score collection and display
4. Game over and restart cycle

**Automated browser tests with Playwright:**
- Critical path automation
- Visual regression testing
- Performance validation

**Acceptance Criteria:**
- [ ] All 4 critical paths tested
- [ ] E2E tests pass consistently
- [ ] Visual regression detected

### Day 10: Optimization & Polish

**Performance testing:**
- Frame rate under load testing (100+ obstacles)
- Memory leak detection (5+ minute gameplay)
- Asset loading optimization

**Cross-browser testing:**
- Chrome (latest 3 versions)
- Firefox (latest 3 versions)
- Safari (latest 2 versions)
- Mobile web validation

**Acceptance Criteria:**
- [ ] 60 FPS maintained with 100+ objects
- [ ] No memory leaks after 5 minutes
- [ ] All browsers pass basic functionality
- [ ] Input latency < 100ms

---

## WEEK 4: REAL BROWSER TESTING & VALIDATION

### W4 GATE NOTES (added 2026-09-13; W3/W4 plan-hardening)

**Pre-requisites (all must be true before W4 starts):**
- W3 all 6 success criteria passed (game fully playable: menu → play → game-over → restart, HUD in `UISystem`, Playwright E2E passing, perf target met).

**Critical lessons carried into W4:**
1. **Accessibility = FULL WCAG AA (boss decision 2026-09-13).** This is a large, open-ended lift on a canvas-based 3D game: keyboard-only navigation of all UI, visible focus indicators, ARIA labels, screen-reader announcements, WCAG AA color contrast. Day 12 is the biggest single chunk of W4 — budget accordingly and do NOT let it compress against Day 14 buffer.
2. **Playwright is installed but `tests/e2e/` is empty and there is no `playwright.config`.** Day 11 Task 11.1 is therefore "configure + first real E2E run", not just "install". Visual-regression baselines (11.3) can only be captured once the game renders reliably in-browser (W3-B already produced a baseline; W4 refines it).
3. **Cross-browser reality check:** Chrome + Firefox are the committed targets (per W3). Safari + mobile are best-effort — WebGL/audio behavior on Safari is a known risk; document, don't block, unless a blocker is found.
4. **Coverage is already 93%** (W1). Day 13 Task 13.2 is "MAINTAIN ≥90% and push critical paths to 100%", not "reach 90%". Reframe acceptance criteria to match.
5. **Day 14 is a true buffer + final validation**, not new feature work. If W3 slipped, Day 14 absorbs it; do not add scope here.

**W4 execution order:**
- **W4-A: E2E (Day 11)** — Playwright config, critical-path E2E, visual regression.
- **W4-B: Accessibility & Edge Cases (Day 12)** — full WCAG AA + edge-case handling.
- **W4-C: Docs & Handoff (Day 13)** — `TESTING.md`, coverage report, maintain ≥90%.
- **W4-D: Final Validation & Buffer (Day 14)** — full regression, perf benchmark, cross-browser final pass.

**W4 success criteria (project "done" gates):**
1. Full game loop E2E passes in real Chrome + Firefox (menu → start → play → game-over → restart).
2. Visual-regression baseline stable; regressions detected.
3. WCAG AA met: keyboard nav, ARIA, screen-reader announcements, AA contrast on all UI.
4. Edge cases (resize, tab blur/focus, low memory) handled without crash.
5. `TESTING.md` complete; coverage ≥90% maintained, critical paths 100%.
6. 60 FPS benchmark documented; no memory leak over 5 min; cross-browser pass.

### Day 11: Real Browser E2E Testing

**Task 11.1: Playwright E2E setup**
- RED: Test that Playwright fails (not installed)
- GREEN: Install Playwright, configure test suite
- VERIFY: E2E tests run in real Chrome/Firefox
- Acceptance Criteria:
  - [ ] Playwright installed and configured
  - [ ] Tests run in real browsers (not headless for debugging)
  - [ ] Screenshots captured on failure

**Task 11.2: Critical path E2E tests**
- RED: Test that game starts from menu
- GREEN: E2E test: Menu → Start → Play → Game Over
- VERIFY: Full game flow works in real browser
- Acceptance Criteria:
  - [ ] Menu renders correctly
  - [ ] Start button clickable
  - [ ] Game loads and accepts input
  - [ ] Game over screen appears
  - [ ] Restart works

**Task 11.3: Visual regression testing**
- RED: Test that visual changes are detected
- GREEN: Baseline screenshots + comparison
- VERIFY: Unexpected visual changes flagged
- Acceptance Criteria:
  - [ ] Baseline screenshots captured
  - [ ] Changes detected on regression
  - [ ] False positives minimized

### Day 12: Accessibility & Edge Cases

**Task 12.1: Accessibility testing**
- RED: Test that keyboard-only navigation fails
- GREEN: Implement keyboard navigation for all UI
- VERIFY: Screen reader announces UI elements
- Acceptance Criteria:
  - [ ] All UI keyboard accessible
  - [ ] Focus indicators visible
  - [ ] ARIA labels present
  - [ ] Color contrast meets WCAG AA

**Task 12.2: Edge case testing**
- RED: Test game breaks on edge cases
- GREEN: Add tests for edge cases:
  - Window resize during gameplay
  - Tab switch (blur/focus)
  - Network disconnect (if applicable)
  - Low memory conditions
- VERIFY: Game handles gracefully
- Acceptance Criteria:
  - [ ] Resize handled without crash
  - [ ] Focus/blur handled correctly
  - [ ] Error messages user-friendly

### Day 13: Documentation & Handoff

**Task 13.1: Test documentation**
- RED: Test that test documentation is missing
- GREEN: Create `TESTING.md` with:
  - How to run tests
  - Test structure overview
  - Coverage report interpretation
  - Common test patterns
- VERIFY: New developer can run tests
- Acceptance Criteria:
  - [ ] Testing documentation complete
  - [ ] Examples provided
  - [ ] Troubleshooting section included

**Task 13.2: Code coverage report**
- RED: Test that coverage report shows <90%
- GREEN: Achieve 90%+ coverage across all systems
- VERIFY: Coverage report meets targets
- Acceptance Criteria:
  - [ ] Overall coverage ≥90%
  - [ ] Critical paths 100%
  - [ ] Coverage report generated

### Day 14: Final Validation & Buffer

**Task 14.1: Full regression test**
- Run entire test suite
- Fix any failures
- Verify 90%+ coverage

**Task 14.2: Performance benchmark**
- Run performance tests
- Verify 60 FPS target
- Document baseline metrics

**Task 14.3: Cross-browser final pass**
- Test on Chrome, Firefox, Safari
- Fix any browser-specific issues

---

## MISSING SYSTEMS TO IMPLEMENT (TDD)

### Critical Files (Create with TDD)
1. **`src/systems/Audio.ts`** - Audio management system
   - RED: Test audio system creation fails
   - GREEN: Implement audio loading, playing, mixing
   - VERIFY: All sounds play correctly

2. **`src/systems/UI.ts`** - UI management system
   - RED: Test UI system creation fails
   - GREEN: Implement DOM-based UI components
   - VERIFY: All UI elements functional

3. **`src/scenes/MenuScene.ts`** - Main menu scene
   - RED: Test menu scene fails
   - GREEN: Implement menu with navigation
   - VERIFY: Menu transitions work

4. **`src/scenes/GameOverScene.ts`** - Game over screen
   - RED: Test game over scene fails
   - GREEN: Implement game over display
   - VERIFY: Score display and restart work

---

## TEST COVERAGE TARGETS

### Phase Targets:
- **Week 0**: 20%+ coverage (baseline established)
- **Week 1**: 50%+ coverage (core systems)
- **Week 2**: 70%+ coverage (gameplay systems) + **game must actually run in a real browser** (see W2 success criteria below)
- **Week 3**: 85%+ coverage (integration)
- **Week 4**: 90%+ coverage (complete game)

### Week 2 Success Criteria (added 2026-09-13 — all must pass before W3 starts):
1. Game runs in Chrome (and Firefox at verification) — canvas renders, player moves
   - ✅ **Chrome leg satisfied** (W2-E.1a, 2026-09-13): `tests/e2e/smoke/smoke.spec.ts` — 6/6 scenarios green in real headed Chrome: boot→menu→game, WASD movement, jump, score increment, game-over+restart, console clean. Evidence: `tests/evidence/w2/W2-E1a-GREEN.txt` + 7 screenshots + console capture.
   - ✅ **Firefox leg satisfied** (W2-E.1b, 2026-09-13): same spec, 6/6 green in real headed Firefox (`firefox` project added to playwright.config.ts). No functional diff vs Chrome; Firefox-only observation: 2x non-fatal "AudioContext prevented from starting automatically" boot warnings (stricter Firefox autoplay gesture policy; documented in `tests/evidence/w2/W2-E1b-GREEN.txt`, out of scope — cross-browser audio policy is W3-C). Evidence: `tests/evidence/w2/W2-E1b-GREEN.txt` (Chrome-vs-Firefox result table + diff) + 7 Firefox screenshots + `w2-e1a-smoke-console-firefox.txt` + 7 fresh Chrome screenshots + `w2-e1a-smoke-console-chrome.txt`.
   - **Criterion #1 complete: both legs (Chrome + Firefox) green.**
2. Physics body positions sync with visual meshes — **verified in real browser**, not just mocks
3. Jump/collision audio triggers
4. Score persists via LocalStorage
5. Shield power-up collectible with visual effect (Phase 1 of Task 7.3)
6. Game states formalized (menu → playing → paused → gameOver → restart)
7. FPS baseline recorded with 20 obstacles (D4 gate)

### Identified Bugs (Post-W2 Verification, added 2026-09-14)

> Findings from manual in-browser verification of `main` @ `8f1520a` (after W2
> sign-off). W2's smoke test passed on **logic** (boot→menu→game, WASD, jump,
> score, game-over, restart all green in Chrome + Firefox), but manual QA
> against the live app surfaced issues the automated tests did not exercise.
> These are tracked here and decomposed into small kanban chunks.

**BUG-W2-1 — Menu has no start path: game cannot be entered by the player** *(Priority: High, blocks real playability)*
- **Symptom:** App boots to the placeholder `MenuScene` ("CLUSTER RUSH — Press START to begin") and stops there. No key press or click transitions into the `GameScene`; the 3D gameplay loop never becomes reachable in the live app.
- **Root cause:** `src/scenes/MenuScene.ts` is an intentional W2-A.3 placeholder (see its header, lines 7–10) — it renders a title + hint but registers **no input handler and no `switchScene('game')` call**. The full menu UI (buttons/settings/high scores) was explicitly deferred to W3 Task 8.2. The W2-E smoke spec drove the transition programmatically, so the *player-facing* start path was never exercised.
- **Verification evidence (2026-09-14, live browser @ `main`):** renderer attached to `#game-canvas` (721×600), WebGL context live, 3 scenes registered (boot/menu/game), `fsm.state=playing`, `currentScene=MenuScene`; `gameScene.player=null`, `threeChildren=0` until entered. Pressing Enter/Space produced no transition.
- **Scope decision:** Minimal "press Enter / click → start game" wiring is a small, high-value chunk that makes the game immediately playable and de-risks W3 (the 3D pipeline behind the menu already works). Full menu UI polish (settings, high scores, styled buttons) remains W3 Task 8.2.
- **Status:** OPEN → decomposed into kanban (see orchestrator task set, 2026-09-14).

**BUG-W2-2 — (Watch item, not a defect) Firefox autoplay audio warning** *(Priority: Low)*
- **Symptom:** Firefox logs 2× non-fatal "AudioContext prevented from starting automatically" at boot (stricter autoplay gesture policy). No functional audio loss in the W2 placeholder path.
- **Note:** Documented during W2-E.1b; already routed to W3-C (cross-browser audio policy). Listed here for completeness; no separate fix needed until W3-C.
- **Status:** OPEN → W3-C.

### Critical Paths (100% coverage required):
1. Game initialization and cleanup
2. Input system → player movement
3. Collision detection → game logic
4. State transitions (menu→play→gameOver)
5. Score calculation and persistence
6. Power-up collection and effects

---

## PERFORMANCE BENCHMARKS (Testable)

### Technical Metrics:
- **Frame Rate**: ≥60 FPS with 100+ dynamic objects
- **Frame Time**: <16ms for 60 FPS, <33ms for 30 FPS
- **Memory**: <200MB peak usage
- **Load Time**: <3s on 4G, <1s local
- **Input Latency**: <100ms
- **Object Budget**: Support 100+ dynamic objects at 60 FPS

### Performance Test Suite:
```typescript
// Example performance test
it('should maintain 60 FPS with 100 obstacles', async () => {
  const fps = await measureFPS(100Obstacles);
  expect(fps).toBeGreaterThanOrEqual(60);
});

it('should not leak memory over 5 minutes', async () => {
  const initialMemory = getMemoryUsage();
  await runGameLoop(5 * 60); // 5 minutes
  const finalMemory = getMemoryUsage();
  expect(finalMemory - initialMemory).toBeLessThan(10); // <10MB increase
});
```

---

## CROSS-BROWSER REQUIREMENTS

### Supported Browsers:
- **Chrome**: Latest 3 versions
- **Firefox**: Latest 3 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions (Chromium-based)

### WebGL Requirements:
- WebGL 1.0 minimum support
- WebGL 2.0 preferred for better performance
- Fallback strategy for unsupported browsers

### Test Matrix:
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Rendering | ✓ | ✓ | ✓ | ✓ |
| Physics | ✓ | ✓ | ✓ | ✓ |
| Input | ✓ | ✓ | ✓ | ✓ |
| Audio | ✓ | ✓ | ✓ | ✓ |
| UI | ✓ | ✓ | ✓ | ✓ |

---

## ACCESSIBILITY FEATURES

### Required:
- Keyboard-only navigation support
- Color-blind friendly color schemes
- Adjustable text sizes
- Audio volume controls (music, SFX, master)
- Visual feedback for all audio events
- Screen reader compatibility for UI elements

### Accessibility Tests:
- [ ] All UI elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader announces key events

---

## ASSET PIPELINE

### Asset Types:
- **Textures**: PNG/JPG with mipmaps
- **Models**: GLTF/GLB format
- **Audio**: OGG (preferred), MP3 fallback
- **Fonts**: WOFF2 format

### Loading Strategy:
- Progressive loading with progress indicator
- Asset caching for repeated access
- Fallback assets for missing resources
- Async loading with error handling

### Asset Test Requirements:
- [ ] All assets load successfully
- [ ] Loading progress displays correctly
- [ ] Fallback assets work when primary fails
- [ ] No blocking on asset load

---

## PERSISTENCE & SAVE SYSTEM

### Data to Persist:
- High scores (top 10)
- User settings (audio, controls, graphics)
- Game progress (for pause/resume)

### Implementation:
- LocalStorage for browser-based persistence
- Data encryption for sensitive info
- Backup/restore functionality

### Test Requirements:
- [ ] High scores persist across sessions
- [ ] Settings saved and loaded correctly
- [ ] Game state can be saved/restored
- [ ] Data integrity maintained

---

## VERIFICATION AT EACH COMMIT

**Before any commit:**
1. Run unit tests: `npm run test`
2. Run integration tests: `npm run test:integration`
3. Generate coverage report: `npm run test:coverage`
4. Manual browser test of changed feature
5. Verify no console errors or warnings
6. Confirm code follows project style guide

**Coverage Requirements:**
- Overall coverage ≥90%
- Critical paths 100%
- No uncovered new code

---

## DELIVERABLE VALIDATION CHECKLIST

**Before marking any task as complete:**
- [ ] Tests written first (RED phase verified)
- [ ] Implementation passes tests (GREEN verified)
- [ ] All existing tests still pass (no regression)
- [ ] Coverage report shows adequate coverage
- [ ] Manual browser test confirms functionality
- [ ] No console errors or warnings
- [ ] Code follows project style guide
- [ ] Performance benchmarks met
- [ ] Cross-browser testing completed
- [ ] Accessibility requirements met

**Only when ALL checks pass → Task is DONE.**

---

## RISK REGISTER & MITIGATION

| Risk | Probability | Impact | Mitigation | Test Coverage |
|------|------------|--------|------------|---------------|
| Three.js complexity | Medium | High | Start small, test visualization early | Unit tests for scene/renderer |
| Physics integration | High | High | Mock physics, integrate gradually | Integration tests for Cannon-es |
| Browser compatibility | Medium | Medium | Early cross-browser testing | E2E tests on multiple browsers |
| Performance issues | Medium | High | Profile early, optimize systematically | Performance test suite |
| Memory leaks | Medium | High | Regular memory profiling | Memory leak detection tests |
| Audio sync issues | Low | Medium | Test audio timing early | Audio synchronization tests |
| Existing code conflicts | High | High | Retroactive TDD, don't delete | Baseline tests before refactor |

---

## SUCCESS METRICS (Testable)

### Technical Metrics:
- 90%+ test coverage (branch)
- 60 FPS maintained under load
- <3 second initial load time
- No memory leaks in 5+ minute gameplay
- Input latency < 100ms
- All UI elements functional cross-browser

### User Experience Metrics:
- Intuitive controls (WASD + SPACE)
- No visual artifacts or glitches
- Smooth animations (60 FPS)
- Responsive UI feedback
- Clear visual/audio feedback for all actions

---

## NEXT ACTION: START FROM WEEK 0

**Current State**: Code exists without TDD. Will use retroactive TDD approach.

**Immediate Steps:**
1. **Week 0 Infrastructure**: Setup testing infrastructure (Vitest, mocking, CI)
2. **Baseline Tests**: Write tests for existing code to establish baseline
3. **Start Week 1**: Begin strict TDD for new features
4. **Real Browser Testing**: Use Playwright for E2E validation (Week 4)

**First Task:**
1. Create `vite.config.ts` with Vitest configuration
2. Create `tests/mocks/` directory with Three.js/Cannon-es mocks
3. Create `.github/workflows/test.yml` for CI
4. Write first failing test for project structure

---

## APPENDIX: COMPLETE TEST INVENTORY

### Unit Tests Required (100+)
- Game class (start, pause, resume, stop)
- GameLoop timing and frame scheduling
- SceneManager (register, unregister, transitions)
- InputSystem (keyboard, mouse, gamepad)
- PhysicsSystem (world creation, body management, collision)
- Player (movement, jump, damage, health, score)
- Obstacle (creation, movement, collision types)
- PowerUp (creation, effects, duration)
- ScoreManager (calculation, persistence, multipliers)
- AssetLoader (loading, caching, error handling)
- AudioSystem (loading, playing, mixing, controls)
- UISystem (rendering, updates, interactions)
- Logger utilities
- Constants validation

### Integration Tests Required (20+)
- Game start to gameplay flow
- Player movement with obstacle avoidance
- Score collection and display
- Game over and restart cycle
- Scene transitions (Boot → Menu → Game → GameOver)
- Physics-visual synchronization
- Audio-system integration
- UI-system integration
- Power-up collection and effects
- High score persistence

### E2E Tests Required (10+)
- Full game loop from menu to game over
- Visual regression testing
- Performance validation (60 FPS)
- Cross-browser compatibility
- Accessibility validation
- Mobile touch input (if applicable)
- Audio functionality
- Settings persistence
- Real browser input testing
- Menu navigation flow

### Performance Tests Required (5+)
- Frame rate under load
- Memory leak detection
- Asset loading optimization
- Input latency measurement
- Render thread vs physics thread separation

**Total Tests Required: ~135+**

---

## TESTING THROUGH REAL BROWSER (CRITICAL FOR USER)

**Why Real Browser Testing is Required:**
1. Godot WebGL issues were only discoverable in real browser
2. CORS problems only manifest in browser environment
3. UI rendering bugs require actual DOM
4. Performance metrics need real hardware

**Real Browser Test Setup:**
```bash
# Install Playwright with browsers
npm install -D @playwright/test

# Run tests in real Chrome (not headless)
npx playwright test --headed

# Run specific test with debugging
npx playwright test --debug
```

**E2E Test Example:**
```typescript
import { test, expect } from '@playwright/test';

test('game starts from menu', async ({ page }) => {
  await page.goto('/');
  
  // Menu should be visible
  await expect(page.locator('.menu-container')).toBeVisible();
  
  // Click start button
  await page.click('#start-btn');
  
  // Game should start
  await expect(page.locator('.hud-score')).toBeVisible();
  
  // Player should be on screen
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});
```

---

*This plan supersedes all previous versions. Strict TDD enforcement required for all development.*
*Updated: Retroactive TDD strategy, 4-week timeline, real browser E2E testing emphasis.*
*Updated 2026-09-13 (W1 retro): W2 gate notes + execution order (W2-A…E), Task 4.3 DOM/boot wiring (gates Week 2), Task 6.2 browser-verification criterion, Task 7.3 phased power-ups (D3), W2 success criteria.*
*Updated 2026-09-13 (W3/W4 plan-hardening): W3 gate notes + execution order (W3-A…C) + 6 success criteria; W4 gate notes + execution order (W4-A…D) + 6 "done" criteria; HUD→UISystem (D2), MenuScene/GameOverScene→W3 Day 8, AssetLoader fix→W2-A Task 4.3, synthesized audio→W2-C, full WCAG AA→W4 Day 12, coverage reframe→maintain ≥90%.*
