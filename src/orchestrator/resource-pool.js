/**
 * Agent Resource Pool
 *
 * Manages agent allocation, capability tracking, and workload balancing.
 * Provides intelligent task-to-agent matching based on:
 * - Agent capabilities (model, skills, cost tier)
 * - Current utilization (prevent overload)
 * - Task requirements (complexity, priority)
 * - Cost optimization
 */

import * as db from "../db.js";

// ── Agent Capability Definitions ────────────────────────────────────────────

/**
 * Cost tiers for agents - determines which model/configuration to use
 */
export const COST_TIERS = {
  economy: {
    name: "economy",
    model: "claude-3-haiku-20240307",
    costMultiplier: 0.25,
    description: "Simple tasks, documentation, code review"
  },
  standard: {
    name: "standard",
    model: "claude-sonnet-4-20250514",
    costMultiplier: 1.0,
    description: "Standard development tasks"
  },
  premium: {
    name: "premium",
    model: "claude-opus-4-20250514",
    costMultiplier: 15.0,
    description: "Complex architecture, debugging, critical features"
  }
};

/**
 * Agent capability types
 */
export const CAPABILITIES = {
  // Development capabilities
  fullstack: "fullstack",          // Full-stack development
  frontend: "frontend",            // Frontend/UI development
  backend: "backend",              // Backend/API development
  database: "database",            // Database design and optimization
  devops: "devops",                // DevOps, CI/CD, deployment

  // Specialized capabilities
  security: "security",            // Security analysis and hardening
  performance: "performance",      // Performance optimization
  testing: "testing",              // Test writing and QA
  documentation: "documentation",  // Documentation writing
  debugging: "debugging",          // Bug investigation and fixes

  // Domain capabilities
  ai_ml: "ai_ml",                  // AI/ML integration
  data_processing: "data_processing", // Data pipelines and ETL
  ui_ux: "ui_ux",                  // UI/UX design and implementation
  api_design: "api_design",        // API architecture
};

// ── Resource Pool State ─────────────────────────────────────────────────────

/**
 * Initialize agent with capabilities and resource limits
 */
export function initializeAgent(agentId, config = {}) {
  const {
    capabilities = [],
    costTier = "standard",
    maxLoad = 1,
  } = config;

  const capabilitiesJson = JSON.stringify(capabilities);

  db.getDb().prepare(`
    UPDATE agents
    SET capabilities = ?,
        cost_tier = ?,
        max_load = ?,
        current_load = 0
    WHERE id = ?
  `).run(capabilitiesJson, costTier, maxLoad, agentId);
}

/**
 * Get agent capabilities
 */
export function getAgentCapabilities(agentId) {
  const agent = db.getAgent(agentId);
  if (!agent || !agent.capabilities) {
    return [];
  }
  try {
    return JSON.parse(agent.capabilities);
  } catch {
    return [];
  }
}

/**
 * Get agent cost tier
 */
export function getAgentCostTier(agentId) {
  const agent = db.getAgent(agentId);
  return agent?.cost_tier || "standard";
}

/**
 * Update agent load (increment/decrement)
 */
export function updateAgentLoad(agentId, delta) {
  const agent = db.getAgent(agentId);
  if (!agent) return;

  const newLoad = Math.max(0, (agent.current_load || 0) + delta);

  db.getDb().prepare(`
    UPDATE agents
    SET current_load = ?
    WHERE id = ?
  `).run(newLoad, agentId);
}

/**
 * Get agent utilization ratio (0.0 to 1.0+)
 */
export function getAgentUtilization(agentId) {
  const agent = db.getAgent(agentId);
  if (!agent) return 0;

  const currentLoad = agent.current_load || 0;
  const maxLoad = agent.max_load || 1;

  return maxLoad > 0 ? currentLoad / maxLoad : 0;
}

/**
 * Check if agent is overloaded
 */
export function isAgentOverloaded(agentId) {
  return getAgentUtilization(agentId) >= 1.0;
}

/**
 * Check if agent is available for new work
 */
export function isAgentAvailable(agentId) {
  const agent = db.getAgent(agentId);
  if (!agent || agent.status === "error") return false;

  return !isAgentOverloaded(agentId);
}

// ── Agent Pool Queries ──────────────────────────────────────────────────────

/**
 * Get available agents in the pool for a company
 * @param {string} companyId - Company ID
 * @param {object} filters - Optional filters (role, capabilities, costTier)
 * @returns {Array} Available agents sorted by utilization (least loaded first)
 */
