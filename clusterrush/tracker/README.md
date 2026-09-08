# TDD Project Progress Tracker

## Overview
A TDD-based progress tracking system for Cluster Rush game development. Allows multiple agents (boss_bot, game_dev, game_tester, etc.) to coordinate on test-driven development following the `TDD_PLAN.md`.

## Quick Start

### Initialize Tracker
```bash
cd /home/srinivasvkumar/vishruth/games/clusterrush
node tracker/init_tracker.js
```

### Check Current Status
```bash
node tracker/working_tracker.js status
```

### View Agent Workflow
```bash
cat tracker/agent_workflow.md
```

## Files Structure
```
tracker/
├── tdd_tracker_config.json     # Main tracking configuration
├── task_registry.json          # All TDD tasks with status
├── agent_workflow.md           # Agent instructions and workflow
├── working_tracker.js          # Main tracker utility (tested)
├── init_tracker.js             # Initialization script
├── tracker.js                  # Advanced tracker (ESM)
└── simple_tracker.js           # Backup tracker (CommonJS)
```

## Agent Roles

### boss_bot (Orchestrator)
- Breaks down TDD tasks from `TDD_PLAN.md`
- Creates kanban tasks on `cluster-rush` board
- Assigns tasks to appropriate agents
- Monitors TDD compliance

### game_dev (Game Developer)
- Writes failing tests first (RED phase)
- Implements minimal code (GREEN phase)
- Refactors code (REFACTOR phase)
- Never writes production code without failing test

### game_tester (QA / Browser Tester)
- Verifies RED phase failures
- Verifies GREEN phase functionality
- Runs real browser tests using `browser_exec`
- Validates cross-browser compatibility

## TDD Cycle States
1. **pending** - Task not started
2. **red** - Failing test written
3. **red_verified** - Tester confirmed failure
4. **green** - Minimal implementation passes test
5. **green_verified** - Tester confirmed functionality
6. **refactor** - Code cleaned, tests still pass
7. **completed** - All checks passed

## Kanban Integration

### Task Creation (boss_bot)
```bash
# RED phase task
hermes kanban create --board cluster-rush --assignee game_dev \
  --title "[RED] TDD-1.1: Initialize project with testing infrastructure" \
  --description "Write failing test for: npm run test should run empty test suite"

# Verification task
hermes kanban create --board cluster-rush --assignee game_tester \
  --title "[VERIFY] TDD-1.1-RED: Verify failing test" \
  --description "Verify RED phase: 1. Run npm test 2. Confirm test fails"
```

### Kanban Board Settings
- **Board**: `cluster-rush`
- **Max in progress**: 1 per profile
- **Failure limit**: 2
- **Default assignee**: orchestrator

## Real Browser Testing Commands

For game_tester verification:
```python
# RED phase verification
browser_exec('run npm test and verify test failure')
browser_exec('load game in browser, verify no rendering')

# GREEN phase verification
browser_exec('run npm test and verify test passes')
browser_exec('load game in browser, verify expected rendering')
browser_exec('test WASD input in browser')
```

## Workflow Example

### Starting a New TDD Cycle
1. **boss_bot**: Reviews `TDD_PLAN.md` for next task
2. **boss_bot**: Creates kanban task with RED phase description
3. **boss_bot**: Assigns to game_dev
4. **game_dev**: Writes failing test
5. **game_dev**: Requests verification from game_tester
6. **game_tester**: Verifies test fails (RED phase)
7. **game_dev**: Writes minimal implementation (GREEN phase)
8. **game_tester**: Verifies functionality with browser tests
9. **game_dev**: Refactors code while keeping tests passing
10. **game_tester**: Final verification with all tests
11. **boss_bot**: Marks task as completed

## TDD Compliance Rules

### MANDATORY (Never Skip)
1. Write failing test before any production code
2. Verify RED phase before starting GREEN phase
3. Run all existing tests after REFACTOR phase
4. Browser test verification for each GREEN phase

### VIOLATIONS (Immediate Action)
- Code written without test → DELETE code, start over
- Test passes immediately → Fix test to fail first
- "I'll test later" → Stop, revert to last TDD step
- Modifying code without test → Write test first

## Verification Checklist (Before Each Commit)

✅ All tests pass (unit + integration)
✅ Coverage report meets targets
✅ No console errors or warnings
✅ Browser test confirms functionality
✅ Code follows project style guide
✅ TDD cycle completed (RED→GREEN→REFACTOR)

## Progress Monitoring

### Daily Status Check
```bash
node tracker/working_tracker.js status
```

### Agent Assignment Check
```bash
cat tracker/tdd_tracker_config.json | grep -A 2 "agent_assignments"
```

### Task Completion Rate
```bash
node tracker/working_tracker.js status | grep -A 5 "SUMMARY"
```

## Emergency Procedures

### TDD Violation Detected
1. Stop all work on affected task
2. Revert to last valid TDD state
3. Report to boss_bot for re-assignment
4. Document violation in tracker errors

### Browser Test Failure
1. Document failure with screenshots
2. Report to game_dev with reproduction steps
3. Block task progression until resolved
4. Update task status to "blocked"

## Getting Started Now

1. **Review TDD plan**: Read `TDD_PLAN.md` for Week 1 tasks
2. **Initialize tracker**: `node tracker/init_tracker.js`
3. **Check status**: `node tracker/working_tracker.js status`
4. **Start workflow**: boss_bot create first kanban task
5. **Follow TDD**: game_dev write failing test for TDD-1.1

## References
- Original TDD Plan: `TDD_PLAN.md`
- Project Spec: `SPEC_DRIVEN_DEVELOPMENT.md`
- Rebuild Plan: `REBUILD_PLAN.md`
- Kanban Config: `~/.hermes/config.yaml`

---

**Status**: 🟢 READY - Tracker initialized, ready for TDD workflow
**Current Task**: TDD-1.1 (Initialize project with testing infrastructure)
**TDD Cycle**: RED phase (Write failing test)
**Next Action**: boss_bot create kanban task for game_dev
