/**
 * Automated Recovery Playbooks
 *
 * Auto-executes recovery strategies for common failure patterns:
 * - API timeout → retry with backoff
 * - Rate limit → pause 60s
 * - Context overflow → split task
 * - Agent crash → auto-restart
 * - Network errors → retry with network recovery wait
 *
 * Playbooks are defined in src/config/recovery-playbooks.json
 * All executions are logged to activity_log with type='playbook_execution'
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as db from '../db.js';
import { classifyError, executeWithRetry, sleep, ErrorType } from '../retry-manager.js';
import { recordAgentCrash, canRetryAgent } from '../recovery-manager.js';
import { log as structuredLog } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load playbooks from config
let playbooks = [];
let globalSettings = {};

export function loadPlaybooks() {
  try {
    const configPath = path.join(__dirname, '../config/recovery-playbooks.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    playbooks = config.playbooks.filter(p => p.enabled);
    globalSettings = config.global_settings || {};

    console.log(`[PLAYBOOKS] Loaded ${playbooks.length} enabled playbooks`);
    return { playbooks, globalSettings };
  } catch (error) {
    console.error('[PLAYBOOKS] Failed to load playbooks config:', error.message);
    playbooks = [];
    globalSettings = {};
    return { playbooks: [], globalSettings: {} };
  }
}

// Initialize playbooks on module load
loadPlaybooks();

/**
 * Reload playbooks from config (useful for hot-reloading)
 */
export function reloadPlaybooks() {
  console.log('[PLAYBOOKS] Reloading playbook configuration...');
  return loadPlaybooks();
}

/**
 * Match error/failure to appropriate playbook based on triggers
 */
export function matchPlaybook(context) {
  const {
    error,
    errorType,
    errorMessage,
    agentStatus,
    incidentType,
    taskStatus,
    taskStuckMinutes,
    failureCount = 1
  } = context;

  // Get error classification if error object provided
  let classified = null;
  if (error) {
    classified = classifyError(error);
  }

  const actualErrorType = errorType || classified?.type;
  const actualErrorMessage = errorMessage || error?.message || '';

  // Find matching playbooks (may have multiple matches)
  const matches = [];

  for (const playbook of playbooks) {
    const { triggers } = playbook;
    let isMatch = true;

    // Check error_type trigger
    if (triggers.error_type) {
      if (actualErrorType !== triggers.error_type) {
        isMatch = false;
      }
    }

    // Check error_message_contains trigger
    if (triggers.error_message_contains) {
      const keywords = triggers.error_message_contains;
      const messageMatch = keywords.some(keyword =>
        actualErrorMessage.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!messageMatch) {
        isMatch = false;
      }
    }

    // Check agent_status trigger
    if (triggers.agent_status) {
      if (agentStatus !== triggers.agent_status) {
        isMatch = false;
      }
    }

    // Check incident_type trigger
    if (triggers.incident_type) {
      if (incidentType !== triggers.incident_type) {
        isMatch = false;
      }
    }

    // Check task_status trigger
    if (triggers.task_status) {
      if (taskStatus !== triggers.task_status) {
        isMatch = false;
      }
    }

    // Check task_stuck_minutes trigger
    if (triggers.task_stuck_minutes !== undefined) {
      if (!taskStuckMinutes || taskStuckMinutes < triggers.task_stuck_minutes) {
        isMatch = false;
      }
    }

    // Check min_failures trigger
    if (triggers.min_failures !== undefined) {
      if (failureCount < triggers.min_failures) {
        isMatch = false;
      }
    }

    if (isMatch) {
      matches.push(playbook);
    }
  }

  // Sort by priority (higher priority first)
  matches.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return matches.length > 0 ? matches[0] : null;
}

/**
 * Execute playbook action
 */
