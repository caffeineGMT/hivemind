# Playbook Integration Guide

Step-by-step guide to integrate automated recovery playbooks into the Hivemind orchestrator.

## Integration Points

### 1. Agent Task Execution (orchestrator.js)

When agents execute tasks, wrap the execution with playbook recovery:

```javascript
// In orchestrator.js - runAgent() function
import { executeWithPlaybookRecovery } from './automation/playbook-integration.js';

async function executeAgentTask(agent, task, company) {
  const result = await executeWithPlaybookRecovery(
    async () => {
      // Original agent task execution logic
      return await claude.runAgent({
        agentId: agent.id,
        taskId: task.id,
        prompt: task.description,
        model: DEFAULT_MODEL
      });
    },
    {
      companyId: company.id,
      agentId: agent.id,
      agentName: agent.name,
      taskId: task.id,
      maxAttempts: 4
    }
  );

  return result;
}
```

### 2. Agent Crash Handling

When agents crash, trigger playbook recovery:

```javascript
// In orchestrator.js - Agent monitoring
import { handleAgentCrashWithPlaybook } from './automation/playbook-integration.js';

function handleAgentExit(agent, exitCode, signal) {
  console.error(`Agent ${agent.name} crashed with code ${exitCode}`);

  // Trigger playbook recovery
  await handleAgentCrashWithPlaybook({
    companyId: agent.company_id,
    agentId: agent.id,
    agentName: agent.name,
    taskId: getCurrentTaskId(agent),
    reason: `Process exited with code ${exitCode}, signal ${signal}`
  });

  // Playbook will handle auto-restart with exponential backoff
}
```

### 3. Periodic Health Checks

Add health check to heartbeat loop:

```javascript
// In orchestrator.js - heartbeat function
import { performHealthCheck } from './automation/playbook-integration.js';

async function heartbeat(companyId) {
  // Existing heartbeat logic...

  // Run playbook health check every 5 minutes
  const lastHealthCheck = healthCheckTimestamps.get(companyId) || 0;
  const now = Date.now();

  if (now - lastHealthCheck > 5 * 60 * 1000) {
    console.log('[PLAYBOOKS] Running health check...');
    const result = await performHealthCheck(companyId);
    console.log(`[PLAYBOOKS] Health check complete: ${result.stuck_tasks?.playbooks_triggered || 0} playbooks triggered`);
    healthCheckTimestamps.set(companyId, now);
  }
}

const healthCheckTimestamps = new Map();
```

### 4. API Call Wrapping

Wrap all Claude API calls with playbook recovery:

```javascript
// In claude.js - API call wrapper
import { executeWithPlaybookRecovery } from './automation/playbook-integration.js';

export async function callClaudeAPI(params) {
  return await executeWithPlaybookRecovery(
    async () => {
      // Original API call
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'anthropic-api-key': process.env.ANTHROPIC_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    },
    {
      companyId: params.companyId,
      agentId: params.agentId,
      taskId: params.taskId,
      maxAttempts: 4
    }
  );
}
```

## Example: Full Integration

Here's a complete example integrating playbooks into the orchestrator:

