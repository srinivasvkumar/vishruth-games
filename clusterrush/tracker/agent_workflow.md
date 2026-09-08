# TDD Progress Tracker - Agent Workflow Guide

## AGENT ROLES & RESPONSIBILITIES

### boss_bot (Project Manager / Orchestrator)
- Breaks down TDD_PLAN.md tasks into assignable units
- Creates kanban tasks with proper dependencies
- Monitors overall TDD compliance
- Assigns tasks to appropriate agents
- Escalates blockers to attention

WORKFLOW:
1. Read TDD plan phase (e.g., "Week 1, Day 1")
2. Create kanban tasks with TDD cycle steps
3. Assign game_dev for GREEN phase after RED verification
4. Assign game_tester for RED/GREEN verification
5. Update tracker_config.json with current status

### game_dev (Game Developer)
- Writes failing tests (RED phase) first
- Implements minimal code to pass tests (GREEN phase)
- Refactors code without changing behavior
- Creates/updates source files in src/ directory
- Never writes production code without failing test

WORKFLOW:
1. Check assigned task from boss_bot
2. Write failing test for expected behavior
3. Verify test fails (RED phase)
4. Write minimal implementation to pass test
5. Refactor code while keeping tests passing
6. Submit for verification by game_tester

### game_tester (QA / Browser Tester)
- Verifies RED phase (test fails as expected)
- Verifies GREEN phase (test passes with implementation)
- Runs real browser tests using browser-exec tool
- Validates cross-browser compatibility
- Ensures TDD compliance at each step

WORKFLOW:
1. Get verification request from game_dev
2. Run test suite to verify RED/GREEN phase
3. Execute real browser test using browser-exec
4. Validate visual rendering and input response
5. Update task status in tracker
6. Report failures back to game_dev

### researcher (Content Extraction)
- NOT involved in TDD cycle
- Handles documentation, analysis
- External to core development flow

### reviewer (Quality Gatekeeper)
- Reviews completed TDD cycles
- Ensures code quality standards
- Validates refactoring improvements
- Gates production merges

## TDD CYCLE AUTOMATION

### Task States Flow:
pending → red → red_verified → green → green_verified → refactor → completed

### Required Verification at Each State:
1. RED: Test must fail (not error)
2. RED_VERIFIED: Real browser test confirms expected failure
3. GREEN: Test must pass with minimal code
4. GREEN_VERIFIED: Browser test confirms functionality
5. REFACTOR: All tests still pass, coverage adequate
6. COMPLETED: Manual browser test fully successful

## KANBAN TASK TEMPLATES

### For boss_bot creating tasks:
```bash
hermes kanban create --board cluster-rush --assignee game_dev   --title "[RED] TDD-1.1: Initialize project with testing infrastructure"   --description "Write failing test for: npm run test should run empty test suite"
```

### Verification tasks:
```bash
hermes kanban create --board cluster-rush --assignee game_tester   --title "[VERIFY] TDD-1.1-RED: Verify failing test for project initialization"   --description "Verify RED phase: 1. Run npm test 2. Confirm test fails as expected 3. Run browser test to confirm"
```

## TRACKER INTEGRATION

All agents MUST update tracker files after each action:

1. **boss_bot**: Update tracker_config.json current_status
2. **game_dev**: Update task_registry.json task status
3. **game_tester**: Update verification status in both files

## REAL BROWSER TESTING COMMANDS

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

## EMERGENCY PROCEDURES

### TDD Violation Detected:
1. Stop all work on affected task
2. Revert to last valid TDD state
3. Report to boss_bot for re-assignment
4. Document violation in tracker errors

### Browser Test Failure:
1. Document failure details with screenshots
2. Report to game_dev with specific reproduction steps
3. Block task progression until resolved
4. Update task status to "blocked"

## STARTING THE FLOW

Current status: READY
Next action: boss_bot create first TDD task (TDD-1.1 RED phase)
Current board: cluster-rush
Agents available: boss_bot, game_dev, game_tester
