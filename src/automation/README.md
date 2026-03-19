# Automated Recovery Playbooks

Production-ready automated recovery system for Hivemind Engine. Automatically handles common failure patterns with configurable recovery strategies.

## Features

- **10 Built-in Playbooks** for common failure modes
- **Smart Pattern Matching** based on error types, status, and context
- **Priority-Based Execution** (highest priority playbook wins)
- **Full Logging** all executions logged to activity_log
- **JSON Configuration** easy to customize and extend
- **REST API** for monitoring and control

## Quick Start

### 1. Basic Usage

```javascript
import { autoRecover } from './automation/playbooks.js';

// On any failure, automatically trigger recovery
try {
  await someApiCall();
} catch (error) {
  const result = await autoRecover({
    error,
    companyId: 'company-123',
    agentId: 'agent-456',
    taskId: 'task-789'
  });

  if (result.matched) {
    console.log(`Playbook executed: ${result.playbook.name}`);
  }
}
```

### 2. Wrap Functions with Auto-Recovery

```javascript
import { executeWithPlaybookRecovery } from './automation/playbook-integration.js';

// Automatically retry with playbooks on failure
const result = await executeWithPlaybookRecovery(
  async () => {
    return await riskyApiCall();
  },
  {
    companyId: 'company-123',
    agentId: 'agent-456',
    taskId: 'task-789',
    maxAttempts: 4
  }
);
```

### 3. Handle Agent Crashes

```javascript
import { handleAgentCrashWithPlaybook } from './automation/playbook-integration.js';

// Auto-restart crashed agent with exponential backoff
await handleAgentCrashWithPlaybook({
  companyId: 'company-123',
  agentId: 'agent-456',
  agentName: 'engineer',
  taskId: 'task-789',
  reason: 'Process exited unexpectedly'
});
```

## Built-in Playbooks

### 1. API Timeout Recovery
- **Trigger**: `TIMEOUT` error
- **Actions**: Retry with exponential backoff (2s → 5s → 12.5s → 30s)
- **Max Attempts**: 4

### 2. Rate Limit Recovery
- **Trigger**: `RATE_LIMIT` error (429)
- **Actions**: Pause 60s, then retry with backoff
- **Max Attempts**: 5

### 3. Context Overflow Task Split
- **Trigger**: Error message contains "context", "too long", "token limit"
- **Actions**: Split task into 4 subtasks
- **Result**: Parent task continues with smaller chunks

### 4. Server Error Recovery
- **Trigger**: `SERVER_ERROR` (5xx)
- **Actions**: Retry with aggressive backoff (1s → 3s → 9s)
- **Max Attempts**: 3

### 5. Network Error Recovery
- **Trigger**: `NETWORK_ERROR` (ECONNREFUSED, etc.)
- **Actions**: Wait 3s, then retry
- **Max Attempts**: 4

### 6. Circuit Breaker Recovery
- **Trigger**: Circuit breaker open
- **Actions**: Wait 10s for circuit to reset, then retry
- **Max Attempts**: 2

### 7. Agent Crash Auto-Recovery
- **Trigger**: Agent status = "error", incident_type = "agent_crash"
- **Actions**: Load checkpoint, restart agent with recovery manager
- **Behavior**: Uses exponential backoff from recovery-manager.js

### 8. Quota Exceeded Alert
- **Trigger**: `QUOTA_EXCEEDED` error
- **Actions**: Block task, log critical incident, notify user
- **Manual Intervention**: Required

### 9. Authentication Error Alert
- **Trigger**: `AUTH_ERROR` (401, 403)
- **Actions**: Block task, log critical incident, notify user
- **Manual Intervention**: Required

### 10. Stuck Task Recovery
- **Trigger**: Task in_progress for 30+ minutes
- **Actions**: Load checkpoint, restart task
- **Result**: Task unblocked and resumed

## Configuration

Playbooks are defined in `src/config/recovery-playbooks.json`:

```json
{
  "playbooks": [
    {
      "id": "api-timeout-retry",
      "name": "API Timeout Recovery",
      "enabled": true,
      "priority": 10,
      "triggers": {
        "error_type": "TIMEOUT",
        "min_failures": 1
      },
      "actions": [
        {
          "type": "retry_with_backoff",
          "params": {
            "max_attempts": 4,
            "base_delay_ms": 2000
          }
        }
      ]
    }
  ],
  "global_settings": {
    "max_playbook_retries": 3,
    "playbook_timeout_minutes": 15
  }
}
```

## Trigger Types

Playbooks match based on:
- `error_type`: Error classification (TIMEOUT, RATE_LIMIT, etc.)
- `error_message_contains`: Keywords in error message
- `agent_status`: Agent state (error, idle, running)
- `incident_type`: Type of incident (agent_crash, etc.)
- `task_status`: Task state (in_progress, blocked)
- `task_stuck_minutes`: How long task has been stuck
- `min_failures`: Minimum failure count to trigger

