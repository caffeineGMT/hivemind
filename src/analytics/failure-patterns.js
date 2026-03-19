import crypto from "node:crypto";
import * as db from "../db.js";

// Normalize an error message by stripping variable parts (IDs, timestamps, paths, numbers)
function normalizeMessage(msg) {
  if (!msg) return "";
  return msg
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<UUID>")
    .replace(/\b[0-9a-f]{8,}\b/gi, "<HEX>")
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\dZ]*/g, "<TIMESTAMP>")
    .replace(/\/[\w\-./]+/g, "<PATH>")
    .replace(/\b\d+\b/g, "<NUM>")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Generate a stable pattern ID from a normalized message
function generatePatternId(normalizedMsg) {
  return crypto.createHash("md5").update(normalizedMsg).digest("hex").slice(0, 12);
}

// Calculate similarity between two normalized strings using bigram overlap (Dice coefficient)
function similarity(a, b) {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const bigramsA = new Set();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));

  const bigramsB = new Set();
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// Extract hour bucket from a timestamp string
function getHourBucket(timestamp) {
  const d = new Date(timestamp);
  return d.getHours();
}

// Extract the agent type from agent_id (e.g., "ceo", "engineer", "cto")
function extractAgentType(agentId) {
  if (!agentId) return "unknown";
  const parts = agentId.toLowerCase().split(/[_\-\s]/);
  const knownRoles = ["ceo", "cto", "cfo", "designer", "engineer"];
  for (const part of parts) {
    if (knownRoles.includes(part)) return part;
  }
  return agentId;
}

// Extract task type from action string
function extractTaskType(action) {
  if (!action) return "unknown";
  const lower = action.toLowerCase();
  if (lower.includes("planning") || lower.includes("strategy")) return "planning";
  if (lower.includes("code") || lower.includes("implement") || lower.includes("build")) return "coding";
  if (lower.includes("deploy") || lower.includes("deployment")) return "deployment";
  if (lower.includes("test")) return "testing";
  if (lower.includes("review")) return "review";
  if (lower.includes("design")) return "design";
  return "general";
}

const SIMILARITY_THRESHOLD = 0.6;

// Cluster errors into patterns using greedy single-linkage clustering
function clusterErrors(entries) {
  const clusters = new Map(); // patternId -> cluster info

  for (const entry of entries) {
    const msg = entry.detail || entry.action || "";
    const normalized = normalizeMessage(msg);
    if (!normalized) continue;

    let bestClusterId = null;
    let bestScore = 0;

    for (const [id, cluster] of clusters) {
      const score = similarity(normalized, cluster.normalizedRepresentative);
      if (score > bestScore) {
        bestScore = score;
        bestClusterId = id;
      }
    }

    if (bestScore >= SIMILARITY_THRESHOLD && bestClusterId) {
      const cluster = clusters.get(bestClusterId);
      cluster.entries.push(entry);
      cluster.count++;

      const ts = entry.created_at || entry.timestamp;
      if (ts) {
        const hour = getHourBucket(ts);
        cluster.hourDistribution[hour] = (cluster.hourDistribution[hour] || 0) + 1;
        const entryTime = new Date(ts).getTime();
        if (entryTime < cluster.firstSeen) cluster.firstSeen = entryTime;
        if (entryTime > cluster.lastSeen) cluster.lastSeen = entryTime;
      }

      const agentType = extractAgentType(entry.agent_id);
      cluster.agentTypes[agentType] = (cluster.agentTypes[agentType] || 0) + 1;

      const taskType = extractTaskType(entry.action);
      cluster.taskTypes[taskType] = (cluster.taskTypes[taskType] || 0) + 1;
    } else {
      const patternId = generatePatternId(normalized);
      const ts = entry.created_at || entry.timestamp;
      const time = ts ? new Date(ts).getTime() : Date.now();
      const hour = ts ? getHourBucket(ts) : new Date().getHours();
      const agentType = extractAgentType(entry.agent_id);
      const taskType = extractTaskType(entry.action);

      clusters.set(patternId, {
        patternId,
        normalizedRepresentative: normalized,
        representative: msg,
        entries: [entry],
        count: 1,
        firstSeen: time,
        lastSeen: time,
        hourDistribution: { [hour]: 1 },
        agentTypes: { [agentType]: 1 },
        taskTypes: { [taskType]: 1 },
      });
    }
  }

  return clusters;
}

