import { getDb } from "./db.js";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const FAILURE_RATE_MULTIPLIER = 2.0;
const COST_SPIKE_MULTIPLIER = 1.5;
const COMPLETION_TIME_MULTIPLIER = 3.0;
const BASELINE_DAYS = 7;
const RECENT_WINDOW_HOURS = 1;

let intervalHandle = null;
let broadcastFn = null;
let lastAlerts = new Map(); // dedup: alertKey -> timestamp

function alertKey(type, companyId) {
  return `${type}:${companyId || "global"}`;
}

function shouldEmit(key, cooldownMs = 30 * 60 * 1000) {
  const last = lastAlerts.get(key);
  if (last && Date.now() - last < cooldownMs) return false;
  lastAlerts.set(key, Date.now());
  return true;
}

function emitAlert(alert) {
  const key = alertKey(alert.type, alert.companyId);
  if (!shouldEmit(key)) return;

  console.log(`[anomaly-detector] ALERT: ${alert.type} — ${alert.message}`);

  if (broadcastFn) {
    broadcastFn("anomaly_alert", alert);
  }

  // Store the alert in the incidents table for persistence
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO incidents (company_id, agent_id, task_id, incident_type, description, recovery_action)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      alert.companyId || null,
      alert.agentId || null,
      null,
      `anomaly:${alert.type}`,
      alert.message,
      alert.recommendation || null
    );
  } catch (err) {
    console.error(`[anomaly-detector] Failed to persist alert: ${err.message}`);
  }
}

/**
 * Detect agent failure rate spikes (>2x baseline).
 * Compares failure rate in last hour vs 7-day average hourly rate.
 */
