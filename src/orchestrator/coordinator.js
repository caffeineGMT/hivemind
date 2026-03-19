/**
 * Task Coordinator
 *
 * Intelligent task-to-agent assignment using the resource pool.
 * Handles:
 * - Smart agent selection based on capabilities and workload
 * - Dependency-aware task scheduling
 * - Priority-based preemption
 * - Workload balancing across agents
 */

import * as db from "../db.js";
import * as resourcePool from "./resource-pool.js";

// ── Task Assignment ─────────────────────────────────────────────────────────

/**
 * Assign a task to the best available agent
 *
 * Selection criteria:
 * 1. Agent has required capabilities
 * 2. Agent is not overloaded
 * 3. Maximize cost efficiency
 * 4. Balance workload across agents
 *
 * @param {string} taskId - Task to assign
 * @param {object} options - Assignment options
 * @returns {object|null} - Assigned agent or null if none available
 */
export function assignTaskToAgent(taskId, options = {}) {
  const task = db.getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Check if task has dependencies that aren't met
  if (task.depends_on) {
    const dependencies = parseTaskDependencies(task.depends_on);
    if (!areTaskDependenciesMet(dependencies)) {
      return {
        success: false,
        reason: "dependencies_not_met",
        dependencies: dependencies.filter(depId => {
          const dep = db.getTask(depId);
          return !dep || dep.status !== "done";
        }),
      };
    }
  }

  // Get or infer task requirements
  let requirements = resourcePool.getTaskRequirements(taskId);

  // Allow options to override requirements
  if (options.requirements) {
    requirements = { ...requirements, ...options.requirements };
  }

  // Find best agent
  const agent = resourcePool.findBestAgent(task.company_id, task, requirements);

  if (!agent) {
    return {
      success: false,
      reason: "no_available_agent",
      requirements,
    };
  }

  // Assign the task
  db.assignTask(taskId, agent.id);

  // Update agent load
  resourcePool.updateAgentLoad(agent.id, +1);

  // Log assignment
  db.logActivity({
    companyId: task.company_id,
    agentId: agent.id,
    taskId,
    action: "task_assigned",
    detail: `Assigned to ${agent.name} (${agent.role}, ${agent.cost_tier || "standard"} tier)`,
  });

  return {
    success: true,
    agent,
    requirements,
  };
}

/**
 * Unassign a task from an agent (e.g., on completion or failure)
 */
export function unassignTask(taskId) {
  const task = db.getTask(taskId);
  if (!task || !task.assignee_id) return;

  // Update agent load
  resourcePool.updateAgentLoad(task.assignee_id, -1);

  // Clear assignment
  db.getDb().prepare(`
    UPDATE tasks
    SET assignee_id = NULL
    WHERE id = ?
  `).run(taskId);
}

/**
 * Reassign a task to a different agent
 */
export function reassignTask(taskId, options = {}) {
  unassignTask(taskId);
  return assignTaskToAgent(taskId, options);
}

// ── Dependency Management ───────────────────────────────────────────────────

/**
 * Parse task dependencies from JSON string
 */
function parseTaskDependencies(dependsOn) {
  if (!dependsOn) return [];

  try {
    const deps = JSON.parse(dependsOn);
    return Array.isArray(deps) ? deps : [deps];
  } catch {
    // Try as comma-separated string
    return dependsOn.split(",").map(d => d.trim()).filter(Boolean);
  }
}

/**
 * Check if all task dependencies are met (completed)
 */
function areTaskDependenciesMet(dependencies) {
  if (!dependencies || dependencies.length === 0) return true;

  for (const depId of dependencies) {
    const dep = db.getTask(depId);
    if (!dep || dep.status !== "done") {
      return false;
    }
  }

  return true;
}

/**
 * Get tasks that are ready to be assigned (dependencies met)
 */
export function getReadyTasks(companyId, status = "todo") {
  const tasks = db.getTasksByCompany(companyId, status);

  return tasks.filter(task => {
    // Skip project tasks
    if (task.title && task.title.startsWith("[PROJECT]")) {
      return false;
    }

    // Check dependencies
    if (task.depends_on) {
      const deps = parseTaskDependencies(task.depends_on);
      return areTaskDependenciesMet(deps);
    }

    return true;
  });
}

