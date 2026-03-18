/**
 * Agent Auto-Recovery Manager with Exponential Backoff
 *
 * Handles intelligent restart of crashed/stuck agents with:
 * - Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s up to max 5 min)
 * - Maximum retry attempts before permanent failure
 * - Cooldown periods between restart attempts
 * - Recovery state tracking per agent
 * - Integration with health monitoring and incident logging
 */

import * as db from "./db.js";
import { log as structuredLog } from "./logger.js";

// Recovery configuration
const INITIAL_BACKOFF_MS = 1000; // Start at 1 second
const MAX_BACKOFF_MS = 5 * 60 * 1000; // Cap at 5 minutes
const MAX_RETRY_ATTEMPTS = 8; // After 8 failures, give up (total ~8.5 minutes)
const BACKOFF_MULTIPLIER = 2; // Exponential growth factor
const SUCCESS_RESET_THRESHOLD_MS = 10 * 60 * 1000; // Reset retry count after 10 min of success

// Recovery state tracking (in-memory, per agent)
const recoveryState = new Map();

/**
 * Recovery state structure:
 * {
 *   agentId: string,
 *   agentName: string,
 *   companyId: string,
 *   attemptCount: number,
 *   lastRestartTime: number (timestamp),
 *   nextRetryTime: number (timestamp),
 *   currentBackoffMs: number,
 *   status: 'recovering' | 'failed_permanently' | 'healthy',
 *   lastSuccessTime: number (timestamp),
 *   totalCrashes: number,
 *   failureHistory: Array<{ timestamp, reason, taskId }>
 * }
 */

/**
 * Calculate next backoff duration using exponential backoff
 */
function calculateBackoff(attemptCount) {
  const backoff = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount - 1);
  return Math.min(backoff, MAX_BACKOFF_MS);
}

/**
 * Get or initialize recovery state for an agent
 */
function getRecoveryState(agentId, agentName, companyId) {
  if (!recoveryState.has(agentId)) {
    recoveryState.set(agentId, {
      agentId,
      agentName,
      companyId,
      attemptCount: 0,
      lastRestartTime: null,
      nextRetryTime: null,
      currentBackoffMs: INITIAL_BACKOFF_MS,
      status: 'healthy',
      lastSuccessTime: Date.now(),
      totalCrashes: 0,
      failureHistory: []
    });
  }
  return recoveryState.get(agentId);
}

/**
 * Record agent crash and determine if restart should be attempted
 */