function checkFailureRateSpike() {
  const db = getDb();

  // 7-day baseline: average hourly failure count per company
  const baseline = db.prepare(`
    SELECT company_id,
           COUNT(*) * 1.0 / (${BASELINE_DAYS} * 24) AS avg_hourly_failures,
           COUNT(*) AS total_failures
    FROM agent_runs
    WHERE status IN ('failed', 'error')
      AND start_time >= datetime('now', '-${BASELINE_DAYS} days')
    GROUP BY company_id
  `).all();

  const baselineMap = new Map();
  for (const row of baseline) {
    baselineMap.set(row.company_id, row.avg_hourly_failures);
  }

  // Recent window: failures in last hour
  const recent = db.prepare(`
    SELECT company_id, COUNT(*) AS recent_failures
    FROM agent_runs
    WHERE status IN ('failed', 'error')
      AND start_time >= datetime('now', '-${RECENT_WINDOW_HOURS} hours')
    GROUP BY company_id
  `).all();

  for (const row of recent) {
    const baselineRate = baselineMap.get(row.company_id) || 0;
    // Need at least 2 baseline failures to avoid false positives on sparse data
    if (baselineRate < 0.01) continue;

    const ratio = row.recent_failures / baselineRate;
    if (ratio >= FAILURE_RATE_MULTIPLIER) {
      emitAlert({
        type: "failure_rate_spike",
        severity: ratio >= 5 ? "critical" : "warning",
        companyId: row.company_id,
        message: `Agent failure rate spike: ${row.recent_failures} failures in last hour (${ratio.toFixed(1)}x baseline of ${baselineRate.toFixed(2)}/hr)`,
        details: {
          recentFailures: row.recent_failures,
          baselineHourlyRate: baselineRate,
          ratio,
          windowHours: RECENT_WINDOW_HOURS,
        },
        recommendation: "Check agent logs for recurring errors. Consider pausing affected agents.",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Detect cost spikes (>1.5x 7-day daily average).
 * Compares today's cost vs 7-day average daily cost.
 */
function checkCostSpike() {
  const db = getDb();

  // 7-day baseline: average daily cost per company
  const baseline = db.prepare(`
    SELECT company_id,
           SUM(cost_usd) * 1.0 / ${BASELINE_DAYS} AS avg_daily_cost,
           SUM(cost_usd) AS total_cost
    FROM cost_log
    WHERE created_at >= datetime('now', '-${BASELINE_DAYS} days')
      AND created_at < date('now')
    GROUP BY company_id
  `).all();

  const baselineMap = new Map();
  for (const row of baseline) {
    baselineMap.set(row.company_id, row.avg_daily_cost);
  }

  // Today's cost
  const today = db.prepare(`
    SELECT company_id, SUM(cost_usd) AS today_cost
    FROM cost_log
    WHERE created_at >= date('now')
    GROUP BY company_id
  `).all();

  for (const row of today) {
    const avgDaily = baselineMap.get(row.company_id) || 0;
    if (avgDaily < 0.01) continue; // skip if no meaningful baseline

    const ratio = row.today_cost / avgDaily;
    if (ratio >= COST_SPIKE_MULTIPLIER) {
      emitAlert({
        type: "cost_spike",
        severity: ratio >= 3 ? "critical" : "warning",
        companyId: row.company_id,
        message: `Cost spike: $${row.today_cost.toFixed(2)} today (${ratio.toFixed(1)}x 7-day avg of $${avgDaily.toFixed(2)}/day)`,
        details: {
          todayCost: row.today_cost,
          averageDailyCost: avgDaily,
          ratio,
          baselineDays: BASELINE_DAYS,
        },
        recommendation: "Review which agents/tasks are consuming excessive tokens. Consider setting budget limits.",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Detect task completion time spikes (>3x p95).
 * Compares recent task completion times to historical p95.
 */
function checkCompletionTimeSpike() {
  const db = getDb();

  // Historical p95 completion time per company (from task_executions that completed)
  const historicalTimes = db.prepare(`
    SELECT company_id,
           (julianday(completed_at) - julianday(created_at)) * 24 * 60 AS duration_minutes
    FROM task_executions
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND created_at >= datetime('now', '-${BASELINE_DAYS} days')
    ORDER BY company_id, duration_minutes
  `).all();

  // Group by company and compute p95
  const p95Map = new Map();
  const byCompany = new Map();
  for (const row of historicalTimes) {
    if (!byCompany.has(row.company_id)) byCompany.set(row.company_id, []);
    byCompany.get(row.company_id).push(row.duration_minutes);
  }
  for (const [companyId, durations] of byCompany) {
    if (durations.length < 5) continue; // need enough data
    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    p95Map.set(companyId, durations[p95Index]);
  }

  // Recent completions (last hour)
  const recent = db.prepare(`
    SELECT company_id, task_id,
           (julianday(completed_at) - julianday(created_at)) * 24 * 60 AS duration_minutes
    FROM task_executions
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at >= datetime('now', '-${RECENT_WINDOW_HOURS} hours')
  `).all();

  for (const row of recent) {
    const p95 = p95Map.get(row.company_id);
    if (!p95 || p95 < 0.1) continue;

    const ratio = row.duration_minutes / p95;
    if (ratio >= COMPLETION_TIME_MULTIPLIER) {
      emitAlert({
        type: "completion_time_spike",
        severity: ratio >= 10 ? "critical" : "warning",
        companyId: row.company_id,
        message: `Task completion time spike: ${row.duration_minutes.toFixed(1)}min (${ratio.toFixed(1)}x p95 of ${p95.toFixed(1)}min)`,
        details: {
          taskId: row.task_id,
          durationMinutes: row.duration_minutes,
          p95Minutes: p95,
          ratio,
        },
        recommendation: "Investigate slow tasks for blocking dependencies or resource contention.",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Run all anomaly detection checks.
 */
function runChecks() {
  try {
    checkFailureRateSpike();
  } catch (err) {
    console.error(`[anomaly-detector] failure rate check error: ${err.message}`);
  }

  try {
    checkCostSpike();
  } catch (err) {
    console.error(`[anomaly-detector] cost check error: ${err.message}`);
  }

  try {
    checkCompletionTimeSpike();
  } catch (err) {
    console.error(`[anomaly-detector] completion time check error: ${err.message}`);
  }
}

/**
 * Start the anomaly detector. Runs checks every 10 minutes.
 * @param {Function} broadcast - WebSocket broadcast function (event, data) => void
 */
export function startAnomalyDetector(broadcast) {
  broadcastFn = broadcast;

  // Run initial check after a short delay (let DB warm up)
  setTimeout(() => {
    console.log("[anomaly-detector] Running initial anomaly check...");
    runChecks();
  }, 5000);

  intervalHandle = setInterval(() => {
    console.log("[anomaly-detector] Running scheduled anomaly check...");
    runChecks();
  }, CHECK_INTERVAL_MS);

  console.log(`[anomaly-detector] Started. Checking every ${CHECK_INTERVAL_MS / 60000} minutes.`);
}

/**
 * Stop the anomaly detector.
 */
export function stopAnomalyDetector() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  broadcastFn = null;
  console.log("[anomaly-detector] Stopped.");
}

/**
 * Manually trigger an anomaly check (for API endpoint / testing).
 * Returns any alerts found.
 */
export function runAnomalyCheck() {
  const alerts = [];
  const originalBroadcast = broadcastFn;

  // Capture alerts instead of broadcasting
  broadcastFn = (event, data) => {
    alerts.push(data);
    if (originalBroadcast) originalBroadcast(event, data);
  };

  // Temporarily clear cooldowns for manual checks
  lastAlerts.clear();
  runChecks();
  broadcastFn = originalBroadcast;

  return alerts;
}
