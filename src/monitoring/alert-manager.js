/**
 * Proactive Alert Manager
 *
 * Configurable alert rules with severity tiers (critical/warning/info).
 * Supports multiple delivery channels:
 * - WebSocket push to dashboard
 * - Log file
 * - Desktop notification API (via SSE endpoint)
 *
 * Integrates with the anomaly detector to turn detected anomalies
 * into actionable alerts with escalation logic.
 */

import * as db from "../db.js";
import fs from "node:fs";
import path from "node:path";
import { HIVEMIND_HOME } from "../config.js";

import logger from "./logger.js";
// Severity levels with escalation order
export const SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
};

const SEVERITY_PRIORITY = { info: 0, warning: 1, critical: 2 };

// Default alert rules
const DEFAULT_RULES = [
  {
    id: "high_error_rate",
    name: "High Error Rate",
    description: "Agent error rate exceeds threshold",
    metric: "error_rate",
    condition: "gt",
    threshold: 0.5,
    severity: SEVERITY.CRITICAL,
    enabled: true,
    cooldown_minutes: 10,
    escalate_after_minutes: 30,
  },
  {
    id: "slow_response",
    name: "Slow Response Time",
    description: "API response time exceeds threshold",
    metric: "response_time",
    condition: "gt",
    threshold: 30000,
    severity: SEVERITY.WARNING,
    enabled: true,
    cooldown_minutes: 15,
    escalate_after_minutes: 60,
  },
  {
    id: "high_token_usage",
    name: "High Token Usage",
    description: "Token usage per task exceeds threshold",
    metric: "token_usage",
    condition: "gt",
    threshold: 100000,
    severity: SEVERITY.WARNING,
    enabled: true,
    cooldown_minutes: 30,
    escalate_after_minutes: null,
  },
  {
    id: "agent_crash",
    name: "Agent Crash",
    description: "Agent process terminated unexpectedly",
    metric: "agent_status",
    condition: "eq",
    threshold: "crashed",
    severity: SEVERITY.CRITICAL,
    enabled: true,
    cooldown_minutes: 5,
    escalate_after_minutes: 15,
  },
  {
    id: "high_cost",
    name: "High Cost Per Task",
    description: "Cost per task exceeds threshold",
    metric: "cost_per_task",
    condition: "gt",
    threshold: 5.0,
    severity: SEVERITY.WARNING,
    enabled: true,
    cooldown_minutes: 30,
    escalate_after_minutes: null,
  },
  {
    id: "task_stuck",
    name: "Task Stuck",
    description: "Task in progress for too long",
    metric: "task_completion_time",
    condition: "gt",
    threshold: 3600000,
    severity: SEVERITY.INFO,
    enabled: true,
    cooldown_minutes: 60,
    escalate_after_minutes: 120,
  },
  {
    id: "budget_exceeded",
    name: "Budget Exceeded",
    description: "Project spending exceeded budget limit",
    metric: "budget_usage",
    condition: "gt",
    threshold: 1.0,
    severity: SEVERITY.CRITICAL,
    enabled: true,
    cooldown_minutes: 60,
    escalate_after_minutes: null,
  },
  {
    id: "budget_warning",
    name: "Budget Warning",
    description: "Project spending approaching budget limit",
    metric: "budget_usage",
    condition: "gt",
    threshold: 0.8,
    severity: SEVERITY.WARNING,
    enabled: true,
    cooldown_minutes: 120,
    escalate_after_minutes: null,
  },
];

// Channel configuration defaults
const DEFAULT_CHANNELS = {
  websocket: true,
  log_file: true,
  desktop: false,
};

// In-memory state
let broadcastFn = null;
const cooldownTracker = new Map(); // ruleId:context -> last fired timestamp
const escalationTracker = new Map(); // alertId -> { firstFired, escalated }
const sseClients = new Set();

// Alert log file path
const ALERT_LOG_PATH = path.join(HIVEMIND_HOME, "logs", "alerts.log");

/**
 * Initialize the alert manager DB tables
 */