export function getAvailableAgents(companyId, filters = {}) {
  const { role, capabilities, costTier, maxUtilization = 0.8 } = filters;

  let agents = db.getAgentsByCompany(companyId);

  // Filter by role
  if (role) {
    agents = agents.filter(a => a.role === role);
  }

  // Filter by cost tier
  if (costTier) {
    agents = agents.filter(a => (a.cost_tier || "standard") === costTier);
  }

  // Filter by capabilities
  if (capabilities && capabilities.length > 0) {
    agents = agents.filter(agent => {
      const agentCaps = getAgentCapabilities(agent.id);
      return capabilities.every(cap => agentCaps.includes(cap));
    });
  }

  // Filter by availability and utilization
  agents = agents.filter(agent => {
    if (agent.status === "error") return false;
    const utilization = getAgentUtilization(agent.id);
    return utilization < maxUtilization;
  });

  // Sort by utilization (least loaded first) for balanced distribution
  agents.sort((a, b) => {
    const utilA = getAgentUtilization(a.id);
    const utilB = getAgentUtilization(b.id);
    return utilA - utilB;
  });

  return agents;
}

/**
 * Get pool statistics for a company
 */
export function getPoolStats(companyId) {
  const agents = db.getAgentsByCompany(companyId);

  const stats = {
    total: agents.length,
    running: 0,
    idle: 0,
    error: 0,
    available: 0,
    overloaded: 0,
    totalCapacity: 0,
    currentLoad: 0,
    utilizationRatio: 0,
    byRole: {},
    byCostTier: {},
    byCapability: {},
  };

  for (const agent of agents) {
    // Status counts
    if (agent.status === "running") stats.running++;
    else if (agent.status === "idle") stats.idle++;
    else if (agent.status === "error") stats.error++;

    // Availability
    if (isAgentAvailable(agent.id)) stats.available++;
    if (isAgentOverloaded(agent.id)) stats.overloaded++;

    // Capacity and load
    const maxLoad = agent.max_load || 1;
    const currentLoad = agent.current_load || 0;
    stats.totalCapacity += maxLoad;
    stats.currentLoad += currentLoad;

    // By role
    stats.byRole[agent.role] = (stats.byRole[agent.role] || 0) + 1;

    // By cost tier
    const tier = agent.cost_tier || "standard";
    stats.byCostTier[tier] = (stats.byCostTier[tier] || 0) + 1;

    // By capability
    const caps = getAgentCapabilities(agent.id);
    for (const cap of caps) {
      stats.byCapability[cap] = (stats.byCapability[cap] || 0) + 1;
    }
  }

  stats.utilizationRatio = stats.totalCapacity > 0
    ? stats.currentLoad / stats.totalCapacity
    : 0;

  return stats;
}

/**
 * Get detailed agent utilization metrics
 */
export function getAgentUtilizationMetrics(companyId) {
  const agents = db.getAgentsByCompany(companyId);

  return agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    costTier: agent.cost_tier || "standard",
    capabilities: getAgentCapabilities(agent.id),
    currentLoad: agent.current_load || 0,
    maxLoad: agent.max_load || 1,
    utilization: getAgentUtilization(agent.id),
    available: isAgentAvailable(agent.id),
    overloaded: isAgentOverloaded(agent.id),
    lastHeartbeat: agent.last_heartbeat,
  }));
}

// ── Agent Assignment Scoring ────────────────────────────────────────────────

/**
 * Calculate fitness score for assigning a task to an agent
 * Higher score = better match
 *
 * Scoring factors:
 * - Capability match (0-40 points)
 * - Availability/load (0-30 points)
 * - Cost efficiency (0-20 points)
 * - Role match (0-10 points)
 */
export function calculateAssignmentScore(agent, task, taskRequirements = {}) {
  let score = 0;

  // 1. Capability match (0-40 points)
  const agentCaps = getAgentCapabilities(agent.id);
  const requiredCaps = taskRequirements.capabilities || [];

  if (requiredCaps.length > 0) {
    const matchedCaps = requiredCaps.filter(cap => agentCaps.includes(cap));
    const capabilityMatch = matchedCaps.length / requiredCaps.length;
    score += capabilityMatch * 40;

    // If agent lacks required capabilities, heavily penalize
    if (capabilityMatch < 1.0) {
      score -= 50;
    }
  } else {
    // No specific requirements, give baseline score
    score += 20;
  }

  // 2. Availability/load (0-30 points)
  const utilization = getAgentUtilization(agent.id);

  if (utilization >= 1.0) {
    // Overloaded - heavy penalty
    score -= 100;
  } else {
    // Prefer less loaded agents for better distribution
    const availabilityScore = (1.0 - utilization) * 30;
    score += availabilityScore;
  }

  // 3. Cost efficiency (0-20 points)
  const agentTier = agent.cost_tier || "standard";
  const taskComplexity = taskRequirements.complexity || "medium";

  const costMatch = {
    // Simple tasks
    simple: { economy: 20, standard: 10, premium: 0 },
    // Medium tasks
    medium: { economy: 5, standard: 20, premium: 10 },
    // Complex tasks
    complex: { economy: 0, standard: 10, premium: 20 },
  };

  score += costMatch[taskComplexity]?.[agentTier] || 10;

  // 4. Role match (0-10 points)
  const preferredRole = taskRequirements.preferredRole || "engineer";
  if (agent.role === preferredRole) {
    score += 10;
  } else if (agent.role === "engineer") {
    // Engineers are generalists, give some points
    score += 5;
  }

  // 5. Status check - error status is disqualifying
  if (agent.status === "error") {
    score = -1000;
  }

  return score;
}

