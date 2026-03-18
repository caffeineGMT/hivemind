import Database from "better-sqlite3";
import { DB_PATH, ensureDirs } from "./config.js";

let _db;
let globalBroadcast = null;

// Allow server to register broadcast function
export function setBroadcastFunction(broadcastFn) {
  globalBroadcast = broadcastFn;
}

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

  // Add 'sprint' column to companies if missing
  try {
    const cols = db.prepare("PRAGMA table_info(companies)").all();
    if (cols.length > 0 && !cols.find(c => c.name === "sprint")) {
      db.exec("ALTER TABLE companies ADD COLUMN sprint INTEGER NOT NULL DEFAULT 0");
    }
  } catch {}

  // Add 'deployment_url' column to companies if missing
  try {
    const cols = db.prepare("PRAGMA table_info(companies)").all();
    if (cols.length > 0 && !cols.find(c => c.name === "deployment_url")) {
      db.exec("ALTER TABLE companies ADD COLUMN deployment_url TEXT");
    }
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      workspace TEXT,
      sprint INTEGER NOT NULL DEFAULT 0,
      deployment_url TEXT,
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

    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      agent_id TEXT,
      metadata TEXT
    );


    CREATE TABLE IF NOT EXISTS checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      task_id TEXT NOT NULL REFERENCES tasks(id),
      turn_number INTEGER NOT NULL,
      state_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL REFERENCES companies(id),
      agent_id TEXT NOT NULL REFERENCES agents(id),
      task_id TEXT REFERENCES tasks(id),
      incident_type TEXT NOT NULL,
      description TEXT,
      recovery_action TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deployment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL REFERENCES companies(id),
      commit_sha TEXT NOT NULL,
      git_tag TEXT NOT NULL,
      deployment_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      health_check_passed INTEGER DEFAULT 0,
      health_check_error TEXT,
      deployed_at TEXT NOT NULL DEFAULT (datetime('now')),
      rolled_back_at TEXT,
      rollback_reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_usage_company_metric ON usage_logs(company_id, metric);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_agent ON checkpoints(agent_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_company ON incidents(company_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_company ON deployment_history(company_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployment_history(status);

    CREATE TABLE IF NOT EXISTS retry_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT,
      agent_name TEXT,
      attempt INTEGER NOT NULL,
      error_type TEXT NOT NULL,
      error_message TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_retry_logs_task ON retry_logs(task_id);

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      level TEXT NOT NULL,
      source TEXT,
      company_id TEXT,
      agent_id TEXT,
      task_id TEXT,
      action TEXT,
      metadata TEXT,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_company ON logs(company_id);
    CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);

    CREATE TABLE IF NOT EXISTS budget_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL REFERENCES companies(id),
      monthly_budget REAL NOT NULL,
      alert_threshold REAL NOT NULL DEFAULT 0.8,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(company_id)
    );

    CREATE INDEX IF NOT EXISTS idx_budget_company ON budget_config(company_id);

    CREATE TABLE IF NOT EXISTS project_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(company_id)
    );

    CREATE INDEX IF NOT EXISTS idx_project_config_company ON project_config(company_id);
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

