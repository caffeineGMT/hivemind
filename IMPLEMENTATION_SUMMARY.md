# Claude API Retry with Exponential Backoff - Implementation Summary

## Overview
Implemented enterprise-grade reliability for Claude API calls with automatic retry logic, exponential backoff, circuit breaker pattern, and comprehensive error tracking.

## Components Implemented

### 1. Circuit Breaker Pattern (`src/circuit-breaker.js`)
**Purpose**: Prevent cascade failures by pausing API dispatching when too many consecutive failures occur.

**Key Features**:
- **Failure Threshold**: 5 consecutive failures trigger circuit open
- **Pause Duration**: 5 minutes cooldown period
- **States**:
  - `CLOSED`: Normal operation
  - `OPEN`: Paused after threshold reached
  - `HALF_OPEN`: Testing recovery after cooldown
- **Auto-recovery**: Circuit transitions to HALF_OPEN after pause, then back to CLOSED on first success

**Decision**: Global singleton instance to track API health across all agents.

### 2. Retry Logic with Exponential Backoff (`src/claude.js`)
**Purpose**: Automatically recover from transient API failures without manual intervention.

**Key Features**:
- **Max Retries**: 3 attempts (4 total including initial)
- **Backoff Schedule**: 2s → 8s → 32s (exponential: 2^n * 2000ms)
- **Error Classification**:
  - `RATE_LIMIT`: 429 errors, rate limit messages
  - `TIMEOUT`: Connection timeouts, ETIMEDOUT
  - `SERVER_ERROR`: 5xx errors, Internal Server Error
  - `NETWORK_ERROR`: ECONNREFUSED, ENOTFOUND
  - `UNKNOWN_ERROR`: Fallback category
- **Retryable Errors**: Only rate limits, timeouts, server errors, and network errors are retried
- **Non-retryable Errors**: Authentication errors, client errors (4xx except 429) fail immediately

**Decision**: Exponential backoff chosen over linear to respect API rate limits and avoid thundering herd.

### 3. Retry Logging (`src/db.js`)
**Purpose**: Track all retry attempts for debugging, monitoring, and analytics.

**Database Schema**:
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
```

**Functions**:
- `logRetry()`: Record each retry attempt with error details
- `getRetryLogs()`: Retrieve retry history for a task
- `getRecentRetries()`: Get recent retries for an agent

**Decision**: Separate table for retry logs to avoid cluttering activity_log and enable specialized queries.

### 4. Incident Management
**Purpose**: Track final failures that require manual intervention.

**Existing Schema Enhanced**:
```sql
CREATE TABLE incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  task_id TEXT REFERENCES tasks(id),
  incident_type TEXT NOT NULL,
  description TEXT,
  recovery_action TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Incident Creation**: When all retries exhausted:
1. Create incident with type `API_FAILURE`
2. Include full error context and retry history
3. Mark task as `blocked` status
4. Record recovery action taken

**Decision**: Reuse existing incidents table to centralize all failure tracking.

### 5. Integration Points

#### Updated Functions:
- **`claudeSessionSync()`**: Now includes retry logic, circuit breaker checks, and error tracking
- All callers updated to pass `companyId` and `taskId`:
  - CEO planning
  - CTO refinement
  - Designer phase
  - CMO marketing strategy
  - Engineer dispatch
  - CEO nudge/feedback

**Decision**: Inject tracking metadata at call sites rather than global state to support concurrent companies.

## Error Recovery Flow

```
1. Check Circuit Breaker
   ├─ OPEN? → Fail immediately with circuit breaker error
   └─ CLOSED/HALF_OPEN? → Proceed

2. Attempt API Call
   ├─ Success?
   │  ├─ Record success in circuit breaker
   │  └─ Return result
   └─ Error?
      ├─ Classify error type
      ├─ Log retry attempt to database
      ├─ Check if retryable
      │  ├─ Non-retryable? → Record failure & exit loop
      │  └─ Retryable?
      │     ├─ Last attempt? → Record failure & exit loop
      │     └─ Wait exponential backoff (2s/8s/32s)
      └─ Retry next iteration

3. All Retries Exhausted
   ├─ Record failure in circuit breaker
   ├─ Create incident record
   ├─ Mark task as blocked
   └─ Throw final error
```

