# TDD TRACKER QUICK REFERENCE

## COMMANDS
init      - node tracker/init_tracker.js
status    - node tracker/working_tracker.js status
workflow  - cat tracker/agent_workflow.md

## CURRENT STATUS
Project: cluster-rush
Board: cluster-rush  
Current: TDD-1.1 (RED phase)
Phase: Week 1, Day 1
Agents: boss_bot, game_dev, game_tester

## AGENT ACTIONS NOW

### boss_bot (Orchestrator)
1. Create kanban task: "[RED] TDD-1.1: Initialize project"
2. Assign to: game_dev
3. Description: "Write failing test for npm run test"
4. Create verification task for game_tester

### game_dev (Developer)
1. Wait for RED phase task assignment
2. Write failing test in tests/unit/
3. Verify test fails: npm test
4. Request verification from game_tester

### game_tester (QA)
1. Wait for verification task
2. Verify RED phase: test fails
3. Run browser test: game not rendering
4. Update tracker: TDD-1.1 → red_verified

## TDD CYCLE
🔴 RED: Write failing test
🔴✓ RED_VERIFIED: Tester confirms failure
🟢 GREEN: Minimal implementation
🟢✓ GREEN_VERIFIED: Tester confirms functionality
🔧 REFACTOR: Clean code
✅ COMPLETED: All checks passed

## KANBAN TASK TEMPLATE
hermes kanban create --board cluster-rush --assignee <agent> \
  --title "[PHASE] <task-id>: <description>" \
  --description "<detailed instructions>"

## BROWSER TEST COMMANDS
# For game_tester
browser_exec('run npm test')
browser_exec('load http://localhost:5173')
browser_exec('test keyboard input')

## EMERGENCY
Violation → Stop, revert, report to boss_bot
Failure → Document, block task, update status
