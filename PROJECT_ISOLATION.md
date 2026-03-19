# Project Isolation & Configuration System

## Overview

Comprehensive project isolation and configuration system for Hivemind Engine that ensures each managed project has:
- **Isolated agents and tasks** with strict boundary enforcement
- **Resource limits** (max concurrent agents, budget caps)
- **Custom configuration** (heartbeat interval, checkpoint frequency)
- **Clear separation** between projects with isolation verification

## Architecture

### Database Schema

**New Table: `project_config`**
```sql
CREATE TABLE project_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id)
);
```

### Configuration Fields

Each project has isolated configuration:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_concurrent_agents` | number | 5 | Maximum agents that can run simultaneously for this project |
| `heartbeat_interval_sec` | number | 15 | How often the orchestrator checks project health (seconds) |
| `checkpoint_every_n_turns` | number | 5 | Frequency of agent state checkpoints (turns) |
| `max_budget_usd` | number \| null | null | Maximum spend limit in USD (null = unlimited) |
| `budget_alert_threshold` | number | 0.8 | Alert when budget usage exceeds this ratio (0-1) |
| `auto_resume` | boolean | true | Automatically resume orchestrator on server restart |
| `health_check_enabled` | boolean | true | Enable health monitoring for agents |
| `health_check_interval_sec` | number | 30 | Health check frequency (seconds) |
| `deployment_enabled` | boolean | true | Allow deployments for this project |
| `auto_deploy` | boolean | false | Automatically deploy on task completion |
| `slack_notifications` | boolean | false | Enable Slack notifications |
| `slack_webhook_url` | string \| null | null | Slack webhook URL for notifications |

## Resource Isolation

### Agent Slots

Each project respects its own `max_concurrent_agents` limit:

```javascript
// Orchestrator enforces per-project limits
const config = projectConfig.getProjectConfig(company.id);
const available = config.max_concurrent_agents - runningCount;
```

**Key functions:**
- `canSpawnAgent(companyId)` - Check if project can spawn more agents
- `getAvailableAgentSlots(companyId)` - Get remaining agent capacity

### Budget Controls

Projects can have spending limits with automatic enforcement:

```javascript
// Budget enforcement in orchestrator
if (projectConfig.hasExceededBudget(company.id)) {
  log(company.id, "DISPATCH", "Budget limit exceeded. Pausing dispatch.");
  return 0;
}
```

**Budget status tracking:**
- `getBudgetStatus(companyId)` - Get detailed budget metrics
- `hasExceededBudget(companyId)` - Check if over limit
- `isApproachingBudgetLimit(companyId)` - Check if approaching threshold

### Data Isolation

All database queries are scoped to specific companies:

```javascript
// All agents for a specific project
db.getAgentsByCompany(companyId)

// All tasks for a specific project
db.getTasksByCompany(companyId)

// Isolation verification
projectConfig.verifyAgentIsolation(agentId, expectedCompanyId)
projectConfig.verifyTaskIsolation(taskId, expectedCompanyId)
```

## Configuration Presets

Four built-in presets for common scenarios:

### Development
```javascript
{
  max_concurrent_agents: 3,
  heartbeat_interval_sec: 10,
  checkpoint_every_n_turns: 3,
  max_budget_usd: 5.0,
  budget_alert_threshold: 0.7,
  auto_resume: true,
  health_check_enabled: true,
  deployment_enabled: false,
  auto_deploy: false,
}
```

### Production
```javascript
{
  max_concurrent_agents: 10,
  heartbeat_interval_sec: 30,
  checkpoint_every_n_turns: 10,
  max_budget_usd: null, // unlimited
  budget_alert_threshold: 0.8,
  auto_resume: true,
  health_check_enabled: true,
  deployment_enabled: true,
  auto_deploy: true,
}
```

### Budget Constrained
```javascript
{
  max_concurrent_agents: 2,
  heartbeat_interval_sec: 60,
  checkpoint_every_n_turns: 20,
  max_budget_usd: 10.0,
  budget_alert_threshold: 0.9,
  auto_resume: false,
  health_check_enabled: true,
  deployment_enabled: false,
  auto_deploy: false,
}
```

### High Performance
```javascript
{
  max_concurrent_agents: 20,
  heartbeat_interval_sec: 5,
  checkpoint_every_n_turns: 2,
  max_budget_usd: null,
  budget_alert_threshold: 0.8,
  auto_resume: true,
  health_check_enabled: true,
  deployment_enabled: true,
  auto_deploy: true,
}
```

## API Endpoints

### Get Configuration
```http
GET /api/companies/:id/config
```

Response includes:
- Current configuration
- Budget status (spent, limit, remaining, alerts)
- Available agent slots
- Project resources summary
- Available presets

### Update Configuration
```http
POST /api/companies/:id/config
Content-Type: application/json

