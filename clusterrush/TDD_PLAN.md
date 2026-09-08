# Cluster Rush - Test-Driven Development Plan

## TDD Philosophy
**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST**
Every implementation follows strict RED→GREEN→REFACTOR cycle.

## WEEK 1: CORE INFRASTRUCTURE (TDD VERIFIED)

### Day 1: Project Setup with Tests First
**Task 1.1: Initialize project with testing infrastructure**
- Red: Test that `npm run test` runs empty test suite
- Green: Configure Vitest with TypeScript support
- Verify: `npm test` → "✓ 0 passed"

**Task 1.2: TypeScript strict mode**
- Red: Test TypeScript compilation with strict mode
- Green: Configure tsconfig.json with strict options
- Verify: `npm run build` compiles without type errors

**Task 1.3: Three.js rendering test**
- Red: Test WebGL renderer creation fails
- Green: Create minimal Three.js renderer
- Verify: Test passes, canvas appears in browser

### Day 2: Core Game Loop (Test-Driven)
**Task 2.1: Game state management**
- Red: Test Game class exists and has initialState
- Green: Implement Game class with start/stop methods
- Verify: Game starts in STOPPED state

**Task 2.2: Frame loop timing**
- Red: Test that game loop calls update with deltaTime
- Green: Implement requestAnimationFrame loop
- Verify: Update called ~60 times per second

**Task 2.3: Scene management system**
- Red: Test scene creation and object addition
- Green: Scene class with Three.js integration
- Verify: Objects appear in scene when added

### Day 3: Input System Testing
**Task 3.1: Keyboard input detection**
- Red: Test keydown events trigger input state
- Green: DOM event listener with key mapping
- Verify: WASD keys detected in automated browser test

**Task 3.2: Input buffering for frame independence**
- Red: Test input state persists across frames
- Green: Input buffer with frame processing
- Verify: Input works at high and low frame rates

## WEEK 2: GAMEPLAY SYSTEMS

### Day 4: Player Entity TDD
**RED→GREEN→REFACTOR cycles for each behavior:**

**Cycle 1: Player creation**
- Red: Test player mesh created with proper geometry
- Green: Box geometry with material
- Verify: Player appears at starting position

**Cycle 2: Movement**
- Red: Test player position changes with velocity
- Green: Apply velocity based on input
- Verify: WASD moves player in corresponding directions

**Cycle 3: Jump mechanics**
- Red: Test player jumps with SPACE when grounded
- Green: Apply upward impulse, track ground state
- Verify: Player ascends then falls back

**Cycle 4: Gravity application**  
- Red: Test player falls without ground support
- Green: Constant downward acceleration
- Verify: Physics simulation matches expected

### Day 5: Physics System Integration
**Task 5.1: Cannon-es test integration**
- Red: Test physics world creation fails
- Green: Initialize Cannon-es world
- Verify: Physics steps without errors

**Task 5.2: Body synchronization**
- Red: Test that physics body updates visual mesh
- Green: Mesh-Body synchronization system
- Verify: Physics simulation moves visual objects

**Task 5.3: Collision detection tests**
- Red: Test collision events trigger game logic
- Green: Cannon-es collision event handlers
- Verify: Collisions trigger score changes

### Day 6: Scoring System
**Task 6.1: Score manager (pure functions)**
- Red: Test score increments/decrements
- Green: Score manager with add/subtract methods
- Verify: Score calculations are deterministic

**Task 6.2: Game state machine**
- Red: Test state transitions (menu→playing→gameOver)
- Green: Finite state machine implementation
- Verify: Only valid transitions allowed

**Task 6.3: Power-up system**
- Red: Test power-up collection triggers effects
- Green: Power-up entity with collection handlers
- Verify: Power-ups disappear, effects apply

## WEEK 3: UI & INTEGRATION

### Day 7: HTML UI (No CORS!)
**Task 7.1: DOM-based UI components**
- Red: Test UI elements render and update
- Green: HTML overlay system
- Verify: Score displays update in real browser

**Task 7.2: Menu navigation flow**
- Red: Test START button transitions scene
- Green: Scene transition system with UI events
- Verify: Click start → game starts

### Day 8-9: Integration Testing
**Integration test suite:**
1. Game start to gameplay flow
2. Player movement with obstacle avoidance
3. Score collection and display
4. Game over and restart cycle

**Automated browser tests with Puppeteer:**
- Critical path automation
- Visual regression testing
- Performance validation

### Day 10: Optimization & Polish
**Performance testing:**
- Frame rate under load testing
- Memory leak detection
- Asset loading optimization

**Cross-browser testing:**
- Chrome, Firefox, Safari validation
- Mobile web version consideration
- Touch input support

## TDD ENFORCEMENT RULES

### MANDATORY TEST STEPS (Never Skip)
1. **RED**: Write failing test describing expected behavior
2. **VERIFY RED**: Run test to confirm failure (not error)
3. **GREEN**: Write minimal code to pass test
4. **VERIFY GREEN**: Run test to confirm pass
5. **REFACTOR**: Clean code without changing behavior
6. **VERIFY REFACTOR**: All tests still pass

### TDD VIOLATIONS (Restart Required)
- Code written before test → DELETE CODE, start over
- Test passes immediately → Fix test to fail first
- "I'll test later" attitude → Stop, follow TDD
- Modifying existing code without test → Write test first

### VERIFICATION AT EACH COMMIT
Before any commit:
1. Run unit tests: `npm run test`
2. Run integration tests: `npm run test:integration`
3. Generate coverage report: `npm run test:coverage`
4. Manual browser test of changed feature

## TEST COVERAGE TARGETS

### Phase Targets:
- **Week 1**: 80%+ coverage (core systems)
- **Week 2**: 85%+ coverage (gameplay systems)
- **Week 3**: 90%+ coverage (complete game)

### Critical Paths (100% coverage required):
1. Game initialization and cleanup
2. Input system → player movement
3. Collision detection → game logic
4. State transitions (menu→play→gameOver)

## RISK REGISTER & MITIGATION

| Risk | Probability | Impact | Mitigation | Test Coverage |
|------|------------|--------|------------|---------------|
| Three.js complexity | Medium | High | Start small, test visualization early | Unit tests for scene/renderer |
| Physics integration | High | High | Mock physics, integrate gradually | Integration tests for Cannon-es |
| Browser compatibility | Medium | Medium | Early cross-browser testing | E2E tests on multiple browsers |
| Performance issues | Medium | High | Profile early, optimize systematically | Performance test suite |

## SUCCESS METRICS (Testable)

### Technical Metrics:
- 90%+ test coverage (branch)
- 60 FPS maintained under load
- <3 second initial load time
- No memory leaks in 5+ minute gameplay

### User Experience Metrics:
- Input latency < 100ms
- All UI elements functional cross-browser
- No visual artifacts or glitches
- Intuitive controls (WASD + SPACE)

## DELIVERABLE VALIDATION CHECKLIST

**Before marking any task as complete:**
- [ ] Tests written first (RED phase verified)
- [ ] Implementation passes tests (GREEN verified)
- [ ] All existing tests still pass (no regression)
- [ ] Coverage report shows adequate coverage
- [ ] Manual browser test confirms functionality
- [ ] No console errors or warnings
- [ ] Code follows project style guide

**Only when ALL checks pass → Task is DONE.**

## NEXT ACTION: START WITH DAY 1 TASKS
1. Create package.json with testing dependencies
2. Write first failing test for project structure
3. Implement minimal structure to pass test
4. Commit with test and implementation together