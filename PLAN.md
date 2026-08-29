# Cluster Rush - Godot 4 Development Plan

**Status:** Phase 1 ~80% — Code complete, build exported, critical bugs fixed
**Created:** 2026-08-26
**Last Updated:** 2026-08-29
**Target Platform:** WebGL (Local Browser)
**Engine:** Godot 4.7.2 (native ARM64 Linux)

## Recent Critical Fixes (2026-08-29)
- **BUG 1:** Non-deterministic level parameters (`randi()` → tier interpolation) — level difficulty now reproducible
- **BUG 2:** Broken speed/gap formulas (negative gaps, broken multipliers) — now using proper `lerp()` interpolation
- **BUG 3:** `complete_level()` didn't save progress — now calls `save_progress()` directly
- **BUG 4:** Player missing script/physics layers in some code paths — added safety checks in LevelManager
- **BUG 5:** World node lookup failure — fixed `_find_or_create_scene_root()` to use `get_current_scene()`
- **BUG 6:** Premature `LevelManager.load_level()` call — moved to game scene lifecycle
- **BUG 7:** Player invisible (no mesh) — added CapsuleMesh body
- **BUG 8:** No level completion check — added x=140 threshold (ground is 300 units long)

## Level Parameter Audit (matches PLAN.md T1-T5 spec)
| Tier | Levels | Trucks | Speed (m/s) | Gap (m) | Hazards |
|------|--------|--------|-------------|---------|---------|
| T1 Tutorial | 1-5 | 1-2 | 10-12 | 3.0-4.0 | 0-1 |
| T2 Easy | 6-10 | 2-3 | 12-15 | 2.5-3.5 | 1-2 |
| T3 Medium | 11-20 | 4-6 | 15-18 | 2.0-3.0 | 2-3 |
| T4 Hard | 21-30 | 6-8 | 18-22 | 1.5-2.5 | 3-4 |
| T5 Expert | 31-35 | 8-10 | 22-25 | 1.0-2.0 | 4-5 |

## Phase 1 Deliverables Complete:
- ✅ Godot 4.7.2 installed (ARM64 native build)
- ✅ `project.godot` — Project configuration with autoloads, input bindings, rendering settings
- ✅ `autoloads/game_manager.gd` — Game state (lives, score, level progression, save/load)
- ✅ `autoloads/level_manager.gd` — Level loading, 5-tier templates, procedural generation
- ✅ `autoloads/audio_manager.gd` — Audio management with volume controls
- ✅ `autoloads/input_manager.gd` — Input handling with buffering and coyote time
- ✅ `scripts/player/player_movement.gd` — Strafe, jump, double-jump, variable jump, wall-climb
- ✅ `scripts/truck/truck_controller.gd` — Physics-driven truck movement with clustering
- ✅ `scripts/hazards/` — Saw blade, falling debris, ramp, swinging hammer
- ✅ `scripts/ui/` — Main menu, HUD, level complete, game over, pause menu, settings
- ✅ `docs/test-fixtures/` — Level templates, physics constants, input patterns
- ✅ `docs/webgl-optimization-guide.md` — WebGL optimization guide (1210 lines)

---

## 1. Executive Summary

### Goal
Build a locally-runnable Cluster Rush clone in Godot 4 with proper UI/UX, physics-driven truck movement, and 35 levels of escalating difficulty.

### Why Godot 4
- Original Cluster Rush was built in Unity (proven path), but we are implementing in Godot 4
- Godot 4.7.2 provides native ARM64 Linux support (no x86_64 constraint)
- Built-in physics with Area3D/CharacterBody3D for smooth gameplay
- WebGL export via `--export-release "Web"` for local browser running
- Free and open-source engine

### Success Criteria
- ✅ Player can jump, double-jump, wall-climb between moving trucks
- ✅ Trucks move with physics-driven chaos (not scripted paths)
- ✅ 35 handcrafted levels with escalating difficulty
- ✅ First-person perspective with proper depth perception
- ✅ Hazards: saw blades, ramps, falling debris
- ✅ WebGL build runs smoothly in browser
- ✅ All features tested and verified by agent

### Mandatory Testing Protocol (Required for Every Milestone)
**All 4 testing approaches must be executed and documented for every milestone and phase:**

| # | Approach | Tool | Purpose | Deliverable |
|---|----------|------|---------|-------------|
| 1 | **Playwright Automation** | `playwright` skill | Browser automation to verify game flows (jump, climb, level completion) | Automated test script + pass/fail report |
| 2 | **Performance Profiling** | `browser-testing-with-devtools` | Monitor FPS (60 target), memory usage, frame timing | DevTools performance profile + metrics log |
| 3 | **WebApp Testing** | `webapp-testing` skill | UI responsiveness, accessibility, cross-browser compatibility | Accessibility audit + cross-browser matrix |
| 4 | **Systematic Debugging** | `software-development:systematic-debugging` | Root cause analysis for bugs using 4-phase method | Bug report with root cause + fix verification |

**Protocol:**
1. Before marking any milestone complete, run all 4 approaches.
2. Document results in `tests/milestones/{milestone-name}/` with:
   - Playwright test output
   - DevTools performance profile
   - Accessibility audit report
   - Debugging log for any issues found
3. Minimum pass criteria: 60 FPS sustained, no critical accessibility violations, all automated tests passing.
4. If any approach fails, iterate until all 4 meet quality gates before proceeding.

### Test Plan Strategy (4-Layer Approach)
**Objective:** Ensure robust, efficient testing by running checks in the correct order to catch issues early and avoid wasting time on slow WebGL builds.

#### Layer 1: Unit Tests
- **Tool:** GDScript unit tests with `godot --headless --test`
- **Purpose:** Test logic in isolation (no engine required). Fast execution (<1s).
- **Scope:**
  - Player mechanics (jump force, double-jump state machine)
  - Truck physics calculations (velocity, collision detection logic)
  - Level template parameter validation
- **Execution:** Run automatically on every code commit.

#### Layer 2: Integration Tests (PlayMode)
- **Tool:** Godot 4 runnable scene tests
- **Purpose:** Test interactions between components inside the Godot engine.
- **Scope:**
  - Player + Truck collision resolution
  - Hazard triggering and death logic
  - UI state transitions (Menu → Game → Pause → Game Over)
- **Execution:** Run before every WebGL build. **Mandatory gate.**

#### Layer 3: End-to-End (E2E) Automation
- **Tool:** Playwright + `computer_use`
- **Purpose:** Verify complete user journeys in the actual browser environment.
- **Scope:**
  - Level completion flows (Start → Play → Win/Loss)
  - Input responsiveness (jump, strafe, wall-climb)
  - Performance baseline checks (FPS > 60 sustained)
- **Execution:** Run nightly or before major milestones.

#### Layer 4: Performance Profiling
- **Tool:** Chrome DevTools (Performance & Memory Panels)
- **Purpose:** Monitor runtime metrics in the browser.
- **Scope:**
  - Frame timing (target: 16.6ms/frame)
  - Memory leaks (heap growth over time)
  - CPU/GPU utilization