{
  "max_concurrent_agents": 10,
  "max_budget_usd": 100.0,
  "budget_alert_threshold": 0.8
}
```

### Apply Preset
```http
POST /api/companies/:id/config/preset
Content-Type: application/json

{
  "preset": "production"
}
```

### Reset to Defaults
```http
DELETE /api/companies/:id/config
```

### Archive Project
```http
POST /api/companies/:id/archive
```

Marks project as archived:
- Stops all running agents
- Sets status to 'archived'
- Preserves all data

### Delete Project (DANGEROUS)
```http
DELETE /api/companies/:id?confirm=true
```

**Permanently deletes:**
- Project configuration
- All agents
- All tasks
- Activity logs
- Cost logs
- Incidents
- Checkpoints
- Deployment history

### Isolation Check
```http
GET /api/companies/:id/isolation-check
```

Verifies data isolation:
- Checks all agents belong to correct project
- Checks all tasks belong to correct project
- Returns any isolation violations

## UI Components

### Settings Page (`/settings`)

Comprehensive configuration interface with sections:

1. **Quick Presets** - One-click preset application
2. **Resource Limits** - Agent slots, heartbeat, checkpoints
3. **Budget Controls** - Spending limits, alert thresholds, usage visualization
4. **Automation** - Auto-resume, health checks, deployment settings
5. **Project Resources** - Current resource counts (agents, tasks, logs)
6. **Danger Zone** - Archive or delete project

**Features:**
- Real-time unsaved changes detection
- Save/reset controls
- Budget usage visualization
- Isolation warnings

## Orchestrator Integration

The orchestrator respects project configuration at runtime:

```javascript
// On startup - initialize default config
const initialConfig = projectConfig.setProjectConfig(companyId, {
  max_concurrent_agents: MAX_CONCURRENT_AGENTS,
  heartbeat_interval_sec: HEARTBEAT_INTERVAL_SEC,
  checkpoint_every_n_turns: CHECKPOINT_EVERY_N_TURNS,
});

// During dispatch - enforce agent limits
const config = projectConfig.getProjectConfig(company.id);
let available = config.max_concurrent_agents - runningCount;

// During heartbeat - use custom intervals
const heartbeat = setInterval(async () => {
  // ... heartbeat logic
}, config.heartbeat_interval_sec * 1000);