export function initAlertTables() {
  const database = db.getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      metric TEXT NOT NULL,
      condition TEXT NOT NULL DEFAULT 'gt',
      threshold REAL NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      enabled INTEGER NOT NULL DEFAULT 1,
      cooldown_minutes INTEGER NOT NULL DEFAULT 10,
      escalate_after_minutes INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS alert_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL,
      rule_id TEXT,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metric TEXT,
      metric_value REAL,
      threshold REAL,
      agent_id TEXT,
      agent_name TEXT,
      task_id TEXT,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      acknowledged_at TEXT,
      escalated INTEGER NOT NULL DEFAULT 0,
      channels_delivered TEXT,
      context TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS alert_channel_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      config TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_id, channel)
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_alert_history_company ON alert_history(company_id);
    CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
    CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_alert_rules_company ON alert_rules(company_id);
  `);
}

/**
 * Register broadcast function for WebSocket push
 */
export function setBroadcast(fn) {
  broadcastFn = fn;
}

/**
 * Register an SSE client for desktop notifications
 */
export function addSSEClient(res) {
  sseClients.add(res);
  res.on("close", () => sseClients.delete(res));
}

/**
 * Get alert rules for a company (merges defaults with custom)
 */
export function getAlertRules(companyId) {
  const database = db.getDb();
  const customRules = database
    .prepare("SELECT * FROM alert_rules WHERE company_id = ?")
    .all(companyId);

  if (customRules.length > 0) {
    return customRules.map((r) => ({
      ...r,
      enabled: Boolean(r.enabled),
    }));
  }

  // Return defaults (not yet persisted)
  return DEFAULT_RULES.map((r) => ({
    ...r,
    company_id: companyId,
  }));
}

/**
 * Save or update an alert rule
 */
export function saveAlertRule(companyId, rule) {
  const database = db.getDb();
  database
    .prepare(
      `INSERT INTO alert_rules (id, company_id, name, description, metric, condition, threshold, severity, enabled, cooldown_minutes, escalate_after_minutes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       metric = excluded.metric,
       condition = excluded.condition,
       threshold = excluded.threshold,
       severity = excluded.severity,
       enabled = excluded.enabled,
       cooldown_minutes = excluded.cooldown_minutes,
       escalate_after_minutes = excluded.escalate_after_minutes,
       updated_at = datetime('now')`
    )
    .run(
      rule.id,
      companyId,
      rule.name,
      rule.description || null,
      rule.metric,
      rule.condition || "gt",
      rule.threshold,
      rule.severity || SEVERITY.WARNING,
      rule.enabled ? 1 : 0,
      rule.cooldown_minutes || 10,
      rule.escalate_after_minutes || null
    );
}

/**
 * Save all alert rules for a company (bulk upsert)
 */
export function saveAllAlertRules(companyId, rules) {
  const database = db.getDb();
  const transaction = database.transaction(() => {
    for (const rule of rules) {
      saveAlertRule(companyId, rule);
    }
  });
  transaction();
}

/**
 * Delete an alert rule
 */
export function deleteAlertRule(ruleId) {
  db.getDb().prepare("DELETE FROM alert_rules WHERE id = ?").run(ruleId);
}

/**
 * Get channel configuration for a company
 */
export function getChannelConfig(companyId) {
  const database = db.getDb();
  const rows = database
    .prepare("SELECT * FROM alert_channel_config WHERE company_id = ?")
    .all(companyId);

  const config = { ...DEFAULT_CHANNELS };
  for (const row of rows) {
    config[row.channel] = Boolean(row.enabled);
  }
  return config;
}

/**
 * Save channel configuration
 */
export function saveChannelConfig(companyId, channel, enabled) {
  db.getDb()
    .prepare(
      `INSERT INTO alert_channel_config (company_id, channel, enabled, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(company_id, channel) DO UPDATE SET
       enabled = excluded.enabled,
       updated_at = datetime('now')`
    )
    .run(companyId, channel, enabled ? 1 : 0);
}

/**
 * Check if a rule is in cooldown
 */
function isInCooldown(ruleId, contextKey) {
  const key = `${ruleId}:${contextKey}`;
  const lastFired = cooldownTracker.get(key);
  if (!lastFired) return false;
  return lastFired;
}

/**
 * Evaluate a condition against a value
 */
function evaluateCondition(value, condition, threshold) {
  switch (condition) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    case "eq":
      return value === threshold;
    case "neq":
      return value !== threshold;
    default:
      return false;
  }
}

/**
 * Deliver alert to log file channel
 */
function deliverToLogFile(alert) {
  const timestamp = new Date().toISOString();
  const severityTag = `[${alert.severity.toUpperCase()}]`;
  const line = `${timestamp} ${severityTag} ${alert.title} — ${alert.message}\n`;

  try {
    const dir = path.dirname(ALERT_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(ALERT_LOG_PATH, line);
  } catch (err) {
    logger.error(`[ALERT] Failed to write to log file: ${err.message}`);
  }
}

/**
 * Deliver alert via WebSocket to dashboard
 */
function deliverToWebSocket(alert) {
  if (!broadcastFn) return;
  broadcastFn("alert_fired", {
    id: alert.id,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    metric: alert.metric,
    metricValue: alert.metric_value,
    threshold: alert.threshold,
    agentId: alert.agent_id,
    agentName: alert.agent_name,
    taskId: alert.task_id,
    escalated: alert.escalated,
    timestamp: alert.created_at || new Date().toISOString(),
  });
}

/**
 * Deliver alert via SSE for desktop notifications
 */
function deliverToDesktop(alert) {
  const payload = JSON.stringify({
    type: "alert",
    severity: alert.severity,
    title: alert.title,
    body: alert.message,
    timestamp: new Date().toISOString(),
  });

  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

/**
 * Fire an alert through all enabled channels
 */
export function fireAlert({
  companyId,
  ruleId = null,
  severity,
  title,
  message,
  metric = null,
  metricValue = null,
  threshold = null,
  agentId = null,
  agentName = null,
  taskId = null,
  context = null,
}) {
  // Check cooldown
  if (ruleId) {
    const contextKey = agentId || companyId;
    const lastFired = isInCooldown(ruleId, contextKey);
    if (lastFired) {
      const rules = getAlertRules(companyId);
      const rule = rules.find((r) => r.id === ruleId);
      const cooldownMs = (rule?.cooldown_minutes || 10) * 60 * 1000;
      if (Date.now() - lastFired < cooldownMs) {
        return null; // Still in cooldown
      }
    }
  }

  // Persist alert
  const database = db.getDb();
  const channels = getChannelConfig(companyId);
  const deliveredChannels = [];

  const result = database
    .prepare(
      `INSERT INTO alert_history (company_id, rule_id, severity, title, message, metric, metric_value, threshold, agent_id, agent_name, task_id, context)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      companyId,
      ruleId,
      severity,
      title,
      message,
      metric,
      metricValue,
      threshold,
      agentId,
      agentName,
      taskId,
      context ? JSON.stringify(context) : null
    );

  const alertId = result.lastInsertRowid;
  const alert = {
    id: alertId,
    company_id: companyId,
    rule_id: ruleId,
    severity,
    title,
    message,
    metric,
    metric_value: metricValue,
    threshold,
    agent_id: agentId,
    agent_name: agentName,
    task_id: taskId,
    escalated: false,
    created_at: new Date().toISOString(),
  };

  // Deliver to enabled channels
  if (channels.websocket) {
    deliverToWebSocket(alert);
    deliveredChannels.push("websocket");
  }

  if (channels.log_file) {
    deliverToLogFile(alert);
    deliveredChannels.push("log_file");
  }

  if (channels.desktop) {
    deliverToDesktop(alert);
    deliveredChannels.push("desktop");
  }

  // Update delivered channels
  database
    .prepare(
      "UPDATE alert_history SET channels_delivered = ? WHERE id = ?"
    )
    .run(JSON.stringify(deliveredChannels), alertId);

  // Track cooldown
  if (ruleId) {
    const contextKey = agentId || companyId;
    cooldownTracker.set(`${ruleId}:${contextKey}`, Date.now());
  }

  // Track for escalation
  if (ruleId) {
    const rules = getAlertRules(companyId);
    const rule = rules.find((r) => r.id === ruleId);
    if (rule?.escalate_after_minutes) {
      const escKey = `${ruleId}:${agentId || companyId}`;
      if (!escalationTracker.has(escKey)) {
        escalationTracker.set(escKey, {
          firstFired: Date.now(),
          alertId,
          escalated: false,
        });
      }
    }
  }

  // Console log for server-side visibility
  const icon =
    severity === SEVERITY.CRITICAL
      ? "CRITICAL"
      : severity === SEVERITY.WARNING
        ? "WARNING"
        : "INFO";
  logger.info(`[ALERT][${icon}] ${title}: ${message}`);

  return { alertId, deliveredChannels };
}