- **Execution:** Run during performance-critical milestones (e.g., Phase 6: 35 Levels).

### Test Execution Workflow
1. **Pre-Commit:** Run Layer 1 (Unit) tests. Fail = block commit.
2. **Pre-Build:** Run Layer 2 (PlayMode) tests. Fail = block WebGL build.
3. **Milestone Complete:** Run Layer 3 (E2E) + Layer 4 (Profiling).
4. **Bug Resolution:** Use `software-development:systematic-debugging` 4-phase method for any failures.

### Deliverables per Milestone
- `tests/editmode/` — Unit test results
- `tests/playmode/` — Integration test logs
- `tests/e2e/` — Playwright screenshots + video recordings
- `tests/performance/` — DevTools JSON profiles

---

## 2. Test Strategy Summary

### 4-Layer Testing Protocol (MANDATORY for every milestone)

| Layer | Tool | Scope | When Run | Gate |
|-------|------|-------|----------|------|
| **L1: Unit (EditMode)** | GDScript unit tests (headless) | Pure logic: jump math, state transitions, parameter validation, level template generation | On every code commit | Blocks commit |
| **L2: Integration (PlayMode)** | Godot 4 runnable scene tests | Component interactions: player-truck collision, hazard triggers, UI state machines | Before every WebGL build | Blocks build |
| **L3: E2E Automation** | Playwright + computer_use | Complete user journeys in browser: full level playthroughs, input responsiveness | Nightly + milestone completion | Blocks approval |
| **L4: Performance** | Chrome DevTools (Performance + Memory panels) | FPS (≥60 sustained), frame timing (≤16.6ms), JS heap growth, draw calls | Phase 3+, Phase 6, Phase 7, Phase 8 | Blocks sign-off |

**Pass Criteria (All layers must pass):**
- L1: 100% of defined unit tests pass
- L2: 100% of integration tests pass
- L3: 100% E2E test cases pass with screenshots/video
- L4: ≥55 FPS sustained (target ≥60), memory growth <10% over 5 level transitions, draw calls <150

---

## 3. Phase-by-Phase Task-Level Test Matrix

### Phase 1: Project Setup (Week 1)

| # | Task | Test ID | Layer | Test Case | Pass Criteria | Verification Method |
|---|------|---------|-------|-----------|---------------|---------------------|
| 1.1 | Install Godot 4.7.2 (ARM64 Linux) | P1-T01 | L1 | `godot --version` returns 4.7.2.stable | Exact version string matches | Terminal: `godot --version` |
| 1.2 | Create Godot project at `~/vishruth/games/clusterrush` | P1-T02 | L1 | Project directory exists with `autoloads/`, `scripts/`, `scenes/` | All required dirs present | Filesystem scan |
| 1.3 | Set up folder structure (Scripts/, Prefabs/, Materials/, Scenes/, Audio/, etc.) | P1-T03 | L1 | All directories from architecture spec exist | 15+ directories match PLAN.md tree | Automated directory comparison |
| 1.4 | Set up collision layers (Ground=1, Truck=2, Hazard=4, Player=8) | P1-T04 | L1 + L2 | Collision constants defined in LevelManager.gd | `LAYER_GROUND==1 && LAYER_TRUCK==2 && LAYER_HAZARD==4 && LAYER_PLAYER==8` | GDScript unit test: load autoload, check constants |
| 1.5 | Configure Input Map (strafe_left/right, jump, climb) | P1-T05 | L1 | Input actions defined in project.godot | `InputMap.get_actions()` returns expected actions | GDScript unit test: check input map entries |
| 1.6 | Export WebGL build (`--export-release "Web"`) | P1-T06 | L2 | Builds/WebGL/index.html exists and loads | index.html, index.wasm, index.pck present | Playwright: assert page loads, no console errors |
| 1.8 | Create Input Actions Asset with Player + UI action maps | P1-T08 | L1 + L2 | `InputActions.inputactions` file exists with correct action maps | All 4 actions defined: Jump, StrafeLeft, StrafeRight, Climb | L1: Parse JSON structure. L2: Bind action to player prefab |
| 1.9 | Configure scene tree (MainMenu → Game → Level Select → Credits → EndScreen) | P1-T09 | L2 | Scene files define proper navigation flow | Scene count = 37 (1 menu + 35 levels + end + level select) | Godot scene tree test |
| 1.10 | Configure export preset with WebGL optimization settings | P1-T10 | L2 | export_presets.cfg has correct WebGL settings | compression=brotli, target FPS=60, canvas settings configured | Godot export preset test |
| 1.11 | Design browser bridge specification (GDScript→JavaScript interop) | P1-T11 | L1 | Bridge spec document defines 11+ functions for testing | Bridge API covers playerY, isGrounded, isClimbing, getTruckPositions, getFPS, getHeapSize, isDead, etc. | Review: AOT-safe, no virtual method issues |
| 1.12 | Create export hook for WebGL auto-configuration | P1-T12 | L1 | Build script configures all WebGL settings | Runs without errors, applies Brotli compression, 60 FPS, 256MB cap | Terminal: run script, verify settings applied |
| 1.13 | Update .gitignore (complete Godot set) | P1-T13 | L1 | .gitignore includes all Godot-specific patterns | Includes .godot/, *.godot, *.pck, Builds/, etc. | grep check against Godot .gitignore template |

**Phase 1 Test Deliverables:**
- `tests/editmode/results/P1-project-setup.json` — Unit test results
- `tests/playmode/results/P1-integration.json` — Integration test results
- `tests/e2e/screenshots/P1-empty-scene.png` — Browser renders canvas

---

### Phase 2: Player Movement (Week 1-2)