/**
 * Get tasks that are blocked by dependencies
 */
export function getBlockedTasks(companyId) {
  const tasks = db.getTasksByCompany(companyId);

  return tasks.filter(task => {
    if (task.status === "done") return false;
    if (!task.depends_on) return false;

    const deps = parseTaskDependencies(task.depends_on);
    return !areTaskDependenciesMet(deps);
  });
}

/**
 * Get dependency chain for a task
 */
export function getTaskDependencyChain(taskId, visited = new Set()) {
  if (visited.has(taskId)) {
    return []; // Circular dependency detected
  }

  visited.add(taskId);

  const task = db.getTask(taskId);
  if (!task || !task.depends_on) return [];

  const deps = parseTaskDependencies(task.depends_on);
  const chain = [...deps];

  for (const depId of deps) {
    const subChain = getTaskDependencyChain(depId, visited);
    chain.push(...subChain);
  }

  return [...new Set(chain)]; // Remove duplicates
}

// ── Batch Assignment ────────────────────────────────────────────────────────

/**
 * Assign multiple tasks in priority order
 *
 * @param {string} companyId - Company ID
 * @param {number} maxAssignments - Maximum tasks to assign
 * @returns {object} - Assignment results
 */
export function assignPendingTasks(companyId, maxAssignments = 10) {
  const readyTasks = getReadyTasks(companyId, "todo");

  // Sort by priority: urgent > high > medium > low
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  readyTasks.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    return pa - pb;
  });

  const results = {
    total: readyTasks.length,
    assigned: 0,
    failed: 0,
    blocked: 0,
    assignments: [],
    failures: [],
  };

  for (const task of readyTasks.slice(0, maxAssignments)) {
    const result = assignTaskToAgent(task.id);

    if (result.success) {
      results.assigned++;
      results.assignments.push({
        taskId: task.id,
        taskTitle: task.title,
        agentId: result.agent.id,
        agentName: result.agent.name,
        requirements: result.requirements,
      });
    } else {
      if (result.reason === "dependencies_not_met") {
        results.blocked++;
      } else {
        results.failed++;
      }

      results.failures.push({
        taskId: task.id,
        taskTitle: task.title,
        reason: result.reason,
        details: result,
      });
    }
  }

  return results;
}

// ── Workload Balancing ──────────────────────────────────────────────────────

/**
 * Rebalance workload across agents
 * Reassigns tasks from overloaded agents to underutilized ones
 */
export function rebalanceWorkload(companyId, options = {}) {
  const { maxReassignments = 5 } = options;

  const metrics = resourcePool.getAgentUtilizationMetrics(companyId);

  // Find overloaded agents
  const overloaded = metrics.filter(m => m.overloaded && m.status === "running");

  // Find underutilized agents (< 50% load)
  const underutilized = metrics.filter(m =>
    m.available && m.utilization < 0.5 && m.status !== "error"
  );

  if (overloaded.length === 0 || underutilized.length === 0) {
    return {
      rebalanced: 0,
      reason: overloaded.length === 0 ? "no_overloaded_agents" : "no_available_agents",
    };
  }

  const reassignments = [];
  let reassignCount = 0;

  for (const agent of overloaded) {
    if (reassignCount >= maxReassignments) break;

    // Get tasks assigned to this agent
    const tasks = db.getTasksByAssignee(agent.id, "in_progress");

    for (const task of tasks) {
      if (reassignCount >= maxReassignments) break;

      // Try to reassign to underutilized agent
      const result = reassignTask(task.id, {
        requirements: resourcePool.getTaskRequirements(task.id),
      });

      if (result.success && result.agent.id !== agent.id) {
        reassignments.push({
          taskId: task.id,
          fromAgent: agent.name,
          toAgent: result.agent.name,
        });
        reassignCount++;
      }
    }
  }

  return {
    rebalanced: reassignCount,
    reassignments,
  };
}

/**
 * Get workload distribution across agents
 */