/**
 * Evaluate all rules against current metrics for a company
 */
export function evaluateRules({
  companyId,
  metric,
  value,
  agentId = null,
  agentName = null,
  taskId = null,
  metadata = null,
}) {
  const rules = getAlertRules(companyId);
  const results = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.metric !== metric) continue;

    const triggered = evaluateCondition(value, rule.condition, rule.threshold);
    if (!triggered) continue;

    const result = fireAlert({
      companyId,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.name,
      message: buildAlertMessage(rule, value, agentName),
      metric: rule.metric,
      metricValue: value,
      threshold: rule.threshold,
      agentId,
      agentName,
      taskId,
      context: metadata,
    });

    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Build a human-readable alert message
 */
function buildAlertMessage(rule, value, agentName) {
  const agent = agentName ? ` (agent: ${agentName})` : "";
  const formattedValue =
    typeof value === "number" ? value.toFixed(2) : String(value);
  const formattedThreshold =
    typeof rule.threshold === "number"
      ? rule.threshold.toFixed(2)
      : String(rule.threshold);

  return `${rule.description}${agent}. Current: ${formattedValue}, Threshold: ${formattedThreshold}`;
}

/**
 * Check for alerts that need escalation
 */
export function checkEscalations(companyId) {
  const rules = getAlertRules(companyId);
  const now = Date.now();
  const escalated = [];

  for (const [key, tracker] of escalationTracker.entries()) {
    if (tracker.escalated) continue;

    const [ruleId] = key.split(":");
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule || !rule.escalate_after_minutes) continue;

    const elapsed = now - tracker.firstFired;
    const escalateMs = rule.escalate_after_minutes * 60 * 1000;

    if (elapsed >= escalateMs) {
      // Escalate: bump severity one level
      const currentPriority = SEVERITY_PRIORITY[rule.severity] || 0;
      const newSeverity =
        currentPriority < 2 ? SEVERITY.CRITICAL : SEVERITY.CRITICAL;

      const result = fireAlert({
        companyId,
        ruleId: rule.id,
        severity: newSeverity,
        title: `ESCALATED: ${rule.name}`,
        message: `Alert "${rule.name}" has been active for ${Math.round(elapsed / 60000)} minutes without resolution. Escalated to ${newSeverity}.`,
        metric: rule.metric,
        agentId: key.split(":")[1] || null,
      });

      tracker.escalated = true;

      if (result) {
        // Mark the original alert as escalated
        db.getDb()
          .prepare(
            "UPDATE alert_history SET escalated = 1 WHERE id = ?"
          )
          .run(tracker.alertId);
        escalated.push(result);
      }
    }
  }

  return escalated;
}

