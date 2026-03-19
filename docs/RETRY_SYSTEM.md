# Task Retry System with Failure Classification

## Overview

The Hivemind Engine includes a sophisticated retry system that intelligently handles transient failures, implements smart backoff strategies, and provides comprehensive failure analytics. The system automatically classifies errors as transient or permanent and applies appropriate retry policies.

## Key Features

✅ **Intelligent Failure Classification** - Distinguishes between transient errors (safe to retry) and permanent errors (no retry needed)

✅ **Smart Exponential Backoff with Jitter** - Prevents thundering herd problem while maximizing retry success

✅ **Configurable Retry Policies** - Different strategies per error type (rate limits, timeouts, network errors, etc.)

✅ **Task-Level Retry State Management** - Tracks retry history and state for each task

✅ **Circuit Breaker Integration** - Prevents cascade failures by pausing operations when too many failures occur

✅ **Comprehensive Analytics** - Dashboard visibility into retry metrics, timelines, and high-retry tasks

✅ **Automatic Recovery Actions** - Smart recommendations for recovery based on error type

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Execution Request                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Circuit Breaker Check                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ State: CLOSED (normal) | OPEN (paused) | HALF_OPEN  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │ ✓ Can proceed
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                Execute Task with Retry                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Attempt execution                                 │   │
│  │ 2. On failure: Classify error                       │   │
│  │ 3. Check if retryable (transient vs permanent)      │   │
│  │ 4. Apply retry policy for error type                │   │
│  │ 5. Calculate backoff delay with jitter              │   │
│  │ 6. Log retry attempt to database                    │   │
│  │ 7. Wait for delay, then retry                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
  ┌─────────┐         ┌──────────┐
  │ SUCCESS │         │ FAILURE  │
  └────┬────┘         └─────┬────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌───────────────┐
│ Record       │     │ Create        │
│ Success in   │     │ Incident,     │
│ Circuit      │     │ Mark Task     │
│ Breaker      │     │ Blocked       │
└──────────────┘     └───────────────┘
```

## Error Classification

### Transient Errors (Retryable)

These errors are temporary and safe to retry:

| Error Type | Max Attempts | Base Delay | Max Delay | Description |
|------------|--------------|------------|-----------|-------------|
| **RATE_LIMIT** | 5 | 5s | 120s | API rate limit exceeded - aggressive retry with long backoff |
| **TIMEOUT** | 4 | 2s | 60s | Request timeout - standard retry with medium backoff |
| **SERVER_ERROR** | 3 | 1s | 30s | 5xx server errors - quick retry with fast backoff |
| **NETWORK_ERROR** | 4 | 3s | 45s | Connection refused, DNS failures - medium retry |
| **CIRCUIT_BREAKER_OPEN** | 2 | 10s | 300s | Circuit breaker paused - wait for reset |
| **TEMPORARY_UNAVAILABLE** | 3 | 2s | 32s | Service temporarily unavailable |

### Permanent Errors (Non-Retryable)

These errors require manual intervention and should not be retried:

| Error Type | Description | Recommended Action |
|------------|-------------|--------------------|
| **AUTH_ERROR** | 401/403 authentication failures | Check API credentials and permissions |
| **INVALID_REQUEST** | 400 bad request | Review task parameters and prompt |
| **NOT_FOUND** | 404 resource not found | Verify resource exists and path is correct |
| **PERMISSION_DENIED** | Access denied | Check API key permissions |
| **QUOTA_EXCEEDED** | API quota limit reached | Wait for quota reset or upgrade plan |
| **INVALID_MODEL** | Model not found or invalid | Use a valid model identifier |

## Smart Backoff Strategy

The retry system uses **exponential backoff with jitter** to maximize success while preventing thundering herd:

### Formula

```
delay = min(baseDelay × (multiplier ^ attempt), maxDelay)
jitter = random(-jitterRange, +jitterRange)
finalDelay = delay + jitter
```

### Example: Timeout Error Retry

```
Attempt 0: 2,000ms  ± 20% jitter = 1,600-2,400ms
Attempt 1: 5,000ms  ± 20% jitter = 4,000-6,000ms
Attempt 2: 12,500ms ± 20% jitter = 10,000-15,000ms
Attempt 3: 31,250ms ± 20% jitter = 25,000-37,500ms (capped at 60s max)
```

### Why Jitter?

Jitter prevents multiple failing requests from retrying simultaneously (thundering herd), spreading out retry attempts to reduce load spikes on the API server.

## Usage

### In Application Code

```javascript
import { executeWithRetry } from "./retry-manager.js";

// Execute with automatic retry handling
const result = await executeWithRetry(
  async () => {
    // Your async operation
    return await someApiCall();
  },
  {
    taskId: task.id,
    agentId: agent.name,
    companyId: company.id,
    maxAttempts: 5,

    // Optional callbacks
    onRetry: async (attempt, error, delay) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
    },

    onFailure: async (error, attempts) => {
      console.error(`Failed after ${attempts} attempts`);
    }
  }
);
```

### Claude Session with Retry

The `claudeSessionSync()` function automatically uses the retry manager:

```javascript
import { claudeSessionSync } from "./claude.js";