export function getWorkloadDistribution(companyId) {
  const metrics = resourcePool.getAgentUtilizationMetrics(companyId);

  return {
    agents: metrics.map(m => ({
      name: m.name,
      role: m.role,
      utilization: m.utilization,
      currentLoad: m.currentLoad,
      maxLoad: m.maxLoad,
      status: m.status,
    })),
    stats: {
      avgUtilization: metrics.reduce((sum, m) => sum + m.utilization, 0) / Math.max(metrics.length, 1),
      maxUtilization: Math.max(...metrics.map(m => m.utilization), 0),
      minUtilization: Math.min(...metrics.map(m => m.utilization), 1),
      overloadedCount: metrics.filter(m => m.overloaded).length,
      availableCount: metrics.filter(m => m.available).length,
    },
  };
}

// ── Priority-Based Preemption ───────────────────────────────────────────────

/**
 * Preempt lower-priority tasks for urgent work
 *
 * @param {string} companyId - Company ID
 * @param {string} urgentTaskId - Urgent task that needs an agent
 * @returns {object} - Preemption result
 */
export function preemptForUrgentTask(urgentTaskId) {
  const urgentTask = db.getTask(urgentTaskId);
  if (!urgentTask || urgentTask.priority !== "urgent") {
    return {
      success: false,
      reason: "task_not_urgent",
    };
  }

  const companyId = urgentTask.company_id;

  // Get all running agents with their current tasks
  const agents = db.getAgentsByCompany(companyId);
  const runningAgents = agents.filter(a => a.status === "running");

  // Find preemption candidates (agents running low/medium priority tasks)
  const candidates = [];

  for (const agent of runningAgents) {
    const tasks = db.getTasksByAssignee(agent.id, "in_progress");

    for (const task of tasks) {
      if (task.priority === "low" || task.priority === "medium") {
        const score = task.priority === "low" ? 2 : 1; // Prefer preempting low priority
        candidates.push({ agent, task, score });
      }
    }
  }

  if (candidates.length === 0) {
    return {
      success: false,
      reason: "no_preemptible_tasks",
    };
  }

  // Sort by score (prefer low priority tasks)
  candidates.sort((a, b) => b.score - a.score);

  const victim = candidates[0];

  // Pause the victim task
  db.updateTaskStatus(victim.task.id, "todo", null);
  unassignTask(victim.task.id);

  // Assign urgent task
  const result = assignTaskToAgent(urgentTaskId);

  db.logActivity({
    companyId,
    agentId: victim.agent.id,
    taskId: victim.task.id,
    action: "task_preempted",
    detail: `Preempted for urgent task: ${urgentTask.title}`,
  });

  return {
    success: result.success,
    preemptedTask: {
      id: victim.task.id,
      title: victim.task.title,
      priority: victim.task.priority,
    },
    assignedAgent: result.agent,
  };
}

// ── Agent Performance Tracking ──────────────────────────────────────────────

/**
 * Track agent task completion metrics
 */
export function getAgentPerformanceMetrics(agentId) {
  const agent = db.getAgent(agentId);
  if (!agent) return null;

  const completedTasks = db.getTasksByAssignee(agentId, "done");
  const inProgressTasks = db.getTasksByAssignee(agentId, "in_progress");

  // Calculate average completion time
  let totalCompletionHours = 0;
  let completedCount = 0;

  for (const task of completedTasks) {
    if (task.created_at && task.updated_at) {
      const created = new Date(task.created_at);
      const completed = new Date(task.updated_at);
      const hours = (completed - created) / (1000 * 60 * 60);
      totalCompletionHours += hours;
      completedCount++;
    }
  }

  const avgCompletionHours = completedCount > 0
    ? totalCompletionHours / completedCount
    : 0;

  return {
    agentId,
    agentName: agent.name,
    role: agent.role,
    completedTasks: completedTasks.length,
    inProgressTasks: inProgressTasks.length,
    avgCompletionHours,
    currentUtilization: resourcePool.getAgentUtilization(agentId),
    capabilities: resourcePool.getAgentCapabilities(agentId),
    costTier: resourcePool.getAgentCostTier(agentId),
  };
}

/**
 * Get performance metrics for all agents in a company
 */
export function getAllAgentPerformanceMetrics(companyId) {
  const agents = db.getAgentsByCompany(companyId);

  return agents.map(agent => getAgentPerformanceMetrics(agent.id)).filter(Boolean);
}