async function executeAction(action, context) {
  const { type, params = {} } = action;
  const { companyId, agentId, agentName, taskId, error } = context;

  switch (type) {
    case 'log_playbook_start':
      console.log(`[PLAYBOOK] ${params.message || 'Playbook action started'}`);
      structuredLog({
        level: 'info',
        source: 'playbook',
        company_id: companyId,
        agent_id: agentId,
        task_id: taskId,
        action: 'playbook_action_start',
        metadata: { message: params.message }
      });
      break;

    case 'retry_with_backoff':
      // This is handled externally by executeWithRetry wrapper
      // Just log that retry strategy is configured
      console.log(`[PLAYBOOK] Retry strategy configured: max_attempts=${params.max_attempts}, base_delay=${params.base_delay_ms}ms`);
      return {
        retryConfig: {
          maxAttempts: params.max_attempts,
          baseDelayMs: params.base_delay_ms,
          maxDelayMs: params.max_delay_ms,
          backoffMultiplier: params.backoff_multiplier
        }
      };

    case 'pause':
      console.log(`[PLAYBOOK] Pausing for ${params.duration_ms}ms (reason: ${params.reason || 'playbook'})`);
      await sleep(params.duration_ms);

      db.logActivity({
        companyId,
        agentId,
        taskId,
        action: 'playbook_pause',
        detail: `Paused for ${params.duration_ms}ms - ${params.reason || 'recovery'}`
      });
      break;

    case 'split_task':
      console.log(`[PLAYBOOK] Splitting task into subtasks (strategy: ${params.strategy})`);

      // Get original task
      const task = taskId ? db.getTask(taskId) : null;
      if (!task) {
        console.warn('[PLAYBOOK] Cannot split task - task not found');
        break;
      }

      // Create subtasks
      const maxSubtasks = params.max_subtasks || 4;
      const subtaskTitles = [
        `${task.title} - Part 1`,
        `${task.title} - Part 2`,
        `${task.title} - Part 3`,
        `${task.title} - Part 4`
      ].slice(0, maxSubtasks);

      for (let i = 0; i < subtaskTitles.length; i++) {
        const subtaskId = crypto.randomUUID();
        db.createTask({
          id: subtaskId,
          companyId,
          parentId: taskId,
          title: subtaskTitles[i],
          description: `Subtask ${i + 1} of ${maxSubtasks}: ${task.description}`,
          priority: task.priority,
          assigneeId: task.assignee_id,
          createdById: 'playbook-automation'
        });

        console.log(`[PLAYBOOK] Created subtask: ${subtaskTitles[i]}`);
      }

      // Update original task status
      db.updateTaskStatus(taskId, 'in_progress', `Split into ${maxSubtasks} subtasks due to complexity`);

      db.logActivity({
        companyId,
        agentId,
        taskId,
        action: 'task_split',
        detail: `Task split into ${maxSubtasks} subtasks by playbook automation`
      });
      break;

    case 'update_task_status':
      if (taskId) {
        db.updateTaskStatus(taskId, params.status, params.result);
        console.log(`[PLAYBOOK] Updated task status to ${params.status}`);
      }
      break;

    case 'log_incident':
      if (companyId && agentId) {
        db.logIncident({
          companyId,
          agentId,
          taskId,
          incidentType: params.incident_type || 'playbook_recovery',
          description: params.description || 'Playbook automated recovery',
          recoveryAction: params.recovery_action || 'AUTO_RECOVERY'
        });
        console.log(`[PLAYBOOK] Logged incident: ${params.incident_type}`);
      }
      break;

    case 'log_activity':
      db.logActivity({
        companyId,
        agentId,
        taskId,
        action: params.action || 'playbook_action',
        detail: params.detail || 'Playbook automated action'
      });
      break;

    case 'checkpoint_restore':
      console.log(`[PLAYBOOK] Checkpoint restore requested (implementation pending)`);
      // This would integrate with checkpoint system
      if (params.load_last_checkpoint && agentId && taskId) {
        const checkpoint = db.getLatestCheckpoint(agentId, taskId);
        if (checkpoint) {
          console.log(`[PLAYBOOK] Found checkpoint at turn ${checkpoint.turn_number}`);
          return { checkpoint };
        }
      }
      break;

    case 'restart_agent':
      console.log(`[PLAYBOOK] Agent restart requested (delegated to recovery manager)`);
      // This would be handled by the recovery manager
      if (params.use_recovery_manager && agentId) {
        const canRetry = canRetryAgent(agentId);
        console.log(`[PLAYBOOK] Agent ${agentName || agentId} can retry: ${canRetry}`);
        return { canRetry };
      }
      break;

    case 'restart_task':
      console.log(`[PLAYBOOK] Task restart requested`);
      if (taskId && params.preserve_progress) {
        // Reset to in_progress from blocked/failed
        db.updateTaskStatus(taskId, 'in_progress', 'Restarted by playbook automation');
        db.logActivity({
          companyId,
          agentId,
          taskId,
          action: 'task_restarted',
          detail: 'Task restarted by playbook automation'
        });
      }
      break;

    case 'notify_user':
      console.log(`[PLAYBOOK] USER NOTIFICATION: ${params.message}`);
      structuredLog({
        level: params.severity || 'info',
        source: 'playbook',
        company_id: companyId,
        agent_id: agentId,
        task_id: taskId,
        action: 'user_notification',
        metadata: { message: params.message }
      });
      break;

    default:
      console.warn(`[PLAYBOOK] Unknown action type: ${type}`);
  }

  return {};
}

