-- Migration 001: Base schema
-- Creates all core tables with their full column sets.
-- This represents the complete schema as of the initial migration extraction.

-- UP
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
  capabilities TEXT,
  cost_tier TEXT DEFAULT 'standard',
  current_load INTEGER DEFAULT 0,
  max_load INTEGER DEFAULT 1,
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
  depends_on TEXT,
  required_capabilities TEXT,
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
  pattern_id TEXT,
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

CREATE TABLE IF NOT EXISTS retry_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  agent_name TEXT,
  attempt INTEGER NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  level TEXT NOT NULL,
  source TEXT,
  company_id TEXT,
  agent_id TEXT,
  task_id TEXT,
  trace_id TEXT,
  action TEXT,
  metadata TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS budget_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  monthly_budget REAL NOT NULL,
  alert_threshold REAL NOT NULL DEFAULT 0.8,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS project_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS workload_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  forecast_type TEXT NOT NULL,
  time_bucket TEXT NOT NULL,
  predicted_value REAL NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0.8,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, forecast_type, time_bucket)
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  task_id TEXT REFERENCES tasks(id),
  start_time TEXT NOT NULL DEFAULT (datetime('now')),
  end_time TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  tokens_used INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  status TEXT NOT NULL DEFAULT 'pending',
  retries INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value REAL NOT NULL,
  metadata TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value REAL NOT NULL,
  baseline_mean REAL NOT NULL,
  baseline_std_dev REAL NOT NULL,
  z_score REAL NOT NULL,
  severity TEXT NOT NULL,
  direction TEXT NOT NULL,
  deviation_percent REAL NOT NULL,
  context TEXT,
  detected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  agent_id TEXT REFERENCES agents(id),
  company_id TEXT REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  operation TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  duration_ms INTEGER,
  status TEXT,
  company_id TEXT,
  agent_id TEXT,
  task_id TEXT,
  metadata TEXT,
  UNIQUE(trace_id, span_id)
);

-- DOWN
DROP TABLE IF EXISTS traces;
DROP TABLE IF EXISTS metrics;
DROP TABLE IF EXISTS anomalies;
DROP TABLE IF EXISTS agent_metrics;
DROP TABLE IF EXISTS task_executions;
DROP TABLE IF EXISTS agent_runs;
DROP TABLE IF EXISTS workload_forecasts;
DROP TABLE IF EXISTS project_config;
DROP TABLE IF EXISTS budget_config;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS retry_logs;
DROP TABLE IF EXISTS deployment_history;
DROP TABLE IF EXISTS incidents;
DROP TABLE IF EXISTS checkpoints;
DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS cost_log;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS companies;