export function updateCompany(id, updates) {
  const db = getDb();
  const sets = [];
  const vals = [];

  if (updates.name !== undefined) { sets.push("name = ?"); vals.push(updates.name); }
  if (updates.goal !== undefined) { sets.push("goal = ?"); vals.push(updates.goal); }
  if (updates.status !== undefined) { sets.push("status = ?"); vals.push(updates.status); }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  vals.push(id);

  db.prepare(`UPDATE companies SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

export function deleteCompany(id) {
  const db = getDb();
  // Delete in order: activity_log, comments, tasks, agents, company
  db.prepare("DELETE FROM activity_log WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM comments WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM cost_log WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM usage_logs WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM incidents WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM deployment_history WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM budget_config WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM project_config WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM tasks WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM agents WHERE company_id = ?").run(id);
  db.prepare("DELETE FROM companies WHERE id = ?").run(id);
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

  // Get agent info for broadcast
  const agent = getAgent(id);
  if (agent && globalBroadcast) {
    globalBroadcast('agent_status_changed', { agentId: id, status, companyId: agent.company_id });
  }
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

  // Get task info for broadcast
  const task = getTask(id);
  if (task && globalBroadcast) {
    globalBroadcast('task_updated', { taskId: id, status, companyId: task.company_id });
  }
}

export function assignTask(taskId, agentId) {
  getDb().prepare("UPDATE tasks SET assignee_id = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(agentId, taskId);

  // Get task info for broadcast
  const task = getTask(taskId);
  if (task && globalBroadcast) {
    globalBroadcast('task_updated', { taskId, status: 'in_progress', assigneeId: agentId, companyId: task.company_id });
  }
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

  // Broadcast cost update
  if (globalBroadcast) {
    globalBroadcast('cost_updated', { companyId, agentName, costUsd, totalTokens });
  }
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

export function updateCompanyDeploymentUrl(companyId, url) {
  getDb().prepare("UPDATE companies SET deployment_url = ? WHERE id = ?").run(url, companyId);
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

// ── Budget tracking ──────────────────────────────────────────────────

export function setBudget({ companyId, monthlyBudget, alertThreshold }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO budget_config (company_id, monthly_budget, alert_threshold)
    VALUES (?, ?, ?)
    ON CONFLICT(company_id) DO UPDATE SET
      monthly_budget = excluded.monthly_budget,
      alert_threshold = excluded.alert_threshold,
      updated_at = datetime('now')
  `).run(companyId, monthlyBudget, alertThreshold || 0.8);
}

export function getBudget(companyId) {
  return getDb().prepare("SELECT * FROM budget_config WHERE company_id = ?").get(companyId);
}

export function getCostsByTask(companyId) {
  return getDb().prepare(`
    SELECT
      task_id,
      COUNT(*) as sessions,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(cache_read_tokens) as total_cache_read_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost_usd,
      SUM(duration_ms) as total_duration_ms,
      SUM(num_turns) as total_turns
    FROM cost_log
    WHERE company_id = ? AND task_id IS NOT NULL
    GROUP BY task_id
    ORDER BY total_cost_usd DESC
  `).all(companyId);
}

export function getCostsByDateRange(companyId, startDate, endDate) {
  return getDb().prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as sessions,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost_usd
    FROM cost_log
    WHERE company_id = ?
      AND created_at >= ?
      AND created_at <= ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(companyId, startDate, endDate);
}

export function getCurrentMonthCosts(companyId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const costs = getDb().prepare(`
    SELECT SUM(cost_usd) as total_cost_usd
    FROM cost_log
    WHERE company_id = ?
      AND created_at >= ?
      AND created_at <= ?
  `).get(companyId, startOfMonth, endOfMonth);

  return costs?.total_cost_usd || 0;
}

// ── Usage tracking ──────────────────────────────────────────────────

export function logUsage({ companyId, metric, value, agentId, metadata }) {
  getDb().prepare(
    `INSERT INTO usage_logs (company_id, metric, value, agent_id, metadata)
     VALUES (?, ?, ?, ?, ?)`
  ).run(companyId, metric, value, agentId || null, metadata ? JSON.stringify(metadata) : null);
}

export function getUsageByMetric(companyId, metric, startDate = null) {
  let query = `
    SELECT
      SUM(value) as total_value,
      COUNT(*) as event_count,
      MIN(timestamp) as first_logged,
      MAX(timestamp) as last_logged
    FROM usage_logs
    WHERE company_id = ? AND metric = ?
  `;
  const params = [companyId, metric];

  if (startDate) {
    query += ` AND timestamp >= ?`;
    params.push(startDate);
  }

  return getDb().prepare(query).get(...params);
}