// During checkpointing - use custom frequency
if (handle.currentTurn - lastCheckpointTurn >= config.checkpoint_every_n_turns) {
  db.saveCheckpoint({ ... });
}
```

## Project Lifecycle

### Creation
1. Create company in database
2. Initialize default configuration
3. Create initial agents (CEO, CTO, Designer, CFO, CMO)
4. Configuration can be modified via UI or API

### Operation
1. Orchestrator reads project configuration
2. Enforces resource limits (agents, budget)
3. Uses custom intervals (heartbeat, checkpoints)
4. Monitors budget thresholds
5. Respects automation settings

### Archival
1. User triggers archive via API/UI
2. All running agents stopped
3. Project status set to 'archived'
4. Data preserved for auditing
5. Can be reactivated by changing status

### Deletion
1. User confirms deletion (requires `?confirm=true`)
2. All associated data deleted in order:
   - Checkpoints → Incidents → Deployments
   - Retry logs → Cost logs → Usage logs
   - Comments → Activity logs → Tasks
   - Agents → Config → Budget config → Logs
   - Company record
3. **IRREVERSIBLE** - no recovery possible

## Security & Isolation Guarantees

1. **Database-level isolation** - All queries scoped by `company_id`
2. **Foreign key constraints** - Cascading deletes prevent orphaned records
3. **Resource boundaries** - Each project has independent limits
4. **Budget enforcement** - Automatic dispatch pause on budget exceeded
5. **Validation checks** - API endpoints verify isolation integrity
6. **Verification tools** - `/isolation-check` endpoint audits boundaries

## Files Modified/Created

### Backend
- ✅ `src/project-config.js` - Complete configuration system (NEW)
- ✅ `src/db.js` - Added `project_config` table schema
- ✅ `src/orchestrator.js` - Integrated project configuration enforcement
- ✅ `src/server.js` - Added configuration API endpoints

### Frontend
- ✅ `ui/src/pages/Settings.tsx` - Configuration management UI (NEW)
- ✅ `ui/src/App.tsx` - Added Settings route
- ✅ `ui/src/components/Layout.tsx` - Added Settings navigation link

### Documentation
- ✅ `PROJECT_ISOLATION.md` - This comprehensive guide (NEW)

## Testing Checklist

- [ ] Create multiple projects
- [ ] Set different agent limits per project
- [ ] Verify agents respect per-project limits
- [ ] Set budget limits and verify enforcement
- [ ] Test budget alert thresholds
- [ ] Apply configuration presets
- [ ] Verify custom heartbeat intervals
- [ ] Verify custom checkpoint frequency
- [ ] Test archive functionality
- [ ] Test delete with confirmation
- [ ] Run isolation check endpoint
- [ ] Verify cross-project data separation
- [ ] Test UI configuration changes
- [ ] Verify unsaved changes detection
- [ ] Test preset application via UI

## Usage Examples

### Set Custom Limits for a Project

```javascript
// Via API
await fetch(`http://localhost:3100/api/companies/${companyId}/config`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    max_concurrent_agents: 15,
    max_budget_usd: 50.0,
    heartbeat_interval_sec: 20,
  }),
});
```

### Check Budget Status

```javascript
import * as projectConfig from './project-config.js';

const status = projectConfig.getBudgetStatus(companyId);
console.log(`Spent: $${status.spent.toFixed(2)} / $${status.limit}`);
console.log(`Usage: ${(status.usageRatio * 100).toFixed(1)}%`);
console.log(`Exceeded: ${status.exceeded}`);
console.log(`Approaching limit: ${status.approaching}`);
```

### Verify Isolation

```javascript
const res = await fetch(`http://localhost:3100/api/companies/${companyId}/isolation-check`);
const { isolated, issues } = await res.json();

if (!isolated) {
  console.error('Isolation violations detected:', issues);
}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Per-agent resource limits** - CPU/memory quotas per agent
2. **Project templates** - Save/load custom configuration templates
3. **Configuration history** - Track changes over time
4. **Budget forecasting** - Predict spend based on current usage
5. **Multi-tier budgets** - Daily/weekly/monthly limits
6. **Resource quotas** - Limit storage, API calls, etc.
7. **Project cloning** - Duplicate projects with configuration
8. **Batch operations** - Apply settings to multiple projects
9. **Audit logging** - Track all configuration changes
10. **Webhooks** - Trigger external actions on budget/resource events

---

**Implementation Date:** March 2026
**Version:** 1.0.0
**Status:** Complete ✅
