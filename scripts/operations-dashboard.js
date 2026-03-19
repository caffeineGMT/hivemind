#!/usr/bin/env node
/**
 * 24/7 Operations Dashboard - Real-time Company Status
 * Shows: running engineers, task pipeline, sprint status, resource utilization
 */

import * as db from "../src/db.js";
import { execSync } from "node:child_process";

const database = db.getDb();

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║         HIVEMIND 24/7 OPERATIONS DASHBOARD                ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

const companies = db.listCompanies().filter(c => c.status === 'active');

// Check heartbeat monitors
const resumeProcesses = execSync("ps aux | grep 'hivemind.js resume' | grep -v grep || true").toString().trim().split("\n").filter(Boolean);
const monitoredCompanies = resumeProcesses.map(line => {
  const match = line.match(/resume ([a-f0-9]{8})/);
  return match ? match[1] : null;
}).filter(Boolean);

console.log(`📊 SYSTEM STATUS: ${companies.length} active companies, ${monitoredCompanies.length} heartbeat monitors running\n`);

let totalRunning = 0;
let totalTodo = 0;
let totalBacklog = 0;
let totalDone = 0;
let totalInProgress = 0;

for (const company of companies) {
  const prefix = company.id.slice(0, 8);
  const hasMonitor = monitoredCompanies.includes(prefix) ? '✓' : '✗';

  console.log(`━━━ ${company.name} (${prefix}) [Sprint ${company.sprint}] ${hasMonitor} ━━━`);

  const agents = db.getAgentsByCompany(company.id);
  const engineers = agents.filter(a => a.role === 'engineer');
  const running = engineers.filter(a => a.status === 'running').length;
  const idle = engineers.filter(a => a.status === 'idle').length;
  totalRunning += running;

  const tasks = db.getTasksByCompany(company.id);
  const workTasks = tasks.filter(t => !t.title.startsWith("[PROJECT]"));

  const backlog = workTasks.filter(t => t.status === 'backlog').length;
  const todo = workTasks.filter(t => t.status === 'todo').length;
  const inProgress = workTasks.filter(t => t.status === 'in_progress').length;
  const done = workTasks.filter(t => t.status === 'done').length;
  const blocked = workTasks.filter(t => t.status === 'blocked').length;

  totalBacklog += backlog;
  totalTodo += todo;
  totalInProgress += inProgress;
  totalDone += done;

  console.log(`   Engineers: ${running} working, ${idle} idle (${engineers.length} total)`);
  console.log(`   Pipeline:  ${backlog} backlog → ${todo} ready → ${inProgress} building → ${done} shipped`);
  if (blocked > 0) console.log(`   ⚠️  ${blocked} tasks blocked`);

  // Status assessment
  if (workTasks.length > 0 && done === workTasks.length) {
    console.log(`   🎯 ALL DONE! Sprint planning will trigger automatically.`);
  } else if (todo + backlog > 0 && inProgress < 5) {
    console.log(`   ⚡ ${todo + backlog} tasks waiting for engineers (dispatch in progress...)`);
  } else if (inProgress > 0) {
    console.log(`   🔄 ${inProgress} tasks actively building...`);
  }

  // Recent activity
  const recentActivity = db.getRecentActivity(company.id, 2);
  if (recentActivity.length > 0) {
    const latest = recentActivity[0];
    const timeAgo = Math.floor((Date.now() - new Date(latest.created_at).getTime()) / 60000);
    console.log(`   Latest:    ${latest.action} (${timeAgo}m ago)`);
  }

  console.log("");
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📈 TOTALS: ${totalRunning} engineers working | ${totalBacklog} backlog | ${totalTodo} ready | ${totalInProgress} active | ${totalDone} completed`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Cost summary
const allCompanies = companies.map(c => c.id);
let totalCost = 0;
let totalTokens = 0;
for (const companyId of allCompanies) {
  const costTotals = db.getCostTotals(companyId);
  if (costTotals) {
    totalCost += costTotals.total_cost_usd || 0;
    totalTokens += costTotals.total_tokens || 0;
  }
}

console.log(`💰 Total spend: $${totalCost.toFixed(2)} | ${(totalTokens / 1000000).toFixed(1)}M tokens`);

// Health check
const allHealthy = monitoredCompanies.length === companies.length;
if (allHealthy) {
  console.log("✅ All companies have active heartbeat monitors. System running 24/7.\n");
} else {
  const missing = companies.filter(c => !monitoredCompanies.includes(c.id.slice(0, 8)));
  console.log(`⚠️  WARNING: ${missing.length} companies missing heartbeat monitors:`);
  for (const c of missing) {
    console.log(`   - ${c.name} (${c.id.slice(0, 8)}) - run: node bin/hivemind.js resume ${c.id.slice(0, 8)}`);
  }
  console.log("");
}

console.log("🔄 Auto-dispatch: Idle engineers assigned to tasks every heartbeat cycle");
console.log("🎯 Auto-sprint: CEO plans next sprint when all tasks complete");
console.log("🏥 Auto-recovery: Failed agents restart with exponential backoff\n");