export function getCurrentMonthUsage(companyId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startDateStr = startOfMonth.toISOString().slice(0, 19).replace('T', ' ');

  const agentHours = getUsageByMetric(companyId, 'agent_hours', startDateStr);
  const apiCalls = getUsageByMetric(companyId, 'api_calls', startDateStr);

  return {
    agent_hours: agentHours?.total_value || 0,
    api_calls: apiCalls?.total_value || 0,
    period_start: startDateStr,
    period_end: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };
}

export function getUsageHistory(companyId, limit = 100) {
  return getDb().prepare(`
    SELECT * FROM usage_logs
    WHERE company_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(companyId, limit);
}

// ── Analytics tracking ──────────────────────────────────────────────────

// Cross-project analytics - aggregate metrics across ALL companies
export function getCrossProjectCostSummary() {
  return getDb().prepare(`
    SELECT
      c.id as company_id,
      c.name as company_name,
      c.deployment_url,
      COUNT(cl.id) as sessions,
      SUM(cl.input_tokens) as total_input_tokens,
      SUM(cl.output_tokens) as total_output_tokens,
      SUM(cl.cache_read_tokens) as total_cache_read_tokens,
      SUM(cl.total_tokens) as total_tokens,
      SUM(cl.cost_usd) as total_cost_usd,
      SUM(cl.duration_ms) as total_duration_ms,
      SUM(cl.num_turns) as total_turns
    FROM companies c
    LEFT JOIN cost_log cl ON c.id = cl.company_id
    WHERE c.status = 'active'
    GROUP BY c.id, c.name, c.deployment_url
    ORDER BY total_cost_usd DESC
  `).all();
}

export function getCrossProjectTaskMetrics() {
  return getDb().prepare(`
    SELECT
      c.id as company_id,
      c.name as company_name,
      COUNT(DISTINCT t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
      SUM(CASE WHEN t.status = 'backlog' OR t.status = 'todo' THEN 1 ELSE 0 END) as backlog_tasks,
      SUM(CASE WHEN t.status = 'blocked' THEN 1 ELSE 0 END) as blocked_tasks,
      SUM(CASE WHEN t.priority = 'urgent' THEN 1 ELSE 0 END) as urgent_tasks,
      SUM(CASE WHEN t.priority = 'high' THEN 1 ELSE 0 END) as high_priority_tasks
    FROM companies c
    LEFT JOIN tasks t ON c.id = t.company_id
    WHERE c.status = 'active'
    GROUP BY c.id, c.name
    ORDER BY total_tasks DESC
  `).all();
}

export function getCrossProjectAgentMetrics() {
  return getDb().prepare(`
    SELECT
      c.id as company_id,
      c.name as company_name,
      COUNT(DISTINCT a.id) as total_agents,
      SUM(CASE WHEN a.status = 'running' THEN 1 ELSE 0 END) as running_agents,
      SUM(CASE WHEN a.status = 'idle' THEN 1 ELSE 0 END) as idle_agents,
      SUM(CASE WHEN a.status = 'error' THEN 1 ELSE 0 END) as error_agents,
      COUNT(DISTINCT i.id) as total_incidents,
      SUM(CASE WHEN i.incident_type = 'agent_crash' THEN 1 ELSE 0 END) as total_crashes
    FROM companies c
    LEFT JOIN agents a ON c.id = a.company_id
    LEFT JOIN incidents i ON a.id = i.agent_id
    WHERE c.status = 'active'
    GROUP BY c.id, c.name
    ORDER BY total_agents DESC
  `).all();
}

export function getCrossProjectTotals() {
  const cost = getDb().prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(cache_read_tokens) as total_cache_read_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost_usd,
      SUM(duration_ms) as total_duration_ms,
      SUM(num_turns) as total_turns
    FROM cost_log cl
    JOIN companies c ON cl.company_id = c.id
    WHERE c.status = 'active'
  `).get();

  const tasks = getDb().prepare(`
    SELECT
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_tasks,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
      SUM(CASE WHEN status = 'backlog' OR status = 'todo' THEN 1 ELSE 0 END) as backlog_tasks
    FROM tasks t
    JOIN companies c ON t.company_id = c.id
    WHERE c.status = 'active'
  `).get();

  const agents = getDb().prepare(`
    SELECT
      COUNT(*) as total_agents,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_agents,
      SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle_agents
    FROM agents a
    JOIN companies c ON a.company_id = c.id
    WHERE c.status = 'active'
  `).get();

  const incidents = getDb().prepare(`
    SELECT COUNT(*) as total_incidents
    FROM incidents i
    JOIN companies c ON i.company_id = c.id
    WHERE c.status = 'active'
  `).get();

  return {
    ...cost,
    ...tasks,
    ...agents,
    total_incidents: incidents?.total_incidents || 0,
    total_companies: getDb().prepare("SELECT COUNT(*) as count FROM companies WHERE status = 'active'").get().count,
  };
}

export function getCrossProjectCostTrend(days = 7) {
  return getDb().prepare(`
    SELECT
      DATE(cl.created_at) as date,
      COUNT(*) as sessions,
      SUM(cl.cost_usd) as total_cost_usd,
      SUM(cl.total_tokens) as total_tokens
    FROM cost_log cl
    JOIN companies c ON cl.company_id = c.id
    WHERE c.status = 'active'
      AND cl.created_at >= date('now', '-' || ? || ' days')
    GROUP BY DATE(cl.created_at)
    ORDER BY date ASC
  `).all(days);
}

// Cross-project agent performance
export function getCrossProjectAgentPerformance() {
  return getDb().prepare(`
    SELECT
      a.name as agent_name,
      a.role,
      c.name as company_name,
      c.id as company_id,
      COUNT(DISTINCT t.id) as tasks_completed,
      SUM(cl.cost_usd) as total_cost,
      SUM(cl.total_tokens) as total_tokens,
      COUNT(i.id) as incidents,
      a.status,
      a.last_heartbeat
    FROM agents a
    JOIN companies c ON a.company_id = c.id
    LEFT JOIN tasks t ON t.assignee_id = a.id AND t.status = 'done'
    LEFT JOIN cost_log cl ON cl.agent_name = a.name AND cl.company_id = c.id
    LEFT JOIN incidents i ON i.agent_id = a.id
    WHERE c.status = 'active'
    GROUP BY a.id, a.name, a.role, c.name, c.id, a.status, a.last_heartbeat
    ORDER BY tasks_completed DESC, total_cost DESC
  `).all();
}

// ── Checkpoints (for agent crash recovery) ──────────────────────────────────

export function saveCheckpoint({ agentId, taskId, turnNumber, stateData }) {
  getDb().prepare(
    "INSERT INTO checkpoints (agent_id, task_id, turn_number, state_data) VALUES (?, ?, ?, ?)"
  ).run(agentId, taskId, turnNumber, stateData ? JSON.stringify(stateData) : null);
}

export function getLatestCheckpoint(agentId, taskId) {
  const checkpoint = getDb().prepare(
    "SELECT * FROM checkpoints WHERE agent_id = ? AND task_id = ? ORDER BY turn_number DESC LIMIT 1"
  ).get(agentId, taskId);

  if (checkpoint && checkpoint.state_data) {
    checkpoint.state_data = JSON.parse(checkpoint.state_data);
  }
  return checkpoint;
}

export function deleteCheckpoints(agentId, taskId) {
  getDb().prepare("DELETE FROM checkpoints WHERE agent_id = ? AND task_id = ?").run(agentId, taskId);
}

// ── Incidents (for crash logging and monitoring) ────────────────────────────

export function logIncident({ companyId, agentId, taskId, incidentType, description, recoveryAction }) {
  getDb().prepare(
    "INSERT INTO incidents (company_id, agent_id, task_id, incident_type, description, recovery_action) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(companyId, agentId, taskId || null, incidentType, description, recoveryAction || null);
}

export function getIncidents(companyId, limit = 50) {
  return getDb().prepare(
    "SELECT * FROM incidents WHERE company_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(companyId, limit);
}

export function getIncidentsByAgent(agentId, limit = 20) {
  return getDb().prepare(
    "SELECT * FROM incidents WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(agentId, limit);
}

export function getIncidentTimeline(companyId, limit = 50) {
  // Get incidents with enriched data including time-to-recovery
  const incidents = getDb().prepare(`
    SELECT
      i.*,
      a.name as agent_name,
      a.role as agent_role,
      CASE
        WHEN i.recovery_action IS NOT NULL THEN
          COALESCE(
            (SELECT (julianday(created_at) - julianday(i.created_at)) * 24 * 60
             FROM activity_log
             WHERE company_id = i.company_id
               AND agent_id = i.agent_id
               AND action IN ('task_assigned', 'agent_started')
               AND created_at > i.created_at
             ORDER BY created_at ASC
             LIMIT 1),
            0
          )
        ELSE NULL
      END as recovery_time_minutes
    FROM incidents i
    LEFT JOIN agents a ON i.agent_id = a.id
    WHERE i.company_id = ?
    ORDER BY i.created_at DESC
    LIMIT ?
  `).all(companyId, limit);

  return incidents;
}

export function getIncidentMetrics(companyId) {
  const db = getDb();

  // Total incidents by type
  const byType = db.prepare(`
    SELECT incident_type, COUNT(*) as count
    FROM incidents
    WHERE company_id = ?
    GROUP BY incident_type
  `).all(companyId);

  // Incidents with successful recovery
  const withRecovery = db.prepare(`
    SELECT COUNT(*) as count
    FROM incidents
    WHERE company_id = ? AND recovery_action IS NOT NULL
  `).get(companyId);

  // Average time to recovery (in minutes)
  const avgRecovery = db.prepare(`
    SELECT AVG(recovery_time) as avg_minutes
    FROM (
      SELECT
        (julianday(al.created_at) - julianday(i.created_at)) * 24 * 60 as recovery_time
      FROM incidents i
      JOIN activity_log al ON al.company_id = i.company_id AND al.agent_id = i.agent_id
      WHERE i.company_id = ?
        AND i.recovery_action IS NOT NULL
        AND al.action IN ('task_assigned', 'agent_started')
        AND al.created_at > i.created_at
        AND al.created_at < datetime(i.created_at, '+1 hour')
    )
  `).get(companyId);

  return {
    by_type: byType,
    total_incidents: byType.reduce((sum, t) => sum + t.count, 0),
    with_recovery: withRecovery?.count || 0,
    avg_recovery_minutes: avgRecovery?.avg_minutes || 0,
  };
}

// ── Retry logs (for API failure tracking) ───────────────────────────────────

export function logRetry({ taskId, agentName, attempt, errorType, errorMessage }) {
  getDb().prepare(
    "INSERT INTO retry_logs (task_id, agent_name, attempt, error_type, error_message) VALUES (?, ?, ?, ?, ?)"
  ).run(taskId || null, agentName, attempt, errorType, errorMessage || null);
}

export function getRetryLogs(taskId, limit = 20) {
  return getDb().prepare(
    "SELECT * FROM retry_logs WHERE task_id = ? ORDER BY timestamp DESC LIMIT ?"
  ).all(taskId, limit);
}

export function getRecentRetries(agentName, limit = 10) {
  return getDb().prepare(
    "SELECT * FROM retry_logs WHERE agent_name = ? ORDER BY timestamp DESC LIMIT ?"
  ).all(agentName, limit);
}

// ── Deployment tracking ──────────────────────────────────────────────────

export function logDeployment({ companyId, commitSha, gitTag, deploymentUrl, status }) {
  const result = getDb().prepare(
    "INSERT INTO deployment_history (company_id, commit_sha, git_tag, deployment_url, status) VALUES (?, ?, ?, ?, ?)"
  ).run(companyId, commitSha, gitTag, deploymentUrl || null, status || 'pending');
  return result.lastInsertRowid;
}

export function updateDeploymentStatus(deploymentId, status, healthCheckPassed, healthCheckError) {
  getDb().prepare(
    "UPDATE deployment_history SET status = ?, health_check_passed = ?, health_check_error = ? WHERE id = ?"
  ).run(status, healthCheckPassed ? 1 : 0, healthCheckError || null, deploymentId);
}

export function markDeploymentRolledBack(deploymentId, reason) {
  getDb().prepare(
    "UPDATE deployment_history SET rolled_back_at = datetime('now'), rollback_reason = ?, status = 'rolled_back' WHERE id = ?"
  ).run(reason, deploymentId);
}

export function getDeploymentHistory(companyId, limit = 20) {
  return getDb().prepare(
    "SELECT * FROM deployment_history WHERE company_id = ? ORDER BY deployed_at DESC LIMIT ?"
  ).all(companyId, limit);
}

export function getLastSuccessfulDeployment(companyId) {
  return getDb().prepare(
    "SELECT * FROM deployment_history WHERE company_id = ? AND status = 'success' AND health_check_passed = 1 ORDER BY deployed_at DESC LIMIT 1"
  ).get(companyId);
}

export function getDeployment(deploymentId) {
  return getDb().prepare("SELECT * FROM deployment_history WHERE id = ?").get(deploymentId);
}

// ── Structured logging ──────────────────────────────────────────────────

export function logStructured({timestamp, level, source, company_id, agent_id, task_id, action, metadata}) {
  try {
    getDb().prepare(
      'INSERT INTO logs (timestamp, level, source, company_id, agent_id, task_id, action, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      timestamp || new Date().toISOString(),
      level || 'info',
      source || null,
      company_id || null,
      agent_id || null,
      task_id || null,
      action || '',
      metadata ? JSON.stringify(metadata) : null
    );
  } catch (err) {
    // Silently ignore errors to prevent logging from breaking the app
    console.error('Failed to write structured log:', err.message);
  }
}

export function searchLogs({companyId, level, source, keyword, limit = 1000}) {
  let query = 'SELECT * FROM logs WHERE 1=1';
  const params = [];

  if (companyId) {
    query += ' AND company_id = ?';
    params.push(companyId);
  }

  if (level) {
    query += ' AND level = ?';
    params.push(level);
  }

  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }

  if (keyword) {
    query += ' AND (action LIKE ? OR metadata LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  return getDb().prepare(query).all(...params);
}

export function cleanOldLogs(daysToKeep = 30) {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
  const result = getDb().prepare('DELETE FROM logs WHERE timestamp < ?').run(cutoff);
  return result.changes;
}

// ── Account management ──────────────────────────────────────────────────

export function createAccount({ id, email, passwordHash, tier }) {
  const db = getDb();
  db.prepare(
    "INSERT INTO accounts (id, email, password_hash, tier) VALUES (?, ?, ?, ?)"
  ).run(id, email, passwordHash, tier || "free");
  return { id, email, tier: tier || "free" };
}

export function getAccountByEmail(email) {
  return getDb().prepare("SELECT * FROM accounts WHERE email = ?").get(email);
}

export function getAccountById(id) {
  return getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(id);
}

export function updateAccountTier(accountId, tier, subscriptionId = null, status = null) {
  const db = getDb();
  if (subscriptionId && status) {
    db.prepare(`
      UPDATE accounts
      SET tier = ?,
          subscription_id = ?,
          subscription_status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(tier, subscriptionId, status, accountId);
  } else {
    db.prepare("UPDATE accounts SET tier = ?, updated_at = datetime('now') WHERE id = ?").run(tier, accountId);
  }
}

export function getCompaniesByAccount(accountId) {
  return getDb().prepare("SELECT * FROM companies WHERE account_id = ?").all(accountId);
}

export function linkCompanyToAccount(companyId, accountId) {
  getDb().prepare("UPDATE companies SET account_id = ? WHERE id = ?").run(accountId, companyId);
}

// ── Onboarding ──────────────────────────────────────────────────
export function getOnboardingStatus() {
  // For single-user mode, we use a simple key-value approach
  const db = getDb();

  // Create a simple settings table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const setting = db.prepare("SELECT value FROM app_settings WHERE key = ?").get('onboarding_completed');
  return {
    onboarding_completed: setting ? parseInt(setting.value, 10) === 1 : false
  };
}

export function setOnboardingCompleted() {
  const db = getDb();

  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES ('onboarding_completed', '1')
    ON CONFLICT(key) DO UPDATE SET
      value = '1',
      updated_at = datetime('now')
  `).run();
}

// ── Analytics events ──────────────────────────────────────────────────
export function logAnalyticsEvent({ companyId, userId, sessionId, eventType, eventData, revenueUsd }) {
  const db = getDb();

  // Create analytics_events table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT,
      user_id TEXT,
      session_id TEXT,
      event_type TEXT NOT NULL,
      event_data TEXT,
      revenue_usd REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
  `);

  db.prepare(
    `INSERT INTO analytics_events (company_id, user_id, session_id, event_type, event_data, revenue_usd)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    companyId || null,
    userId || null,
    sessionId || null,
    eventType,
    eventData ? JSON.stringify(eventData) : null,
    revenueUsd || 0
  );
}

// ── Paddle Subscription Management ────────────────────────────────────────

export function createSubscription({ accountId, paddleSubscriptionId, paddleCustomerId, tier, status, trialEndsAt }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO subscriptions (account_id, paddle_subscription_id, paddle_customer_id, tier, status, trial_ends_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(accountId, paddleSubscriptionId, paddleCustomerId, tier, status, trialEndsAt || null);
}

export function updateSubscriptionStatus(paddleSubscriptionId, status, canceledAt) {
  const db = getDb();
  const updates = ["status = ?", "updated_at = datetime('now')"];
  const values = [status];

  if (canceledAt) {
    updates.push("canceled_at = ?");
    values.push(canceledAt);
  }

  values.push(paddleSubscriptionId);

  db.prepare(`
    UPDATE subscriptions
    SET ${updates.join(", ")}
    WHERE paddle_subscription_id = ?
  `).run(...values);
}

export function getAccountBySubscriptionId(paddleSubscriptionId) {
  return getDb().prepare(`
    SELECT a.*, s.paddle_subscription_id, s.status as subscription_status, s.tier
    FROM accounts a
    JOIN subscriptions s ON a.id = s.account_id
    WHERE s.paddle_subscription_id = ?
  `).get(paddleSubscriptionId);
}

// ── Usage-based billing ──────────────────────────────────────────────────

export function setAccountQuotas(accountId, { monthlyAgentHours, monthlyApiSpend }) {
  const db = getDb();
  db.prepare(`
    UPDATE accounts
    SET monthly_agent_hours_included = ?,
        monthly_api_spend_included = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(monthlyAgentHours, monthlyApiSpend, accountId);
}

export function getAccountWithQuotas(accountId) {
  return getDb().prepare(`
    SELECT * FROM accounts WHERE id = ?
  `).get(accountId);
}

export function saveDailyUsageSummaryDb(accountId, date, agentHours, apiSpend) {
  getDb().prepare(`
    INSERT INTO usage_summary (account_id, date, agent_hours, api_spend)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, date) DO UPDATE SET
      agent_hours = excluded.agent_hours,
      api_spend = excluded.api_spend
  `).run(accountId, date, agentHours, apiSpend);
}

export function getMonthlyUsageSummaryDb(accountId, startDate) {
  return getDb().prepare(`
    SELECT
      SUM(agent_hours) as total_agent_hours,
      SUM(api_spend) as total_api_spend,
      COUNT(*) as days_with_usage
    FROM usage_summary
    WHERE account_id = ?
      AND date >= ?
  `).get(accountId, startDate);
}

export function getAccountUsageHistory(accountId, startDate, endDate) {
  return getDb().prepare(`
    SELECT * FROM usage_summary
    WHERE account_id = ?
      AND date >= ?
      AND date <= ?
    ORDER BY date DESC
  `).all(accountId, startDate, endDate);
}