| # | Task | Test ID | Layer | Test Case | Pass Criteria | Verification Method |
|---|------|---------|-------|-----------|---------------|---------------------|
| 2.1 | Implement PlayerMovement.cs (WASD/Arrow strafe) | P2-T01 | L1 | `PlayerMovement.ApplyStrafe()` moves X position by expected delta | `Mathf.Abs(newX - expectedX) < 0.01` | EditMode: mock Rigidbody, call ApplyStrafe(1f), assert position change |
| 2.2 | Implement PlayerJump.cs (single jump, configurable force) | P2-T02 | L1 | Jump applies correct upward velocity | `rigidbody.velocity.y ≥ jumpForce * 0.95` | EditMode: mock physics, call PerformJump(10f), assert velocity.y |
| 2.3 | Implement double-jump (state machine) | P2-T03 | L1 | Second jump only works mid-air, resets on ground | `jumpCount == 2` mid-air, `jumpCount == 0` after land | EditMode: simulate ground → air → jump → jump → ground, assert state transitions |
| 2.4 | Implement wall-climb system (raycast detection) | P2-T04 | L1 + L2 | Raycast detects wall within climb distance | `Physics.Raycast(from, dir, out hit, climbDistance)` returns true for wall tag | L1: isolated raycast test. L2: place wall prefab, raycast, assert hit |
| 2.5 | Implement climb movement (W/Up arrow upward motion) | P2-T05 | L2 | Player moves upward at climb speed while climbing | `velocity.y ≈ climbSpeed` during climb state | PlayMode: spawn player on wall, press climb, measure Y delta over 1s |
| 2.6 | Add coyote time (0.15s grace period after leaving ground) | P2-T06 | L1 | Player can still jump 0.15s after ground contact lost | `CanJump() == true` for 0.15s post-ground, then `false` | EditMode: time-simulated test, jump at t=0.1s (pass), t=0.2s (fail) |
| 2.7 | Variable jump height (hold = higher, tap = lower) | P2-T07 | L1 | Jump height proportional to button hold duration | Max hold → height ≥ 1.5× tap height | EditMode: mock input, test two jumps, assert height ratio |
| 2.8 | Fall detection (death when falling between trucks) | P2-T08 | L2 | Player triggers death when Y < ground threshold | `playerState == PlayerState.Dead` when `transform.position.y < -10` | PlayMode: push player off platform, verify dead state within 0.5s |
| 2.9 | Test all movement on static platform | P2-T09 | L3 | Player can strafe, jump, double-jump, climb on static test surface | All actions work in browser environment | Playwright: load test scene, send keystrokes, verify player Y/X changes via JS bridge |
| 2.10 | Performance: Movement code frame budget | P2-T10 | L4 | PlayerMovement.Update() < 0.5ms per frame | DevTools reports ≤0.5ms in profiler | Chrome DevTools: profile movement loop, measure time |

**Phase 2 Test Deliverables:**
- `tests/editmode/results/P2-player-movement.json` — 10 unit tests
- `tests/playmode/results/P2-player-interaction.json` — 3 integration tests
- `tests/e2e/screenshots/P2-movement-*.png` — Browser test screenshots
- `tests/performance/profiles/P2-movement.json` — Frame time profile

---

### Phase 3: Truck System (Week 2-3)

| # | Task | Test ID | Layer | Test Case | Pass Criteria | Verification Method |
|---|------|---------|-------|-----------|---------------|---------------------|
| 3.1 | Implement TruckController.cs (physics-driven movement) | P3-T01 | L1 | Truck velocity changes randomly within bounds | Velocity stays within [-maxSpeed, +maxSpeed], changes each FixedTick | EditMode: instantiate truck, step 100 physics ticks, assert velocity range |
| 3.2 | Implement TruckSpawner.cs (spawn trucks in lane) | P3-T02 | L2 | Trucks spawn at correct Y offset per lane | Spawned trucks have Y coordinates matching lane definitions (±0.1f) | PlayMode: trigger spawn, count trucks, verify Y positions |
| 3.3 | Implement TruckClusterManager.cs (form/break clusters) | P3-T03 | L2 | Cluster forms within formationPhaseDuration | All trucks within `clusterThreshold` distance by time T | PlayMode: start pattern, measure time until trucks converge |
| 3.4 | Truck physics: acceleration and braking patterns | P3-T04 | L1 | Perlin-noise-based acceleration produces smooth, predictable patterns | Acceleration values show autocorrelation > 0.8 (not pure noise) | EditMode: generate 1000 samples, compute autocorrelation |
| 3.5 | Truck collision handling (no clipping through each other) | P3-T05 | L2 | Two trucks collide and bounce/stop, no overlap | After collision, `distance(truckA, truckB) ≥ truckA.radius + truckB.radius` | PlayMode: push two trucks together, verify separation |
| 3.6 | Edge detection (trucks stay within track bounds) | P3-T06 | L1 | Truck reverses direction when near edge | `transform.position.x` never exceeds ±trackWidth/2 | EditMode: simulate near-edge position, assert direction flip |
| 3.7 | Player-on-truck collision (can stand on roofs) | P3-T07 | L2 | Player can stand on moving truck roof, moves with truck | Player Y = truck roof Y + playerHeight, player X tracks truck X | PlayMode: spawn player on truck, verify relative position stability |
| 3.8 | Convoy traversal (jump between multiple trucks) | P3-T08 | L3 | Player can jump truck→truck→truck in sequence | Player reaches 3rd truck without falling | Playwright: load convoy scene, send jump sequence, verify position |
| 3.9 | Cluster dispersion creates jumpable gaps | P3-T09 | L3 | Gap between trucks during dispersion is surmountable | Gap width ≤ player max jump distance (≈5m) | PlayMode: measure gap at dispersion peak, compare to jump distance |
| 3.10 | Performance: Truck physics frame budget | P3-T10 | L4 | All truck physics < 1ms total for 10 trucks | DevTools: physics ≤1.0ms/frame with 10 trucks | Chrome DevTools: profile with 10 active trucks |

**Phase 3 Test Deliverables:**
- `tests/editmode/results/P3-truck-physics.json` — 6 unit tests
- `tests/playmode/results/P3-truck-interaction.json` — 4 integration tests
- `tests/e2e/videos/P3-convoy-traversal.mp4` — E2E video proof
- `tests/performance/profiles/P3-trucks.json` — 10-truck frame profile

---

### Phase 4: Hazards (Week 3-4)

| # | Task | Test ID | Layer | Test Case | Pass Criteria | Verification Method |
|---|------|---------|-------|-----------|---------------|---------------------|
| 4.1 | Implement SawBlade.cs (rotating blade) | P4-T01 | L1 | Blade rotation speed is constant and configurable | `transform.rotation.z` changes at `rotationSpeed` rad/s | EditMode: step 60 ticks, verify angular displacement matches speed |
| 4.2 | Saw blade kill trigger (contact = instant death) | P4-T02 | L2 | Player near saw blade triggers death event | `playerState == Dead` within 0.05s of contact | PlayMode: position player on blade, assert state change |
| 4.3 | Implement FallingDebris.cs (drops from above) | P4-T03 | L2 | Debris falls with gravity, spawns at random X within lane | Spawn X within lane bounds, falls at `Physics.gravity.y` | PlayMode: spawn debris, track Y over time, verify parabola |
| 4.4 | Falling debris kill trigger | P4-T04 | L2 | Direct hit on player causes death | `playerState == Dead` when debris collider intersects player | PlayMode: drop debris on player, verify death |
| 4.5 | Implement Ramp.cs (launch player vertically) | P4-T05 | L1 | Ramp collision applies upward force | `rigidbody.velocity.y` increases by rampLaunchForce | EditMode: mock ramp collision, assert velocity change |
| 4.6 | SwingingHammer.cs (pendulum motion) | P4-T06 | L1 | Hammer swings with consistent period | `transform.rotation` follows pendulum equation: `θ(t) = θ₀·cos(√(g/L)·t)` | EditMode: track angular position, compare to pendulum curve |
| 4.7 | Swinging hammer kill/knockback trigger | P4-T07 | L2 | Contact causes death or knockback (configurable) | Player dies OR velocity changes > knockbackThreshold | PlayMode: hit player with hammer, assert outcome |
| 4.8 | Hazard combination testing (multiple hazards active) | P4-T08 | L2 | 4 different hazards coexist without physics conflicts | All hazards active simultaneously, no engine errors | PlayMode: create level with all 4 hazard types, run 60s |
| 4.9 | Hazard spawn timing matches level templates | P4-T09 | L1 | Hazard spawn interval matches `HazardConfig.spawnInterval` | Spawn count per second ≈ `1.0 / spawnInterval` ±10% | EditMode: simulate level with template, count spawns over 10s |
| 4.10 | Hazard safety: blind spots exist (fair gameplay) | P4-T10 | L3 | Player can navigate through hazard corridor | Playable route exists with no overlapping kill zones | Playwright: navigate through hazard scene, verify survival |

