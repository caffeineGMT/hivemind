/**
 * Anomaly Detection System for Agent Behavior Monitoring
 *
 * Tracks and detects anomalies in:
 * - Response time (API call duration)
 * - Error rate (errors per hour)
 * - Token usage (tokens per task)
 * - Task completion time (duration from start to done)
 *
 * Uses statistical methods:
 * - Z-score (standard deviation-based outlier detection)
 * - Moving averages (trend analysis)
 * - Historical baseline comparison
 */

import * as db from "../db.js";

// Configuration
const ANOMALY_THRESHOLD_SIGMA = 2.0; // Deviations >2 standard deviations are anomalies
const MOVING_AVERAGE_WINDOW = 10; // Window size for moving average calculation
const BASELINE_MIN_SAMPLES = 20; // Minimum samples needed to establish baseline
const ANOMALY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes - prevent alert spam

// Metric types we track
export const METRIC_TYPES = {
  RESPONSE_TIME: 'response_time',
  ERROR_RATE: 'error_rate',
  TOKEN_USAGE: 'token_usage',
  TASK_COMPLETION_TIME: 'task_completion_time',
  COST_PER_TASK: 'cost_per_task',
  CACHE_HIT_RATE: 'cache_hit_rate',
};

// Anomaly severity levels
export const SEVERITY = {
  LOW: 'low',       // 2-3 sigma deviation
  MEDIUM: 'medium', // 3-4 sigma deviation
  HIGH: 'high',     // 4+ sigma deviation
  CRITICAL: 'critical', // System-wide impact
};

// In-memory cache for recent anomalies (prevent spam)
const recentAnomalies = new Map();

/**
 * Calculate mean (average) of an array of numbers
 */
function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation of an array of numbers
 */
function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = mean(squareDiffs);
  return Math.sqrt(variance);
}

/**
 * Calculate z-score for a value given mean and standard deviation
 */
function zScore(value, avg, stdDev) {
  if (stdDev === 0) return 0;
  return (value - avg) / stdDev;
}

/**
 * Calculate moving average for the last N values
 */
function movingAverage(values, windowSize = MOVING_AVERAGE_WINDOW) {
  if (values.length === 0) return 0;
  const window = values.slice(-windowSize);
  return mean(window);
}

/**
 * Determine severity based on z-score magnitude
 */
function getSeverity(zScoreValue) {
  const absZ = Math.abs(zScoreValue);
  if (absZ >= 4) return SEVERITY.HIGH;
  if (absZ >= 3) return SEVERITY.MEDIUM;
  if (absZ >= 2) return SEVERITY.LOW;
  return null; // Not anomalous
}

/**
 * Check if we recently reported this anomaly (cooldown)
 */
function isInCooldown(agentId, metricType) {
  const key = `${agentId}:${metricType}`;
  const lastReported = recentAnomalies.get(key);
  if (!lastReported) return false;

  const elapsed = Date.now() - lastReported;
  return elapsed < ANOMALY_COOLDOWN_MS;
}

/**
 * Mark anomaly as reported (start cooldown)
 */
function markAsReported(agentId, metricType) {
  const key = `${agentId}:${metricType}`;
  recentAnomalies.set(key, Date.now());
}

/**
 * Get historical baseline metrics for an agent
 */
export function getBaselineMetrics(companyId, agentId, metricType, hoursBack = 24) {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const metrics = db.getDb().prepare(`
    SELECT value, timestamp
    FROM agent_metrics
    WHERE company_id = ?
      AND agent_id = ?
      AND metric_type = ?
      AND timestamp >= ?
    ORDER BY timestamp ASC
  `).all(companyId, agentId, metricType, cutoffTime);

  return metrics;
}

/**
 * Calculate baseline statistics for a metric
 */