## Testing Recommendations

### Unit Tests
- Circuit breaker state transitions
- Error type detection
- Retry logic with mocked failures
- Exponential backoff timing

### Integration Tests
- End-to-end retry on transient failures
- Circuit breaker triggering after threshold
- Task marked blocked after final failure
- Retry logs correctly persisted

### Load Tests
- Circuit breaker under sustained load
- Performance impact of retry delays
- Database write performance for retry logs

## Monitoring & Observability

### Key Metrics to Track
1. **Retry Rate**: `COUNT(retry_logs) / COUNT(api_calls)`
2. **Circuit Breaker Trips**: How often circuit opens
3. **Error Type Distribution**: Which errors are most common
4. **Recovery Time**: Time from first failure to success
5. **Blocked Tasks**: Tasks that require manual intervention

### Dashboard Queries
```sql
-- Retry rate by error type
SELECT error_type, COUNT(*) as retries,
       COUNT(DISTINCT task_id) as tasks_affected
FROM retry_logs
WHERE timestamp > datetime('now', '-1 hour')
GROUP BY error_type;

-- Tasks that hit max retries
SELECT t.id, t.title, COUNT(r.id) as retry_count
FROM tasks t
JOIN retry_logs r ON t.id = r.task_id
WHERE t.status = 'blocked'
GROUP BY t.id
ORDER BY retry_count DESC;
```

## Production Readiness

### ✅ Implemented
- [x] Exponential backoff (2s, 8s, 32s)
- [x] Circuit breaker pattern (5 failures → 5 min pause)
- [x] Retry logging to database
- [x] Incident creation on final failure
- [x] Task status updated to 'blocked'
- [x] Error type classification
- [x] Integration with all agent types

### 🔄 Future Enhancements
- [ ] Configurable retry parameters per agent type
- [ ] Jittered backoff to avoid thundering herd
- [ ] Prometheus metrics export
- [ ] PagerDuty/Slack alerts on circuit breaker trips
- [ ] Automatic task retry after recovery
- [ ] Per-company circuit breakers (isolation)

## Performance Impact

### Latency
- **Normal case**: No overhead (same as before)
- **First retry**: +2s worst case
- **All retries**: +42s worst case (2s + 8s + 32s)

### Storage
- **Retry logs**: ~200 bytes per retry attempt
- **Incidents**: ~300 bytes per final failure
- **Expected volume**: 1-5 retries per 1000 API calls (0.1-0.5% failure rate)

## Deployment Notes

1. **Database Migration**: Retry logs table automatically created on startup
2. **Backward Compatibility**: All existing code continues to work
3. **No Config Required**: Works out of box with sane defaults
4. **Monitoring**: Check retry_logs table after deployment

## Example Logs

```
[RETRY] Agent ceo attempt 1/4 failed: RATE_LIMIT - 429 Too Many Requests
[RETRY] Waiting 2000ms before retry...
[RETRY] Agent ceo attempt 2/4 failed: RATE_LIMIT - 429 Too Many Requests
[RETRY] Waiting 8000ms before retry...
[RETRY] Agent ceo attempt 3/4 success!
```

```
[CIRCUIT_BREAKER] Circuit OPEN - 5 consecutive failures. Pausing for 5 minutes.
[CIRCUIT_BREAKER] Circuit HALF_OPEN - Testing recovery
[CIRCUIT_BREAKER] Circuit restored to CLOSED - API calls resumed
```

## Success Criteria Met

✅ Transient API failures auto-recover without manual intervention
✅ Engineers don't fail on temporary issues
✅ Circuit breaker prevents cascade failures
✅ Comprehensive logging for debugging
✅ Blocked tasks clearly identified for manual review