**Phase 4 Test Deliverables:**
- `tests/editmode/results/P4-hazard-logic.json` — 4 unit tests
- `tests/playmode/results/P4-hazard-interaction.json` — 4 integration tests
- `tests/e2e/screenshots/P4-hazards-*.png` — Browser hazard tests
- `tests/performance/profiles/P4-hazards.json` — Frame budget with 4 hazards

---

### Phase 5: Camera & UI (Week 4)

| # | Task | Test ID | Layer | Test Case | Pass Criteria | Verification Method |
|---|------|---------|-------|-----------|---------------|---------------------|
| 5.1 | Implement FirstPersonCamera.cs (POV follow) | P5-T01 | L1 + L2 | Camera maintains fixed offset from player head | Camera position = player position + offset (±0.05f) | L1: isolated transform math test. L2: verify in-editor |
| 5.2 | Camera handles rapid direction changes smoothly | P5-T02 | L4 | Camera rotation change ≤ 90° per frame (no motion sickness) | `Quaternion.Angle(prev, current) ≤ 90` every frame | DevTools: profile camera rotation, verify smoothness |
| 5.3 | Main Menu UI (Start Game, Level Select, Settings, Credits) | P5-T03 | L3 | All 4 buttons functional, navigate to correct screens | Click → destination screen visible within 1s | Playwright: click each button, assert screen content |
| 5.4 | HUD displays level, lives, time correctly | P5-T04 | L2 | HUD text matches GameManager state | `HUD.levelText == GameManager.currentLevel.ToString()` | PlayMode: set game state, verify HUD updates within 0.1s |
| 5.5 | Level complete screen appears on win | P5-T05 | L3 | Transition to LevelCompleteUI triggered correctly | UI appears ≤ 0.5s after player crosses finish line | Playwright: trigger level completion, assert UI visible |
| 5.6 | Game Over screen on death (all lives lost) | P5-T06 | L3 | GameOverUI appears after final life loss | `GameOverUI.active == true` after lives == 0 | Playwright: kill player 3 times (3 lives), assert Game Over |
| 5.7 | Pause menu (Resume, Restart, Main Menu, Settings) | P5-T07 | L3 | Escape/P toggles pause, all buttons work | Pause toggles on/off, buttons navigate correctly | Playwright: press Escape, verify overlay, test all buttons |
| 5.8 | Level select shows unlocked levels only | P5-T08 | L3 | Only levels up to player's progress are clickable | Level 3 selectable if player completed Level 2, not if on Level 1 | Playwright: navigate level select, verify enabled/disabled states |
| 5.9 | Settings menu (controls, audio, graphics) | P5-T09 | L3 | Audio slider affects game volume, controls remap works | Volume change audible, remapped key triggers same action | Playwright: adjust slider, check audio level via JS bridge |
| 5.10 | Accessibility: All UI elements keyboard-navigable | P5-T10 | L3 + L4 | Tab/Arrow keys navigate all UI focusable elements | All buttons receive focus in Tab order, Enter activates | Playwright: Tab through UI, assert focus order, verify Enter |

**Phase 5 Test Deliverables:**
- `tests/editmode/results/P5-ui-state-machines.json` — State transition tests
- `tests/playmode/results/P5-hud-sync.json` — UI-data sync tests
- `tests/e2e/videos/P5-ui-flow.mp4` — Complete UI navigation video
- `tests/accessibility/audits/P5-ui-audit.json` — WCAG 2.1 AA results

---

### Phase 6: Level Design — 35 Levels (Week 5-6)

| # | Task | Test ID | Layer | Test Case | Pass Criteria | Verification Method |
|---|------|---------|-------|-----------|---------------|---------------------|
| 6.1 | Template T1: Tutorial levels (1-5) — 1-2 trucks, 10-12 m/s, gaps 3-4m | P6-T01 | L1 | Level parameters fall within T1 bounds | All 5 levels: truckCount∈[1,2], speed∈[10,12], gap∈[3,4] | EditMode: generate 5 levels from template T1, assert ranges |
| 6.2 | Template T2: Easy levels (6-10) — 2-3 trucks, 12-15 m/s, 1-2 hazards | P6-T02 | L1 | Level parameters fall within T2 bounds | All 5 levels: truckCount∈[2,3], speed∈[12,15], hazardCount∈[1,2] | EditMode: generate levels, assert parameters |
| 6.3 | Template T3: Medium levels (11-20) — 4-6 trucks, 15-18 m/s, 2-3 hazards | P6-T03 | L1 | Level parameters fall within T3 bounds | All 10 levels: truckCount∈[4,6], speed∈[15,18], hazardCount∈[2,3] | EditMode: generate levels, assert parameters |
| 6.4 | Template T4: Hard levels (21-30) — 6-8 trucks, 18-22 m/s, 3-4 hazards | P6-T04 | L1 | Level parameters fall within T4 bounds | All 10 levels: truckCount∈[6,8], speed∈[18,22], hazardCount∈[3,4] | EditMode: generate levels, assert parameters |
| 6.5 | Template T5: Expert levels (31-35) — 8-10 trucks, 22-25 m/s, 4-5 hazards | P6-T05 | L1 | Level parameters fall within T5 bounds | All 5 levels: truckCount∈[8,10], speed∈[22,25], hazardCount∈[4,5] | EditMode: generate levels, assert parameters |
| 6.6 | All 35 levels load without errors | P6-T06 | L2 | No null references, missing references, or scene load errors | `SceneManager.LoadScene` completes with zero Console errors | PlayMode: loop through all 35 scene names, attempt load |
| 6.7 | Levels 1-5 (Tutorial) completable by new player | P6-T07 | L3 | Average completion time < 30s per level, ≤ 2 deaths | Completion stats within tutorial bounds | Playwright: simulate new player input pattern, measure outcome |
| 6.8 | Levels 6-10 (Easy) completable with basic skill | P6-T08 | L3 | Completion time 30-90s, ≤ 3 deaths average | Within expected easy tier bounds | Playwright: simulate basic skill pattern |
| 6.9 | Levels 11-20 (Medium) completable with practice | P6-T09 | L3 | Completion time 60-180s, ≤ 5 deaths average | Within medium tier bounds | Playwright: simulate practiced pattern |
| 6.10 | Levels 21-30 (Hard) completable with skill | P6-T10 | L3 | Completion time 90-300s, ≤ 7 deaths average | Within hard tier bounds | Playwright: simulate expert pattern |
| 6.11 | Levels 31-35 (Expert) completable by expert player | P6-T11 | L3 | Completion time 120-400s, ≤ 10 deaths average | Within expert tier bounds | Playwright: expert pattern simulation |
| 6.12 | No impossible jumps (all gaps surmountable) | P6-T12 | L1 | Gap ≤ 80% of player max jump distance (with double-jump) | `gapSize ≤ maxJumpDistance * 0.8` for all gaps in all 35 levels | EditMode: compute max jump from physics params, compare all gaps |
| 6.13 | Difficulty progression is smooth (no sudden spikes) | P6-T13 | L4 | Difficulty index (speed×trucks+hazards) increases monotonically | Difficulty(t) ≤ Difficulty(t+1) * 1.2 (no >20% jumps) | EditMode: compute difficulty for all 35 levels, check monotonicity |
| 6.14 | All levels have consistent rhythm/pattern | P6-T14 | L1 | Formation phase ≥ 6s (T1) or ≥ 4s (T5) gives player reaction time | Formation times match template specs | EditMode: verify formationPhaseDuration for each level |
| 6.15 | Performance: 35-level run sustained ≥50 FPS | P6-T15 | L4 | Average FPS ≥50, minimum frame time ≤20ms over full run | DevTools: profile 35-level sequence | Chrome DevTools: full run profile |

