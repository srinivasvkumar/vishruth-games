#!/usr/bin/env node

/**
 * Initialize TDD Progress Tracker for new agent session
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🎬 INITIALIZING TDD PROGRESS TRACKER');
console.log('=' * 40);

// Load config
const trackerDir = path.join(projectRoot, 'tracker');
const configPath = path.join(trackerDir, 'tdd_tracker_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log(`Project: ${config.tdd_progress_tracker.project}`);
console.log(`Board: ${config.tdd_progress_tracker.kanban_board}`);
console.log(`Current Phase: ${config.current_status.phase}`);
console.log(`Current Day: ${config.current_status.day}`);
console.log(`Current Task: ${config.current_status.current_task}`);
console.log(`TDD Cycle: ${config.current_status.tdd_cycle_step}`);
console.log('');

// Agent assignments
console.log('🤖 AGENT ASSIGNMENTS:');
for (const [agent, info] of Object.entries(config.agent_assignments)) {
  console.log(`  ${agent.padEnd(15)}: ${info.current_assignment}`);
}

console.log('');
console.log('📋 TDD CYCLE REMINDER:');
console.log('  1. 🔴 RED: Write failing test first');
console.log('  2. 🔴✓ RED_VERIFIED: Tester verifies failure');
console.log('  3. 🟢 GREEN: Minimal implementation to pass');
console.log('  4. 🟢✓ GREEN_VERIFIED: Tester verifies functionality');
console.log('  5. 🔧 REFACTOR: Clean code, tests still pass');
console.log('  6. ✅ COMPLETED: All checks passed');
console.log('');

console.log('🚀 STARTING COMMANDS:');
console.log(`  cd ${projectRoot}`);
console.log(`  node tracker/tracker.js status`);
console.log(`  node tracker/tracker.js next <agent_name>`);
console.log('');

console.log('📚 AGENT WORKFLOW DOCUMENTATION:');
console.log(`  See tracker/agent_workflow.md for detailed instructions`);
console.log('');

console.log('🎯 VERIFICATION CHECKLIST (Before Each Commit):');
for (const item of config.verification_checklist.tdd_compliance) {
  console.log(`  • ${item}`);
}

console.log('');
console.log('✅ TRACKER INITIALIZED - READY FOR TDD DEVELOPMENT');
