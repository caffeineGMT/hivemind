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

  // Add 'user_id' column to companies if missing
  try {
    const cols = db.prepare("PRAGMA table_info(companies)").all();
    if (cols.length > 0 && !cols.find(c => c.name === "user_id")) {
      db.exec("ALTER TABLE companies ADD COLUMN user_id TEXT");
    }
  } catch {}

  // Add 'stripe_customer_id' column to companies if missing
  try {
    const cols = db.prepare("PRAGMA table_info(companies)").all();
    if (cols.length > 0 && !cols.find(c => c.name === "stripe_customer_id")) {
      db.exec("ALTER TABLE companies ADD COLUMN stripe_customer_id TEXT");
    }
  } catch {}

  // Add 'plan_tier' column to companies if missing
  try {
    const cols = db.prepare("PRAGMA table_info(companies)").all();
    if (cols.length > 0 && !cols.find(c => c.name === "plan_tier")) {
      db.exec("ALTER TABLE companies ADD COLUMN plan_tier TEXT DEFAULT 'STARTER'");
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

    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      agent_id TEXT,
      metadata TEXT
    );

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

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      user_id TEXT,
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      mrr REAL NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      cancelled_at TEXT,
      next_billing_date TEXT
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

    CREATE INDEX IF NOT EXISTS idx_usage_company_metric ON usage_logs(company_id, metric);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_analytics_company ON analytics_events(company_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_agent ON checkpoints(agent_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_company ON incidents(company_id);
  `);
}

export function createCompany({ id, name, goal, workspace, userId }) {
  const db = getDb();
  db.prepare("INSERT INTO companies (id, name, goal, workspace, user_id) VALUES (?, ?, ?, ?, ?)").run(id, name, goal, workspace, userId || null);
  return { id, name, goal, workspace, userId };
}

export function getCompany(id) {
  return getDb().prepare("SELECT * FROM companies WHERE id = ?").get(id);
}

export function getActiveCompany() {
  return getDb().prepare("SELECT * FROM companies WHERE status = 'active' ORDER BY created_at DESC LIMIT 1").get();
}

export function listCompanies(userId) {
  if (userId) {
    return getDb().prepare("SELECT * FROM companies WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC").all(userId);
  }
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

export function trackEvent({ companyId, userId, sessionId, eventType, eventData, revenueUsd }) {
  getDb().prepare(
    `INSERT INTO analytics_events (company_id, user_id, session_id, event_type, event_data, revenue_usd)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(companyId || null, userId || null, sessionId || null, eventType, eventData ? JSON.stringify(eventData) : null, revenueUsd || 0);
}

export function getAnalyticsEvents(companyId, limit = 100) {
  if (companyId) {
    return getDb().prepare("SELECT * FROM analytics_events WHERE company_id = ? ORDER BY created_at DESC LIMIT ?").all(companyId, limit);
  }
  return getDb().prepare("SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT ?").all(limit);
}

export function getConversionFunnel(companyId) {
  const db = getDb();
  const where = companyId ? "WHERE company_id = ?" : "";
  const whereAnd = companyId ? "WHERE company_id = ? AND" : "WHERE";
  const params = companyId ? [companyId] : [];

  const pageViews = db.prepare(`SELECT COUNT(*) as count FROM analytics_events ${whereAnd} event_type = 'page_view'`).get(...params)?.count || 0;
  const signupStarted = db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM analytics_events ${whereAnd} event_type = 'signup_started'`).get(...params)?.count || 0;
  const signupCompleted = db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM analytics_events ${whereAnd} event_type = 'signup_completed'`).get(...params)?.count || 0;
  const checkoutStarted = db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM analytics_events ${whereAnd} event_type = 'checkout_started'`).get(...params)?.count || 0;
  const checkoutCompleted = db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM analytics_events ${whereAnd} event_type = 'checkout_completed'`).get(...params)?.count || 0;
  const companyCreated = db.prepare(`SELECT COUNT(*) as count FROM analytics_events ${whereAnd} event_type = 'company_created'`).get(...params)?.count || 0;
  const firstTaskCompleted = db.prepare(`SELECT COUNT(DISTINCT company_id) as count FROM analytics_events ${whereAnd} event_type = 'first_task_completed'`).get(...params)?.count || 0;

  return {
    page_view: pageViews,
    signup_started: signupStarted,
    signup_completed: signupCompleted,
    checkout_started: checkoutStarted,
    checkout_completed: checkoutCompleted,
    company_created: companyCreated,
    first_task_completed: firstTaskCompleted,
  };
}

export function getRevenueMetrics(companyId) {
  const db = getDb();
  const where = companyId ? "WHERE company_id = ? AND status = 'active'" : "WHERE status = 'active'";
  const params = companyId ? [companyId] : [];

  const activeSubs = db.prepare(`SELECT * FROM subscriptions ${where}`).all(...params);
  const mrr = activeSubs.reduce((sum, sub) => sum + (sub.mrr || 0), 0);
  const arr = mrr * 12;

  // Churn calculation (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cancelledWhere = companyId ? "WHERE company_id = ? AND cancelled_at > ?" : "WHERE cancelled_at > ?";
  const cancelledParams = companyId ? [companyId, thirtyDaysAgo] : [thirtyDaysAgo];
  const cancelledCount = db.prepare(`SELECT COUNT(*) as count FROM subscriptions ${cancelledWhere}`).get(...cancelledParams)?.count || 0;
  const totalSubs = activeSubs.length + cancelledCount;
  const churnRate = totalSubs > 0 ? (cancelledCount / totalSubs) * 100 : 0;

  // LTV calculation (simple: average revenue per user * average lifetime)
  const avgRevenuePerUser = activeSubs.length > 0 ? mrr / activeSubs.length : 0;
  const avgLifetimeMonths = churnRate > 0 ? 1 / (churnRate / 100) : 12; // If 10% monthly churn, avg lifetime = 10 months
  const ltv = avgRevenuePerUser * avgLifetimeMonths;

  // Total revenue from all checkout_completed events
  const totalRevenue = db.prepare(
    `SELECT SUM(revenue_usd) as total FROM analytics_events WHERE event_type = 'checkout_completed' ${companyId ? 'AND company_id = ?' : ''}`
  ).get(...(companyId ? [companyId] : []))?.total || 0;

  return {
    mrr,
    arr,
    churnRate,
    ltv,
    totalRevenue,
    activeSubscriptions: activeSubs.length,
  };
}

export function createSubscription({ id, companyId, userId, plan, mrr }) {
  getDb().prepare(
    "INSERT INTO subscriptions (id, company_id, user_id, plan, mrr) VALUES (?, ?, ?, ?, ?)"
  ).run(id, companyId, userId || null, plan, mrr);
}

export function cancelSubscription(id) {
  getDb().prepare("UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?").run(id);
}
