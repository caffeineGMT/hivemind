# Database Schema Implementation Summary

## Overview
Added SQLite schema with three new tables for persistent data storage and historical analysis. Database automatically initializes on first use with migration support for existing databases.

## New Tables

### 1. agent_runs
Tracks individual agent execution sessions with performance metrics.

**Schema:**
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing ID
- `agent_id` (TEXT NOT NULL) - Foreign key to agents table
- `task_id` (TEXT) - Foreign key to tasks table (nullable)
- `start_time` (TEXT NOT NULL) - ISO timestamp when run started
- `end_time` (TEXT) - ISO timestamp when run ended (nullable)
- `status` (TEXT NOT NULL) - Status: 'running', 'completed', 'error'
- `tokens_used` (INTEGER) - Total tokens consumed
- `cost` (REAL) - Cost in USD
- `error_message` (TEXT) - Error details if failed
- `created_at` (TEXT NOT NULL) - Record creation timestamp

**Indexes:**
- `idx_agent_runs_agent` - Query by agent
- `idx_agent_runs_task` - Query by task
- `idx_agent_runs_status` - Filter by status
- `idx_agent_runs_start_time` - Time-based queries

**Functions:**
- `createAgentRun({ agentId, taskId })` - Start new agent run
- `updateAgentRun(runId, { status, tokensUsed, cost, errorMessage })` - Update run details
- `completeAgentRun(runId, { tokensUsed, cost })` - Mark run as completed
- `failAgentRun(runId, errorMessage)` - Mark run as failed
- `getAgentRuns(agentId, limit)` - Get runs for agent
- `getAgentRunsByTask(taskId)` - Get all runs for a task
- `getAgentRunById(runId)` - Get specific run

### 2. task_executions
Tracks task lifecycle, retries, and completion status.

**Schema:**
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing ID
- `task_id` (TEXT NOT NULL) - Foreign key to tasks table
- `company_id` (TEXT NOT NULL) - Foreign key to companies table
- `status` (TEXT NOT NULL) - Status: 'pending', 'completed', 'failed'
- `retries` (INTEGER NOT NULL) - Number of retry attempts
- `created_at` (TEXT NOT NULL) - When execution started
- `completed_at` (TEXT) - When execution completed (nullable)

**Indexes:**
- `idx_task_executions_task` - Query by task
- `idx_task_executions_company` - Query by company
- `idx_task_executions_status` - Filter by status

**Functions:**
- `createTaskExecution({ taskId, companyId, status, agentId })` - Create new execution record
- `updateTaskExecution(executionId, { status, retries })` - Update execution details
- `completeTaskExecution(executionId)` - Mark execution as completed
- `getTaskExecutions(taskId, limit)` - Get executions for task
- `getTaskExecutionById(executionId)` - Get specific execution
- `getRecentTaskExecutions(companyId, limit)` - Get recent executions

### 3. metrics
Time-series metrics storage for trend analysis and anomaly detection.

**Schema:**
- `id` (INTEGER PRIMARY KEY) - Auto-incrementing ID
- `timestamp` (TEXT NOT NULL) - ISO timestamp when metric recorded
- `metric_name` (TEXT NOT NULL) - Metric identifier (e.g., 'cpu_usage', 'api_latency')
- `value` (REAL NOT NULL) - Metric value
- `agent_id` (TEXT) - Associated agent (nullable)
- `company_id` (TEXT) - Associated company (nullable)

**Indexes:**
- `idx_metrics_timestamp` - Time-based queries
- `idx_metrics_name` - Query by metric name
- `idx_metrics_agent` - Query by agent
- `idx_metrics_company` - Query by company

**Functions:**
- `logMetric({ metricName, value, agentId, companyId, timestamp })` - Record metric
- `getMetrics({ metricName, agentId, companyId, startTime, endTime, limit })` - Query metrics
- `getMetricsSummary({ metricName, agentId, companyId, startTime, endTime })` - Aggregate stats

## Database Location
- **Path:** `~/.hivemind/hivemind.db` (configurable via `HIVEMIND_HOME`)
- **Format:** SQLite with WAL mode enabled
- **Foreign Keys:** Enabled for referential integrity

## Migration Strategy
- Tables created with `CREATE TABLE IF NOT EXISTS` for safe initialization
- Existing databases automatically migrated when `getDb()` is first called
- No manual migration steps required

## Verification
Run `node test-db-schema.js` to verify schema and view all tables/indexes.

## Usage Example

```javascript
import * as db from './src/db.js';

// Track agent execution
const runId = db.createAgentRun({
  agentId: 'agent-123',
  taskId: 'task-456'
});

// Update with results
db.completeAgentRun(runId, {
  tokensUsed: 15000,
  cost: 0.05
});

// Create task execution
const execId = db.createTaskExecution({
  taskId: 'task-456',
  companyId: 'company-789'
});

// Record metrics
db.logMetric({
  metricName: 'api_latency_ms',
  value: 150,
  agentId: 'agent-123'
});
```

## Technical Decisions

1. **SQLite over PostgreSQL:** Simplified deployment, no external dependencies, suitable for local dashboard
2. **Timestamps as TEXT (ISO 8601):** Better SQLite compatibility, human-readable, sortable
3. **Lazy initialization:** Database created on first use, no explicit startup step required
4. **Comprehensive indexing:** Optimized for common query patterns (by agent, company, time)
5. **Nullable foreign keys:** Allows metrics/runs without specific task/agent association
