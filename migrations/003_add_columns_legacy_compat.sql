-- Migration 003: Add columns to existing tables (legacy compat)
-- These ALTER TABLE statements ensure databases created before these columns
-- were added to the CREATE TABLE definitions get them retroactively.
-- Each uses a conditional approach — the migration runner handles idempotency
-- by tracking applied migrations, but the IF NOT EXISTS pattern in the runner's
-- column-check logic provides an extra safety net.

-- UP

-- comments.read
ALTER TABLE comments ADD COLUMN read INTEGER NOT NULL DEFAULT 0;

-- companies.sprint
ALTER TABLE companies ADD COLUMN sprint INTEGER NOT NULL DEFAULT 0;

-- companies.deployment_url
ALTER TABLE companies ADD COLUMN deployment_url TEXT;

-- traces enhancement columns
ALTER TABLE traces ADD COLUMN duration_ms INTEGER;
ALTER TABLE traces ADD COLUMN status TEXT;
ALTER TABLE traces ADD COLUMN company_id TEXT;
ALTER TABLE traces ADD COLUMN agent_id TEXT;
ALTER TABLE traces ADD COLUMN task_id TEXT;

-- logs.trace_id
ALTER TABLE logs ADD COLUMN trace_id TEXT;
CREATE INDEX IF NOT EXISTS idx_logs_trace_id ON logs(trace_id);

-- tasks.depends_on
ALTER TABLE tasks ADD COLUMN depends_on TEXT;

-- activity_log.pattern_id
ALTER TABLE activity_log ADD COLUMN pattern_id TEXT;
CREATE INDEX IF NOT EXISTS idx_activity_log_pattern ON activity_log(pattern_id);

-- agents resource pooling columns
ALTER TABLE agents ADD COLUMN capabilities TEXT;
ALTER TABLE agents ADD COLUMN cost_tier TEXT DEFAULT 'standard';
ALTER TABLE agents ADD COLUMN current_load INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN max_load INTEGER DEFAULT 1;

-- tasks.required_capabilities
ALTER TABLE tasks ADD COLUMN required_capabilities TEXT;

-- DOWN

-- NOTE: SQLite does not support DROP COLUMN in older versions.
-- For SQLite 3.35.0+ (2021-03-12), DROP COLUMN is supported.
-- These rollbacks assume SQLite 3.35.0+.

ALTER TABLE tasks DROP COLUMN required_capabilities;
ALTER TABLE agents DROP COLUMN max_load;
ALTER TABLE agents DROP COLUMN current_load;
ALTER TABLE agents DROP COLUMN cost_tier;
ALTER TABLE agents DROP COLUMN capabilities;
DROP INDEX IF EXISTS idx_activity_log_pattern;
ALTER TABLE activity_log DROP COLUMN pattern_id;
ALTER TABLE tasks DROP COLUMN depends_on;
DROP INDEX IF EXISTS idx_logs_trace_id;
ALTER TABLE logs DROP COLUMN trace_id;
ALTER TABLE traces DROP COLUMN task_id;
ALTER TABLE traces DROP COLUMN agent_id;
ALTER TABLE traces DROP COLUMN company_id;
ALTER TABLE traces DROP COLUMN status;
ALTER TABLE traces DROP COLUMN duration_ms;
ALTER TABLE companies DROP COLUMN deployment_url;
ALTER TABLE companies DROP COLUMN sprint;
ALTER TABLE comments DROP COLUMN read;
