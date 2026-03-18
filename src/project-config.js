import crypto from "node:crypto";
import { getDb } from "./db.js";

/**
 * Project Configuration & Isolation System
 *
 * Ensures each company/project has:
 * - Isolated agents and tasks
 * - Resource limits (max agents, budget caps)
 * - Custom configuration (heartbeat interval, checkpoint frequency)
 * - Clear boundaries between projects
 */

// ── Default configuration ──────────────────────────────────────────

export const DEFAULT_PROJECT_CONFIG = {
  max_concurrent_agents: 5,
  heartbeat_interval_sec: 15,
  checkpoint_every_n_turns: 5,
  max_budget_usd: null, // null = unlimited
  budget_alert_threshold: 0.8,
  auto_resume: true,
  health_check_enabled: true,
  health_check_interval_sec: 30,
  deployment_enabled: true,
  auto_deploy: false,
  slack_notifications: false,
  slack_webhook_url: null,
};

// ── Configuration CRUD ─────────────────────────────────────────────

export function getProjectConfig(companyId) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM project_config WHERE company_id = ?").get(companyId);

  if (!row) {
    // Return default config if none exists
    return { company_id: companyId, ...DEFAULT_PROJECT_CONFIG };
  }

  // Parse JSON config field
  const config = JSON.parse(row.config_json || "{}");
  return {
    company_id: companyId,
    ...DEFAULT_PROJECT_CONFIG,
    ...config,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function setProjectConfig(companyId, updates) {
  const db = getDb();
  const current = getProjectConfig(companyId);

  // Merge updates with current config
  const newConfig = {
    max_concurrent_agents: updates.max_concurrent_agents ?? current.max_concurrent_agents,
    heartbeat_interval_sec: updates.heartbeat_interval_sec ?? current.heartbeat_interval_sec,
    checkpoint_every_n_turns: updates.checkpoint_every_n_turns ?? current.checkpoint_every_n_turns,
    max_budget_usd: updates.max_budget_usd ?? current.max_budget_usd,
    budget_alert_threshold: updates.budget_alert_threshold ?? current.budget_alert_threshold,
    auto_resume: updates.auto_resume ?? current.auto_resume,
    health_check_enabled: updates.health_check_enabled ?? current.health_check_enabled,
    health_check_interval_sec: updates.health_check_interval_sec ?? current.health_check_interval_sec,
    deployment_enabled: updates.deployment_enabled ?? current.deployment_enabled,
    auto_deploy: updates.auto_deploy ?? current.auto_deploy,
    slack_notifications: updates.slack_notifications ?? current.slack_notifications,
    slack_webhook_url: updates.slack_webhook_url ?? current.slack_webhook_url,
  };

  db.prepare(`
    INSERT INTO project_config (company_id, config_json)
    VALUES (?, ?)
    ON CONFLICT(company_id) DO UPDATE SET
      config_json = excluded.config_json,
      updated_at = datetime('now')
  `).run(companyId, JSON.stringify(newConfig));

  return getProjectConfig(companyId);
}

export function deleteProjectConfig(companyId) {
  const db = getDb();
  db.prepare("DELETE FROM project_config WHERE company_id = ?").run(companyId);
}

// ── Resource isolation enforcement ─────────────────────────────────

/**
 * Check if a project can spawn a new agent (respects max_concurrent_agents)
 */
export function canSpawnAgent(companyId) {
  const config = getProjectConfig(companyId);
  const db = getDb();

  const runningCount = db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE company_id = ? AND status = 'running'"
  ).get(companyId);

  return runningCount.count < config.max_concurrent_agents;
}

/**
 * Get available agent slots for a project
 */
export function getAvailableAgentSlots(companyId) {
  const config = getProjectConfig(companyId);
  const db = getDb();

  const runningCount = db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE company_id = ? AND status = 'running'"
  ).get(companyId);

  return Math.max(0, config.max_concurrent_agents - runningCount.count);
}

/**
 * Check if a project has exceeded its budget
 */
export function hasExceededBudget(companyId) {
  const config = getProjectConfig(companyId);

  if (!config.max_budget_usd) return false; // Unlimited budget

  const db = getDb();
  const totalCost = db.prepare(
    "SELECT SUM(cost_usd) as total FROM cost_log WHERE company_id = ?"
  ).get(companyId);

  return (totalCost?.total || 0) >= config.max_budget_usd;
}

/**
 * Check if a project is approaching its budget limit
 */
export function isApproachingBudgetLimit(companyId) {
  const config = getProjectConfig(companyId);

  if (!config.max_budget_usd) return false;

  const db = getDb();
  const totalCost = db.prepare(
    "SELECT SUM(cost_usd) as total FROM cost_log WHERE company_id = ?"
  ).get(companyId);

  const usageRatio = (totalCost?.total || 0) / config.max_budget_usd;
  return usageRatio >= config.budget_alert_threshold;
}

/**
 * Get budget status for a project
 */