const result = await claudeSessionSync(
  "agent-name",
  "Your prompt here",
  {
    cwd: "/path/to/workspace",
    taskId: "task-id",
    companyId: "company-id",
    maxTurns: 50
  }
);
```

## API Endpoints

### Get Retry Metrics

```bash
GET /api/companies/:id/retry-metrics
```

Returns overall retry statistics grouped by error type:

```json
{
  "overall": {
    "total_retries": 42,
    "total_affected_tasks": 15,
    "total_affected_agents": 5
  },
  "byErrorType": [
    {
      "error_type": "TIMEOUT",
      "total_retries": 25,
      "affected_tasks": 10,
      "avg_attempts": 2.5,
      "max_attempts": 4,
      "first_retry": "2026-03-18T10:00:00Z",
      "last_retry": "2026-03-18T14:30:00Z"
    }
  ]
}
```

### Get Retry Timeline

```bash
GET /api/companies/:id/retry-timeline?days=7
```

Returns time-series data for retry visualization:

```json
[
  {
    "date": "2026-03-18",
    "error_type": "TIMEOUT",
    "retry_count": 15,
    "affected_tasks": 8
  }
]
```

### Get High-Retry Tasks

```bash
GET /api/companies/:id/high-retry-tasks?min=3
```

Returns tasks with high retry counts for investigation:

```json
[
  {
    "task_id": "abc123",
    "title": "Deploy feature X",
    "status": "blocked",
    "retry_count": 7,
    "max_attempt": 4,
    "last_error_type": "TIMEOUT",
    "last_retry_at": "2026-03-18T14:30:00Z"
  }
]
```

### Get Task Retry State

```bash
GET /api/tasks/:taskId/retry-state
```

Returns retry state for a specific task:

```json
{
  "taskId": "abc123",
  "attemptCount": 3,
  "lastErrorType": "TIMEOUT",
  "lastErrorMessage": "Request timeout after 30s",
  "lastAttemptAt": "2026-03-18T14:30:00Z",
  "canRetry": true
}
```

### Get Retry Policies

```bash
GET /api/retry-policies
```

Returns all error types and their retry policies:

```json
{
  "error_types": [
    "RATE_LIMIT",
    "TIMEOUT",
    "SERVER_ERROR",
    "..."
  ],
  "policies": {
    "RATE_LIMIT": {
      "maxAttempts": 5,
      "baseDelayMs": 5000,
      "maxDelayMs": 120000,
      "backoffMultiplier": 2,
      "jitterFactor": 0.3
    }
  }
}
```

## Database Schema

### retry_logs Table

```sql
CREATE TABLE retry_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  agent_name TEXT,
  attempt INTEGER NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_retry_logs_task ON retry_logs(task_id);
```

## Circuit Breaker Integration

The retry system works with the circuit breaker to prevent cascade failures:

- **CLOSED**: Normal operation, all requests proceed
- **OPEN**: Too many failures (5+ consecutive), requests paused for 5 minutes
- **HALF_OPEN**: Testing recovery, allow one request to check if service recovered

When circuit breaker is OPEN, retry attempts receive `CIRCUIT_BREAKER_OPEN` error and wait for the breaker to reset.

## Recovery Actions

Based on error type, the system recommends specific recovery actions:

| Error Type | Recovery Action |
|------------|-----------------|
| RATE_LIMIT | Auto-retry after cooldown period |
| TIMEOUT | Check network and task complexity, auto-retry |
| SERVER_ERROR | Temporary API issue, auto-retry |
| NETWORK_ERROR | Check internet connection, auto-retry |
| AUTH_ERROR | Check API credentials - manual intervention required |
| INVALID_REQUEST | Review task parameters - manual review required |
| QUOTA_EXCEEDED | Wait for quota reset or upgrade plan - manual intervention |
| PERMISSION_DENIED | Check API permissions - manual intervention required |

## Metrics & Monitoring

The retry system tracks comprehensive metrics for monitoring:

- **Total retries** by error type
- **Affected tasks** and agents
- **Average retry attempts** per error
- **Retry timeline** for trend analysis
- **High-retry tasks** for investigation
- **Success rate** after retries
- **Recovery time** metrics

## Best Practices

1. **Always use `executeWithRetry`** for external API calls
2. **Set appropriate `taskId`** and `companyId` for proper tracking
3. **Monitor retry metrics** to identify systemic issues
4. **Investigate high-retry tasks** to find root causes
5. **Tune retry policies** based on your API provider's recommendations
6. **Use circuit breaker** to prevent cascade failures
7. **Handle permanent errors** with proper error messages to users

## Testing

Run the test suite:

```bash
node src/retry-manager.test.js
```

Tests cover:
- Error classification (transient vs permanent)
- Retryability checks
- Retry policy selection
- Backoff calculation with jitter
- End-to-end retry execution
- Success after retries
- Permanent error handling
- Max retries exhaustion

## Performance Considerations

- **Jitter reduces load spikes** on API servers during outages
- **Exponential backoff** gives services time to recover
- **Circuit breaker** prevents wasted retry attempts during prolonged outages
- **Database indexing** on `task_id` ensures fast retry log queries
- **Configurable policies** allow tuning for specific API characteristics

## Future Enhancements

- [ ] Per-task retry policy overrides
- [ ] Adaptive backoff based on error frequency
- [ ] Retry budget limits (max retries per time window)
- [ ] Distributed circuit breaker (cross-process coordination)
- [ ] Machine learning for optimal retry timing
- [ ] Real-time retry dashboard with live updates
- [ ] Alerting when retry rates exceed thresholds
- [ ] Automatic policy tuning based on historical data

## References

- Circuit Breaker Pattern: `/src/circuit-breaker.js`
- Database Schema: `/src/db.js`
- Claude Integration: `/src/claude.js`
- Server API: `/src/server.js`
- Tests: `/src/retry-manager.test.js`