## Action Types

Available actions:
- `log_playbook_start`: Log start of playbook
- `retry_with_backoff`: Configure retry strategy
- `pause`: Wait for specified duration
- `split_task`: Break task into subtasks
- `update_task_status`: Change task status
- `log_incident`: Record incident
- `log_activity`: Log to activity_log
- `checkpoint_restore`: Load last checkpoint
- `restart_agent`: Restart crashed agent
- `restart_task`: Resume blocked task
- `notify_user`: Send alert notification

## API Endpoints

### List Playbooks
```http
GET /api/playbooks
```

### Get Execution History
```http
GET /api/companies/:id/playbooks/history?limit=50
```

### Get Statistics
```http
GET /api/companies/:id/playbooks/stats
```

### Reload Configuration
```http
POST /api/playbooks/reload
```

### Run Health Check
```http
POST /api/companies/:id/playbooks/health-check
```

### Test Playbook Matching
```http
POST /api/playbooks/test-match
Body: { "error": {...}, "errorType": "TIMEOUT", "companyId": "..." }
```

## Monitoring

All playbook executions are logged to `activity_log` table:

```sql
SELECT * FROM activity_log
WHERE action = 'playbook_execution'
ORDER BY created_at DESC;
```

Log format:
```json
{
  "playbook_id": "api-timeout-retry",
  "playbook_name": "API Timeout Recovery",
  "status": "completed",
  "duration_ms": 2345,
  "actions_executed": 3,
  "actions_succeeded": 3,
  "actions_failed": 0
}
```

## Extending Playbooks

### Add New Playbook

Edit `src/config/recovery-playbooks.json`:

```json
{
  "id": "custom-recovery",
  "name": "Custom Recovery Strategy",
  "enabled": true,
  "priority": 40,
  "triggers": {
    "error_message_contains": ["custom error"],
    "min_failures": 2
  },
  "actions": [
    {
      "type": "pause",
      "params": { "duration_ms": 5000 }
    },
    {
      "type": "retry_with_backoff",
      "params": {
        "max_attempts": 3,
        "base_delay_ms": 1000
      }
    }
  ]
}
```

Then reload:
```bash
curl -X POST http://localhost:3100/api/playbooks/reload
```

### Add New Action Type

Edit `src/automation/playbooks.js` and add to `executeAction()` function:

```javascript
case 'my_custom_action':
  console.log('[PLAYBOOK] Executing custom action');
  // Your logic here
  break;
```

## Integration with Existing Systems

### With Retry Manager
Playbooks use `retry-manager.js` for intelligent retry logic with error classification.

### With Recovery Manager
Agent crash playbooks delegate to `recovery-manager.js` for exponential backoff tracking.

### With Circuit Breaker
Playbooks respect circuit breaker state and pause when circuit is open.

### With Health Monitoring
Health check scans for stuck tasks and triggers playbooks automatically.

## Production Deployment

1. **Review Playbook Configuration**
   ```bash
   cat src/config/recovery-playbooks.json
   ```

2. **Test Playbook System**
   ```bash
   node src/automation/playbooks.test.js
   ```

3. **Monitor Execution**
   - Check activity_log for playbook_execution
   - Use /api/companies/:id/playbooks/stats for metrics
   - Watch for critical incidents (quota/auth errors)

4. **Tune Parameters**
   - Adjust retry attempts based on API limits
   - Modify backoff delays for your SLAs
   - Set appropriate task stuck timeouts

## Troubleshooting

### Playbook Not Matching
Check triggers in config match your error context:
```javascript
const result = testPlaybookMatch({
  error: yourError,
  errorType: 'TIMEOUT',
  companyId: 'company-123'
});
console.log(result.matched); // Should be true
```

### Playbook Not Executing
Check logs:
```sql
SELECT * FROM activity_log
WHERE action = 'playbook_execution'
AND company_id = 'company-123'
ORDER BY created_at DESC LIMIT 10;
```

### High Failure Rate
Review stats:
```bash
curl http://localhost:3100/api/companies/company-123/playbooks/stats
```

## Performance

- **Overhead**: ~5-10ms per playbook match
- **Execution**: Varies by playbook (pauses add delay)
- **Database**: Minimal (1-2 inserts per execution)
- **Memory**: ~1MB for config, negligible runtime

## Best Practices

1. **Start Conservative**: Begin with longer backoff delays, tune down if needed
2. **Monitor First Week**: Watch execution stats, adjust priorities
3. **Alert on Critical**: Set up notifications for quota/auth playbooks
4. **Test Changes**: Use test-match endpoint before deploying config changes
5. **Document Custom Playbooks**: Add descriptions for team knowledge

## Examples

See `playbooks.test.js` for comprehensive examples of:
- Error matching
- Priority ordering
- Context scenarios
- Integration patterns