export function getBudgetStatus(companyId) {
  const config = getProjectConfig(companyId);
  const db = getDb();

  const totalCost = db.prepare(
    "SELECT SUM(cost_usd) as total FROM cost_log WHERE company_id = ?"
  ).get(companyId);

  const spent = totalCost?.total || 0;
  const limit = config.max_budget_usd;
  const hasLimit = limit !== null;
  const usageRatio = hasLimit ? spent / limit : 0;
  const exceeded = hasLimit && spent >= limit;
  const approaching = hasLimit && usageRatio >= config.budget_alert_threshold;

  return {
    spent,
    limit,
    hasLimit,
    usageRatio,
    exceeded,
    approaching,
    remaining: hasLimit ? Math.max(0, limit - spent) : null,
  };
}

// ── Project isolation verification ────────────────────────────────

/**
 * Verify that agents belong to the correct project
 */
export function verifyAgentIsolation(agentId, expectedCompanyId) {
  const db = getDb();
  const agent = db.prepare("SELECT company_id FROM agents WHERE id = ?").get(agentId);

  if (!agent) return false;
  return agent.company_id === expectedCompanyId;
}

/**
 * Verify that tasks belong to the correct project
 */
export function verifyTaskIsolation(taskId, expectedCompanyId) {
  const db = getDb();
  const task = db.prepare("SELECT company_id FROM tasks WHERE id = ?").get(taskId);

  if (!task) return false;
  return task.company_id === expectedCompanyId;
}

/**
 * Get all resources for a project (for cleanup/isolation auditing)
 */
export function getProjectResources(companyId) {
  const db = getDb();

  return {
    agents: db.prepare("SELECT * FROM agents WHERE company_id = ?").all(companyId),
    tasks: db.prepare("SELECT * FROM tasks WHERE company_id = ?").all(companyId),
    activity: db.prepare("SELECT COUNT(*) as count FROM activity_log WHERE company_id = ?").get(companyId).count,
    costs: db.prepare("SELECT COUNT(*) as count FROM cost_log WHERE company_id = ?").get(companyId).count,
    incidents: db.prepare("SELECT COUNT(*) as count FROM incidents WHERE company_id = ?").get(companyId).count,
    deployments: db.prepare("SELECT COUNT(*) as count FROM deployment_history WHERE company_id = ?").get(companyId).count,
  };
}

/**
 * Archive a project (soft delete - preserves data but marks inactive)
 */
export function archiveProject(companyId) {
  const db = getDb();
  db.prepare("UPDATE companies SET status = 'archived', updated_at = datetime('now') WHERE id = ?").run(companyId);

  // Mark all agents as idle
  db.prepare("UPDATE agents SET status = 'idle' WHERE company_id = ?").run(companyId);
}

/**
 * Delete all project data (hard delete - DANGEROUS)
 */
export function deleteProjectData(companyId) {
  const db = getDb();

  // Delete in order to respect foreign key constraints
  db.prepare("DELETE FROM checkpoints WHERE agent_id IN (SELECT id FROM agents WHERE company_id = ?)").run(companyId);
  db.prepare("DELETE FROM incidents WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM deployment_history WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM retry_logs WHERE task_id IN (SELECT id FROM tasks WHERE company_id = ?)").run(companyId);
  db.prepare("DELETE FROM cost_log WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM usage_logs WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM comments WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM activity_log WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM tasks WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM agents WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM project_config WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM budget_config WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM logs WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM companies WHERE id = ?").run(companyId);
}

// ── Configuration presets ──────────────────────────────────────────

export const CONFIG_PRESETS = {
  development: {
    max_concurrent_agents: 3,
    heartbeat_interval_sec: 10,
    checkpoint_every_n_turns: 3,
    max_budget_usd: 5.0,
    budget_alert_threshold: 0.7,
    auto_resume: true,
    health_check_enabled: true,
    health_check_interval_sec: 20,
    deployment_enabled: false,
    auto_deploy: false,
  },
  production: {
    max_concurrent_agents: 10,
    heartbeat_interval_sec: 30,
    checkpoint_every_n_turns: 10,
    max_budget_usd: null,
    budget_alert_threshold: 0.8,
    auto_resume: true,
    health_check_enabled: true,
    health_check_interval_sec: 60,
    deployment_enabled: true,
    auto_deploy: true,
  },
  budget_constrained: {
    max_concurrent_agents: 2,
    heartbeat_interval_sec: 60,
    checkpoint_every_n_turns: 20,
    max_budget_usd: 10.0,
    budget_alert_threshold: 0.9,
    auto_resume: false,
    health_check_enabled: true,
    health_check_interval_sec: 120,
    deployment_enabled: false,
    auto_deploy: false,
  },
  high_performance: {
    max_concurrent_agents: 20,
    heartbeat_interval_sec: 5,
    checkpoint_every_n_turns: 2,
    max_budget_usd: null,
    budget_alert_threshold: 0.8,
    auto_resume: true,
    health_check_enabled: true,
    health_check_interval_sec: 10,
    deployment_enabled: true,
    auto_deploy: true,
  },
};

export function applyConfigPreset(companyId, presetName) {
  const preset = CONFIG_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }
  return setProjectConfig(companyId, preset);
}
