#!/usr/bin/env node

/**
 * TDD Progress Tracker Utility
 * For agents to update and query project progress
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
  
  updateTaskStatus(taskId, newStatus, agent) {
    // Find and update task in registry
    for (const phase of this.registry.tdd_tasks) {
      for (const day of phase.days) {
        for (const task of day.tasks) {
          if (task.id === taskId) {
            const oldStatus = task.status;
            task.status = newStatus;
            task.last_updated = new Date().toISOString();
            task.updated_by = agent;
            
            console.log(`✅ Task ${taskId} updated: ${oldStatus} → ${newStatus} by ${agent}`);
            
            // Update current status if this is the current task
            if (taskId === this.config.current_status.current_task) {
              this.config.current_status.tdd_cycle_step = newStatus;
              console.log(`📊 Current cycle step updated to: ${newStatus}`);
            }
            
            this.saveRegistry();
            this.saveConfig();
            return true;
          }
        }
      }
    }
    
    console.error(`❌ Task ${taskId} not found in registry`);
    return false;
  }
  
  getNextTask() {
    for (const phase of this.registry.tdd_tasks) {
      for (const day of phase.days) {
        for (const task of day.tasks) {
          if (task.status === 'pending') {
            return {
              phase: phase.phase,
              day: day.day,
              task: task
            };
          }
        }
      }
    }
    return null;
  }
  
  advanceToNextTask(agent) {
    const nextTask = this.getNextTask();
    if (!nextTask) {
      console.log('🎉 All tasks completed!');
      return null;
    }
    
    // Update config to new task
    this.config.current_status = {
      phase: nextTask.phase,
      day: nextTask.day,
      current_task: nextTask.task.id,
      tdd_cycle_step: 'red',
      start_date: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    
    // Update task status
    this.updateTaskStatus(nextTask.task.id, 'red', agent);
    
    console.log(`🚀 Advanced to next task: ${nextTask.task.id}`);
    console.log(`📝 Description: ${nextTask.task.description}`);
    console.log(`📋 Phase: ${nextTask.phase} - Day ${nextTask.day}`);
    
    this.saveConfig();
    return nextTask;
  }
  
  getAgentAssignment(agentName) {
    return this.config.agent_assignments[agentName] || null;
  }
  
  updateAgentAssignment(agentName, assignment, dependencies = []) {
    if (!this.config.agent_assignments[agentName]) {
      console.error(`❌ Agent ${agentName} not found in assignments`);
      return false;
    }
    
    this.config.agent_assignments[agentName].current_assignment = assignment;
    this.config.agent_assignments[agentName].dependencies = dependencies;
    this.config.agent_assignments[agentName].last_updated = new Date().toISOString();
    
    console.log(`🤖 Agent ${agentName} assignment updated: ${assignment}`);
    this.saveConfig();
    return true;
  }
  
  reportProgress() {
    const status = this.getCurrentStatus();
    
    console.log('📊 TDD PROGRESS REPORT');
    console.log('='.repeat(40));
    console.log(`Project: ${status.project}`);
    console.log(`Kanban Board: ${status.board}`);
    console.log(`Current Phase: ${status.phase}`);
    console.log(`Current Day: ${status.day}`);
    console.log(`Current Task: ${status.current_task}`);
    console.log(`TDD Cycle: ${status.tdd_cycle}`);
    console.log(`Last Updated: ${status.last_updated}`);
    console.log('');
    
    // Task breakdown
    console.log('📋 TASK STATUS BREAKDOWN:');
    let completed = 0;
    let pending = 0;
    let red = 0;
    let green = 0;
    
    for (const phase of this.registry.tdd_tasks) {
      console.log(`
${phase.phase}:`);
      for (const day of phase.days) {
        console.log(`  Day ${day.day}:`);
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
          
          console.log(`    ${statusIcon} ${task.id}: ${task.description} (${task.status})`);
          
          if (task.status === 'completed') completed++;
          if (task.status === 'pending') pending++;
          if (task.status.includes('red')) red++;
          if (task.status.includes('green')) green++;
        }
      }
    }
    
    console.log('
📈 SUMMARY:');
    console.log(`  Completed: ${completed}`);
    console.log(`  In Progress (RED): ${red}`);
    console.log(`  In Progress (GREEN): ${green}`);
    console.log(`  Pending: ${pending}`);
    console.log(`  Total: ${completed + red + green + pending}`);
    
    // Agent status
    console.log('
🤖 ACTIVE AGENTS:');
    for (const [agent, info] of Object.entries(this.config.agent_assignments)) {
      console.log(`  ${agent}: ${info.current_assignment}`);
    }
  }
}

// Command line interface
async function main() {
  const tracker = new TDDTracker();
  const [command, ...args] = process.argv.slice(2);
  
  switch (command) {
    case 'status':
      tracker.reportProgress();
      break;
      
    case 'next':
      tracker.advanceToNextTask(args[0] || 'system');
      break;
      
    case 'update':
      if (args.length < 2) {
        console.log('Usage: node tracker.js update <taskId> <status> [agent]');
        return;
      }
      tracker.updateTaskStatus(args[0], args[1], args[2] || 'system');
      break;
      
    case 'assign':
      if (args.length < 2) {
        console.log('Usage: node tracker.js assign <agent> <assignment>');
        return;
      }
      tracker.updateAgentAssignment(args[0], args[1], args.slice(2));
      break;
      
    case 'current':
      console.log(JSON.stringify(tracker.getCurrentStatus(), null, 2));
      break;
      
    case 'help':
    default:
      console.log(`
🎮 TDD Progress Tracker Commands:

  status                    Show comprehensive progress report
  next <agent>             Advance to next pending task
  update <task> <status>   Update task status (agent optional)
  assign <agent> <task>    Assign task to agent
  current                  Show current task details
  help                     Show this help message

\nExamples:
  node tracker.js status
  node tracker.js next boss_bot
  node tracker.js update TDD-1.1 red_verified game_tester
  node tracker.js assign game_dev "Implement TDD-1.2 GREEN phase"
`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default TDDTracker;