**Phase 6 Test Deliverables:**
- `tests/editmode/results/P6-level-generation.json` — 5 parameter validation tests
- `tests/playmode/results/P6-scene-loading.json` — 35 scene load tests
- `tests/e2e/reports/P6-all-levels.json` — All 35 level completion reports
- `tests/e2e/screenshots/P6-each-level-complete.png` — 1 screenshot per level completion
- `tests/performance/profiles/P6-35level-run.json` — Full run profile

---

### Phase 7: Polish & Optimization (Week 7)

| # | Task | Test ID | Layer | Test Case | Pass Criteria | Verification Method |
|---|------|---------|-------|-----------|---------------|---------------------|
| 7.1 | Particle effects for jump, death, hazards | P7-T01 | L3 | VFX appears on each game event | Jump VFX, death VFX, saw blade VFX, debris VFX visible | Playwright: trigger events, capture screenshot showing VFX |
| 7.2 | Sound effects for all game events | P7-T02 | L3 | Jump sound, death sound, hazard proximity audio play | Audio levels match expected decibel range | Playwright: check audio output via Web Audio API |
| 7.3 | WebGL build size < 50 MB | P7-T03 | L1 | `du -sh Builds/WebGL/` output < 50M | File size ≤ 50,000,000 bytes | Terminal: `du -sb Builds/WebGL/ | awk '{print $1}'` |
| 7.4 | Load time < 10 seconds | P7-T04 | L3 | Time from page load to first frame < 10s | `performance.timing.domContentLoadedEventEnd` < 10000ms | Playwright: measure navigation timing |
| 7.5 | Zero critical bugs | P7-T05 | L3 | No game-breaking issues found | 0 bugs with severity Critical | Systematic-debugging: 4-phase analysis of all found issues |
| 7.6 | Difficulty balancing (no impossible segments) | P7-T06 | L3 | Every segment has a reachable solution | Automated pattern recognition finds ≤ 2 unreachable segments in 100 attempts | Playwright: random player pattern, measure success rate |
| 7.7 | Memory growth < 10% over 5 level transitions | P7-T07 | L4 | Heap size increase ≤ 10% after 5 level loads/unloads | `(finalHeap - initialHeap) / initialHeap ≤ 0.10` | DevTools: record heap at start, after 5 transitions, compare |
| 7.8 | Draw calls < 150 with 35-level assets | P7-T08 | L4 | Renderer stats within budget | `GL.GetCounters().drawCalls ≤ 150` | DevTools: capture render stats during gameplay |
| 7.9 | Texture compression (ASTC/DXT) verified | P7-T09 | L1 | All textures use WebGL-compressed format | Texture format in `ASTC/DXT/ETC2` | EditMode: scan all TextureImporter assets, verify format |
| 7.10 | All models under 500 triangles | P7-T10 | L1 | Triangle count ≤ 500 per model | `mesh.triangles.Length / 3 ≤ 500` for every model | EditMode: scan all MeshFilter assets, check triangle count |

**Phase 7 Test Deliverables:**
- `tests/editmode/results/P7-asset-audit.json` — Asset validation results
- `tests/e2e/reports/P7-polish.json` — VFX/audio verification
- `tests/performance/profiles/P7-optimization.json` — FPS, memory, draw calls
- `tests/e2e/screenshots/P7-build-size.png` — File size screenshot

---

### Phase 8: Testing & Verification (Week 8)

| # | Task | Test ID | Layer | Test Case | Pass Criteria | Verification Method |
|---|------|---------|-------|-----------|---------------|---------------------|
| 8.1 | Full 35-level playthrough by automated agent | P8-T01 | L3 | Agent navigates from Level 1 to Level 35 completion | All 35 levels marked complete in test results | Playwright: automated sequence of all 35 levels |
| 8.2 | Edge case: rapid input (spam jump, strafe) | P8-T02 | L3 | No physics glitches, no infinite jump exploits | Player state remains valid, no unintended flight | Playwright: send 100 jump inputs in 1 second |
| 8.3 | Edge case: pause during hazard contact | P8-T03 | L3 | Pause resolves safely, unpause from safe state | No death from paused state, resume on truck not ground | Playwright: pause mid-hazard, unpause, verify survival |
| 8.4 | Edge case: alt-tab during gameplay | P8-T04 | L3 | Audio continues, physics pauses, resume works | No crash, sound persists, game state preserved | Playwright: simulate focus loss, verify state |
| 8.5 | Edge case: minimum window resize | P8-T05 | L3 | WebGL canvas resizes, game remains playable | No clipping, input still responsive at small sizes | Playwright: resize viewport to 800×600, test |
| 8.6 | Performance: 60 FPS sustained on target hardware | P8-T06 | L4 | Average FPS ≥ 55 on test hardware | DevTools: ≥55 FPS average over 5-minute gameplay | Chrome DevTools: extended profile run |
| 8.7 | Accessibility: colorblind modes function | P8-T07 | L3 | Protanopia/Deuteranopia/Tritanopia modes toggle correctly | Visual output changes per mode, no critical info lost | Playwright: toggle each mode, verify visual difference |
| 8.8 | Accessibility: control remapping persists | P8-T08 | L3 | Remapped keys survive level reload | Remap "W → S", load new level, S still works as up | Playwright: remap, reload, test |
| 8.9 | Cross-browser: Chrome, Firefox, Safari | P8-T09 | L3 | Game runs on all 3 browsers | No errors, input works, FPS comparable | Playwright: run on all 3 engines (if available), compare |
| 8.10 | Final build: production-ready WebGL artifact | P8-T10 | L1 | All above tests pass, build artifact ready for delivery | Comprehensive pass report + build artifact at `Builds/WebGL/` | Checklist sign-off |

