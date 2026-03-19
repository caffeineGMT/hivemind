/**
 * Advanced Retry Manager with Failure Classification
 *
 * Features:
 * - Transient vs Permanent error classification
 * - Smart exponential backoff with jitter
 * - Configurable retry policies per error type
 * - Task-level retry state management
 * - Automatic recovery strategies
 * - Metrics and analytics
 */

import * as db from "./db.js";
import { circuitBreaker } from "./circuit-breaker.js";

import logger from "./logger.js";
// ──────────────────────────────────────────────────────────────────
// Error Classification
// ──────────────────────────────────────────────────────────────────

export const ErrorType = {
  // Transient errors - safe to retry
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  TEMPORARY_UNAVAILABLE: 'TEMPORARY_UNAVAILABLE',

  // Permanent errors - do not retry
  AUTH_ERROR: 'AUTH_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_MODEL: 'INVALID_MODEL',

  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

export const ErrorCategory = {
  TRANSIENT: 'transient',
  PERMANENT: 'permanent',
  UNKNOWN: 'unknown'
};

/**
 * Classify error into specific type and category
 */
export function classifyError(error) {
  const message = (error.message || error.toString()).toLowerCase();
  const statusCode = error.statusCode || error.status;

  // Rate limiting
  if (statusCode === 429 || message.includes('429') || message.includes('rate limit')) {
    return { type: ErrorType.RATE_LIMIT, category: ErrorCategory.TRANSIENT };
  }

  // Timeouts
  if (message.includes('timeout') || message.includes('etimedout') || message.includes('timed out')) {
    return { type: ErrorType.TIMEOUT, category: ErrorCategory.TRANSIENT };
  }

  // Server errors (5xx)
  if (statusCode >= 500 && statusCode < 600) {
    return { type: ErrorType.SERVER_ERROR, category: ErrorCategory.TRANSIENT };
  }
  if (message.match(/5\d\d/) || message.includes('internal server error') || message.includes('service unavailable')) {
    return { type: ErrorType.SERVER_ERROR, category: ErrorCategory.TRANSIENT };
  }

  // Network errors
  if (message.includes('econnrefused') || message.includes('enotfound') || message.includes('enetunreach')) {
    return { type: ErrorType.NETWORK_ERROR, category: ErrorCategory.TRANSIENT };
  }

  // Circuit breaker
  if (message.includes('circuit breaker')) {
    return { type: ErrorType.CIRCUIT_BREAKER_OPEN, category: ErrorCategory.TRANSIENT };
  }

  // Temporary unavailable
  if (message.includes('temporarily unavailable') || message.includes('try again')) {
    return { type: ErrorType.TEMPORARY_UNAVAILABLE, category: ErrorCategory.TRANSIENT };
  }

  // Authentication errors (4xx permanent)
  if (statusCode === 401 || statusCode === 403 || message.includes('unauthorized') || message.includes('forbidden')) {
    return { type: ErrorType.AUTH_ERROR, category: ErrorCategory.PERMANENT };
  }

  // Invalid request
  if (statusCode === 400 || message.includes('bad request') || message.includes('invalid request')) {
    return { type: ErrorType.INVALID_REQUEST, category: ErrorCategory.PERMANENT };
  }

  // Not found
  if (statusCode === 404 || message.includes('not found')) {
    return { type: ErrorType.NOT_FOUND, category: ErrorCategory.PERMANENT };
  }

  // Permission denied
  if (message.includes('permission denied') || message.includes('access denied')) {
    return { type: ErrorType.PERMISSION_DENIED, category: ErrorCategory.PERMANENT };
  }

  // Quota exceeded (permanent until quota resets)
  if (message.includes('quota exceeded') || message.includes('limit exceeded')) {
    return { type: ErrorType.QUOTA_EXCEEDED, category: ErrorCategory.PERMANENT };
  }

  // Invalid model
  if (message.includes('invalid model') || message.includes('model not found')) {
    return { type: ErrorType.INVALID_MODEL, category: ErrorCategory.PERMANENT };
  }

  // Default to unknown
  return { type: ErrorType.UNKNOWN_ERROR, category: ErrorCategory.UNKNOWN };
}

/**
 * Check if error is retryable
 */
export function isRetryable(error) {
  const { category } = classifyError(error);
  return category === ErrorCategory.TRANSIENT;
}

// ──────────────────────────────────────────────────────────────────
// Retry Policies
// ──────────────────────────────────────────────────────────────────

export const RetryPolicy = {
  // Aggressive retry for rate limits with longer backoff
  RATE_LIMIT: {
    maxAttempts: 5,
    baseDelayMs: 5000,
    maxDelayMs: 120000, // 2 minutes
    backoffMultiplier: 2,
    jitterFactor: 0.3
  },

  // Standard retry for timeouts
  TIMEOUT: {
    maxAttempts: 4,
    baseDelayMs: 2000,
    maxDelayMs: 60000, // 1 minute
    backoffMultiplier: 2.5,
    jitterFactor: 0.2
  },

  // Quick retry for server errors
  SERVER_ERROR: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000, // 30 seconds
    backoffMultiplier: 3,
    jitterFactor: 0.25
  },

  // Network errors - medium retry
  NETWORK_ERROR: {
    maxAttempts: 4,
    baseDelayMs: 3000,
    maxDelayMs: 45000, // 45 seconds
    backoffMultiplier: 2,
    jitterFactor: 0.3
  },

  // Circuit breaker - wait for it to reset
  CIRCUIT_BREAKER: {
    maxAttempts: 2,
    baseDelayMs: 10000,
    maxDelayMs: 300000, // 5 minutes
    backoffMultiplier: 2,
    jitterFactor: 0.1
  },

  // Default policy for unknown transient errors
  DEFAULT: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 32000,
    backoffMultiplier: 2,
    jitterFactor: 0.2
  }
};

