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
  // Add 'read' column to comments if missing (for existing DBs)
  try {
    const cols = db.prepare("PRAGMA table_info(comments)").all();
    if (cols.length > 0 && !cols.find(c => c.name === "read")) {
      db.exec("ALTER TABLE comments ADD COLUMN read INTEGER NOT NULL DEFAULT 0");
    }
  } catch {}

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
      created_by_id TEXT,
      result TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL,
      task_id TEXT REFERENCES tasks(id),
      agent_id TEXT,
      author TEXT NOT NULL DEFAULT 'user',
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

    CREATE TABLE IF NOT EXISTS cost_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      task_id TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      num_turns INTEGER NOT NULL DEFAULT 0,
      model TEXT,
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
  if (status) return getDb().prepare("SELECT t.*, a.name as assignee_name FROM tasks t LEFT JOIN agents a ON t.assignee_id = a.id WHERE t.company_id = ? AND t.status = ?").all(companyId, status);
  return getDb().prepare("SELECT t.*, a.name as assignee_name FROM tasks t LEFT JOIN agents a ON t.assignee_id = a.id WHERE t.company_id = ?").all(companyId);
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
  getDb().prepare("UPDATE tasks SET assignee_id = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(agentId, taskId);
}

export function logActivity({ companyId, agentId, taskId, action, detail }) {
  getDb().prepare("INSERT INTO activity_log (company_id, agent_id, task_id, action, detail) VALUES (?, ?, ?, ?, ?)").run(companyId, agentId, taskId, action, detail);
}

export function addComment({ companyId, taskId, agentId, author, message }) {
  getDb().prepare("INSERT INTO comments (company_id, task_id, agent_id, author, message) VALUES (?, ?, ?, ?, ?)").run(companyId, taskId, agentId, author || "user", message);
}

export function getComments(taskId) {
  return getDb().prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC").all(taskId);
}

export function getUnreadComments(companyId) {
  return getDb().prepare("SELECT * FROM comments WHERE company_id = ? AND author = 'user' AND read = 0 ORDER BY created_at ASC").all(companyId);
}

export function markCommentsRead(commentIds) {
  if (!commentIds || commentIds.length === 0) return;
  const db = getDb();
  const stmt = db.prepare("UPDATE comments SET read = 1 WHERE id = ?");
  for (const id of commentIds) {
    stmt.run(id);
  }
}

export function getUnreadTaskComments(taskId) {
  return getDb().prepare("SELECT * FROM comments WHERE task_id = ? AND author = 'user' AND read = 0 ORDER BY created_at ASC").all(taskId);
}

export function getTask(id) {
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id);
}

export function getRecentActivity(companyId, limit = 20) {
  return getDb().prepare("SELECT * FROM activity_log WHERE company_id = ? ORDER BY created_at DESC LIMIT ?").all(companyId, limit);
}

// ── Cost tracking ──────────────────────────────────────────────────

export function logCost({ companyId, agentName, taskId, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, totalTokens, costUsd, durationMs, numTurns, model }) {
  getDb().prepare(
    `INSERT INTO cost_log (company_id, agent_name, task_id, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_tokens, cost_usd, duration_ms, num_turns, model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(companyId, agentName, taskId || null, inputTokens || 0, outputTokens || 0, cacheReadTokens || 0, cacheWriteTokens || 0, totalTokens || 0, costUsd || 0, durationMs || 0, numTurns || 0, model || null);
}

export function getCostsByCompany(companyId) {
  return getDb().prepare("SELECT * FROM cost_log WHERE company_id = ? ORDER BY created_at DESC").all(companyId);
}

export function getCostSummary(companyId) {
  return getDb().prepare(`
    SELECT
      agent_name,
      COUNT(*) as sessions,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(cache_read_tokens) as total_cache_read_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost_usd,
      SUM(duration_ms) as total_duration_ms,
      SUM(num_turns) as total_turns
    FROM cost_log
    WHERE company_id = ?
    GROUP BY agent_name
    ORDER BY total_cost_usd DESC
  `).all(companyId);
}

export function getCostTotals(companyId) {
  return getDb().prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(cache_read_tokens) as total_cache_read_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost_usd,
      SUM(duration_ms) as total_duration_ms,
      SUM(num_turns) as total_turns
    FROM cost_log
    WHERE company_id = ?
  `).get(companyId);
}