export function recordAgentCrash({ agentId, agentName, companyId, taskId, reason }) {
  const state = getRecoveryState(agentId, agentName, companyId);
  const now = Date.now();

  // If agent was healthy for long enough, reset retry count
  if (state.lastSuccessTime && (now - state.lastSuccessTime) > SUCCESS_RESET_THRESHOLD_MS) {
    console.log(`[RECOVERY] Agent ${agentName} was healthy for 10+ minutes, resetting retry count`);
    state.attemptCount = 0;
    state.currentBackoffMs = INITIAL_BACKOFF_MS;
  }

  // Increment crash tracking
  state.totalCrashes++;
  state.attemptCount++;
  state.failureHistory.push({
    timestamp: now,
    reason: reason || 'unknown',
    taskId
  });

  // Keep only last 10 failures in history
  if (state.failureHistory.length > 10) {
    state.failureHistory.shift();
  }

  // Check if we've exceeded max retry attempts
  if (state.attemptCount > MAX_RETRY_ATTEMPTS) {
    state.status = 'failed_permanently';

    console.error(`[RECOVERY] Agent ${agentName} exceeded max retry attempts (${MAX_RETRY_ATTEMPTS}). Marking as permanently failed.`);

    // Log permanent failure incident
    db.logIncident({
      companyId,
      agentId,
      taskId,
      incidentType: 'agent_permanent_failure',
      description: `Agent ${agentName} failed ${MAX_RETRY_ATTEMPTS} times. Manual intervention required.`,
      recoveryAction: 'MANUAL_INTERVENTION_REQUIRED'
    });

    structuredLog({
      level: 'critical',
      source: 'recovery-manager',
      company_id: companyId,
      agent_id: agentId,
      task_id: taskId,
      action: 'agent_permanent_failure',
      metadata: {
        total_attempts: state.attemptCount,
        total_crashes: state.totalCrashes,
        failure_history: state.failureHistory
      }
    });

    return {
      shouldRetry: false,
      reason: 'max_retries_exceeded',
      nextRetryIn: null
    };
  }

  // Calculate backoff and schedule next retry
  state.currentBackoffMs = calculateBackoff(state.attemptCount);
  state.lastRestartTime = now;
  state.nextRetryTime = now + state.currentBackoffMs;
  state.status = 'recovering';

  console.log(`[RECOVERY] Agent ${agentName} crash #${state.attemptCount}/${MAX_RETRY_ATTEMPTS}. Retry in ${state.currentBackoffMs}ms`);

  // Log retry attempt
  db.logRetry({
    taskId,
    agentName,
    attempt: state.attemptCount,
    errorType: 'agent_crash',
    errorMessage: reason || 'Agent process died'
  });

  structuredLog({
    level: 'warning',
    source: 'recovery-manager',
    company_id: companyId,
    agent_id: agentId,
    task_id: taskId,
    action: 'scheduling_retry',
    metadata: {
      attempt: state.attemptCount,
      backoff_ms: state.currentBackoffMs,
      next_retry_at: new Date(state.nextRetryTime).toISOString()
    }
  });

  return {
    shouldRetry: true,
    reason: 'exponential_backoff',
    nextRetryIn: state.currentBackoffMs,
    attemptNumber: state.attemptCount
  };
}

/**
 * Check if agent is ready to be restarted (cooldown period expired)
 */
export function canRetryAgent(agentId) {
  const state = recoveryState.get(agentId);
  if (!state) return true; // No recovery state = can start

  if (state.status === 'failed_permanently') {
    return false; // Permanently failed, needs manual intervention
  }

  if (state.status === 'healthy') {
    return true; // Healthy agents can always be started
  }

  // Check if cooldown period has expired
  const now = Date.now();
  if (state.nextRetryTime && now >= state.nextRetryTime) {
    return true;
  }

  return false;
}

/**
 * Get time until next retry is allowed (in milliseconds)
 */
export function getTimeUntilRetry(agentId) {
  const state = recoveryState.get(agentId);
  if (!state || !state.nextRetryTime) return 0;

  const now = Date.now();
  const remaining = state.nextRetryTime - now;
  return Math.max(0, remaining);
}

/**
 * Record successful agent start/recovery
 */
export function recordAgentRecovery({ agentId, agentName, companyId, taskId }) {
  const state = getRecoveryState(agentId, agentName, companyId);
  const now = Date.now();

  const previousAttempts = state.attemptCount;
  const wasRecovering = state.status === 'recovering';

  // Update state to healthy
  state.lastSuccessTime = now;
  state.status = 'healthy';
  // Don't reset attempt count immediately - wait for SUCCESS_RESET_THRESHOLD_MS

  if (wasRecovering && previousAttempts > 0) {
    console.log(`[RECOVERY] Agent ${agentName} successfully recovered after ${previousAttempts} attempts`);

    // Log successful recovery
    db.logActivity({
      companyId,
      agentId,
      taskId,
      action: 'agent_recovered',
      detail: `Agent recovered after ${previousAttempts} restart attempts`
    });

    structuredLog({
      level: 'info',
      source: 'recovery-manager',
      company_id: companyId,
      agent_id: agentId,
      task_id: taskId,
      action: 'recovery_success',
      metadata: {
        attempts_needed: previousAttempts,
        total_crashes: state.totalCrashes,
        recovery_duration_ms: state.lastRestartTime ? now - state.lastRestartTime : 0
      }
    });
  }
}

/**
 * Manual reset of recovery state (for admin intervention)
 */
