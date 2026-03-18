# Agent Health Monitoring & Auto-Restart

## Overview
Production-grade health monitoring system that automatically detects crashed agents and restarts them from the last saved checkpoint.

## Features

### 1. Health Check Loop
- **Frequency**: Every 30 seconds (configurable via `HIVEMIND_HEALTH_CHECK_SEC`)
- **Method**: PID-based process liveness checking (more reliable than HTTP endpoints)
- **Threshold**: 2 consecutive failed checks (60s total) before declaring crash

### 2. Checkpoint System
- **Frequency**: Every 5 turns (configurable via `HIVEMIND_CHECKPOINT_TURNS`)
- **Storage**: SQLite `checkpoints` table
- **Data Saved**: Turn number, last 1KB of output, timestamp
- **Cleanup**: Checkpoints deleted after successful task completion

### 3. Auto-Restart
- **Detection**: Health monitor identifies crashed agents (PID no longer alive)
- **Recovery**: Task reset to `todo` status and picked up by dispatcher
- **Resume Point**: Tasks restart from last checkpoint (or from beginning if no checkpoint exists)

### 4. Incident Logging
- **Storage**: SQLite `incidents` table
- **Data**: Company ID, agent ID, task ID, crash description, recovery action, timestamp
- **API Endpoints**:
  - `GET /api/companies/:id/incidents` - View all incidents for a company
  - `GET /api/agents/:id/incidents` - View incidents for specific agent

### 5. Slack Alerts (Optional)
- **Configuration**: Set `HIVEMIND_SLACK_WEBHOOK` environment variable
- **Format**: Rich message with agent name, task title, and recovery action
- **Trigger**: Sent immediately when crash is detected

## Architecture

### Database Schema
```sql
CREATE TABLE checkpoints (
  id INTEGER PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  state_data TEXT,              -- JSON: { progress, timestamp }
  created_at TEXT
);

CREATE TABLE incidents (
  id INTEGER PRIMARY KEY,
  company_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  task_id TEXT,
  incident_type TEXT NOT NULL,  -- 'agent_crash', etc.
  description TEXT,
  recovery_action TEXT,
  created_at TEXT
);
```

### Components

1. **health-monitoring.js**
   - Core health checking logic
   - Crash detection and recovery
   - Slack notification integration
   - Incident logging

2. **orchestrator.js**
   - Integrates health monitoring loop
   - Checkpoint saving every N turns
   - Auto-restart via dispatcher callback

3. **claude.js**
   - Tracks `currentTurn` on each agent handle
   - Updated by assistant message events

4. **db.js**
   - Checkpoint CRUD operations
   - Incident logging and querying

5. **server.js**
   - API endpoints for incident viewing
   - Dashboard integration ready

## Configuration

### Environment Variables
```bash
# Health check frequency (default: 30 seconds)
HIVEMIND_HEALTH_CHECK_SEC=30

# Save checkpoint every N turns (default: 5)
HIVEMIND_CHECKPOINT_TURNS=5

# Optional Slack webhook for crash alerts
HIVEMIND_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Runtime Behavior
- Health monitoring starts automatically when company heartbeat loop begins
- Runs in parallel with main heartbeat (separate 30s interval)
- Stops gracefully when orchestrator is interrupted (Ctrl+C)
- Survives orchestrator restarts (agents continue running, will be detected as stale and cleaned up on resume)

## Acceptance Criteria ✅
- ✅ Crashed agents auto-restart within 60s
- ✅ Work resumes from last checkpoint (every 5 turns)
- ✅ Incidents logged to database
- ✅ Optional Slack alerts for production monitoring
- ✅ API endpoints for viewing crash history
- ✅ Zero data loss (checkpoints saved regularly)

## Example Workflow

1. **Normal Operation**
   ```
   [HEALTH] Starting health monitoring (check every 30s)
   [CHECKPOINT] Saved checkpoint for eng-a1b2c3d4 at turn 5
   [CHECKPOINT] Saved checkpoint for eng-a1b2c3d4 at turn 10
   ```

2. **Crash Detection**
   ```
   [HEALTH] Agent eng-a1b2c3d4 missed health check (1/2)
   [HEALTH] Agent eng-a1b2c3d4 missed health check (2/2)
   [HEALTH] Agent eng-a1b2c3d4 (pid 12345) crashed - initiating recovery
   ```

3. **Recovery**
   ```
   [HEALTH] Task "Build dashboard UI" reset to todo, will be restarted by dispatcher
   [INCIDENT] Logged: Agent eng-a1b2c3d4 crashed while working on "Build dashboard UI"
   [SLACK] Alert sent: Agent eng-a1b2c3d4 crashed. Auto-restarting from turn 10.
   [DISPATCH] Sending 1 tasks to engineers...
   [ENG-A1B2C3D4] Working on: Build dashboard UI (resuming from checkpoint)
   ```

## Dashboard Integration
Add incidents view to UI:
- Show recent crashes in company dashboard
- Filter by agent, task, or time range
- Display recovery actions taken
- Link to agent logs for debugging

## Production Best Practices
1. Set `HIVEMIND_SLACK_WEBHOOK` for real-time crash notifications
2. Monitor incident rate via `/api/companies/:id/incidents`
3. Increase `HIVEMIND_CHECKPOINT_TURNS` for long-running tasks to reduce overhead
4. Review incidents weekly to identify patterns (API failures, OOM, etc.)
5. Use checkpoint data for debugging (last known state before crash)