/**
 * Get alert history for a company
 */
export function getAlertHistory(companyId, options = {}) {
  const {
    limit = 50,
    severity = null,
    acknowledged = null,
    hoursBack = 24,
  } = options;

  let query = `
    SELECT * FROM alert_history
    WHERE company_id = ?
      AND created_at >= datetime('now', '-' || ? || ' hours')
  `;
  const params = [companyId, hoursBack];

  if (severity) {
    query += " AND severity = ?";
    params.push(severity);
  }

  if (acknowledged !== null) {
    query += " AND acknowledged = ?";
    params.push(acknowledged ? 1 : 0);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const alerts = db.getDb().prepare(query).all(...params);
  return alerts.map((a) => ({
    ...a,
    acknowledged: Boolean(a.acknowledged),
    escalated: Boolean(a.escalated),
    channels_delivered: a.channels_delivered
      ? JSON.parse(a.channels_delivered)
      : [],
    context: a.context ? JSON.parse(a.context) : null,
  }));
}

/**
 * Get alert summary stats
 */
export function getAlertStats(companyId, hoursBack = 24) {
  const database = db.getDb();
  return database
    .prepare(
      `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning,
      SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info,
      SUM(CASE WHEN acknowledged = 1 THEN 1 ELSE 0 END) as acknowledged,
      SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as unacknowledged,
      SUM(CASE WHEN escalated = 1 THEN 1 ELSE 0 END) as escalated
    FROM alert_history
    WHERE company_id = ?
      AND created_at >= datetime('now', '-' || ? || ' hours')`
    )
    .get(companyId, hoursBack);
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId) {
  db.getDb()
    .prepare(
      "UPDATE alert_history SET acknowledged = 1, acknowledged_at = datetime('now') WHERE id = ?"
    )
    .run(alertId);

  // Clear escalation tracker for this alert
  for (const [key, tracker] of escalationTracker.entries()) {
    if (tracker.alertId === alertId) {
      escalationTracker.delete(key);
      break;
    }
  }
}

/**
 * Acknowledge all alerts for a company
 */
export function acknowledgeAllAlerts(companyId) {
  db.getDb()
    .prepare(
      "UPDATE alert_history SET acknowledged = 1, acknowledged_at = datetime('now') WHERE company_id = ? AND acknowledged = 0"
    )
    .run(companyId);

  // Clear all escalation trackers
  escalationTracker.clear();
}

/**
 * Clean up old alert history
 */
export function cleanupAlertHistory(daysToKeep = 30) {
  const result = db
    .getDb()
    .prepare(
      "DELETE FROM alert_history WHERE created_at < datetime('now', '-' || ? || ' days')"
    )
    .run(daysToKeep);
  return result.changes;
}