```javascript
// orchestrator.js additions

import { autoRecover, matchPlaybook } from './automation/playbooks.js';
import {
  executeWithPlaybookRecovery,
  handleAgentCrashWithPlaybook,
  performHealthCheck
} from './automation/playbook-integration.js';

// ────────────────────────────────────────────────────────────────
// Agent Execution with Playbook Recovery
// ────────────────────────────────────────────────────────────────

async function runAgentWithRecovery(company, agent, task) {
  const startTime = Date.now();

  try {
    const result = await executeWithPlaybookRecovery(
      async () => {
        // Execute agent task
        const output = await claude.runAgent({
          agentId: agent.id,
          taskId: task.id,
          prompt: prompts.buildAgentPrompt(task, agent),
          model: DEFAULT_MODEL,
          companyId: company.id
        });

        return output;
      },
      {
        companyId: company.id,
        agentId: agent.id,
        agentName: agent.name,
        taskId: task.id,
        maxAttempts: 4
      }
    );

    const duration = Date.now() - startTime;
    console.log(`[AGENT] Task completed in ${duration}ms`);

    // Mark task as done
    db.updateTaskStatus(task.id, 'done', result.output);
    db.logActivity({
      companyId: company.id,
      agentId: agent.id,
      taskId: task.id,
      action: 'task_completed',
      detail: `Completed in ${duration}ms`
    });

    return result;

  } catch (error) {
    console.error(`[AGENT] Task failed after playbook recovery: ${error.message}`);

    // Even after playbooks, task still failed
    db.updateTaskStatus(task.id, 'blocked', `Failed: ${error.message}`);
    db.logIncident({
      companyId: company.id,
      agentId: agent.id,
      taskId: task.id,
      incidentType: 'task_failed_permanently',
      description: error.message,
      recoveryAction: 'MANUAL_INTERVENTION_REQUIRED'
    });

    throw error;
  }
}

// ────────────────────────────────────────────────────────────────
// Agent Crash Handler
// ────────────────────────────────────────────────────────────────

async function onAgentCrash(agent, task, reason) {
  console.error(`[ORCHESTRATOR] Agent crashed: ${agent.name}`);

  // Trigger playbook recovery (handles auto-restart with backoff)
  const recoveryResult = await handleAgentCrashWithPlaybook({
    companyId: agent.company_id,
    agentId: agent.id,
    agentName: agent.name,
    taskId: task?.id,
    reason: reason || 'Agent process crashed'
  });

  console.log(`[ORCHESTRATOR] Crash recovery: ${JSON.stringify(recoveryResult)}`);

  // If playbook matched and recovery manager says we can retry
  if (recoveryResult.playbook.matched && recoveryResult.recovery_manager.shouldRetry) {
    const retryInMs = recoveryResult.recovery_manager.nextRetryIn;
    console.log(`[ORCHESTRATOR] Agent will auto-restart in ${retryInMs}ms`);

    // Schedule restart
    setTimeout(async () => {
      console.log(`[ORCHESTRATOR] Auto-restarting agent ${agent.name}`);
      await startAgent(agent, task);
    }, retryInMs);

  } else if (!recoveryResult.recovery_manager.shouldRetry) {
    console.error(`[ORCHESTRATOR] Agent ${agent.name} exceeded max retries - manual intervention required`);
  }
}

// ────────────────────────────────────────────────────────────────
// Periodic Health Check
// ────────────────────────────────────────────────────────────────

const healthCheckIntervals = new Map();

function startPeriodicHealthChecks(companyId) {
  // Run health check every 5 minutes
  const interval = setInterval(async () => {
    try {
      console.log(`[PLAYBOOKS] Running health check for ${companyId}`);
      const result = await performHealthCheck(companyId);

      if (result.stuck_tasks?.playbooks_triggered > 0) {
        console.log(`[PLAYBOOKS] Health check triggered ${result.stuck_tasks.playbooks_triggered} playbooks`);
      }

      if (result.error) {
        console.error(`[PLAYBOOKS] Health check error: ${result.error}`);
      }

    } catch (err) {
      console.error(`[PLAYBOOKS] Health check failed: ${err.message}`);
    }
  }, 5 * 60 * 1000); // 5 minutes

  healthCheckIntervals.set(companyId, interval);
}

function stopPeriodicHealthChecks(companyId) {
  const interval = healthCheckIntervals.get(companyId);
  if (interval) {
    clearInterval(interval);
    healthCheckIntervals.delete(companyId);
  }
}

// ────────────────────────────────────────────────────────────────
// Manual Playbook Trigger (for testing)
// ────────────────────────────────────────────────────────────────

export async function triggerPlaybookManually(context) {
  console.log('[PLAYBOOKS] Manual playbook trigger');
  const result = await autoRecover(context);

  if (result.matched) {
    console.log(`[PLAYBOOKS] Executed: ${result.playbook.name}`);
  } else {
    console.log('[PLAYBOOKS] No matching playbook found');
  }

  return result;
}
```