export function calculateBaseline(metrics) {
  if (metrics.length < BASELINE_MIN_SAMPLES) {
    return {
      hasBaseline: false,
      sampleCount: metrics.length,
      requiredSamples: BASELINE_MIN_SAMPLES,
    };
  }

  const values = metrics.map(m => m.value);
  const avg = mean(values);
  const stdDev = standardDeviation(values);
  const movAvg = movingAverage(values);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  return {
    hasBaseline: true,
    sampleCount: values.length,
    mean: avg,
    standardDeviation: stdDev,
    movingAverage: movAvg,
    min: minValue,
    max: maxValue,
    threshold: {
      upper: avg + (ANOMALY_THRESHOLD_SIGMA * stdDev),
      lower: Math.max(0, avg - (ANOMALY_THRESHOLD_SIGMA * stdDev)),
    },
  };
}

/**
 * Detect if a new value is anomalous compared to baseline
 */
export function detectAnomaly(value, baseline, metricType) {
  if (!baseline.hasBaseline) {
    return {
      isAnomaly: false,
      reason: 'insufficient_baseline',
      sampleCount: baseline.sampleCount,
      requiredSamples: baseline.requiredSamples,
    };
  }

  const z = zScore(value, baseline.mean, baseline.standardDeviation);
  const severity = getSeverity(z);
  const isAnomaly = severity !== null;

  // Direction of anomaly
  let direction = 'normal';
  if (value > baseline.threshold.upper) direction = 'high';
  if (value < baseline.threshold.lower) direction = 'low';

  // For some metrics, only high values are concerning
  const isUndesirableAnomaly =
    (metricType === METRIC_TYPES.RESPONSE_TIME && direction === 'high') ||
    (metricType === METRIC_TYPES.ERROR_RATE && direction === 'high') ||
    (metricType === METRIC_TYPES.TOKEN_USAGE && direction === 'high') ||
    (metricType === METRIC_TYPES.TASK_COMPLETION_TIME && direction === 'high') ||
    (metricType === METRIC_TYPES.COST_PER_TASK && direction === 'high') ||
    (metricType === METRIC_TYPES.CACHE_HIT_RATE && direction === 'low');

  return {
    isAnomaly,
    isUndesirable: isAnomaly && isUndesirableAnomaly,
    severity,
    value,
    zScore: z,
    direction,
    baseline: {
      mean: baseline.mean,
      stdDev: baseline.standardDeviation,
      movingAverage: baseline.movingAverage,
      threshold: baseline.threshold,
    },
    deviationPercent: baseline.mean > 0 ? ((value - baseline.mean) / baseline.mean) * 100 : 0,
  };
}

/**
 * Record a metric value for an agent
 */
