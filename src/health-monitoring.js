import * as db from "./db.js";
import { HEALTH_CHECK_INTERVAL_SEC, SLACK_WEBHOOK_URL } from "./config.js";
import * as recoveryManager from "./recovery-manager.js";

// Track last successful health check for each agent
const lastHealthCheck = new Map();

// Track consecutive failed health checks
const failedHealthChecks = new Map();

// Track pending retry timers
const retryTimers = new Map();

/**
 * Send Slack alert if webhook is configured
 */
async function sendSlackAlert(message) {
  if (!SLACK_WEBHOOK_URL) return;

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 Hivemind Alert: ${message}`,
        username: "Hivemind Monitor",
        icon_emoji: ":robot_face:"
      })
    });

    if (!response.ok) {
      console.error(`[SLACK] Failed to send alert: ${response.statusText}`);
    }
  } catch (err) {
    console.error(`[SLACK] Error sending alert: ${err.message}`);
  }
}

/**
 * Log agent crash incident to database
 */
function logCrashIncident({ companyId, agentId, taskId, description, recoveryAction }) {
  db.logIncident({
    companyId,
    agentId,
    taskId,
    incidentType: "agent_crash",
    description,
    recoveryAction,
  });
}

/**
 * Check if agent is healthy by verifying PID is alive
 */
function checkAgentHealth(agent) {
  if (!agent.pid) return false;

  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(agent.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Record successful health check
 */
function recordHealthCheck(agentId) {
  lastHealthCheck.set(agentId, Date.now());
  failedHealthChecks.set(agentId, 0);
}

/**
 * Record failed health check
 */
function recordFailedCheck(agentId) {
  const currentFails = failedHealthChecks.get(agentId) || 0;
  failedHealthChecks.set(agentId, currentFails + 1);
  return currentFails + 1;
}

/**
 * Get agent's task from database
 */
function getAgentTask(agentId) {
  return db.getDb().prepare(
    "SELECT * FROM tasks WHERE assignee_id = ? AND status = 'in_progress'"
  ).get(agentId);
}

/**
 * Schedule a retry with exponential backoff
 */
function scheduleRetry({ agent, task, company, checkpointInfo, nextRetryIn, attemptNumber, restartCallback }) {
  // Clear any existing timer for this agent
  const existingTimer = retryTimers.get(agent.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  console.log(`[HEALTH] Scheduling retry for agent ${agent.name} in ${nextRetryIn}ms (attempt #${attemptNumber})`);

  const timer = setTimeout(() => {
    console.log(`[HEALTH] Retry timer expired for agent ${agent.name}, attempting restart...`);

    // Check if agent can be retried (recovery manager controls this)
    if (!recoveryManager.canRetryAgent(agent.id)) {
      const timeRemaining = recoveryManager.getTimeUntilRetry(agent.id);
      console.log(`[HEALTH] Agent ${agent.name} not ready for retry yet (${timeRemaining}ms remaining)`);
      return;
    }

    // Reset task to todo status for restart
    db.updateTaskStatus(task.id, "todo");
    db.assignTask(task.id, null);

    console.log(`[HEALTH] Task "${task.title}" reset to todo, triggering dispatcher for retry attempt #${attemptNumber}`);

    // Trigger restart callback (dispatcher will pick it up)
    if (restartCallback) {
      restartCallback();
    }

    // Clean up timer reference
    retryTimers.delete(agent.id);
  }, nextRetryIn);

  retryTimers.set(agent.id, timer);
}

/**
 * Main health check function - checks all running agents
 */
export function performHealthCheck(company, runningAgents, restartCallback) {
  const agents = db.getAgentsByCompany(company.id).filter(a => a.status === "running");

  for (const agent of agents) {
    const isHealthy = checkAgentHealth(agent);

    if (isHealthy) {
      recordHealthCheck(agent.id);
      // Record recovery success if this agent was previously in recovery
      const recoveryInfo = recoveryManager.getAgentRecoveryInfo(agent.id);
      if (recoveryInfo.exists && recoveryInfo.status === 'recovering') {
        const task = getAgentTask(agent.id);
        recoveryManager.recordAgentRecovery({
          agentId: agent.id,
          agentName: agent.name,
          companyId: company.id,
          taskId: task?.id
        });
      }
      continue;
    }

    // Agent is not responding - increment failed checks
    const failCount = recordFailedCheck(agent.id);

    // Wait for 2 consecutive failures (60s total) before declaring crash
    if (failCount < 2) {
      console.log(`[HEALTH] Agent ${agent.name} missed health check (${failCount}/2)`);
      continue;
    }

    // Agent has crashed - initiate recovery with exponential backoff
    console.log(`[HEALTH] Agent ${agent.name} (pid ${agent.pid || "none"}) crashed - initiating recovery with backoff`);

    const task = getAgentTask(agent.id);
    if (!task) {
      console.log(`[HEALTH] No in-progress task found for crashed agent ${agent.name}`);
      db.updateAgentStatus(agent.id, "idle");
      runningAgents.delete(agent.id);
      failedHealthChecks.delete(agent.id);
      continue;
    }

    // Get last checkpoint for this task
    const checkpoint = db.getLatestCheckpoint(agent.id, task.id);
    const checkpointInfo = checkpoint
      ? `from turn ${checkpoint.turn_number}`
      : "from beginning (no checkpoint)";

    // Record crash in recovery manager
    const recoveryDecision = recoveryManager.recordAgentCrash({
      agentId: agent.id,
      agentName: agent.name,
      companyId: company.id,
      taskId: task.id,
      reason: `Process died (PID: ${agent.pid || "unknown"})`
    });

    // Log incident
    const description = `Agent ${agent.name} crashed while working on "${task.title}". PID: ${agent.pid || "unknown"}`;
    let recoveryAction;

    if (recoveryDecision.shouldRetry) {
      recoveryAction = `Retrying ${checkpointInfo} with ${recoveryDecision.nextRetryIn}ms backoff (attempt ${recoveryDecision.attemptNumber})`;
    } else {
      recoveryAction = `FAILED - Max retries exceeded, manual intervention required`;
    }

    logCrashIncident({
      companyId: company.id,
      agentId: agent.id,
      taskId: task.id,
      description,
      recoveryAction,
    });

    db.logActivity({
      companyId: company.id,
      agentId: agent.id,
      taskId: task.id,
      action: "agent_crashed",
      detail: description,
    });

    // Send Slack alert
    const alertMessage = recoveryDecision.shouldRetry
      ? `Agent ${agent.name} crashed on task "${task.title}". Retrying in ${Math.round(recoveryDecision.nextRetryIn / 1000)}s (attempt ${recoveryDecision.attemptNumber}).`
      : `CRITICAL: Agent ${agent.name} permanently failed after max retries. Manual intervention required!`;

    sendSlackAlert(alertMessage).catch(err => {
      console.error(`[HEALTH] Slack alert failed: ${err.message}`);
    });

    // Clean up crashed agent
    db.updateAgentStatus(agent.id, "idle");
    runningAgents.delete(agent.id);
    failedHealthChecks.delete(agent.id);
    lastHealthCheck.delete(agent.id);

    // Schedule retry with exponential backoff if allowed
    if (recoveryDecision.shouldRetry) {
      scheduleRetry({
        agent,
        task,
        company,
        checkpointInfo,
        nextRetryIn: recoveryDecision.nextRetryIn,
        attemptNumber: recoveryDecision.attemptNumber,
        restartCallback
      });
    } else {
      // Permanently failed - mark task as blocked
      db.updateTaskStatus(task.id, "blocked");
      db.assignTask(task.id, null);
      console.error(`[HEALTH] Task "${task.title}" marked as BLOCKED - agent permanently failed`);
    }
  }
}

/**
 * Start health monitoring loop
 */
export function startHealthMonitoring(company, runningAgents, restartCallback) {
  console.log(`[HEALTH] Starting health monitoring (check every ${HEALTH_CHECK_INTERVAL_SEC}s)`);

  const interval = setInterval(() => {
    try {
      performHealthCheck(company, runningAgents, restartCallback);
    } catch (err) {
      console.error(`[HEALTH] Health check error: ${err.message}`);
    }
  }, HEALTH_CHECK_INTERVAL_SEC * 1000);

  return interval;
}

/**
 * Stop health monitoring
 */
export function stopHealthMonitoring(intervalHandle) {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    console.log("[HEALTH] Health monitoring stopped");
  }

  // Clear all pending retry timers
  for (const [agentId, timer] of retryTimers.entries()) {
    clearTimeout(timer);
    console.log(`[HEALTH] Cleared pending retry timer for agent ${agentId}`);
  }
  retryTimers.clear();
}

/**
 * Get current recovery status for all agents
 */
export function getRecoveryStatus(companyId) {
  return recoveryManager.getRecoveryStatus(companyId);
}

/**
 * Get recovery statistics
 */
export function getRecoveryStats(companyId) {
  return recoveryManager.getRecoveryStats(companyId);
}

/**
 * Manually reset recovery state for an agent
 */
export function resetAgentRecovery(agentId) {
  // Clear any pending retry timer
  const timer = retryTimers.get(agentId);
  if (timer) {
    clearTimeout(timer);
    retryTimers.delete(agentId);
    console.log(`[HEALTH] Cleared retry timer for agent ${agentId} during manual reset`);
  }

  recoveryManager.resetRecoveryState(agentId);
}
