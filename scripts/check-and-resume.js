#!/usr/bin/env node
/**
 * Check database state and resume operations
 */

import * as db from "../src/db.js";

// Initialize database (creates schema if needed)
const database = db.getDb();

console.log("\n=== HIVEMIND SYSTEM STATUS ===\n");

// List all companies
const companies = db.listCompanies();
console.log(`Companies: ${companies.length}`);
for (const company of companies) {
  console.log(`  - ${company.name} (${company.id.slice(0, 8)}): ${company.status}, sprint ${company.sprint}`);
  console.log(`    Goal: ${company.goal}`);
  console.log(`    Workspace: ${company.workspace}`);

  // Get agents
  const agents = db.getAgentsByCompany(company.id);
  console.log(`    Agents: ${agents.length} (${agents.filter(a => a.status === 'running').length} running)`);
  for (const agent of agents) {
    const statusIcon = agent.status === 'running' ? '●' : '○';
    console.log(`      ${statusIcon} ${agent.name} (${agent.role}): ${agent.status}${agent.pid ? ` [PID ${agent.pid}]` : ''}`);
  }

  // Get tasks
  const tasks = db.getTasksByCompany(company.id);
  const workTasks = tasks.filter(t => !t.title.startsWith("[PROJECT]"));
  const byStatus = {
    backlog: workTasks.filter(t => t.status === 'backlog').length,
    todo: workTasks.filter(t => t.status === 'todo').length,
    in_progress: workTasks.filter(t => t.status === 'in_progress').length,
    done: workTasks.filter(t => t.status === 'done').length,
    blocked: workTasks.filter(t => t.status === 'blocked').length
  };
  console.log(`    Tasks: ${workTasks.length} total`);
  console.log(`      ◻ backlog: ${byStatus.backlog}`);
  console.log(`      ◻ todo: ${byStatus.todo}`);
  console.log(`      ▶ in_progress: ${byStatus.in_progress}`);
  console.log(`      ✓ done: ${byStatus.done}`);
  console.log(`      ✗ blocked: ${byStatus.blocked}`);

  // Check if all tasks are done (sprint planning needed)
  if (workTasks.length > 0 && byStatus.done === workTasks.length) {
    console.log(`\n    🎯 ALL TASKS COMPLETE! Sprint planning needed.`);
  } else if (byStatus.todo + byStatus.backlog > 0 && byStatus.in_progress === 0) {
    console.log(`\n    ⚡ ${byStatus.todo + byStatus.backlog} tasks ready for dispatch!`);
  } else if (byStatus.in_progress > 0) {
    console.log(`\n    🔄 ${byStatus.in_progress} tasks in progress...`);
  }

  console.log("");
}

if (companies.length === 0) {
  console.log("\nNo companies found. Database initialized but empty.");
  console.log("Run: node bin/hivemind.js start \"Your goal here\"");
}

console.log("\n=== END STATUS ===\n");