/**
 * Get retry policy for error type
 */
export function getRetryPolicy(errorType) {
  switch (errorType) {
    case ErrorType.RATE_LIMIT:
      return RetryPolicy.RATE_LIMIT;
    case ErrorType.TIMEOUT:
      return RetryPolicy.TIMEOUT;
    case ErrorType.SERVER_ERROR:
      return RetryPolicy.SERVER_ERROR;
    case ErrorType.NETWORK_ERROR:
      return RetryPolicy.NETWORK_ERROR;
    case ErrorType.CIRCUIT_BREAKER_OPEN:
      return RetryPolicy.CIRCUIT_BREAKER;
    default:
      return RetryPolicy.DEFAULT;
  }
}

// ──────────────────────────────────────────────────────────────────
// Smart Backoff with Jitter
// ──────────────────────────────────────────────────────────────────

/**
 * Calculate delay with exponential backoff and jitter
 *
 * Formula: delay = min(baseDelay * (multiplier ^ attempt), maxDelay)
 * Jitter: randomize +/- jitterFactor to prevent thundering herd
 */
export function calculateBackoffDelay(attempt, policy) {
  const { baseDelayMs, maxDelayMs, backoffMultiplier, jitterFactor } = policy;

  // Exponential backoff
  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: randomize +/- jitterFactor
  const jitterRange = cappedDelay * jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // Random between -jitterRange and +jitterRange

  const finalDelay = Math.max(0, cappedDelay + jitter);

  return Math.round(finalDelay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────────────────────────
// Task-Level Retry State Management
// ──────────────────────────────────────────────────────────────────

/**
 * Get retry state for a task
 */
export function getTaskRetryState(taskId) {
  const retryLogs = db.getRetryLogs(taskId);

  if (!retryLogs || retryLogs.length === 0) {
    return {
      taskId,
      attemptCount: 0,
      lastErrorType: null,
      lastErrorMessage: null,
      lastAttemptAt: null,
      canRetry: true
    };
  }

  // Get most recent attempt
  const latestAttempt = retryLogs[0];
  const attemptCount = Math.max(...retryLogs.map(r => r.attempt));

  return {
    taskId,
    attemptCount,
    lastErrorType: latestAttempt.error_type,
    lastErrorMessage: latestAttempt.error_message,
    lastAttemptAt: new Date(latestAttempt.timestamp),
    canRetry: true // Will be determined by retry policy
  };
}

/**
 * Check if task can be retried based on retry state and policy
 */
export function canRetryTask(taskId, errorType) {
  const state = getTaskRetryState(taskId);
  const policy = getRetryPolicy(errorType);

  return state.attemptCount < policy.maxAttempts;
}

// ──────────────────────────────────────────────────────────────────
// Retry Execution with Smart Logic
// ──────────────────────────────────────────────────────────────────

/**
 * Execute function with retry logic
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of function execution
 */
export async function executeWithRetry(fn, options = {}) {
  const {
    taskId,
    agentId,
    companyId,
    maxAttempts,
    onRetry, // Callback: (attempt, error, delay) => void
    onFailure // Callback: (error, attempts) => void
  } = options;

  let lastError = null;
  let attempt = 0;

  while (attempt <= (maxAttempts || 3)) {
    try {
      // Check circuit breaker before attempting
      if (!circuitBreaker.canAttempt()) {
        const error = new Error('Circuit breaker is open - API calls temporarily paused');
        const { type } = classifyError(error);

        if (taskId) {
          db.logRetry({
            taskId,
            agentName: agentId || 'unknown',
            attempt: attempt + 1,
            errorType: type,
            errorMessage: error.message
          });
        }

        throw error;
      }

      // Execute function
      const result = await fn();

      // Success - record and return
      circuitBreaker.recordSuccess();
      return result;

    } catch (error) {
      lastError = error;
      const { type: errorType, category } = classifyError(error);

      // Log retry attempt
      if (taskId) {
        db.logRetry({
          taskId,
          agentName: agentId || 'unknown',
          attempt: attempt + 1,
          errorType,
          errorMessage: error.message || error.toString()
        });
      }

      logger.error(`[RETRY] Attempt ${attempt + 1} failed: ${errorType} - ${error.message}`);

      // Check if error is retryable
      if (category !== ErrorCategory.TRANSIENT) {
        logger.error(`[RETRY] Error is not retryable (category: ${category}). Failing immediately.`);
        circuitBreaker.recordFailure();
        break;
      }

      // Get retry policy for this error type
      const policy = getRetryPolicy(errorType);

      // Check if we've exhausted retries
      if (attempt >= policy.maxAttempts) {
        logger.error(`[RETRY] Max attempts (${policy.maxAttempts}) reached for ${errorType}`);
        circuitBreaker.recordFailure();
        break;
      }

      // Calculate backoff delay with jitter
      const delay = calculateBackoffDelay(attempt, policy);
      logger.info(`[RETRY] Waiting ${delay}ms before retry (policy: ${errorType}, attempt: ${attempt + 1}/${policy.maxAttempts})`);

      // Call retry callback if provided
      if (onRetry) {
        try {
          await onRetry(attempt + 1, error, delay);
        } catch (err) {
          logger.error('[RETRY] Error in onRetry callback:', err.message);
        }
      }

      // Wait before retry
      await sleep(delay);
      attempt++;
    }
  }

  // All retries exhausted - handle failure
  const { type: errorType } = classifyError(lastError);

  // Create incident if company/task context provided
  if (companyId && taskId && agentId) {
    try {
      const agent = db.getDb().prepare("SELECT * FROM agents WHERE name = ?").get(agentId);
      if (agent) {
        db.logIncident({
          companyId,
          agentId: agent.id,
          taskId,
          incidentType: 'RETRY_EXHAUSTED',
          description: `Task failed after ${attempt} retry attempts. Error type: ${errorType}. Message: ${lastError.message}`,
          recoveryAction: getRecoveryAction(errorType)
        });
      }
    } catch (err) {
      logger.error('[RETRY] Failed to log incident:', err.message);
    }

    // Mark task as blocked with error details
    try {
      db.updateTaskStatus(
        taskId,
        'blocked',
        `Failed after ${attempt} retries: ${errorType} - ${lastError.message.slice(0, 200)}`
      );
    } catch (err) {
      logger.error('[RETRY] Failed to update task status:', err.message);
    }
  }

  // Call failure callback if provided
  if (onFailure) {
    try {
      await onFailure(lastError, attempt);
    } catch (err) {
      logger.error('[RETRY] Error in onFailure callback:', err.message);
    }
  }

  // Throw final error
  const errorMessage = `Operation failed after ${attempt} attempts. Last error: ${errorType} - ${lastError.message}`;
  const finalError = new Error(errorMessage);
  finalError.originalError = lastError;
  finalError.errorType = errorType;
  finalError.attempts = attempt;
  throw finalError;
}

/**
 * Get recommended recovery action for error type
 */
function getRecoveryAction(errorType) {
  switch (errorType) {
    case ErrorType.RATE_LIMIT:
      return 'Rate limit exceeded. Task will auto-retry after cooldown period.';
    case ErrorType.TIMEOUT:
      return 'Request timeout. Check network connectivity and task complexity. May auto-retry.';
    case ErrorType.SERVER_ERROR:
      return 'API server error. This is temporary. Task will auto-retry.';
    case ErrorType.NETWORK_ERROR:
      return 'Network connectivity issue. Check internet connection. Task will auto-retry.';
    case ErrorType.AUTH_ERROR:
      return 'Authentication failed. Check API credentials and permissions. Manual intervention required.';
    case ErrorType.INVALID_REQUEST:
      return 'Invalid request. Check task parameters and prompt. Manual review required.';
    case ErrorType.QUOTA_EXCEEDED:
      return 'API quota exceeded. Wait for quota reset or upgrade plan. Manual intervention required.';
    case ErrorType.PERMISSION_DENIED:
      return 'Permission denied. Check API key permissions. Manual intervention required.';
    default:
      return 'Task failed. Manual review recommended.';
  }
}

// ──────────────────────────────────────────────────────────────────
// Retry Analytics
// ──────────────────────────────────────────────────────────────────

/**
 * Get retry metrics for a company
 */
export function getRetryMetrics(companyId) {
  const db_instance = db.getDb();

  // Get all retry logs for company tasks
  const metrics = db_instance.prepare(`
    SELECT
      r.error_type,
      COUNT(*) as total_retries,
      COUNT(DISTINCT r.task_id) as affected_tasks,
      AVG(r.attempt) as avg_attempts,
      MAX(r.attempt) as max_attempts,
      MIN(r.timestamp) as first_retry,
      MAX(r.timestamp) as last_retry
    FROM retry_logs r
    JOIN tasks t ON r.task_id = t.id
    WHERE t.company_id = ?
    GROUP BY r.error_type
    ORDER BY total_retries DESC
  `).all(companyId);

  // Get overall stats
  const overall = db_instance.prepare(`
    SELECT
      COUNT(*) as total_retries,
      COUNT(DISTINCT r.task_id) as total_affected_tasks,
      COUNT(DISTINCT r.agent_name) as total_affected_agents
    FROM retry_logs r
    JOIN tasks t ON r.task_id = t.id
    WHERE t.company_id = ?
  `).get(companyId);

  return {
    overall,
    byErrorType: metrics
  };
}

/**
 * Get retry timeline for visualization
 */
export function getRetryTimeline(companyId, days = 7) {
  const db_instance = db.getDb();

  return db_instance.prepare(`
    SELECT
      DATE(r.timestamp) as date,
      r.error_type,
      COUNT(*) as retry_count,
      COUNT(DISTINCT r.task_id) as affected_tasks
    FROM retry_logs r
    JOIN tasks t ON r.task_id = t.id
    WHERE t.company_id = ?
      AND r.timestamp >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(r.timestamp), r.error_type
    ORDER BY date DESC, retry_count DESC
  `).all(companyId, days);
}

/**
 * Get tasks with high retry counts
 */
export function getHighRetryTasks(companyId, minRetries = 3) {
  const db_instance = db.getDb();

  return db_instance.prepare(`
    SELECT
      t.id as task_id,
      t.title,
      t.status,
      COUNT(r.id) as retry_count,
      MAX(r.attempt) as max_attempt,
      r.error_type as last_error_type,
      MAX(r.timestamp) as last_retry_at
    FROM tasks t
    JOIN retry_logs r ON t.id = r.task_id
    WHERE t.company_id = ?
    GROUP BY t.id, t.title, t.status, r.error_type
    HAVING retry_count >= ?
    ORDER BY retry_count DESC, last_retry_at DESC
  `).all(companyId, minRetries);
}

export default {
  classifyError,
  isRetryable,
  getRetryPolicy,
  calculateBackoffDelay,
  executeWithRetry,
  getTaskRetryState,
  canRetryTask,
  getRetryMetrics,
  getRetryTimeline,
  getHighRetryTasks,
  ErrorType,
  ErrorCategory,
  RetryPolicy
};