export function recordMetric({ companyId, agentId, agentName, metricType, value, metadata = null }) {
  db.getDb().prepare(`
    INSERT INTO agent_metrics (company_id, agent_id, agent_name, metric_type, value, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    companyId,
    agentId,
    agentName,
    metricType,
    value,
    metadata ? JSON.stringify(metadata) : null
  );
}

/**
 * Log an anomaly to the database
 */
export function logAnomaly({
  companyId,
  agentId,
  agentName,
  metricType,
  anomalyData,
  context = null,
}) {
  const result = db.getDb().prepare(`
    INSERT INTO anomalies (
      company_id,
      agent_id,
      agent_name,
      metric_type,
      value,
      baseline_mean,
      baseline_std_dev,
      z_score,
      severity,
      direction,
      deviation_percent,
      context
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    companyId,
    agentId,
    agentName,
    metricType,
    anomalyData.value,
    anomalyData.baseline.mean,
    anomalyData.baseline.stdDev,
    anomalyData.zScore,
    anomalyData.severity,
    anomalyData.direction,
    anomalyData.deviationPercent,
    context ? JSON.stringify(context) : null
  );

  return result.lastInsertRowid;
}

/**
 * Check and record metric, detect anomalies
 */
export async function checkMetric({
  companyId,
  agentId,
  agentName,
  metricType,
  value,
  metadata = null,
  alertCallback = null,
}) {
  // Record the metric
  recordMetric({ companyId, agentId, agentName, metricType, value, metadata });

  // Get historical baseline
  const historicalMetrics = getBaselineMetrics(companyId, agentId, metricType);
  const baseline = calculateBaseline(historicalMetrics);

  // Detect anomaly
  const anomaly = detectAnomaly(value, baseline, metricType);

  // If anomalous and undesirable, log it
  if (anomaly.isAnomaly && anomaly.isUndesirable) {
    // Check cooldown to prevent spam
    if (isInCooldown(agentId, metricType)) {
      return { ...anomaly, logged: false, reason: 'cooldown' };
    }

    // Log the anomaly
    const anomalyId = logAnomaly({
      companyId,
      agentId,
      agentName,
      metricType,
      anomalyData: anomaly,
      context: metadata,
    });

    // Mark as reported
    markAsReported(agentId, metricType);

    // Trigger alert callback if provided
    if (alertCallback) {
      await alertCallback({
        anomalyId,
        companyId,
        agentId,
        agentName,
        metricType,
        anomaly,
        metadata,
      });
    }

    return { ...anomaly, logged: true, anomalyId };
  }

  return { ...anomaly, logged: false };
}

/**
 * Get recent anomalies for a company
 */
export function getAnomalies(companyId, options = {}) {
  const {
    limit = 50,
    severity = null,
    metricType = null,
    agentId = null,
    hoursBack = 24,
  } = options;

  let query = `
    SELECT
      a.*,
      ag.name as agent_full_name,
      ag.role as agent_role,
      ag.status as agent_status
    FROM anomalies a
    LEFT JOIN agents ag ON a.agent_id = ag.id
    WHERE a.company_id = ?
      AND a.detected_at >= datetime('now', '-' || ? || ' hours')
  `;

  const params = [companyId, hoursBack];

  if (severity) {
    query += ` AND a.severity = ?`;
    params.push(severity);
  }

  if (metricType) {
    query += ` AND a.metric_type = ?`;
    params.push(metricType);
  }

  if (agentId) {
    query += ` AND a.agent_id = ?`;
    params.push(agentId);
  }

  query += ` ORDER BY a.detected_at DESC LIMIT ?`;
  params.push(limit);

  const anomalies = db.getDb().prepare(query).all(...params);

  // Parse context JSON
  return anomalies.map(a => ({
    ...a,
    context: a.context ? JSON.parse(a.context) : null,
  }));
}

/**
 * Get anomaly summary statistics
 */
export function getAnomalyStats(companyId, hoursBack = 24) {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const stats = db.getDb().prepare(`
    SELECT
      COUNT(*) as total_anomalies,
      COUNT(DISTINCT agent_id) as affected_agents,
      SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_severity,
      SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_severity,
      SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_severity,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_severity,
      SUM(CASE WHEN metric_type = 'response_time' THEN 1 ELSE 0 END) as response_time_anomalies,
      SUM(CASE WHEN metric_type = 'error_rate' THEN 1 ELSE 0 END) as error_rate_anomalies,
      SUM(CASE WHEN metric_type = 'token_usage' THEN 1 ELSE 0 END) as token_usage_anomalies,
      SUM(CASE WHEN metric_type = 'task_completion_time' THEN 1 ELSE 0 END) as completion_time_anomalies,
      SUM(CASE WHEN metric_type = 'cost_per_task' THEN 1 ELSE 0 END) as cost_anomalies
    FROM anomalies
    WHERE company_id = ?
      AND detected_at >= ?
  `).get(companyId, cutoffTime);

  // Get by-agent breakdown
  const byAgent = db.getDb().prepare(`
    SELECT
      agent_id,
      agent_name,
      COUNT(*) as anomaly_count,
      MAX(severity) as max_severity
    FROM anomalies
    WHERE company_id = ?
      AND detected_at >= ?
    GROUP BY agent_id, agent_name
    ORDER BY anomaly_count DESC
    LIMIT 10
  `).all(companyId, cutoffTime);

  return {
    ...stats,
    by_agent: byAgent,
    period_hours: hoursBack,
  };
}

/**
 * Get metric trends over time for visualization
 */
export function getMetricTrends(companyId, agentId, metricType, hoursBack = 24) {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  // Get raw data points
  const dataPoints = db.getDb().prepare(`
    SELECT
      value,
      timestamp,
      metadata
    FROM agent_metrics
    WHERE company_id = ?
      AND agent_id = ?
      AND metric_type = ?
      AND timestamp >= ?
    ORDER BY timestamp ASC
  `).all(companyId, agentId, metricType, cutoffTime);

  // Get anomalies for this metric
  const anomalies = db.getDb().prepare(`
    SELECT
      value,
      z_score,
      severity,
      direction,
      detected_at
    FROM anomalies
    WHERE company_id = ?
      AND agent_id = ?
      AND metric_type = ?
      AND detected_at >= ?
    ORDER BY detected_at ASC
  `).all(companyId, agentId, metricType, cutoffTime);

  // Calculate rolling statistics
  const values = dataPoints.map(dp => dp.value);
  const baseline = calculateBaseline(dataPoints);

  return {
    dataPoints: dataPoints.map(dp => ({
      ...dp,
      metadata: dp.metadata ? JSON.parse(dp.metadata) : null,
    })),
    anomalies,
    baseline: baseline.hasBaseline ? baseline : null,
    summary: {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: mean(values),
      current: values.length > 0 ? values[values.length - 1] : null,
    },
  };
}

/**
 * Analyze agent behavior for patterns
 */
export function analyzeAgentBehavior(companyId, agentId, hoursBack = 24) {
  const patterns = [];

  // Check each metric type
  for (const metricType of Object.values(METRIC_TYPES)) {
    const trends = getMetricTrends(companyId, agentId, metricType, hoursBack);

    if (!trends.baseline || !trends.baseline.hasBaseline) continue;

    const recentAnomalies = trends.anomalies.filter(a =>
      new Date(a.detected_at).getTime() > Date.now() - (6 * 60 * 60 * 1000) // Last 6 hours
    );

    if (recentAnomalies.length >= 3) {
      patterns.push({
        type: 'repeated_anomalies',
        metricType,
        count: recentAnomalies.length,
        severity: recentAnomalies[0].severity,
        message: `${metricType} showing repeated anomalies (${recentAnomalies.length} in last 6h)`,
      });
    }

    // Check for trending issues
    const recentValues = trends.dataPoints.slice(-10).map(dp => dp.value);
    if (recentValues.length >= 5) {
      const recentMean = mean(recentValues);
      const deviationFromBaseline = ((recentMean - trends.baseline.mean) / trends.baseline.mean) * 100;

      if (Math.abs(deviationFromBaseline) > 50) {
        patterns.push({
          type: 'trending_deviation',
          metricType,
          deviationPercent: deviationFromBaseline,
          message: `${metricType} trending ${deviationFromBaseline > 0 ? 'upward' : 'downward'} (${Math.abs(deviationFromBaseline).toFixed(1)}% from baseline)`,
        });
      }
    }
  }

  return {
    agentId,
    companyId,
    patterns,
    hasIssues: patterns.length > 0,
    analysisTime: new Date().toISOString(),
  };
}

/**
 * Clear old metrics and anomalies (data retention)
 */
export function cleanupOldData(daysToKeep = 30) {
  const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

  const metricsDeleted = db.getDb().prepare(`
    DELETE FROM agent_metrics WHERE timestamp < ?
  `).run(cutoffTime);

  const anomaliesDeleted = db.getDb().prepare(`
    DELETE FROM anomalies WHERE detected_at < ?
  `).run(cutoffTime);

  return {
    metricsDeleted: metricsDeleted.changes,
    anomaliesDeleted: anomaliesDeleted.changes,
    cutoffDate: cutoffTime,
  };
}
