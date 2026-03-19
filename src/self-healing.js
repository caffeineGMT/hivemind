/**
 * Self-Healing Rule Engine
 *
 * Autonomous issue detection and auto-remediation for common failure patterns.
 *
 * Rules:
 * 1. Stale agent (no heartbeat 5min) → force restart
 * 2. API rate limit error → exponential backoff + retry (via circuit breaker)
 * 3. Memory leak detection (RSS >500MB) → graceful restart
 * 4. Deployment failure → rollback to last known good
 *
 * All auto-fixes are logged to the database for monitoring and audit.
 */

import * as db from "./db.js";
import { log as structuredLog } from "./logger.js";
import * as recoveryManager from "./recovery-manager.js";
import { circuitBreaker } from "./circuit-breaker.js";
import { rollbackDeployment } from "./deployment.js";
import { execSync } from "node:child_process";

// Rule engine configuration
const RULE_CHECK_INTERVAL_MS = 30 * 1000; // Check rules every 30 seconds
const STALE_HEARTBEAT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const MEMORY_LEAK_THRESHOLD_BYTES = 500 * 1024 * 1024; // 500MB
const MEMORY_CHECK_SAMPLES = 3; // Consecutive samples above threshold
const API_RATE_LIMIT_PATTERNS = [
  /rate limit/i,
  /too many requests/i,
  /429/,
  /quota exceeded/i,
  /overloaded_error/i
];

// In-memory state tracking
const ruleState = {
  memoryLeakSamples: new Map(), // agentId -> [sample1, sample2, ...]
  lastRuleRun: new Map(), // ruleName -> timestamp
  remediationHistory: [], // Recent remediation actions
  ruleExecutionStats: new Map(), // ruleName -> { executed: n, remediated: n }
};

let ruleCheckInterval = null;
let globalRestartCallback = null;
let globalCompany = null;
let globalRunningAgents = null;

/**
 * Rule execution result
 */