**Phase 8 Test Deliverables:**
- `tests/e2e/reports/P8-final-playthrough.json` — Full game results
- `tests/e2e/videos/P8-edge-cases.mp4` — Edge case demonstrations
- `tests/performance/profiles/P8-60fps-sustained.json` — Extended profile
- `tests/accessibility/audits/P8-final-audit.json` — Complete WCAG report
- `tests/e2e/reports/P8-cross-browser.json` — Browser comparison matrix
- **Final Artifact:** `Builds/WebGL/` — Complete WebGL build directory

---

## 4. Test Data & Fixtures

| Fixture | Description | Location |
|---------|-------------|----------|
| Level Templates | 5 templates with parameter variations | `tests/fixtures/level_templates.json` |
| Physics Values | Standardized gravity, mass, force values | `tests/fixtures/physics_constants.json` |
| Input Mocks | Simulated keyboard/mouse event sequences | `tests/fixtures/input_patterns.json` |
| Asset Placeholders | Low-poly models for testing | `Assets/Prefabs/Placeholders/` |
| Test Levels | 5 minimal test scenes (one per phase) | `scenes/test_*.tscn` |

---

## 5. Pass/Fail Thresholds Summary

| Category | Pass Threshold | Fail Consequence |
|----------|---------------|------------------|
| Unit Tests (L1) | 100% pass rate | Blocks commit |
| Integration Tests (L2) | 100% pass rate | Blocks WebGL build |
| E2E Tests (L3) | 100% pass rate | Blocks milestone approval |
| FPS Performance (L4) | ≥55 sustained (≥60 target) | Blocks sign-off, triggers optimization |
| Memory Growth (L4) | <10% over 5 transitions | Blocks sign-off, triggers leak hunt |
| Build Size | <50 MB total | Blocks release, triggers asset audit |
| Critical Bugs | 0 | Blocks all progression |
| Accessibility | WCAG 2.1 AA, 0 critical violations | Blocks release |

---

## 6. Test Execution Orchestration

```
Code Change
    │
    ▼
┌─────────────────┐
│  L1: Unit Tests  │ ← Blocks commit if any fail
│  (EditMode, <1s) │
└────────┬────────┘
         │ PASS
         ▼
┌──────────────────────────┐
│  L2: Integration Tests   │ ← Blocks WebGL build if any fail
│  (PlayMode, <30s)        │
└────────┬─────────────────┘
         │ PASS
         ▼
┌──────────────────────────┐
│  L3: E2E Playwright      │ ← Blocks milestone approval
│  (Browser, 1-5 min)      │
└────────┬─────────────────┘
         │ PASS
         ▼
┌──────────────────────────┐
│  L4: Performance Profiling│ ← Final gate, triggers optimization if needed
│  (DevTools, 2-10 min)     │
└────────┬─────────────────┘
         │ PASS
         ▼
   ✅ Milestone Complete
```

---

## 7. Game Design Document

### Core Mechanics

| Mechanic | Description | Implementation |
|----------|-------------|----------------|
| **Auto-Run** | Player runs forward automatically | Constant forward velocity on player |
| **Jump** | Single jump to clear gaps | Physics-based jump with configurable force |
| **Double-Jump** | Second jump mid-air | State machine tracking jump count |
| **Wall-Climb** | Climb vertical truck surfaces | Raycast detection + ladder-like movement |
| **Strafe** | Left/right movement | A/D or Arrow keys for lateral movement |
| **Death** | Fall between trucks or touch ground | Trigger colliders on ground/gaps |

### Truck System

| Component | Responsibility |
|-----------|----------------|
| **TruckController** | Individual truck movement (acceleration, braking, swerving) |
| **TruckClusterManager** | Spawns trucks, manages cluster formation/breaking patterns |
| **TruckPhysics** | Physics material, collision layers, moving platform behavior |

### Hazards

| Hazard | Behavior | Kill Condition |
|--------|----------|----------------|
| **Saw Blades** | Spinning obstacles on truck roofs | Contact = instant death |
| **Ramps** | Launch player vertically | Can be used strategically or cause fall |
| **Falling Debris** | Drops from above, concussive explosions | Direct hit = death, sound distraction |
| **Swinging Hammers** | Pendulum-style obstacles | Contact = knockback or death |

### Level Design

| Aspect | Details |
|--------|---------|
| **Total Levels** | 35 |
| **Structure** | 5 difficulty tiers (7 levels each) |
| **Progression** | Same core mechanics, increasing truck speed, tighter gaps, more hazards |
| **Pattern** | Each level has repeating rhythm underneath chaos |

### UI/UX Requirements

| Screen | Elements |
|--------|----------|
| **Main Menu** | Start Game, Level Select, Settings, Credits |
| **HUD** | Current level, lives remaining, time elapsed |
| **Level Complete** | Success screen, next level button, time bonus |
| **Game Over** | Retry button, level select, main menu |
| **Pause Menu** | Resume, Restart, Main Menu, Settings |

---

## 8. Technical Architecture

### Input System Configuration (Complete Specification)
**Godot 4 InputMap Configuration Required**: Set up in `project.godot` `[input]` section

**Input Actions Asset**: `Assets/Input/InputActions.inputactions`

#### Action Maps & Controls

| Action Map | Action | Control Type | Default Binding | Description |
|------------|--------|--------------|-----------------|-------------|
| **Player** | Jump | Button | Spacebar | Primary jump (triggers single/double jump) |
| **Player** | StrafeLeft | Axis (1D) | A / Left Arrow | Move left |
| **Player** | StrafeRight | Axis (1D) | D / Right Arrow | Move right |
| **Player** | Climb | Button | W / Up Arrow | Wall-climb activation (contextual) |
| **Player** | Pause | Button | Escape / P | Pause game |
| **UI** | NavigateUp | Axis (2D) | Arrow Up | Navigate UI up |
| **UI** | NavigateDown | Axis (2D) | Arrow Down | Navigate UI down |
| **UI** | Submit | Button | Enter | Select UI element |
| **UI** | Cancel | Button | Escape | Back out of UI |

#### WebGL-JS Bridge Specification (Phase 1 Deliverable)

**Purpose:** Enable Playwright tests to read game state without relying on Chrome dev-only APIs.

**Design Rules:**
- All bridge methods must be AOT-compatible (no virtual method overrides exposed)
- No `GameObject.SendMessage` to C# (breaks in AOT)
- Use `[MonoPInvokeCallback]` or `[DllExport]` for cross-platform compatibility
- Wrap all GDScript calls in try/catch with safe defaults

**Bridge API Surface (11 functions):**