/**
 * Find best agent for a task
 * Returns the agent with highest assignment score, or null if none available
 */
export function findBestAgent(companyId, task, taskRequirements = {}) {
  const agents = db.getAgentsByCompany(companyId);

  if (agents.length === 0) return null;

  // Calculate scores for all agents
  const scoredAgents = agents.map(agent => ({
    agent,
    score: calculateAssignmentScore(agent, task, taskRequirements),
  }));

  // Sort by score (highest first)
  scoredAgents.sort((a, b) => b.score - a.score);

  // Return best match if score is positive
  const best = scoredAgents[0];
  if (best && best.score > 0) {
    return best.agent;
  }

  return null;
}

// ── Task Requirements Helpers ───────────────────────────────────────────────

/**
 * Infer task requirements from task metadata
 * This provides intelligent defaults based on task title/description
 */
export function inferTaskRequirements(task) {
  const title = (task.title || "").toLowerCase();
  const description = (task.description || "").toLowerCase();
  const text = title + " " + description;

  const requirements = {
    capabilities: [],
    complexity: "medium",
    preferredRole: "engineer",
  };

  // Infer capabilities from keywords
  if (text.match(/\b(ui|frontend|react|component|design|css|styling)\b/)) {
    requirements.capabilities.push(CAPABILITIES.frontend);
    requirements.capabilities.push(CAPABILITIES.ui_ux);
  }

  if (text.match(/\b(backend|api|endpoint|database|sql|server)\b/)) {
    requirements.capabilities.push(CAPABILITIES.backend);
  }

  if (text.match(/\b(database|schema|migration|query|sql|postgres|sqlite)\b/)) {
    requirements.capabilities.push(CAPABILITIES.database);
  }

  if (text.match(/\b(deploy|deployment|ci\/cd|docker|kubernetes|vercel)\b/)) {
    requirements.capabilities.push(CAPABILITIES.devops);
  }

  if (text.match(/\b(security|auth|authentication|authorization|encryption)\b/)) {
    requirements.capabilities.push(CAPABILITIES.security);
  }

  if (text.match(/\b(test|testing|unit test|integration test|e2e)\b/)) {
    requirements.capabilities.push(CAPABILITIES.testing);
  }

  if (text.match(/\b(performance|optimization|slow|latency|speed)\b/)) {
    requirements.capabilities.push(CAPABILITIES.performance);
  }

  if (text.match(/\b(bug|fix|debug|error|crash|issue)\b/)) {
    requirements.capabilities.push(CAPABILITIES.debugging);
    requirements.complexity = "medium"; // Debugging can be complex
  }

  if (text.match(/\b(docs|documentation|readme|guide)\b/)) {
    requirements.capabilities.push(CAPABILITIES.documentation);
    requirements.complexity = "simple";
  }

  // Infer complexity from priority and keywords
  if (task.priority === "urgent" || task.priority === "high") {
    requirements.complexity = "complex";
  }

  if (text.match(/\b(refactor|architecture|redesign|major|overhaul)\b/)) {
    requirements.complexity = "complex";
  }

  if (text.match(/\b(simple|quick|minor|small|trivial)\b/)) {
    requirements.complexity = "simple";
  }

  // If no specific capabilities found, default to fullstack
  if (requirements.capabilities.length === 0) {
    requirements.capabilities.push(CAPABILITIES.fullstack);
  }

  return requirements;
}

/**
 * Set task requirements explicitly
 */
export function setTaskRequirements(taskId, requirements) {
  const requirementsJson = JSON.stringify(requirements);

  db.getDb().prepare(`
    UPDATE tasks
    SET required_capabilities = ?
    WHERE id = ?
  `).run(requirementsJson, taskId);
}

/**
 * Get task requirements
 */
export function getTaskRequirements(taskId) {
  const task = db.getTask(taskId);
  if (!task) return null;

  // If requirements are explicitly set, use them
  if (task.required_capabilities) {
    try {
      return JSON.parse(task.required_capabilities);
    } catch {
      // Fall through to infer
    }
  }

  // Otherwise, infer from task content
  return inferTaskRequirements(task);
}
