#!/usr/bin/env node

/**
 * TDD Progress Tracker
 * For agents to track TDD-based project progress
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const trackerDir = join(projectRoot, 'tracker');

class TDDTracker {
  constructor() {
    this.loadData();
  }
  
  loadData() {
    try {
      const configPath = join(trackerDir, 'tdd_tracker_config.json');
      const registryPath = join(trackerDir, 'task_registry.json');
      
      this.config = JSON.parse(readFileSync(configPath, 'utf8'));
      this.registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    } catch (error) {
      console.error('❌ Failed to load tracker data:', error.message);
      process.exit(1);
    }
  }
  
  saveData() {
    try {
      const configPath = join(trackerDir, 'tdd_tracker_config.json');
      const registryPath = join(trackerDir, 'task_registry.json');
      
      this.config.current_status.last_updated = new Date().toISOString();
      writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      writeFileSync(registryPath, JSON.stringify(this.registry, null, 2));
    } catch (error) {
      console.error('❌ Failed to save tracker data:', error.message);
    }
  }
  
  showStatus() {
    const status = this.config.current_status;
    
    console.log('📊 TDD PROGRESS TRACKER');
    console.log('='.repeat(40));
    console.log('Project: cluster-rush');
    console.log('Board: cluster-rush');
    console.log('Phase:', status.phase);
    console.log('Day:', status.day);
    console.log('Current Task:', status.current_task);
    console.log('TDD Cycle:', status.tdd_cycle_step);
    console.log('Last Updated:', status.last_updated);
    console.log('');
    
    console.log('📋 TASKS BY PHASE:');
    
    let totalTasks = 0;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    
    for (const phase of this.registry.tdd_tasks) {
      console.log('\n' + phase.phase + ':');
      
      for (const day of phase.days) {
        console.log('  Day ' + day.day + ':');
        
        for (const task of day.tasks) {
          totalTasks++;
          
          // Status icon
          let icon = '❓';
          if (task.status === 'completed') {
            icon = '✅';
            completed++;
          } else if (task.status === 'pending') {
            icon = '⏳';
            pending++;
          } else if (task.status.includes('red') || task.status.includes('green') || task.status === 'refactor') {
            icon = '🔴';
            inProgress++;
          }
          
          console.log('    ' + icon + ' ' + task.id + ' (' + task.status + '): ' + task.description);
        }
      }
    }
    
    console.log('');
    console.log('📈 SUMMARY:');
    console.log('  Total Tasks:', totalTasks);
    console.log('  Completed:', completed);
    console.log('  In Progress:', inProgress);
    console.log('  Pending:', pending);
    console.log('');
    
    console.log('🤖 AGENT ASSIGNMENTS:');
    for (const [agent, info] of Object.entries(this.config.agent_assignments)) {
      console.log('  ' + agent.padEnd(12) + ':', info.current_assignment);
    }
    
    console.log('');
    console.log('🎯 CURRENT TDD CYCLE: ' + status.tdd_cycle_step.toUpperCase());
    console.log('  🔴 RED: Write failing test');
    console.log('  🔴✓ RED_VERIFIED: Tester confirms failure');
    console.log('  🟢 GREEN: Minimal implementation');
    console.log('  🟢✓ GREEN_VERIFIED: Tester confirms functionality');
    console.log('  🔧 REFACTOR: Clean code');
    console.log('  ✅ COMPLETED: All checks passed');
  }
  
  showHelp() {
    console.log('\n🎮 TDD PROGRESS TRACKER COMMANDS:');
    console.log('');
    console.log('  node tracker/working_tracker.js status    Show current progress');
    console.log('  node tracker/init_tracker.js             Initialize tracker');
    console.log('');
    console.log('📚 Documentation:');
    console.log('  • tracker/agent_workflow.md - Agent instructions');
    console.log('  • tracker/task_registry.json - All TDD tasks');
    console.log('  • TDD_PLAN.md - Original TDD plan');
    console.log('');
    console.log('🚀 Start TDD workflow:');
    console.log('  1. Review TDD_PLAN.md for task details');
    console.log('  2. Follow agent_workflow.md for your role');
    console.log('  3. Update tracker files after each step');
    console.log('  4. Always verify with real browser tests');
  }
}

// Main execution
const tracker = new TDDTracker();
const command = process.argv[2] || 'help';

if (command === 'status') {
  tracker.showStatus();
} else {
  tracker.showHelp();
}