| Function | Return Type | Description | AOT Safe? |
|----------|-------------|-------------|-----------|
| `getPlayerY()` | `float` | Player's Y position | ✅ Yes |
| `getPlayerX()` | `float` | Player's X position | ✅ Yes |
| `isPlayerGrounded()` | `bool` | Player touching ground | ✅ Yes |
| `isPlayerClimbing()` | `bool` | Player wall-climbing | ✅ Yes |
| `isPlayerDead()` | `bool` | Player dead state | ✅ Yes |
| `getTruckPositions()` | `string` | JSON array of truck X/Y | ✅ Yes (string return) |
| `getCurrentFPS()` | `int` | Current FPS sample | ✅ Yes |
| `getHeapSizeMB()` | `float` | Application heap in MB | ✅ Yes |
| `getTotalTextureBytes()` | `long` | Total texture memory bytes | ✅ Yes |
| `getCurrentLevel()` | `int` | Current level number | ✅ Yes |
| `getLivesRemaining()` | `int` | Player lives left | ✅ Yes |

**Implementation pattern:**
```gdscript
# WebGLBridge.gd — GDScript for Godot 4
@tool
extends Node

# Called from Godot → triggers JS callback via JavaScript.evaluate()
static func _on_player_position(x: float, y: float) -> void:
    JavaScript.call("onPlayerPosition", x, y)

# Exposed to JS via JavaScriptBridge (Godot 4)
func get_player_state_json() -> String:
    var state := {
        "y": $Player.position.y,
        "grounded": is_grounding,
        "climbing": is_climbing,
        "dead": is_dead,
        "level": GameManager.current_level,
        "lives": GameManager.lives
    }
    return JSON.stringify(state)
```

**Playwright usage:**
```python
# Instead of game.getPlayerY()
player_state = page.evaluate("window.gameBridge.getState()")
# Returns JSON: {"y": 5.2, "grounded": true, "climbing": false, ...}
```

### Save/Load System (Phase 1 Deliverable)

**Storage:** `localStorage` (WebGL-compatible, persists across sessions)

**Data Format:** JSON strings under `clusterRush_*` keys

**Keys:**
| Key | Content | Example |
|-----|---------|---------|
| `clusterRush_unlockedLevels` | Comma-separated level numbers | `"1,2,3"` |
| `clusterRush_bestTimes` | JSON object of level→time | `{"1":45.2,"2":67.8}` |
| `clusterRush_settings` | JSON of preferences | `{"volume":0.7,"controls":"default"}` |

**Usage:**
```csharp
// SaveSystem.cs
public static class SaveSystem
{
    public static void SaveLevelUnlock(int level) {
        var unlocked = PlayerPrefs.GetInt("unlocked", 0);
        if (level > unlocked) PlayerPrefs.SetInt("unlocked", level);
        PlayerPrefs.Save(); // localStorage in WebGL
    }
    
    public static int GetUnlockedLevel() {
        return PlayerPrefs.GetInt("unlocked", 1);
    }
}
```

### WebGL Constraints (Critical — Read Before Coding)

**Single-Threaded Warning:** Godot WebGL runs on a single JavaScript thread. ALL GDScript, physics, rendering, and game logic share one thread.

**Required Patterns:**
- Physics MUST run in `_physics_process()`, never `_process()`
- No `new` allocations in `_process()` — use object pooling
- No blocking calls: `await`, infinite loops, `OS.delay_msec()` in per-frame methods
- Heavy computation should be split across multiple frames
- Use `call_deferred()` instead of threads for background work

**Never Do:**
- ❌ Never use `Thread` class (not supported in WebGL)
- ❌ Never use infinite loops in `_process()` or `_physics_process()`
- ❌ Never allocate memory in per-frame methods (use object pooling)
- ❌ Never call `get_node()` repeatedly (cache with `@onready`)
- ❌ Never use `yield` without proper await handling
- ❌ Never call virtual methods from bridge code (AOT breakage)

### Texture Compression by Browser

| Browser | Format | Settings |
|---------|--------|----------|
| Chrome/Edge | ASTC | `TextureImporter.compressionQuality = TextureImporterCompressionQuality.ETC2_HDR` |
| Firefox | ETC2 | `TextureImporter.isReadable = false` |
| Safari | DXT/BC | `ASTC format if available` |

### Object Pooling Requirements

| Object | Pool Size | Rationale |
|--------|-----------|-----------|
| Saw Blades | 10 | Max 4 active per level + 6 spawn buffer |
| Falling Debris | 15 | Spawns at rate, must not GC-allocate |
| Particle Effects | 20 | VFX burst on death/jump/hazard |
| Ramps | 5 | Per level, reuse across levels |
| Hammers | 8 | Pendulum objects, persistent |

### Project Structure

```
ClusterRush/
├── Assets/
│   ├── Scenes/
│   │   ├── main_menu.tscn
│   │   ├── game.tscn
│   │   ├── level_01.tscn through level_35.tscn
│   │   ├── level_select.tscn
│   │   ├── credits.tscn
│   │   └── end_screen.tscn
│   ├── Scripts/
│   │   ├── Player/
│   │   │   ├── PlayerMovement.cs
│   │   │   ├── PlayerJump.cs
│   │   │   ├── PlayerClimb.cs
│   │   │   └── PlayerState.cs
│   │   ├── Truck/
│   │   │   ├── TruckController.cs
│   │   │   ├── TruckClusterManager.cs
│   │   │   ├── TruckPattern.cs
│   │   │   └── TruckSpawner.cs
│   │   ├── Hazards/
│   │   │   ├── SawBlade.cs
│   │   │   ├── FallingDebris.cs
│   │   │   ├── Ramp.cs
│   │   │   └── SwingingHammer.cs
│   │   ├── Camera/
│   │   │   └── FirstPersonCamera.cs
│   │   ├── UI/
│   │   │   ├── MainMenuUI.cs
│   │   │   ├── HUD.cs
│   │   │   ├── LevelCompleteUI.cs
│   │   │   └── PauseMenu.cs
│   │   ├── Managers/
│   │   │   ├── GameManager.cs
│   │   │   ├── LevelManager.cs
│   │   │   └── AudioManager.cs
│   │   └── Utilities/
│   │       ├── Singleton.cs
│   │       └── Extensions.cs
│   ├── Prefabs/
│   │   ├── Player.prefab
│   │   ├── Truck.prefab
│   │   ├── Hazards/
│   │   │   ├── SawBlade.prefab
│   │   │   ├── FallingDebris.prefab
│   │   │   └── Ramp.prefab
│   │   └── UI/
│   ├── Materials/
│   │   ├── TruckMaterials/
│   │   ├── HazardMaterials/
│   │   └── EnvironmentMaterials/
│   ├── Models/
│   │   └── (imported truck/hazard models)
│   ├── Textures/
│   ├── Audio/
│   │   ├── SFX/
│   │   └── Music/
│   └── Settings/
│       ├── PhysicsMaterials/
│       └── InputActions.inputactions
├── ProjectSettings/
├── WebGLTemplates/
│   └── Default/
├── Builds/
├── Tests/
└── Documentation/
```

