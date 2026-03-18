# Agent Auto-Recovery System with Exponential Backoff

## Overview

The Hivemind Engine now includes a sophisticated agent auto-recovery system that automatically detects crashed or stuck agents and restarts them with intelligent exponential backoff retry logic.

## Features

### 1. Intelligent Crash Detection
- Health monitoring checks agent processes every 30 seconds
- Requires 2 consecutive failed health checks before declaring a crash (60s total)
- Prevents false positives from transient network issues

### 2. Exponential Backoff Retry Strategy
- **Initial backoff**: 1 second
- **Backoff multiplier**: 2x (exponential growth)
- **Maximum backoff**: 5 minutes (capped)
- **Maximum retry attempts**: 8 attempts
- **Total recovery window**: ~8.5 minutes before permanent failure

**Backoff progression**:
- Attempt 1: 1s delay
- Attempt 2: 2s delay
- Attempt 3: 4s delay
- Attempt 4: 8s delay
- Attempt 5: 16s delay
- Attempt 6: 32s delay
- Attempt 7: 64s delay
- Attempt 8: 128s delay

### 3. Success-Based Reset
- If an agent runs successfully for 10+ minutes, retry count resets to 0
- Prevents cascading failures from temporary issues
- Agents that recover and stabilize get a fresh start

### 4. Permanent Failure Handling
- After 8 failed retry attempts, agent is marked as "failed_permanently"
- Task is marked as "blocked" to prevent infinite loops
- Manual intervention required via dashboard
- Recovery state can be manually reset to retry

### 5. Real-Time Recovery Status
- Dashboard shows live recovery status for all agents
- Countdown timer for next retry attempt
- Visual indicators for recovering vs. permanently failed agents
- Failure history tracking (last 10 failures per agent)

## Architecture

### Core Modules

#### `src/recovery-manager.js`
- **In-memory state tracking** - Maintains recovery state per agent
- **Backoff calculation** - Exponential backoff with configurable parameters
- **Success tracking** - Monitors healthy runtime duration
- **Recovery metrics** - Aggregated statistics for monitoring

Key functions:
```javascript
recordAgentCrash({ agentId, agentName, companyId, taskId, reason })
recordAgentRecovery({ agentId, agentName, companyId, taskId })
canRetryAgent(agentId)
getTimeUntilRetry(agentId)
resetRecoveryState(agentId)
getRecoveryStatus(companyId)
getRecoveryStats(companyId)
```

#### `src/health-monitoring.js` (Enhanced)
- **Integrated retry scheduling** - Uses setTimeout for backoff delays
- **Timer management** - Tracks pending retry timers per agent
- **Graceful cleanup** - Clears timers on shutdown
- **Recovery success detection** - Automatically records when agents recover

#### API Endpoints

**GET** `/api/companies/:id/recovery-status`
```json
{
  "status": [
    {
      "agentId": "...",
      "agentName": "ceo",
      "status": "recovering",
      "attemptCount": 3,
      "totalCrashes": 5,
      "currentBackoffMs": 4000,
      "timeUntilRetryMs": 2500,
      "canRetryNow": false,
      "lastSuccessTime": 1710789123456,
      "recentFailures": [...]
    }
  ],
  "stats": {
    "total_agents": 5,
    "healthy": 3,
    "recovering": 1,
    "failed_permanently": 1,
    "total_crashes": 12,
    "total_recovery_attempts": 18,
    "agents_in_backoff": 1
  }
}
```

**POST** `/api/agents/:id/recovery/reset`
- Manually reset recovery state for permanently failed agents
- Clears retry count and backoff timers
- Allows fresh restart attempt

## Dashboard UI

### Recovery Status Panels

**Recovering Agents Panel** (Yellow/Amber)
- Shows agents currently in recovery with backoff countdown
- Displays attempt count (e.g., "Attempt 3/8")
- Real-time countdown timer until next retry
- Recent failure reason display

**Permanently Failed Agents Panel** (Red)
- Lists agents that exceeded max retry attempts
- Shows total crash count and attempt history
- "Reset Recovery" button to manually clear state
- Failure reason history

### Enhanced Agent Health View
- Real-time recovery status badges
- Backoff countdown timers
- Visual distinction between recovering vs. failed
- One-click recovery reset for admins

## Configuration

All retry parameters are configurable in `src/recovery-manager.js`:

```javascript
const INITIAL_BACKOFF_MS = 1000;              // Start at 1s
const MAX_BACKOFF_MS = 5 * 60 * 1000;         // Cap at 5 minutes
const MAX_RETRY_ATTEMPTS = 8;                 // Give up after 8 tries
const BACKOFF_MULTIPLIER = 2;                 // Exponential growth
const SUCCESS_RESET_THRESHOLD_MS = 10 * 60 * 1000; // Reset after 10min success
```

## Incident Logging

All recovery events are logged to the database:

### Logged Events
1. **Agent crash detected** - Initial crash with PID info
2. **Retry scheduled** - Each retry attempt with backoff duration
3. **Recovery success** - Successful restart after N attempts
4. **Permanent failure** - Max retries exceeded
5. **Manual reset** - Admin intervention

### Structured Logs
```javascript
{
  level: 'warning',
  source: 'recovery-manager',
  company_id: '...',
  agent_id: '...',
  task_id: '...',
  action: 'scheduling_retry',
  metadata: {
    attempt: 3,
    backoff_ms: 4000,
    next_retry_at: '2024-03-18T10:30:15.000Z'
  }
}
```

## Integration with Existing Systems

### Circuit Breaker
- Recovery system respects circuit breaker state
- No retries attempted when circuit is OPEN
- Automatic resume when circuit closes

### Health Monitoring
- Health checks trigger recovery process
- Recovery success updates health status
- Incident timeline includes recovery events

### Checkpoint System
- Tasks resume from last checkpoint after recovery
- Checkpoint info included in recovery logs
- No work lost during agent restarts

## Monitoring & Alerts

### Slack Integration
Recovery events can trigger Slack alerts:
```
🚨 Agent ceo crashed on task "Deploy homepage".
Retrying in 4s (attempt 3).
```

```
❌ CRITICAL: Agent cto permanently failed after max retries.
Manual intervention required!
```

### Dashboard Metrics
- Total recovery attempts
- Recovery success rate
- Average time to recovery
- Agents in backoff state
- Permanently failed agents count

## Testing Recovery

To test the recovery system:

1. **Simulate crash**: Kill an agent process manually
2. **Watch recovery**: Dashboard shows countdown timer
3. **Monitor retries**: Check incident timeline for attempts
4. **Verify success**: Agent should restart after backoff delay

## Production Deployment

The recovery system is production-ready with:
- ✅ Comprehensive error handling
- ✅ Memory-efficient state tracking
- ✅ Graceful shutdown and cleanup
- ✅ Real-time WebSocket updates
- ✅ Database persistence for audit trail
- ✅ Configurable retry parameters
- ✅ Manual override capabilities

## Future Enhancements

Potential improvements:
- Per-agent custom retry policies
- Adaptive backoff based on failure type
- Historical recovery rate trending
- Predictive failure detection
- Auto-scaling based on failure patterns
