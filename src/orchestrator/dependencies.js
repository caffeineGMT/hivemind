/**
 * Task Dependency Resolution System
 *
 * Provides DAG (Directed Acyclic Graph) validation and dependency resolution
 * for task scheduling in the Hivemind orchestrator.
 */

import * as db from "../db.js";

/**
 * Validates that adding a dependency doesn't create a cycle in the task graph
 * @param {string} taskId - The task that will depend on others
 * @param {string[]} dependsOn - Array of task IDs that taskId will depend on
 * @returns {{ valid: boolean, cycle?: string[] }} - Validation result with cycle path if invalid
 */
export function validateDAG(taskId, dependsOn) {
  if (!dependsOn || dependsOn.length === 0) {
    return { valid: true };
  }

  // Build dependency graph for the company
  const task = db.getTask(taskId);
  if (!task) {
    return { valid: false, error: "Task not found" };
  }

  const companyTasks = db.getTasksByCompany(task.company_id);
  const graph = buildDependencyGraph(companyTasks);

  // Check each proposed dependency
  for (const depId of dependsOn) {
    // Check if depId exists
    const depTask = companyTasks.find(t => t.id === depId);
    if (!depTask) {
      return { valid: false, error: `Dependency task ${depId} not found` };
    }

    // Check if adding this edge would create a cycle
    // A cycle exists if there's already a path from depId to taskId
    if (hasPath(graph, depId, taskId)) {
      const cycle = findCycle(graph, taskId, depId);
      return { valid: false, cycle };
    }
  }

  return { valid: true };
}

/**
 * Builds a dependency graph from tasks
 * @param {Array} tasks - Array of task objects
 * @returns {Map<string, Set<string>>} - Adjacency list representation
 */
