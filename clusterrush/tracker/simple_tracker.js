#!/usr/bin/env node

/**
 * Simple TDD Progress Tracker Utility
 * For agents to update and query project progress
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const trackerDir = path.join(projectRoot, 'tracker');

class TDDTracker {
  constructor() {
    this.config = this.loadConfig();
    this.registry = this.loadRegistry();
  }
  
  loadConfig() {
    const configPath = path.join(trackerDir, 'tdd_tracker_config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  
  loadRegistry() {
    const registryPath = path.join(trackerDir, 'task_registry.json');
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  }
  
  saveConfig() {
    const configPath = path.join(trackerDir, 'tdd_tracker_config.json');
    this.config.current_status.last_updated = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
  }
  
  saveRegistry() {
    const registryPath = path.join(trackerDir, 'task_registry.json');
    fs.writeFileSync(registryPath, JSON.stringify(this.registry, null, 2));
  }
  
  getCurrentStatus() {
    return {
      project: this.config.tdd_progress_tracker.project,
      board: this.config.tdd_progress_tracker.kanban_board,
      phase: this.config.current_status.phase,
      day: this.config.current_status.day,
      current_task: this.config.current_status.current_task,
      tdd_cycle: this.config.current_status.tdd_cycle_step,
      last_updated: this.config.current_status.last_updated
    };
  }
  
  reportProgress() {
    const status = this.getCurrentStatus();
    
    console.log('📊 TDD PROGRESS REPORT');
    console.log('='.repeat(40));
    console.log('Project:', status.project);
    console.log('Kanban Board:', status.board);
    console.log('Current Phase:', status.phase);
    console.log('Current Day:', status.day);
    console.log('Current Task:', status.current_task);
    console.log('TDD Cycle:', status.tdd_cycle);
    console.log('Last Updated:', status.last_updated);
    console.log('');
    
    console.log('📋 TASK STATUS BREAKDOWN:');
    let completed = 0;
    let pending = 0;
    let red = 0;
    let green = 0;
    
    for (const phase of this.registry.tdd_tasks) {
      console.log('\n' + phase.phase + ':');
      for (const day of phase.days) {
        console.log('  Day ' + day.day + ':');
        for (const task of day.tasks) {
          const statusIcon = {
            'completed': '✅',
            'pending': '⏳',
            'red': '🔴',
            'red_verified': '🔴✓',
            'green': '🟢',
            'green_verified': '🟢✓',
            'refactor': '🔧'
          }[task.status] || '❓';
          
          console.log('    ' + statusIcon + ' ' + task.id + ': ' + task.description + ' (' + task.status + ')');
          
          if (task.status === 'completed') completed++;
          if (task.status === 'pending') pending++;
          if (task.status.includes('red')) red++;
          if (task.status.includes('green')) green++;
        }
      }
    }
    
    console.log('\n📈 SUMMARY:');
    console.log('  Completed:', completed);
    console.log('  In Progress (RED):', red);
    console.log('  In Progress (GREEN):', green);
    console.log('  Pending:', pending);
    console.log('  Total:', completed + red + green + pending);
    
    console.log('\n🤖 ACTIVE AGENTS:');
    for (const [agent, info] of Object.entries(this.config.agent_assignments)) {
      console.log('  ' + agent + ':', info.current_assignment);
    }
  }
  
  help() {
    console.log('\n🎮 TDD Progress Tracker Commands:');
    console.log('');
    console.log('  node tracker/simple_tracker.js status    Show progress report');
    console.log('  node tracker/init_tracker.js            Initialize tracker');
    console.log('');
    console.log('📚 Full tracker available at: tracker/tracker.js (ESM)');
    console.log('📖 Agent workflow: tracker/agent_workflow.md');
  }
}

// Main execution
const [command] = process.argv.slice(2);
const tracker = new TDDTracker();

if (command === 'status') {
  tracker.reportProgress();
} else {
  tracker.help();
}