// Analyze failure patterns from both activity_log and logs tables
export function analyzeFailurePatterns(companyId, options = {}) {
  const limit = options.limit || 500;

  const failureActivities = db.getFailureActivities(companyId, limit);
  const failureLogs = db.getFailureLogs(companyId, limit);

  // Merge both sources into a unified format
  const allEntries = [
    ...failureActivities.map(a => ({
      id: a.id,
      source: "activity_log",
      company_id: a.company_id,
      agent_id: a.agent_id,
      task_id: a.task_id,
      action: a.action,
      detail: a.detail,
      created_at: a.created_at,
      level: "error",
    })),
    ...failureLogs.map(l => ({
      id: l.id,
      source: "logs",
      company_id: l.company_id,
      agent_id: l.agent_id || l.source,
      task_id: l.task_id,
      action: l.action,
      detail: l.metadata,
      created_at: l.timestamp,
      level: l.level,
    })),
  ];

  // Sort by time descending
  allEntries.sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta;
  });

  const clusters = clusterErrors(allEntries);

  // Update pattern_id on activity_log entries
  const updateStmt = db.getDb().prepare("UPDATE activity_log SET pattern_id = ? WHERE id = ? AND pattern_id IS NULL");
  const updateTransaction = db.getDb().transaction((updates) => {
    for (const { id, patternId } of updates) {
      updateStmt.run(patternId, id);
    }
  });

  const updates = [];
  for (const cluster of clusters.values()) {
    for (const entry of cluster.entries) {
      if (entry.source === "activity_log") {
        updates.push({ id: entry.id, patternId: cluster.patternId });
      }
    }
  }
  if (updates.length > 0) {
    updateTransaction(updates);
  }

  // Convert to sorted array (most frequent first)
  const patterns = Array.from(clusters.values())
    .map(c => ({
      pattern_id: c.patternId,
      representative_message: c.representative,
      count: c.count,
      first_seen: new Date(c.firstSeen).toISOString(),
      last_seen: new Date(c.lastSeen).toISOString(),
      hour_distribution: c.hourDistribution,
      agent_types: c.agentTypes,
      task_types: c.taskTypes,
      severity: categorizeSeverity(c),
      sample_entries: c.entries.slice(0, 3).map(e => ({
        id: e.id,
        action: e.action,
        detail: e.detail,
        agent_id: e.agent_id,
        created_at: e.created_at,
        level: e.level,
      })),
    }))
    .sort((a, b) => b.count - a.count);

  // Summary stats
  const totalFailures = allEntries.length;
  const uniquePatterns = patterns.length;
  const topPattern = patterns[0] || null;

  // Peak failure hours
  const hourTotals = {};
  for (const p of patterns) {
    for (const [hour, count] of Object.entries(p.hour_distribution)) {
      hourTotals[hour] = (hourTotals[hour] || 0) + count;
    }
  }
  const peakHour = Object.entries(hourTotals).sort((a, b) => b[1] - a[1])[0];

  return {
    patterns,
    summary: {
      total_failures: totalFailures,
      unique_patterns: uniquePatterns,
      top_pattern: topPattern ? {
        pattern_id: topPattern.pattern_id,
        message: topPattern.representative_message,
        count: topPattern.count,
      } : null,
      peak_failure_hour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1] } : null,
      failure_rate_by_agent: computeAgentFailureRates(patterns),
    },
  };
}

function categorizeSeverity(cluster) {
  const recentThreshold = Date.now() - 60 * 60 * 1000; // last hour
  const recentCount = cluster.entries.filter(e => {
    const t = new Date(e.created_at).getTime();
    return t >= recentThreshold;
  }).length;

  if (cluster.count >= 10 || recentCount >= 3) return "critical";
  if (cluster.count >= 5 || recentCount >= 1) return "high";
  if (cluster.count >= 2) return "medium";
  return "low";
}

function computeAgentFailureRates(patterns) {
  const agentCounts = {};
  for (const p of patterns) {
    for (const [agent, count] of Object.entries(p.agent_types)) {
      agentCounts[agent] = (agentCounts[agent] || 0) + count;
    }
  }
  return agentCounts;
}