### Asset Sourcing Strategy

**Asset Acquisition Plan** - All assets sourced before Phase 2 begins

| Asset Type | Source | Specific Assets | Cost | Notes |
|------------|--------|-----------------|------|-------|
| **3D Truck Models** | Polyfork / Kenney | Low poly truck variants | Free | MIT license, consistent scale |
| **3D Hazard Models** | Kenney.nl (free) | Low poly props | Free | Saw blades, ramps, debris, hammers |
| **Environment Textures** | Poly Haven | Ground textures, skybox | Free | 2K textures, PBR materials |
| **UI Graphics** | Kenney Assets | UI icons, buttons, fonts | Free | Consistent low-poly aesthetic |
| **Audio SFX** | Freesound.org (CC0) | Jump, death, hazard sounds | Free | Use `AudioStreamPlayer3D` for SFX |
| **Audio Music** | OpenGameArt | 2-3 background tracks | Free | Upbeat, non-distracting |

**Recommended Free Asset Packages:**
1. **Low Poly Vehicles Pack** (Kenney) - Free
2. **Low Poly Nature/Environment** (Kenney) - Free
3. **FreesoundHub** (Asset Store) - Free, in-editor sound search
4. **Polyfork** - Free 335 low-poly models, MIT license

**Asset Pipeline Workflow:**
1. Week 1: Source placeholder assets (free for prototyping)
2. Week 3: Replace with final assets after mechanics testing
3. Optimization: All textures 1K-2K max, compressed for WebGL
4. Organization: Standard Assets/ folder structure (Models/, Textures/, Audio/, Prefabs/)

**Quality Criteria:**
- All models under 500 triangles (WebGL performance)
- Textures compressed (DXT/ASTC for WebGL)
- Audio files in OGG format
- Consistent scale (1 Godot unit = 1 meter)

---

## 9. Build Processor

### BuildProcessor.cs — Custom WebGL Build Script

```gdscript
# Editor/BuildProcessor.gd
extends EditorPlugin
# WebGL export hook for production build configuration
# Configures Brotli compression, memory limits, and optimization settings

func _enter_tree():
	add_custom_type("WebGLBuildHook", "EditorScript", preload("res://scripts/utilities/build_processor.gd"), null)
```

```gdscript
# scripts/utilities/build_processor.gd
# WebGL Build Configuration for Godot 4
# Configures export preset settings for production builds
        
        // Build
        var report = BuildPipeline.BuildPlayer(
            GetScenes(),
            targetPath,
            BuildTarget.WebGL,
            BuildOptions.None
        );
        
        if (report.summary.result == BuildResult.Succeeded)
            Debug.Log($"WebGL build succeeded: {report.summary.outputSize} bytes");
        else
            Debug.LogError($"WebGL build failed: {report.summary.error}");
    }
    
    static string[] GetScenes()
    {
        var scenes = new System.Collections.Generic.List<string>();
        foreach (var scene in EditorBuildSettings.scenes)
        {
            if (scene.enabled)
                scenes.Add(scene.path);
        }
        return scenes.ToArray();
    }
}
```

---

## 10. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Depth perception issues | High | Medium | Test with real players early, adjust camera FOV |
| Physics precision | High | Low | Use FixedUpdate, tune gravity/scale |
| WebGL performance | Medium | Medium | Object pooling, LOD, texture compression |
| Browser compatibility | Medium | Low | Test Chrome, Firefox, Safari early |
| Asset performance | Medium | Medium | Triangle budget enforcement, memory profiling |

---

## 11. Resource Requirements

| Resource | Specification |
|----------|---------------|
| **Unity Version** | 2022.3 LTS (LTS for stability) |
| **Input System** | com.unity.inputsystem@1.7.0+ |
| **Target FPS** | 60 (pass threshold ≥55) |
| **Memory Budget** | 256MB (WebGL default) |
| **Build Size** | <50 MB |
| **Asset Budget** | Free (Polyfork, Kenney, Freesound) |
| **Model Budget** | <500 triangles per model |

---

## 12. Commands, Code Style, and Boundaries

### Code Style
- C# conventions: PascalCase for public members, camelCase for private
- No magic numbers — use named constants
- Each script: <200 lines, single responsibility
- No `GameObject.Find()` — use references, events, or Singleton pattern

### Unity-Specific "Never Do"
- ❌ No `Thread.Sleep()`, `async/await` without `Yield`
- ❌ No `SendMessage()` (AOT unsafe)
- ❌ No `new` in `Update()` or `FixedUpdate()`
- ❌ No physics in `Update()` — use `FixedUpdate()`
- ❌ No `GameObject.Find()` per frame
- ❌ No virtual method overrides in WebGL bridge

### Required Patterns
- ✅ Physics in `FixedUpdate()`
- ✅ Object pooling for frequently spawned objects
- ✅ `Singleton<T>` pattern for managers
- ✅ ScriptableObjects for level data/hazard configs
- ✅ `Coroutine` for non-physics timing

---

## 13. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| **Colorblind modes** | Protanopia/Deuteranopia/Tritanopia toggle in Settings |
| **Control remapping** | Full remapping in Settings, persists via localStorage |
| **Visual cues** | Non-color-dependent hazard indicators |
| **Audio cues** | Critical events have audio + visual feedback |
| **Input buffering** | 0.1s input buffer for forgiving controls |
| **One-handed presets** | Simplified control scheme option |

---

## 14. Success Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| All 35 levels completable | Yes | Manual + automated playthrough |
| FPS ≥60 sustained | ≥55 pass | Chrome DevTools profiling |
| Build size <50 MB | Yes | `du -sb Builds/WebGL/` |
| Zero critical bugs | 0 | Systematic debugging review |
| Accessibility WCAG 2.1 AA | 0 critical violations | Audit report |
| All 4 testing layers pass | 100% | Test matrix sign-off |

---

## 15. Commands / Style / Boundaries

- `@game-dev` owns all Unity C# scripting and project setup
- `@implementer` assists with file creation and configuration
- `@reviewer` reviews all code before commit
- `@researcher` provides WebGL optimization guidance
- All code must pass 4-layer testing before approval
- No changes to production branch without approval

---

## 16. Approval Checklist

- [x] Plan authored and peer-reviewed
- [x] All 4 testing approaches documented
- [x] WebGL-JS Bridge specification defined
- [x] Save/load system specification defined
- [x] WebGL constraints documented
- [x] Asset sourcing plan finalized (free)
- [x] Section ordering verified
- [x] FPS thresholds standardized
- [ ] Phase 1 execution started

---

## 17. Next Steps

1. **Phase 1 Kickoff**: @game-dev starts project scaffold
2. **Unity Install**: @game-dev installs Unity Hub + 2022.3 LTS
3. **Research Parallel**: @researcher continues WebGL optimization findings
4. **Testing Prep**: @reviewer prepares test fixtures

**Document Owner:** boss_bot
**Last Updated:** 2026-08-28
**Status:** Approved
