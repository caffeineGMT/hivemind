#!/usr/bin/env node
/**
 * Emergency dispatch script: Assign idle engineers to TODO tasks
 * Usage: node scripts/dispatch-engineers.js [company-id]
 */

import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const companyId = process.argv[2] || "0b059754-01ab-4d84-bfd9-77a6f5954666"; // Hivemind Engine

console.log(`\n🚀 Dispatching idle engineers for company: ${companyId.slice(0, 8)}...\n`);

// Get all TODO tasks
const todoTasks = db.prepare(`
  SELECT id, title, status
  FROM tasks
  WHERE company_id = ? AND status = 'todo'
  ORDER BY
    CASE
      WHEN title LIKE '[URGENT]%' THEN 0
      WHEN title LIKE '[CRITICAL]%' THEN 1
      WHEN title LIKE '[BUG]%' THEN 2
      ELSE 3
    END,
    created_at
`).all(companyId);

// Get idle engineers (excluding leadership roles for now)
const idleEngineers = db.prepare(`
  SELECT id, name, role
  FROM agents
  WHERE company_id = ? AND status = 'idle' AND name LIKE 'eng-%'
  ORDER BY created_at
  LIMIT ?
`).all(companyId, todoTasks.length);

if (todoTasks.length === 0) {
  console.log("✅ No TODO tasks found. All tasks are assigned!");
  process.exit(0);
}

if (idleEngineers.length === 0) {
  console.log("⚠️  No idle engineers available. All engineers are busy!");
  console.log(`   ${todoTasks.length} tasks waiting in TODO queue.`);
  process.exit(0);
}

console.log(`📋 Found ${todoTasks.length} TODO tasks`);
console.log(`👥 Found ${idleEngineers.length} idle engineers\n`);

// Assign tasks to engineers
const updateTask = db.prepare(`
  UPDATE tasks
  SET status = 'in_progress',
      assignee_id = ?,
      updated_at = datetime('now')
  WHERE id = ?
`);

const updateAgent = db.prepare(`
  UPDATE agents
  SET status = 'running',
      updated_at = datetime('now')
  WHERE id = ?
`);

let assigned = 0;
for (let i = 0; i < Math.min(todoTasks.length, idleEngineers.length); i++) {
  const task = todoTasks[i];
  const engineer = idleEngineers[i];

  try {
    updateTask.run(engineer.id, task.id);
    updateAgent.run(engineer.id);

    const truncatedTitle = task.title.length > 60
      ? task.title.substring(0, 57) + "..."
      : task.title;

    console.log(`✅ Assigned: ${engineer.name} → ${truncatedTitle}`);
    assigned++;
  } catch (err) {
    console.error(`❌ Failed to assign ${engineer.name}: ${err.message}`);
  }
}

console.log(`\n📊 Dispatched ${assigned} engineer(s) to work on tasks.`);

if (todoTasks.length > idleEngineers.length) {
  const remaining = todoTasks.length - idleEngineers.length;
  console.log(`⏳ ${remaining} task(s) still waiting for available engineers.`);
}

db.close();
