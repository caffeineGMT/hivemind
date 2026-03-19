#!/usr/bin/env node
/**
 * Urgent Task Dispatcher
 * Assigns all TODO tasks to idle engineers
 */

import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const companyId = "0b059754-01ab-4d84-bfd9-77a6f5954666"; // Hivemind Engine

console.log("\n🚨 URGENT DISPATCH: Assigning TODO tasks to idle engineers...\n");

// Get all TODO tasks
const todoTasks = db.prepare(`
  SELECT id, title
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

// Get idle engineers
const idleEngineers = db.prepare(`
  SELECT id, name
  FROM agents
  WHERE company_id = ? AND status = 'idle' AND name LIKE 'eng-%'
  ORDER BY created_at
`).all(companyId);

console.log(`📋 TODO tasks: ${todoTasks.length}`);
console.log(`👥 Idle engineers: ${idleEngineers.length}\n`);

if (todoTasks.length === 0) {
  console.log("✅ No TODO tasks. All work is assigned!\n");
  db.close();
  process.exit(0);
}

if (idleEngineers.length === 0) {
  console.log("⚠️  No idle engineers. All engineers are busy!\n");
  db.close();
  process.exit(0);
}

// Assign tasks
const assignTask = db.prepare(`
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

const logActivity = db.prepare(`
  INSERT INTO activity_log (company_id, agent_id, task_id, action, detail)
  VALUES (?, ?, ?, 'task_assigned', ?)
`);

let dispatched = 0;
const numToAssign = Math.min(todoTasks.length, idleEngineers.length);

for (let i = 0; i < numToAssign; i++) {
  const task = todoTasks[i];
  const engineer = idleEngineers[i];

  try {
    db.transaction(() => {
      assignTask.run(engineer.id, task.id);
      updateAgent.run(engineer.id);
      logActivity.run(companyId, engineer.id, task.id, task.title);
    })();

    const shortTitle = task.title.length > 55
      ? task.title.substring(0, 52) + "..."
      : task.title;

    console.log(`✅ ${engineer.name} → ${shortTitle}`);
    dispatched++;
  } catch (err) {
    console.error(`❌ Failed to assign ${engineer.name}: ${err.message}`);
  }
}

console.log(`\n📊 Dispatched ${dispatched}/${todoTasks.length} tasks`);

if (todoTasks.length > idleEngineers.length) {
  const waiting = todoTasks.length - idleEngineers.length;
  console.log(`⏳ ${waiting} task(s) still waiting for engineers\n`);
} else {
  console.log(`🎉 All TODO tasks are now assigned!\n`);
}

db.close();
