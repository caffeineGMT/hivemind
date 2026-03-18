import Database from "better-sqlite3";
import { DB_PATH, ensureDirs } from "./config.js";

let _db;

export function getDb() {
  if (_db) return _db;
  ensureDirs();
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      workspace TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT,
      reports_to TEXT REFERENCES agents(id),
      status TEXT NOT NULL DEFAULT 'idle',
      tmux_window TEXT,
      pid INTEGER,
      last_heartbeat TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      parent_id TEXT REFERENCES tasks(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT REFERENCES agents(id),
      created_by_id TEXT REFERENCES agents(id),
      result TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL,
      agent_id TEXT,
      task_id TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function createCompany({ id, name, goal, workspace }) {
  const db = getDb();
  db.prepare("INSERT INTO companies (id, name, goal, workspace) VALUES (?, ?, ?, ?)").run(id, name, goal, workspace);
  return { id, name, goal, workspace };
}

export function getCompany(id) {
  return getDb().prepare("SELECT * FROM companies WHERE id = ?").get(id);
}

export function getActiveCompany() {
  return getDb().prepare("SELECT * FROM companies WHERE status = 'active' ORDER BY created_at DESC LIMIT 1").get();
}

export function listCompanies() {
  return getDb().prepare("SELECT * FROM companies ORDER BY created_at DESC").all();
}

export function createAgent({ id, companyId, name, role, title, reportsTo }) {
  const db = getDb();
  db.prepare("INSERT INTO agents (id, company_id, name, role, title, reports_to) VALUES (?, ?, ?, ?, ?, ?)").run(id, companyId, name, role, title, reportsTo);
  return { id, companyId, name, role, title, reportsTo };
}

export function getAgent(id) {
  return getDb().prepare("SELECT * FROM agents WHERE id = ?").get(id);
}

export function getAgentsByCompany(companyId) {
  return getDb().prepare("SELECT * FROM agents WHERE company_id = ?").all(companyId);
}

export function getAgentsByRole(companyId, role) {
  return getDb().prepare("SELECT * FROM agents WHERE company_id = ? AND role = ?").all(companyId, role);
}

export function updateAgentStatus(id, status, extra = {}) {
  const db = getDb();
  const sets = ["status = ?", "last_heartbeat = datetime('now')"];
  const vals = [status];
  if (extra.tmuxWindow !== undefined) { sets.push("tmux_window = ?"); vals.push(extra.tmuxWindow); }
  if (extra.pid !== undefined) { sets.push("pid = ?"); vals.push(extra.pid); }
  vals.push(id);
  db.prepare(`UPDATE agents SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function createTask({ id, companyId, parentId, title, description, priority, assigneeId, createdById }) {
  const db = getDb();
  db.prepare(
    "INSERT INTO tasks (id, company_id, parent_id, title, description, priority, assignee_id, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, companyId, parentId, title, description, priority || "medium", assigneeId, createdById);
  return { id, title, description, priority, assigneeId };
}

export function getTasksByCompany(companyId, status) {
  if (status) return getDb().prepare("SELECT * FROM tasks WHERE company_id = ? AND status = ?").all(companyId, status);
  return getDb().prepare("SELECT * FROM tasks WHERE company_id = ?").all(companyId);
}

export function getTasksByAssignee(assigneeId, status) {
  if (status) return getDb().prepare("SELECT * FROM tasks WHERE assignee_id = ? AND status = ?").all(assigneeId, status);
  return getDb().prepare("SELECT * FROM tasks WHERE assignee_id = ?").all(assigneeId);
}

export function updateTaskStatus(id, status, result) {
  const db = getDb();
  db.prepare("UPDATE tasks SET status = ?, result = ?, updated_at = datetime('now') WHERE id = ?").run(status, result, id);
}

export function assignTask(taskId, agentId) {
  getDb().prepare("UPDATE tasks SET assignee_id = ?, status = 'todo', updated_at = datetime('now') WHERE id = ?").run(agentId, taskId);
}

export function logActivity({ companyId, agentId, taskId, action, detail }) {
  getDb().prepare("INSERT INTO activity_log (company_id, agent_id, task_id, action, detail) VALUES (?, ?, ?, ?, ?)").run(companyId, agentId, taskId, action, detail);
}

export function getRecentActivity(companyId, limit = 20) {
  return getDb().prepare("SELECT * FROM activity_log WHERE company_id = ? ORDER BY created_at DESC LIMIT ?").all(companyId, limit);
}