export function resetRecoveryState(agentId) {
  const state = recoveryState.get(agentId);
  if (!state) return;

  console.log(`[RECOVERY] Manually resetting recovery state for agent ${state.agentName}`);

  state.attemptCount = 0;
  state.currentBackoffMs = INITIAL_BACKOFF_MS;
  state.status = 'healthy';
  state.nextRetryTime = null;
  state.lastSuccessTime = Date.now();

  structuredLog({
    level: 'info',
    source: 'recovery-manager',
    company_id: state.companyId,
    agent_id: agentId,
    action: 'recovery_state_reset',
    metadata: { reason: 'manual_intervention' }
  });
}

/**
 * Get recovery status for all agents
 */
export function getRecoveryStatus(companyId = null) {
  const statuses = [];

  for (const [agentId, state] of recoveryState.entries()) {
    if (companyId && state.companyId !== companyId) continue;

    const now = Date.now();
    const timeUntilRetry = state.nextRetryTime ? Math.max(0, state.nextRetryTime - now) : 0;

    statuses.push({
      agentId: state.agentId,
      agentName: state.agentName,
      status: state.status,
      attemptCount: state.attemptCount,
      totalCrashes: state.totalCrashes,
      currentBackoffMs: state.currentBackoffMs,
      timeUntilRetryMs: timeUntilRetry,
      canRetryNow: canRetryAgent(agentId),
      lastSuccessTime: state.lastSuccessTime,
      recentFailures: state.failureHistory.slice(-5) // Last 5 failures
    });
  }

  return statuses;
}

/**
 * Get recovery statistics for monitoring dashboard
 */
export function getRecoveryStats(companyId = null) {
  const statuses = getRecoveryStatus(companyId);

  const stats = {
    total_agents: statuses.length,
    healthy: statuses.filter(s => s.status === 'healthy').length,
    recovering: statuses.filter(s => s.status === 'recovering').length,
    failed_permanently: statuses.filter(s => s.status === 'failed_permanently').length,
    total_crashes: statuses.reduce((sum, s) => sum + s.totalCrashes, 0),
    total_recovery_attempts: statuses.reduce((sum, s) => sum + s.attemptCount, 0),
    agents_in_backoff: statuses.filter(s => s.timeUntilRetryMs > 0).length
  };

  return stats;
}

/**
 * Clean up recovery state for deleted agents
 */
export function cleanupRecoveryState(agentId) {
  recoveryState.delete(agentId);
}

/**
 * Get detailed recovery info for a specific agent
 */
export function getAgentRecoveryInfo(agentId) {
  const state = recoveryState.get(agentId);
  if (!state) {
    return {
      exists: false,
      status: 'unknown'
    };
  }

  const now = Date.now();
  const timeUntilRetry = state.nextRetryTime ? Math.max(0, state.nextRetryTime - now) : 0;

  return {
    exists: true,
    agentId: state.agentId,
    agentName: state.agentName,
    companyId: state.companyId,
    status: state.status,
    attemptCount: state.attemptCount,
    maxAttempts: MAX_RETRY_ATTEMPTS,
    totalCrashes: state.totalCrashes,
    currentBackoffMs: state.currentBackoffMs,
    nextBackoffMs: state.attemptCount < MAX_RETRY_ATTEMPTS
      ? calculateBackoff(state.attemptCount + 1)
      : null,
    timeUntilRetryMs: timeUntilRetry,
    canRetryNow: canRetryAgent(agentId),
    lastSuccessTime: state.lastSuccessTime,
    lastRestartTime: state.lastRestartTime,
    failureHistory: state.failureHistory,
    healthyDuration: state.lastSuccessTime ? now - state.lastSuccessTime : 0
  };
}

export default {
  recordAgentCrash,
  recordAgentRecovery,
  canRetryAgent,
  getTimeUntilRetry,
  resetRecoveryState,
  getRecoveryStatus,
  getRecoveryStats,
  getAgentRecoveryInfo,
  cleanupRecoveryState
};