/**
 * Execute a playbook
 */
export async function executePlaybook(playbook, context) {
  const { companyId, agentId, taskId } = context;
  const startTime = Date.now();

  console.log(`[PLAYBOOKS] Executing playbook: ${playbook.name} (${playbook.id})`);

  // Log playbook execution start
  db.logActivity({
    companyId,
    agentId,
    taskId,
    action: 'playbook_execution',
    detail: JSON.stringify({
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      status: 'started',
      timestamp: new Date().toISOString()
    })
  });

  structuredLog({
    level: 'info',
    source: 'playbook',
    company_id: companyId,
    agent_id: agentId,
    task_id: taskId,
    action: 'playbook_started',
    metadata: {
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      description: playbook.description
    }
  });

  try {
    const results = [];

    // Execute actions sequentially
    for (let i = 0; i < playbook.actions.length; i++) {
      const action = playbook.actions[i];
      console.log(`[PLAYBOOK] Executing action ${i + 1}/${playbook.actions.length}: ${action.type}`);

      try {
        const result = await executeAction(action, context);
        results.push({ action: action.type, success: true, result });
      } catch (error) {
        console.error(`[PLAYBOOK] Action failed: ${action.type} - ${error.message}`);
        results.push({ action: action.type, success: false, error: error.message });

        // Continue with next action even if one fails (best effort)
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    // Log playbook execution completion
    db.logActivity({
      companyId,
      agentId,
      taskId,
      action: 'playbook_execution',
      detail: JSON.stringify({
        playbook_id: playbook.id,
        playbook_name: playbook.name,
        status: 'completed',
        duration_ms: duration,
        actions_executed: results.length,
        actions_succeeded: successCount,
        actions_failed: failureCount,
        timestamp: new Date().toISOString()
      })
    });

    structuredLog({
      level: failureCount > 0 ? 'warning' : 'info',
      source: 'playbook',
      company_id: companyId,
      agent_id: agentId,
      task_id: taskId,
      action: 'playbook_completed',
      metadata: {
        playbook_id: playbook.id,
        playbook_name: playbook.name,
        duration_ms: duration,
        actions_executed: results.length,
        actions_succeeded: successCount,
        actions_failed: failureCount
      }
    });

    console.log(`[PLAYBOOKS] Playbook ${playbook.name} completed in ${duration}ms (${successCount}/${results.length} actions succeeded)`);

    return {
      success: true,
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      duration_ms: duration,
      actions: results
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    // Log playbook execution failure
    db.logActivity({
      companyId,
      agentId,
      taskId,
      action: 'playbook_execution',
      detail: JSON.stringify({
        playbook_id: playbook.id,
        playbook_name: playbook.name,
        status: 'failed',
        duration_ms: duration,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    });

    structuredLog({
      level: 'error',
      source: 'playbook',
      company_id: companyId,
      agent_id: agentId,
      task_id: taskId,
      action: 'playbook_failed',
      metadata: {
        playbook_id: playbook.id,
        playbook_name: playbook.name,
        duration_ms: duration,
        error: error.message
      }
    });

    console.error(`[PLAYBOOKS] Playbook ${playbook.name} failed: ${error.message}`);

    return {
      success: false,
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      duration_ms: duration,
      error: error.message
    };
  }
}

/**
 * Auto-execute recovery playbook for a failure
 * This is the main entry point for automatic playbook execution
 */
export async function autoRecover(context) {
  const { error, companyId, agentId, taskId } = context;

  // Match failure to playbook
  const playbook = matchPlaybook(context);

  if (!playbook) {
    console.log('[PLAYBOOKS] No matching playbook found for this failure');
    return { matched: false, playbook: null, result: null };
  }

  console.log(`[PLAYBOOKS] Matched playbook: ${playbook.name}`);

  // Execute playbook
  const result = await executePlaybook(playbook, context);

  return {
    matched: true,
    playbook: {
      id: playbook.id,
      name: playbook.name,
      description: playbook.description
    },
    result
  };
}

/**
 * Get playbook execution history for a company
 */
export function getPlaybookHistory(companyId, limit = 50) {
  const activities = db.getDb().prepare(`
    SELECT * FROM activity_log
    WHERE company_id = ? AND action = 'playbook_execution'
    ORDER BY created_at DESC
    LIMIT ?
  `).all(companyId, limit);

  return activities.map(activity => {
    try {
      const detail = JSON.parse(activity.detail);
      return {
        id: activity.id,
        company_id: activity.company_id,
        agent_id: activity.agent_id,
        task_id: activity.task_id,
        created_at: activity.created_at,
        ...detail
      };
    } catch (error) {
      return activity;
    }
  });
}

/**
 * Get playbook execution statistics
 */
export function getPlaybookStats(companyId) {
  const db_instance = db.getDb();

  // Get execution counts by playbook
  const executions = getPlaybookHistory(companyId, 1000);

  const stats = {
    total_executions: executions.length,
    executions_started: executions.filter(e => e.status === 'started').length,
    executions_completed: executions.filter(e => e.status === 'completed').length,
    executions_failed: executions.filter(e => e.status === 'failed').length,
    by_playbook: {},
    recent_executions: executions.slice(0, 10)
  };

  // Group by playbook ID
  for (const execution of executions) {
    if (!execution.playbook_id) continue;

    if (!stats.by_playbook[execution.playbook_id]) {
      stats.by_playbook[execution.playbook_id] = {
        playbook_id: execution.playbook_id,
        playbook_name: execution.playbook_name,
        total_executions: 0,
        completed: 0,
        failed: 0,
        total_duration_ms: 0,
        avg_duration_ms: 0
      };
    }

    const pb = stats.by_playbook[execution.playbook_id];
    pb.total_executions++;

    if (execution.status === 'completed') {
      pb.completed++;
      if (execution.duration_ms) {
        pb.total_duration_ms += execution.duration_ms;
      }
    } else if (execution.status === 'failed') {
      pb.failed++;
    }

    if (pb.completed > 0) {
      pb.avg_duration_ms = Math.round(pb.total_duration_ms / pb.completed);
    }
  }

  return stats;
}

/**
 * List all available playbooks
 */
export function listPlaybooks() {
  return playbooks.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    enabled: p.enabled,
    priority: p.priority,
    triggers: p.triggers,
    action_count: p.actions.length
  }));
}

/**
 * Get a specific playbook by ID
 */
export function getPlaybook(playbookId) {
  return playbooks.find(p => p.id === playbookId);
}

/**
 * Test if a context would match a playbook (for debugging)
 */
export function testPlaybookMatch(context) {
  const playbook = matchPlaybook(context);
  return {
    matched: !!playbook,
    playbook: playbook ? {
      id: playbook.id,
      name: playbook.name,
      description: playbook.description,
      priority: playbook.priority
    } : null
  };
}

export default {
  loadPlaybooks,
  reloadPlaybooks,
  matchPlaybook,
  executePlaybook,
  autoRecover,
  getPlaybookHistory,
  getPlaybookStats,
  listPlaybooks,
  getPlaybook,
  testPlaybookMatch
};
