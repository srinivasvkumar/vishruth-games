# Cluster Rush - Godot 4 Development Plan (v2.0)

**Status:** Phase 1 Complete | Phase 2 (Level Select) In Progress (Spec Review)
**Created:** 2026-08-26
**Last Updated:** 2026-08-29
**Target Platform:** WebGL (Local Browser / GitHub Pages)
**Engine:** Godot 4.7.2 (ARM64 Linux)
**Primary Language:** GDScript (Not C#)

---

## 1. Executive Summary

### Goal
Build a locally-runnable **Cluster Rush** clone in Godot 4 with proper UI/UX, physics-driven truck movement, and 35 levels of escalating difficulty.

### Success Criteria
- Player can jump, double-jump, wall-climb between moving trucks.
- Trucks move with physics-driven chaos (not scripted paths).
- 35 handcrafted levels with escalating difficulty.
- WebGL build runs smoothly in browser (60 FPS).
- All features tested and verified via **Assembly Line Workflow**.

---

## 2. The Assembly Line Workflow (New Standard)

We are switching to a strict **Spec-Driven, Test-Driven Development (SDD/TDD)** pipeline. No more reactive debugging.

### The Pipeline Stages
Every feature goes through these 5 stages. **One at a time.**

| Stage | Role | Input | Output | Gate |
|-------|------|-------|--------|------|
| **1. Spec** | Researcher | Feature request | `specs/FEATURE.md` | Approved Spec |
| **2. Test** | Game Tester | Spec | `tests/e2e/FEATURE.spec.ts` | Test Fails (Red) |
| **3. Code** | Game Dev | Spec + Test | `scenes/*.tscn` + `scripts/*.gd` | Spec Alignment |
| **4. Build** | Implementer | Code | WebGL Build (`index.html`/`.wasm`) | Build Success |
| **5. QA** | Game Tester | Build | E2E Pass Report | All Tests Green |

### Rules
1. **Spec First:** No code written until `specs/FEATURE.md` is approved.
2. **Test Before Code:** Playwright test must be written (and failing) before implementation.
3. **One Feature:** Only 1 item in "In Progress". Finish before starting next.
4. **Phase Lock:** Phase 1 is locked. No changes unless requested.

---

## 3. Team Roles

| Agent | Role | Responsibility |
|-------|------|----------------|
| **@boss_bot** | PM/Orchestrator | Enforce pipeline, track progress, dispatch tasks |
| **@game-dev** | Developer | Implement Godot scenes (`.tscn`) and scripts (`.gd`). **GDScript only.** |
| **@game-tester** | QA Lead | Write Playwright E2E tests, run QA gates. |
| **@implementer** | Build Engineer | Run builds, deploy to localhost/GitHub Pages, manage pipeline script. |
| **@researcher** | Spec Writer | Create detailed specs (`specs/FEATURE.md`). |
| **@reviewer** | Quality Gate | Review code against spec, sign-off on phases. |

---

## 4. Project Roadmap

### Phase 1: Main Menu (COMPLETE ✅)
- [x] Centered menu layout
- [x] 4 Buttons: Start, Level Select, Settings, Credits
- [x] Clickable buttons working
- [x] Canvas filling screen
- [x] **Locked.**

### Phase 2: Level Select (IN PROGRESS)
- [ ] **Spec:** `specs/level_select.md` (Drafted)
- [ ] **Test:** `tests/e2e/level_select.spec.ts` (Drafted)
- [ ] **Code:** `scenes/level_select.tscn` + `scripts/ui/level_select_ui.gd`
- [ ] **QA:** Grid of 35 levels, unlocked/locked states.

### Phase 3: Camera & Gameplay Core (Next)
- [ ] First-person camera logic
- [ ] Level loading logic
- [ ] HUD display (Score, Lives, Level)

### Phase 4: Hazards (Future)
- [ ] Saw blades, ramps, falling debris, swinging hammers
- [ ] Collision detection and death logic

### Phase 5: Audio & Polish (Future)
- [ ] Sound effects (jump, death, hazards)
- [ ] Particle effects
- [ ] VFX and music

### Phase 6: 35 Levels & Final Testing (Future)
- [ ] Create all 35 level scenes
- [ ] Full automated playthrough
- [ ] Cross-browser testing

---

## 5. Technical Architecture

### Core Mechanics
| Mechanic | Description | Implementation |
|----------|-------------|----------------|
| **Auto-Run** | Player runs forward automatically | Constant forward velocity |
| **Jump** | Single jump to clear gaps | Physics-based jump |
| **Double-Jump** | Second jump mid-air | State machine |
| **Wall-Climb** | Climb vertical truck surfaces | Raycast + ladder logic |
| **Strafe** | Left/right movement | A/D or Arrow keys |

### Level Parameters (Escalating Difficulty)

| Tier | Levels | Trucks | Speed (m/s) | Gap (m) | Hazards |
|------|--------|--------|-------------|---------|---------|
| T1 Tutorial | 1-5 | 1-2 | 10-12 | 3.0-4.0 | 0-1 |
| T2 Easy | 6-10 | 2-3 | 12-15 | 2.5-3.5 | 1-2 |
| T3 Medium | 11-20 | 4-6 | 15-18 | 2.0-3.0 | 2-3 |
| T4 Hard | 21-30 | 6-8 | 18-22 | 1.5-2.5 | 3-4 |
| T5 Expert | 31-35 | 8-10 | 22-25 | 1.0-2.0 | 4-5 |

---

## 6. Test Strategy (4 Layers)

All layers must pass before moving to "Done".

| Layer | Tool | Purpose | Gate |
|-------|------|---------|------|
| **L1: Unit** | Godot `--headless --test` | Logic tests (jump math, physics) | Blocks commit |
| **L2: Integration** | Godot `--test` (PlayMode) | Scene loading, component interaction | Blocks build |
| **L3: E2E** | Playwright | Browser automation (clicks, navigation) | Blocks sign-off |
| **L4: Performance** | DevTools | FPS profiling, memory checks | Optional/Polish |

---

## 7. Pipeline & Automation

### Local Pipeline (`scripts/pipeline.sh`)
One command: `./scripts/pipeline.sh`
1. Runs L1 Unit Tests
2. Runs L2 Integration Tests
3. Exports WebGL (`--export-release "Web"`)
4. Deploys to `http://localhost:8765`
5. Runs Playwright E2E Tests

### CI/CD (`.github/workflows/godot-ci.yml`)
- Runs on every push to `main`.
- Downloads Godot 4.7.2.
- Runs Tests → Builds → Deploys to GitHub Pages.

---

## 8. Spec Template (How We Write Specs)

Every feature starts here. **No code without this.**

```markdown
# Spec: [Feature Name]
## Status: [Draft | Approved | Complete]

## Purpose
Why this exists.

## Visual Spec
[ASCII Layout or Description]
- Colors: #HEX
- Font Sizes: PX
- Layout: CSS/Node structure

## Acceptance Criteria (Tests)
- [ ] Test: Title is visible
- [ ] Test: Button is clickable

## Technical Notes
- Scene: res://scenes/...
- Script: res://scripts/...

## Notes for Implementer
[Constraints, GDScript only, etc.]
```

---

## 9. Next Steps

1. **Phase 2 (Level Select):**
   - @researcher finalizes `specs/level_select.md`
   - @game-dev implements `level_select.tscn`
   - @game-tester runs E2E tests

2. **Phase 3 (Gameplay):**
   - Starts once Phase 2 is signed off.

---

**Document Owner:** boss_bot
**Last Updated:** 2026-08-29
**Status:** Approved & Implemented (Assembly Line Active)