function buildDependencyGraph(tasks) {
  const graph = new Map();

  for (const task of tasks) {
    if (!graph.has(task.id)) {
      graph.set(task.id, new Set());
    }

    if (task.depends_on) {
      try {
        const deps = JSON.parse(task.depends_on);
        if (Array.isArray(deps)) {
          for (const depId of deps) {
            if (!graph.has(depId)) {
              graph.set(depId, new Set());
            }
            // Edge from depId to task.id means "task.id depends on depId"
            // So depId must complete before task.id
            graph.get(depId).add(task.id);
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
  }

  return graph;
}

/**
 * Check if there's a path from source to target using BFS
 * @param {Map<string, Set<string>>} graph
 * @param {string} source
 * @param {string} target
 * @returns {boolean}
 */
function hasPath(graph, source, target) {
  if (source === target) return true;

  const visited = new Set();
  const queue = [source];
  visited.add(source);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = graph.get(current) || new Set();

    for (const neighbor of neighbors) {
      if (neighbor === target) return true;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Find a cycle path if one exists
 * @param {Map<string, Set<string>>} graph
 * @param {string} from
 * @param {string} to
 * @returns {string[]} - Array of task IDs forming the cycle
 */
function findCycle(graph, from, to) {
  // Find path from 'to' back to 'from' to show the cycle
  const visited = new Set();
  const parent = new Map();
  const queue = [to];
  visited.add(to);
  parent.set(to, null);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = graph.get(current) || new Set();

    for (const neighbor of neighbors) {
      if (neighbor === from) {
        // Found the cycle, reconstruct path
        const path = [from];
        let node = current;
        while (node !== null) {
          path.push(node);
          node = parent.get(node);
        }
        path.push(from); // Complete the cycle
        return path.reverse();
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return [from, to, from]; // Simple cycle
}

/**
 * Check if all dependencies for a task are completed
 * @param {string} taskId - The task to check
 * @returns {{ ready: boolean, pendingDeps?: string[] }} - Whether task is ready and list of pending dependencies
 */
export function areDependenciesCompleted(taskId) {
  const task = db.getTask(taskId);
  if (!task) {
    return { ready: false, error: "Task not found" };
  }

  if (!task.depends_on) {
    return { ready: true };
  }

  try {
    const deps = JSON.parse(task.depends_on);
    if (!Array.isArray(deps) || deps.length === 0) {
      return { ready: true };
    }

    const pendingDeps = [];
    for (const depId of deps) {
      const depTask = db.getTask(depId);
      if (!depTask) {
        // Dependency doesn't exist - treat as error
        return { ready: false, error: `Dependency ${depId} not found` };
      }
      if (depTask.status !== 'done') {
        pendingDeps.push(depId);
      }
    }

    if (pendingDeps.length > 0) {
      return { ready: false, pendingDeps };
    }

    return { ready: true };
  } catch (e) {
    // Invalid JSON in depends_on field
    return { ready: true }; // Assume no dependencies if can't parse
  }
}

/**
 * Get all tasks that are ready to be assigned (dependencies completed)
 * @param {string} companyId
 * @returns {Array} - Array of tasks ready for assignment
 */
export function getReadyTasks(companyId) {
  const tasks = db.getTasksByCompany(companyId, 'backlog')
    .concat(db.getTasksByCompany(companyId, 'todo'));

  const readyTasks = [];
  for (const task of tasks) {
    const { ready } = areDependenciesCompleted(task.id);
    if (ready) {
      readyTasks.push(task);
    }
  }

  return readyTasks;
}

/**
 * Get tasks that depend on a specific task
 * @param {string} taskId
 * @returns {Array} - Array of tasks that depend on the given task
 */
export function getDependentTasks(taskId) {
  const task = db.getTask(taskId);
  if (!task) return [];

  const allTasks = db.getTasksByCompany(task.company_id);
  const dependents = [];

  for (const t of allTasks) {
    if (t.depends_on) {
      try {
        const deps = JSON.parse(t.depends_on);
        if (Array.isArray(deps) && deps.includes(taskId)) {
          dependents.push(t);
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
  }

  return dependents;
}

/**
 * Get topological sort of tasks (useful for visualizing dependency order)
 * @param {string} companyId
 * @returns {{ sorted: string[], error?: string }} - Topologically sorted task IDs or error if cycle exists
 */
export function topologicalSort(companyId) {
  const tasks = db.getTasksByCompany(companyId);
  const graph = buildDependencyGraph(tasks);

  // Calculate in-degrees
  const inDegree = new Map();
  const allTaskIds = new Set(tasks.map(t => t.id));

  for (const taskId of allTaskIds) {
    inDegree.set(taskId, 0);
  }

  for (const [node, neighbors] of graph.entries()) {
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue = [];
  for (const [taskId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  const sorted = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);

    const neighbors = graph.get(current) || new Set();
    for (const neighbor of neighbors) {
      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If not all tasks are in sorted, there's a cycle
  if (sorted.length !== allTaskIds.size) {
    return { error: "Dependency cycle detected", sorted: [] };
  }

  return { sorted };
}

/**
 * Get dependency depth for a task (longest path from any root)
 * Useful for determining task scheduling priority
 * @param {string} taskId
 * @returns {number} - Depth in dependency tree (0 = no dependencies)
 */
export function getDependencyDepth(taskId) {
  const task = db.getTask(taskId);
  if (!task || !task.depends_on) return 0;

  try {
    const deps = JSON.parse(task.depends_on);
    if (!Array.isArray(deps) || deps.length === 0) return 0;

    let maxDepth = 0;
    for (const depId of deps) {
      const depDepth = getDependencyDepth(depId);
      maxDepth = Math.max(maxDepth, depDepth + 1);
    }
    return maxDepth;
  } catch (e) {
    return 0;
  }
}

/**
 * Get all dependencies for a task (transitive closure)
 * @param {string} taskId
 * @returns {Set<string>} - Set of all task IDs that this task depends on (directly or indirectly)
 */
export function getAllDependencies(taskId) {
  const allDeps = new Set();
  const queue = [taskId];
  const visited = new Set([taskId]);

  while (queue.length > 0) {
    const current = queue.shift();
    const task = db.getTask(current);

    if (task && task.depends_on) {
      try {
        const deps = JSON.parse(task.depends_on);
        if (Array.isArray(deps)) {
          for (const depId of deps) {
            allDeps.add(depId);
            if (!visited.has(depId)) {
              visited.add(depId);
              queue.push(depId);
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
  }

  return allDeps;
}