## Testing Integration

### 1. Test Timeout Recovery

```javascript
// Simulate timeout error
const context = {
  error: new Error('Request timeout'),
  errorType: 'TIMEOUT',
  companyId: 'test-company',
  agentId: 'test-agent',
  taskId: 'test-task'
};

const result = await autoRecover(context);
console.log(result);
// Should match "API Timeout Recovery" playbook
```

### 2. Test Agent Crash

```javascript
// Simulate agent crash
await handleAgentCrashWithPlaybook({
  companyId: 'test-company',
  agentId: 'agent-123',
  agentName: 'engineer',
  taskId: 'task-456',
  reason: 'Process exited with code 1'
});

// Check activity_log for playbook_execution
const logs = db.searchLogs({
  companyId: 'test-company',
  keyword: 'playbook_execution'
});
console.log(logs);
```

### 3. Test Health Check

```bash
# Trigger manual health check via API
curl -X POST http://localhost:3100/api/companies/test-company/playbooks/health-check

# Response:
{
  "stuck_tasks": {
    "stuck_tasks_found": 2,
    "playbooks_triggered": 2,
    "results": [...]
  },
  "recent_failures": {
    "incidents_scanned": 5,
    "playbook_matches": 3
  }
}
```

## Monitoring Integration

Add playbook metrics to dashboard:

```javascript
// In server.js - Add endpoint for playbook dashboard
app.get("/api/companies/:id/playbooks/dashboard", async (req, res) => {
  const company = findCompany(req.params.id);
  if (!company) return res.status(404).json({ error: "Not found" });

  const { getPlaybookStats } = await import("./automation/playbooks.js");
  const stats = getPlaybookStats(company.id);

  // Add recovery manager stats
  const { getRecoveryStats } = await import("./recovery-manager.js");
  const recoveryStats = getRecoveryStats(company.id);

  res.json({
    playbook_stats: stats,
    recovery_stats: recoveryStats,
    timestamp: new Date().toISOString()
  });
});
```

## Rollout Strategy

### Phase 1: Monitoring Only (Week 1)
- Deploy playbook system
- Enable logging but don't execute actions
- Monitor which playbooks would trigger
- Tune configuration based on data

### Phase 2: Non-Destructive Actions (Week 2)
- Enable retry and pause actions
- Keep task splitting and agent restart disabled
- Monitor execution success rate

### Phase 3: Full Automation (Week 3+)
- Enable all playbook actions
- Monitor for 1 week
- Fine-tune backoff parameters
- Document any edge cases

## Troubleshooting

### Playbooks Not Triggering

Check integration points are correctly wired:
```bash
# Search for playbook imports in orchestrator
grep -n "playbook" src/orchestrator.js

# Check if autoRecover is called on errors
grep -n "autoRecover" src/orchestrator.js
```

### Infinite Retry Loops

Verify max retry limits are set:
```javascript
// Check recovery-playbooks.json
cat src/config/recovery-playbooks.json | grep max_attempts

// Check recovery manager limits
grep MAX_RETRY_ATTEMPTS src/recovery-manager.js
```

### Memory Leaks

Monitor playbook state:
```javascript
// Expose metrics endpoint
app.get('/api/debug/playbooks/state', (req, res) => {
  const { getRecoveryStatus } = require('./recovery-manager.js');
  const status = getRecoveryStatus();
  res.json({ agents: status, count: status.length });
});
```

## Next Steps

1. Review `src/automation/README.md` for full playbook documentation
2. Test with `node src/automation/playbooks.test.js`
3. Integrate into orchestrator using examples above
4. Monitor via `/api/companies/:id/playbooks/stats`
5. Tune configuration in `src/config/recovery-playbooks.json`