class RuleResult {
  constructor(ruleName, detected, remediated, details) {
    this.ruleName = ruleName;
    this.detected = detected;
    this.remediated = remediated;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Log auto-remediation action to database
 */
function logRemediation({ companyId, agentId, taskId, ruleName, issue, action, success, details }) {
  const record = {
    timestamp: new Date().toISOString(),
    ruleName,
    issue,
    action,
    success,
    details,
    companyId,
    agentId,
    taskId
  };

  // Log to incidents table
  db.logIncident({
    companyId: companyId || 'system',
    agentId: agentId || 'self-healing-engine',
    taskId: taskId || null,
    incidentType: `auto_heal_${ruleName}`,
    description: issue,
    recoveryAction: `${action} - ${success ? 'SUCCESS' : 'FAILED'}: ${details}`
  });

  // Log to structured logs
  structuredLog({
    level: success ? 'info' : 'error',
    source: 'self-healing',
    company_id: companyId,
    agent_id: agentId,
    task_id: taskId,
    action: `auto_remediation_${ruleName}`,
    metadata: record
  });

  // Log to activity
  if (companyId && agentId) {
    db.logActivity({
      companyId,
      agentId,
      taskId,
      action: `self_healing_${ruleName}`,
      detail: `${issue} → ${action} (${success ? 'OK' : 'FAILED'})`
    });
  }

  // Add to in-memory history (keep last 100)
  ruleState.remediationHistory.push(record);
  if (ruleState.remediationHistory.length > 100) {
    ruleState.remediationHistory.shift();
  }

  // Update stats
  const stats = ruleState.ruleExecutionStats.get(ruleName) || { executed: 0, remediated: 0 };
  stats.remediated++;
  ruleState.ruleExecutionStats.set(ruleName, stats);

  logger.info(`[SELF-HEAL] ${ruleName}: ${issue} → ${action} (${success ? 'SUCCESS' : 'FAILED'})`);
}

/**
 * Update rule execution stats
 */
function updateRuleStats(ruleName) {
  const stats = ruleState.ruleExecutionStats.get(ruleName) || { executed: 0, remediated: 0 };
  stats.executed++;
  ruleState.ruleExecutionStats.set(ruleName, stats);
  ruleState.lastRuleRun.set(ruleName, Date.now());
}

/**
 * Rule 1: Stale Agent Detection
 * Detects agents with no heartbeat in 5+ minutes and forces restart
 */
function rule_stale_agent_detection() {
  const ruleName = 'stale_agent_detection';
  updateRuleStats(ruleName);

  if (!globalCompany) {
    return new RuleResult(ruleName, false, false, 'No active company');
  }

  const agents = db.getAgentsByCompany(globalCompany.id);
  const now = Date.now();
  let detected = 0;
  let remediated = 0;

  for (const agent of agents) {
    // Skip idle agents
    if (agent.status === 'idle') continue;

    // Check if heartbeat is stale
    if (!agent.last_heartbeat) continue;

    const heartbeatTime = new Date(agent.last_heartbeat).getTime();
    const timeSinceHeartbeat = now - heartbeatTime;

    if (timeSinceHeartbeat > STALE_HEARTBEAT_THRESHOLD_MS) {
      detected++;

      const task = db.getDb().prepare(
        "SELECT * FROM tasks WHERE assignee_id = ? AND status = 'in_progress'"
      ).get(agent.id);

      const issue = `Agent ${agent.name} has stale heartbeat (${Math.round(timeSinceHeartbeat / 1000)}s since last beat)`;

      try {
        // Force restart via recovery manager
        const recoveryDecision = recoveryManager.recordAgentCrash({
          agentId: agent.id,
          agentName: agent.name,
          companyId: globalCompany.id,
          taskId: task?.id,
          reason: 'Stale heartbeat detected'
        });

        // Clean up stale agent
        db.updateAgentStatus(agent.id, 'idle');
        if (globalRunningAgents) {
          globalRunningAgents.delete(agent.id);
        }

        if (recoveryDecision.shouldRetry && task) {
          // Reset task for retry
          db.updateTaskStatus(task.id, 'todo');
          db.assignTask(task.id, null);

          // Trigger restart via callback
          if (globalRestartCallback) {
            setTimeout(() => globalRestartCallback(), recoveryDecision.nextRetryIn);
          }

          logRemediation({
            companyId: globalCompany.id,
            agentId: agent.id,
            taskId: task?.id,
            ruleName,
            issue,
            action: `Force restart with ${recoveryDecision.nextRetryIn}ms backoff`,
            success: true,
            details: `Attempt ${recoveryDecision.attemptNumber}/${8} scheduled`
          });

          remediated++;
        } else {
          logRemediation({
            companyId: globalCompany.id,
            agentId: agent.id,
            taskId: task?.id,
            ruleName,
            issue,
            action: 'Mark as failed',
            success: false,
            details: 'Max retries exceeded or no task found'
          });
        }
      } catch (err) {
        logRemediation({
          companyId: globalCompany.id,
          agentId: agent.id,
          taskId: task?.id,
          ruleName,
          issue,
          action: 'Force restart',
          success: false,
          details: err.message
        });
      }
    }
  }

  return new RuleResult(ruleName, detected > 0, remediated > 0,
    `Detected ${detected} stale agents, remediated ${remediated}`);
}

/**
 * Rule 2: API Rate Limit Detection and Backoff
 * Monitors retry logs for rate limit errors and enforces circuit breaker
 */
function rule_api_rate_limit_detection() {
  const ruleName = 'api_rate_limit_detection';
  updateRuleStats(ruleName);

  if (!globalCompany) {
    return new RuleResult(ruleName, false, false, 'No active company');
  }

  // Check recent retry logs for rate limit patterns
  const recentRetries = db.getDb().prepare(`
    SELECT * FROM retry_logs
    WHERE timestamp >= datetime('now', '-5 minutes')
    ORDER BY timestamp DESC
    LIMIT 50
  `).all();

  let rateLimitErrors = 0;

  for (const retry of recentRetries) {
    const errorMsg = retry.error_message || '';
    const isRateLimit = API_RATE_LIMIT_PATTERNS.some(pattern => pattern.test(errorMsg));

    if (isRateLimit) {
      rateLimitErrors++;
    }
  }

  // Check circuit breaker status
  const breakerStatus = circuitBreaker.getStatus();

  // If we detect rate limits and circuit is not open, record failure
  if (rateLimitErrors > 0) {
    // Let circuit breaker handle the backoff
    circuitBreaker.recordFailure();

    logRemediation({
      companyId: globalCompany.id,
      agentId: null,
      taskId: null,
      ruleName,
      issue: `Detected ${rateLimitErrors} rate limit errors in last 5 minutes`,
      action: `Circuit breaker engaged (state: ${breakerStatus.state})`,
      success: true,
      details: `Consecutive failures: ${breakerStatus.consecutiveFailures}, Paused until: ${breakerStatus.pausedUntil ? new Date(breakerStatus.pausedUntil).toISOString() : 'N/A'}`
    });

    return new RuleResult(ruleName, true, true,
      `Rate limit detected, circuit breaker: ${breakerStatus.state}`);
  }

  return new RuleResult(ruleName, false, false,
    `No rate limits detected, circuit: ${breakerStatus.state}`);
}

/**
 * Rule 3: Memory Leak Detection
 * Monitors agent memory usage and restarts if RSS exceeds threshold
 */
async function rule_memory_leak_detection() {
  const ruleName = 'memory_leak_detection';
  updateRuleStats(ruleName);

  if (!globalCompany) {
    return new RuleResult(ruleName, false, false, 'No active company');
  }

  const agents = db.getAgentsByCompany(globalCompany.id);
  let detected = 0;
  let remediated = 0;

  for (const agent of agents) {
    // Only check running agents with PIDs
    if (agent.status !== 'running' || !agent.pid) continue;

    try {
      // Get memory usage via ps command
      const psOutput = execSync(`ps -o rss= -p ${agent.pid}`, { encoding: 'utf-8' }).trim();
      const rssKB = parseInt(psOutput, 10);
      const rssBytes = rssKB * 1024;

      // Initialize sample array if needed
      if (!ruleState.memoryLeakSamples.has(agent.id)) {
        ruleState.memoryLeakSamples.set(agent.id, []);
      }

      const samples = ruleState.memoryLeakSamples.get(agent.id);
      samples.push(rssBytes);

      // Keep only last N samples
      if (samples.length > MEMORY_CHECK_SAMPLES) {
        samples.shift();
      }

      // Check if all recent samples exceed threshold
      if (samples.length >= MEMORY_CHECK_SAMPLES &&
          samples.every(s => s > MEMORY_LEAK_THRESHOLD_BYTES)) {

        detected++;
        const avgMB = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length / 1024 / 1024);

        const task = db.getDb().prepare(
          "SELECT * FROM tasks WHERE assignee_id = ? AND status = 'in_progress'"
        ).get(agent.id);

        const issue = `Agent ${agent.name} memory leak detected (${avgMB}MB avg over ${MEMORY_CHECK_SAMPLES} samples, threshold: 500MB)`;

        try {
          // Graceful restart via recovery manager
          const recoveryDecision = recoveryManager.recordAgentCrash({
            agentId: agent.id,
            agentName: agent.name,
            companyId: globalCompany.id,
            taskId: task?.id,
            reason: `Memory leak: ${avgMB}MB RSS`
          });

          // Kill the process
          try {
            process.kill(agent.pid, 'SIGTERM'); // Graceful shutdown
            setTimeout(() => {
              try {
                process.kill(agent.pid, 'SIGKILL'); // Force kill if still alive after 5s
              } catch {}
            }, 5000);
          } catch (err) {
            logger.error(`[SELF-HEAL] Failed to kill process ${agent.pid}: ${err.message}`);
          }

          // Clean up agent state
          db.updateAgentStatus(agent.id, 'idle');
          if (globalRunningAgents) {
            globalRunningAgents.delete(agent.id);
          }

          // Clear memory samples
          ruleState.memoryLeakSamples.delete(agent.id);

          if (recoveryDecision.shouldRetry && task) {
            // Reset task for retry
            db.updateTaskStatus(task.id, 'todo');
            db.assignTask(task.id, null);

            // Schedule restart
            if (globalRestartCallback) {
              setTimeout(() => globalRestartCallback(), recoveryDecision.nextRetryIn);
            }

            logRemediation({
              companyId: globalCompany.id,
              agentId: agent.id,
              taskId: task?.id,
              ruleName,
              issue,
              action: `Graceful restart with ${recoveryDecision.nextRetryIn}ms backoff`,
              success: true,
              details: `Killed PID ${agent.pid}, attempt ${recoveryDecision.attemptNumber}/${8} scheduled`
            });

            remediated++;
          } else {
            logRemediation({
              companyId: globalCompany.id,
              agentId: agent.id,
              taskId: task?.id,
              ruleName,
              issue,
              action: 'Mark as failed',
              success: false,
              details: 'Max retries exceeded or no task found'
            });
          }
        } catch (err) {
          logRemediation({
            companyId: globalCompany.id,
            agentId: agent.id,
            taskId: task?.id,
            ruleName,
            issue,
            action: 'Graceful restart',
            success: false,
            details: err.message
          });
        }
      }
    } catch (err) {
      // Process might have died, clear samples
      ruleState.memoryLeakSamples.delete(agent.id);
    }
  }

  return new RuleResult(ruleName, detected > 0, remediated > 0,
    `Detected ${detected} memory leaks, remediated ${remediated}`);
}

/**
 * Rule 4: Deployment Failure Detection and Rollback
 * Monitors deployment history and triggers automatic rollback on failure
 */
async function rule_deployment_failure_detection() {
  const ruleName = 'deployment_failure_detection';
  updateRuleStats(ruleName);

  if (!globalCompany || !globalCompany.workspace) {
    return new RuleResult(ruleName, false, false, 'No active company or workspace');
  }

  // Check for recent failed deployments that haven't been rolled back
  const failedDeployments = db.getDb().prepare(`
    SELECT * FROM deployment_history
    WHERE company_id = ?
      AND status = 'failed'
      AND rolled_back_at IS NULL
      AND deployed_at >= datetime('now', '-30 minutes')
    ORDER BY deployed_at DESC
    LIMIT 5
  `).all(globalCompany.id);

  let detected = failedDeployments.length;
  let remediated = 0;

  for (const deployment of failedDeployments) {
    const issue = `Deployment ${deployment.git_tag} failed: ${deployment.health_check_error || 'Unknown error'}`;

    try {
      logger.info(`[SELF-HEAL] Triggering automatic rollback for deployment ${deployment.id}...`);

      // Trigger rollback
      const rollbackResult = await rollbackDeployment(
        globalCompany.id,
        globalCompany.workspace,
        `Auto-rollback: ${deployment.health_check_error || 'Deployment failed'}`
      );

      if (rollbackResult.success) {
        // Mark deployment as rolled back
        db.markDeploymentRolledBack(
          deployment.id,
          `Auto-rollback by self-healing engine: ${deployment.health_check_error || 'Deployment failed'}`
        );

        // Update company deployment URL
        if (rollbackResult.deploymentUrl) {
          db.updateCompanyDeploymentUrl(globalCompany.id, rollbackResult.deploymentUrl);
        }

        logRemediation({
          companyId: globalCompany.id,
          agentId: null,
          taskId: null,
          ruleName,
          issue,
          action: 'Automatic rollback to last known good',
          success: true,
          details: `Rolled back to previous version. New URL: ${rollbackResult.deploymentUrl || 'N/A'}`
        });

        remediated++;
      } else {
        logRemediation({
          companyId: globalCompany.id,
          agentId: null,
          taskId: null,
          ruleName,
          issue,
          action: 'Automatic rollback',
          success: false,
          details: rollbackResult.error || 'Rollback failed'
        });
      }
    } catch (err) {
      logRemediation({
        companyId: globalCompany.id,
        agentId: null,
        taskId: null,
        ruleName,
        issue,
        action: 'Automatic rollback',
        success: false,
        details: err.message
      });
    }
  }

  return new RuleResult(ruleName, detected > 0, remediated > 0,
    `Detected ${detected} failed deployments, remediated ${remediated}`);
}

/**
 * Execute all self-healing rules
 */
async function executeRules() {
  const results = [];

  try {
    results.push(rule_stale_agent_detection());
    results.push(rule_api_rate_limit_detection());
    results.push(await rule_memory_leak_detection());
    results.push(await rule_deployment_failure_detection());
  } catch (err) {
    logger.error(`[SELF-HEAL] Error executing rules: ${err.message}`);
    structuredLog({
      level: 'error',
      source: 'self-healing',
      action: 'rule_execution_error',
      metadata: { error: err.message, stack: err.stack }
    });
  }

  return results;
}

/**
 * Start the self-healing rule engine
 */
export function startSelfHealing({ company, runningAgents, restartCallback }) {
  if (ruleCheckInterval) {
    logger.info('[SELF-HEAL] Self-healing engine already running');
    return;
  }

  globalCompany = company;
  globalRunningAgents = runningAgents;
  globalRestartCallback = restartCallback;

  logger.info(`[SELF-HEAL] Starting self-healing rule engine (check every ${RULE_CHECK_INTERVAL_MS / 1000}s)`);

  structuredLog({
    level: 'info',
    source: 'self-healing',
    company_id: company?.id,
    action: 'engine_started',
    metadata: {
      check_interval_ms: RULE_CHECK_INTERVAL_MS,
      rules: [
        'stale_agent_detection',
        'api_rate_limit_detection',
        'memory_leak_detection',
        'deployment_failure_detection'
      ]
    }
  });

  // Run immediately on start
  executeRules().catch(err => {
    logger.error(`[SELF-HEAL] Initial rule execution failed: ${err.message}`);
  });

  // Then run on interval
  ruleCheckInterval = setInterval(() => {
    executeRules().catch(err => {
      logger.error(`[SELF-HEAL] Rule execution failed: ${err.message}`);
    });
  }, RULE_CHECK_INTERVAL_MS);

  return ruleCheckInterval;
}

/**
 * Stop the self-healing rule engine
 */
export function stopSelfHealing() {
  if (ruleCheckInterval) {
    clearInterval(ruleCheckInterval);
    ruleCheckInterval = null;

    logger.info('[SELF-HEAL] Self-healing engine stopped');

    structuredLog({
      level: 'info',
      source: 'self-healing',
      company_id: globalCompany?.id,
      action: 'engine_stopped',
      metadata: {
        uptime_ms: Date.now() - (ruleState.lastRuleRun.get('stale_agent_detection') || Date.now())
      }
    });
  }

  globalCompany = null;
  globalRunningAgents = null;
  globalRestartCallback = null;
}

/**
 * Get self-healing engine status and statistics
 */
export function getSelfHealingStatus() {
  const now = Date.now();

  const ruleStatuses = Array.from(ruleState.ruleExecutionStats.entries()).map(([ruleName, stats]) => ({
    ruleName,
    executed: stats.executed,
    remediated: stats.remediated,
    successRate: stats.executed > 0 ? (stats.remediated / stats.executed * 100).toFixed(1) : 0,
    lastRun: ruleState.lastRuleRun.get(ruleName)
      ? new Date(ruleState.lastRuleRun.get(ruleName)).toISOString()
      : null,
    timeSinceLastRun: ruleState.lastRuleRun.get(ruleName)
      ? now - ruleState.lastRuleRun.get(ruleName)
      : null
  }));

  return {
    running: ruleCheckInterval !== null,
    checkIntervalMs: RULE_CHECK_INTERVAL_MS,
    company: globalCompany ? { id: globalCompany.id, name: globalCompany.name } : null,
    rules: ruleStatuses,
    recentRemediations: ruleState.remediationHistory.slice(-20),
    totalRemediations: ruleState.remediationHistory.length,
    circuitBreakerStatus: circuitBreaker.getStatus(),
    configuration: {
      staleHeartbeatThresholdMs: STALE_HEARTBEAT_THRESHOLD_MS,
      memoryLeakThresholdBytes: MEMORY_LEAK_THRESHOLD_BYTES,
      memoryCheckSamples: MEMORY_CHECK_SAMPLES,
      apiRateLimitPatterns: API_RATE_LIMIT_PATTERNS.map(p => p.toString())
    }
  };
}

/**
 * Get remediation history for monitoring dashboard
 */
export function getRemediationHistory(limit = 50) {
  return ruleState.remediationHistory.slice(-limit).reverse();
}

/**
 * Manually trigger rule execution (for testing/debugging)
 */
export async function triggerRules() {
  logger.info('[SELF-HEAL] Manually triggering rule execution...');
  return await executeRules();
}

/**
 * Reset rule engine state (for testing/debugging)
 */
export function resetRuleState() {
  ruleState.memoryLeakSamples.clear();
  ruleState.lastRuleRun.clear();
  ruleState.remediationHistory.length = 0;
  ruleState.ruleExecutionStats.clear();

  logger.info('[SELF-HEAL] Rule state reset');

  structuredLog({
    level: 'info',
    source: 'self-healing',
    action: 'state_reset',
    metadata: { timestamp: new Date().toISOString() }
  });
}

export default {
  startSelfHealing,
  stopSelfHealing,
  getSelfHealingStatus,
  getRemediationHistory,
  triggerRules,
  resetRuleState
};
