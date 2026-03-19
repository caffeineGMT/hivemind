/**
 * Playbook Integration Layer
 *
 * Integrates the playbook system with existing retry and recovery managers.
 * Provides wrapper functions that automatically trigger playbooks on failures.
 */

import { autoRecover, matchPlaybook, executePlaybook } from './playbooks.js';
import { classifyError, executeWithRetry } from '../retry-manager.js';
import { recordAgentCrash } from '../recovery-manager.js';
import * as db from '../db.js';

import logger from "./logger.js";
/**
 * Execute function with automatic playbook recovery
 *
 * Wraps executeWithRetry and auto-triggers playbooks on failures
 */
export async function executeWithPlaybookRecovery(fn, options = {}) {
  const {
    companyId,
    agentId,
    agentName,
    taskId,
    maxAttempts = 3
  } = options;

  try {
    // First attempt - execute with standard retry logic
    return await executeWithRetry(fn, {
      taskId,
      agentId,
      companyId,
      maxAttempts,
      onRetry: async (attempt, error, delay) => {
        logger.info(`[PLAYBOOK-INTEGRATION] Retry attempt ${attempt} after error: ${error.message}`);

        // Trigger playbook on first retry
        if (attempt === 1) {
          const context = {
            error,
            companyId,
            agentId,
            agentName,
            taskId,
            failureCount: attempt
          };

          await autoRecover(context);
        }
      },
      onFailure: async (error, attempts) => {
        logger.error(`[PLAYBOOK-INTEGRATION] Final failure after ${attempts} attempts`);

        // Trigger playbook on final failure
        const context = {
          error,
          companyId,
          agentId,
          agentName,
          taskId,
          failureCount: attempts
        };

        await autoRecover(context);
      }
    });
  } catch (error) {
    // Re-throw the error after playbooks have been executed
    throw error;
  }
}

/**
 * Handle agent crash with playbook recovery
 */
export async function handleAgentCrashWithPlaybook(options) {
  const {
    companyId,
    agentId,
    agentName,
    taskId,
    reason
  } = options;

  logger.info(`[PLAYBOOK-INTEGRATION] Agent crash detected: ${agentName || agentId}`);

  // Record crash in recovery manager (this handles exponential backoff)
  const crashResult = recordAgentCrash({
    agentId,
    agentName,
    companyId,
    taskId,
    reason
  });

  // Trigger playbook for agent crash
  const context = {
    companyId,
    agentId,
    agentName,
    taskId,
    agentStatus: 'error',
    incidentType: 'agent_crash',
    errorMessage: reason || 'Agent process crashed'
  };

  const playbookResult = await autoRecover(context);

  return {
    crash_handled: true,
    recovery_manager: crashResult,
    playbook: playbookResult
  };
}

/**
 * Monitor stuck tasks and auto-trigger recovery playbooks
 */
export async function checkStuckTasks(companyId) {
  const db_instance = db.getDb();

  // Find tasks stuck in progress for more than 30 minutes
  const stuckTasks = db_instance.prepare(`
    SELECT
      t.*,
      (julianday('now') - julianday(t.updated_at)) * 24 * 60 as stuck_minutes
    FROM tasks t
    WHERE t.company_id = ?
      AND t.status = 'in_progress'
      AND (julianday('now') - julianday(t.updated_at)) * 24 * 60 > 30
    ORDER BY stuck_minutes DESC
  `).all(companyId);

  const results = [];

  for (const task of stuckTasks) {
    logger.info(`[PLAYBOOK-INTEGRATION] Found stuck task: ${task.title} (${task.stuck_minutes.toFixed(1)} minutes)`);

    const agent = task.assignee_id ? db.getAgent(task.assignee_id) : null;

    const context = {
      companyId,
      agentId: agent?.id,
      agentName: agent?.name,
      taskId: task.id,
      taskStatus: 'in_progress',
      taskStuckMinutes: task.stuck_minutes
    };

    const playbookResult = await autoRecover(context);
    results.push({
      task_id: task.id,
      task_title: task.title,
      stuck_minutes: task.stuck_minutes,
      playbook: playbookResult
    });
  }

  return {
    stuck_tasks_found: stuckTasks.length,
    playbooks_triggered: results.filter(r => r.playbook.matched).length,
    results
  };
}

/**
 * Auto-trigger playbooks based on recent failures
 */
export async function scanForFailures(companyId, lookbackMinutes = 5) {
  const db_instance = db.getDb();

  // Scan recent incidents
  const incidents = db_instance.prepare(`
    SELECT * FROM incidents
    WHERE company_id = ?
      AND created_at >= datetime('now', '-' || ? || ' minutes')
    ORDER BY created_at DESC
  `).all(companyId, lookbackMinutes);

  const results = [];

  for (const incident of incidents) {
    const agent = incident.agent_id ? db.getAgent(incident.agent_id) : null;

    const context = {
      companyId,
      agentId: incident.agent_id,
      agentName: agent?.name,
      taskId: incident.task_id,
      incidentType: incident.incident_type,
      errorMessage: incident.description
    };

    // Check if playbook would match (don't execute, just test)
    const playbook = matchPlaybook(context);

    if (playbook) {
      logger.info(`[PLAYBOOK-INTEGRATION] Found incident matching playbook: ${playbook.name}`);
      results.push({
        incident_id: incident.id,
        incident_type: incident.incident_type,
        playbook_matched: playbook.name,
        playbook_id: playbook.id
      });
    }
  }

  return {
    incidents_scanned: incidents.length,
    playbook_matches: results.length,
    results
  };
}

/**
 * Periodic health check that triggers playbooks for detected issues
 */
export async function performHealthCheck(companyId) {
  logger.info(`[PLAYBOOK-INTEGRATION] Running health check for company ${companyId}`);

  const results = {
    stuck_tasks: null,
    recent_failures: null,
    timestamp: new Date().toISOString()
  };

  try {
    // Check for stuck tasks
    results.stuck_tasks = await checkStuckTasks(companyId);

    // Scan for recent failures
    results.recent_failures = await scanForFailures(companyId, 5);

    logger.info(`[PLAYBOOK-INTEGRATION] Health check complete: ${results.stuck_tasks.playbooks_triggered} playbooks triggered`);
  } catch (error) {
    logger.error(`[PLAYBOOK-INTEGRATION] Health check failed: ${error.message}`);
    results.error = error.message;
  }

  return results;
}

/**
 * Wrap a function to automatically apply playbook recovery on errors
 */
export function withPlaybookRecovery(fn, options = {}) {
  return async (...args) => {
    return executeWithPlaybookRecovery(() => fn(...args), options);
  };
}

export default {
  executeWithPlaybookRecovery,
  handleAgentCrashWithPlaybook,
  checkStuckTasks,
  scanForFailures,
  performHealthCheck,
  withPlaybookRecovery
};
