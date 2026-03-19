#!/usr/bin/env node
/**
 * Hivemind Operations Status Report
 * Generates a comprehensive view of company operations
 */

import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");

const db = new Database(DB_PATH);

const companyId = process.argv[2] || "0b059754-01ab-4d84-bfd9-77a6f5954666";

const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(companyId);

console.log("\n" + "=".repeat(80));
console.log(`🏢 HIVEMIND OPERATIONS STATUS: ${company.name}`);
console.log("=".repeat(80));

// Task breakdown
const taskStats = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM tasks
  WHERE company_id = ?
  GROUP BY status
`).all(companyId);

console.log("\n📊 TASK STATUS:");
taskStats.forEach(({ status, count }) => {
  const emoji = {
    done: "✅",
    in_progress: "🔄",
    todo: "📋",
    backlog: "📦",
    blocked: "🚫"
  }[status] || "❓";
  console.log(`   ${emoji} ${status.padEnd(15)} ${count}`);
});

const totalTasks = taskStats.reduce((sum, s) => sum + s.count, 0);
const doneTasks = taskStats.find(s => s.status === "done")?.count || 0;
const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
console.log(`   ${"─".repeat(30)}`);
console.log(`   Total: ${totalTasks} tasks | Progress: ${progressPct}%`);

// Agent breakdown
const agentStats = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM agents
  WHERE company_id = ?
  GROUP BY status
`).all(companyId);

console.log("\n👥 AGENT STATUS:");
agentStats.forEach(({ status, count }) => {
  const emoji = {
    running: "⚙️",
    idle: "💤",
    error: "❌",
    recovering: "🔧"
  }[status] || "❓";
  console.log(`   ${emoji} ${status.padEnd(15)} ${count}`);
});

// Active work
const activeWork = db.prepare(`
  SELECT
    a.name,
    substr(t.title, 1, 55) as task_title,
    t.priority
  FROM agents a
  JOIN tasks t ON t.assignee_id = a.id
  WHERE a.company_id = ?
    AND a.status = 'running'
    AND t.status = 'in_progress'
  ORDER BY
    CASE t.priority
      WHEN 'critical' THEN 0
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      ELSE 3
    END,
    t.created_at
`).all(companyId);

console.log("\n🚀 ACTIVE WORK (In Progress):");
if (activeWork.length === 0) {
  console.log("   (No active work)");
} else {
  activeWork.forEach(({ name, task_title, priority }) => {
    const priorityEmoji = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🟢"
    }[priority] || "⚪";
    console.log(`   ${priorityEmoji} ${name.padEnd(16)} → ${task_title}`);
  });
}

// Idle resources
const idleAgents = db.prepare(`
  SELECT COUNT(*) as count
  FROM agents
  WHERE company_id = ? AND status = 'idle'
`).get(companyId);

const todoTasks = db.prepare(`
  SELECT COUNT(*) as count
  FROM tasks
  WHERE company_id = ? AND status = 'todo'
`).get(companyId);

console.log("\n⏳ AVAILABLE RESOURCES:");
console.log(`   💤 Idle engineers: ${idleAgents.count}`);
console.log(`   📋 Unassigned tasks: ${todoTasks.count}`);

// Recent activity
const recentActivity = db.prepare(`
  SELECT
    agent_id,
    action,
    detail,
    datetime(created_at, 'localtime') as time
  FROM activity_log
  WHERE company_id = ?
  ORDER BY created_at DESC
  LIMIT 5
`).all(companyId);

console.log("\n📝 RECENT ACTIVITY:");
if (recentActivity.length === 0) {
  console.log("   (No recent activity)");
} else {
  recentActivity.forEach(({ agent_id, action, detail, time }) => {
    const msg = detail || action;
    const shortMsg = msg.length > 50 ? msg.substring(0, 47) + "..." : msg;
    const agentName = agent_id ? agent_id.slice(0, 12) : "system";
    console.log(`   [${time}] ${agentName.padEnd(14)} ${action.padEnd(10)} ${shortMsg}`);
  });
}

// Recommendations
console.log("\n💡 RECOMMENDATIONS:");
if (todoTasks.count > 0 && idleAgents.count > 0) {
  console.log("   ⚠️  Dispatch idle engineers to TODO tasks");
} else if (todoTasks.count > 0 && idleAgents.count === 0) {
  console.log("   ⏸️  All engineers busy. TODO tasks waiting for resources.");
} else if (activeWork.length === 0 && doneTasks === totalTasks) {
  console.log("   🎉 All tasks complete! Ready for sprint planning.");
} else {
  console.log("   ✅ Operations running smoothly. All tasks assigned.");
}

console.log("\n" + "=".repeat(80) + "\n");

db.close();
