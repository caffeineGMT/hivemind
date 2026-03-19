import * as db from '../db.js';

/**
 * Workload Prediction Engine
 * Analyzes historical task data to predict future workload and suggest agent scaling
 */

// ── Prediction Models ──────────────────────────────────────────────────

/**
 * Calculate moving average for time series data
 */
function movingAverage(data, windowSize = 7) {
  if (data.length < windowSize) return data.map(d => d.value);

  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
    result.push(avg);
  }
  return result;
}

/**
 * Simple linear regression for trend prediction
 */
function linearRegression(data) {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].value;
    sumXY += i * data[i].value;
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Predict next N values using linear trend
 */
function predictLinear(data, steps = 7) {
  if (data.length === 0) return [];

  const { slope, intercept } = linearRegression(data);
  const predictions = [];
  const startIndex = data.length;

  for (let i = 0; i < steps; i++) {
    const predicted = slope * (startIndex + i) + intercept;
    predictions.push(Math.max(0, predicted)); // Ensure non-negative
  }

  return predictions;
}

/**
 * Calculate confidence score based on data variance and sample size
 */
function calculateConfidence(data, predictions) {
  if (data.length < 3) return 0.5;

  // Calculate variance in historical data
  const mean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const variance = data.reduce((sum, d) => Math.pow(d.value - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  // Lower variance = higher confidence
  const varianceScore = Math.max(0, 1 - (stdDev / (mean + 1)));

  // More data = higher confidence
  const sampleScore = Math.min(1, data.length / 30);

  // Combine scores
  return (varianceScore * 0.6 + sampleScore * 0.4);
}

// ── Peak Hour Detection ──────────────────────────────────────────────────

/**
 * Identify peak hours from hourly task patterns
 */
function detectPeakHours(hourlyData) {
  if (!hourlyData || hourlyData.length === 0) {
    return {
      peak_hours: [],
      off_peak_hours: [],
      avg_task_count: 0,
    };
  }

  const avgTaskCount = hourlyData.reduce((sum, h) => sum + h.task_count, 0) / hourlyData.length;
  const threshold = avgTaskCount * 1.5; // 150% of average

  const peakHours = hourlyData
    .filter(h => h.task_count >= threshold)
    .map(h => h.hour)
    .sort((a, b) => a - b);

  const offPeakHours = hourlyData
    .filter(h => h.task_count < threshold * 0.5)
    .map(h => h.hour)
    .sort((a, b) => a - b);

  return {
    peak_hours: peakHours,
    off_peak_hours: offPeakHours,
    avg_task_count: avgTaskCount,
    peak_threshold: threshold,
  };
}

// ── Task Volume Prediction ──────────────────────────────────────────────────

/**
 * Predict daily task volume for the next N days
 */
export function predictTaskVolume(companyId, forecastDays = 7) {
  // Get historical data
  const history = db.getTaskCompletionHistory(companyId, 30);

  if (history.length === 0) {
    return {
      predictions: [],
      trend: 'insufficient_data',
      confidence: 0,
      recommendations: ['Collect more historical data (minimum 7 days recommended)'],
    };
  }

  // Prepare data for prediction
  const taskData = history.map(h => ({
    date: h.date,
    value: h.tasks_created || 0,
  }));

  // Calculate trend
  const predictions = predictLinear(taskData, forecastDays);
  const movingAvg = movingAverage(taskData, 7);
  const confidence = calculateConfidence(taskData, predictions);

  // Determine trend direction
  const { slope } = linearRegression(taskData);
  let trend = 'stable';
  if (slope > 0.5) trend = 'increasing';
  else if (slope < -0.5) trend = 'decreasing';

  // Generate forecast entries
  const forecasts = [];
  const today = new Date();

  for (let i = 0; i < forecastDays; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i + 1);
    const timeBucket = forecastDate.toISOString().split('T')[0];

    forecasts.push({
      time_bucket: timeBucket,
      predicted_value: Math.round(predictions[i]),
      confidence_score: confidence,
    });

    // Save to database
    db.saveForecast({
      companyId,
      forecastType: 'daily_task_volume',
      timeBucket,
      predictedValue: predictions[i],
      confidenceScore: confidence,
      metadata: { trend, slope },
    });
  }

  // Calculate current statistics
  const recentAvg = taskData.slice(-7).reduce((sum, d) => sum + d.value, 0) / Math.min(7, taskData.length);
  const predictedAvg = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;

  return {
    predictions: forecasts,
    trend,
    confidence,
    current_avg: recentAvg,
    predicted_avg: predictedAvg,
    change_pct: ((predictedAvg - recentAvg) / (recentAvg + 1)) * 100,
  };
}

// ── Agent Capacity Recommendations ──────────────────────────────────────────────────

/**
 * Calculate recommended agent count based on workload forecast
 */
export function recommendAgentScaling(companyId) {
  // Get current state
  const agents = db.getAgentsByCompany(companyId);
  const tasks = db.getTasksByCompany(companyId);
  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'todo');

  // Get predictions
  const volumePrediction = predictTaskVolume(companyId, 7);

  if (volumePrediction.predictions.length === 0) {
    return {
      current_agents: agents.length,
      recommended_agents: agents.length,
      change: 0,
      reason: 'Insufficient data for prediction',
      confidence: 0,
    };
  }

  // Calculate current workload metrics
  const currentAgentCount = agents.filter(a => a.status !== 'error').length;
  const tasksPerAgent = activeTasks.length / Math.max(currentAgentCount, 1);

  // Get predicted workload
  const predictedDailyTasks = volumePrediction.predicted_avg;
  const predictedWorkload = predictedDailyTasks * 1.5; // Buffer for in-flight tasks

  // Calculate recommended agent count
  // Assume each agent can handle 5-8 tasks comfortably
  const optimalTasksPerAgent = 6;
  const recommendedAgents = Math.max(1, Math.ceil(predictedWorkload / optimalTasksPerAgent));

  const change = recommendedAgents - currentAgentCount;

  // Generate reason
  let reason = '';
  let action = 'maintain';

  if (change > 0) {
    action = 'scale_up';
    reason = `Workload trending ${volumePrediction.trend}. Predicted ${Math.round(predictedDailyTasks)} tasks/day requires ${recommendedAgents} agents (currently ${currentAgentCount}).`;
  } else if (change < 0) {
    action = 'scale_down';
    reason = `Workload decreasing. Predicted ${Math.round(predictedDailyTasks)} tasks/day can be handled by ${recommendedAgents} agents (currently ${currentAgentCount}).`;
  } else {
    reason = `Current agent count (${currentAgentCount}) is optimal for predicted workload of ${Math.round(predictedDailyTasks)} tasks/day.`;
  }

  // Save recommendation
  db.saveForecast({
    companyId,
    forecastType: 'agent_count_recommendation',
    timeBucket: new Date().toISOString().split('T')[0],
    predictedValue: recommendedAgents,
    confidenceScore: volumePrediction.confidence,
    metadata: {
      current_agents: currentAgentCount,
      change,
      action,
      reason,
      predicted_daily_tasks: predictedDailyTasks,
    },
  });

  return {
    current_agents: currentAgentCount,
    recommended_agents: recommendedAgents,
    change,
    action,
    reason,
    confidence: volumePrediction.confidence,
    predicted_daily_tasks: Math.round(predictedDailyTasks),
    tasks_per_agent: tasksPerAgent.toFixed(1),
  };
}

// ── Peak Hour Analysis ──────────────────────────────────────────────────

/**
 * Analyze hourly patterns and predict peak hours
 */
export function analyzePeakHours(companyId) {
  const hourlyData = db.getHourlyTaskPatterns(companyId, 14);

  if (hourlyData.length === 0) {
    return {
      peak_hours: [],
      off_peak_hours: [],
      recommendations: ['Collect more historical data'],
    };
  }

  const peakInfo = detectPeakHours(hourlyData);

  // Save peak hours forecast
  db.saveForecast({
    companyId,
    forecastType: 'peak_hours',
    timeBucket: new Date().toISOString().split('T')[0],
    predictedValue: peakInfo.peak_hours.length,
    confidenceScore: hourlyData.length >= 168 ? 0.85 : 0.6, // Higher confidence with more data
    metadata: peakInfo,
  });

  // Generate recommendations
  const recommendations = [];

  if (peakInfo.peak_hours.length > 0) {
    const peakHoursStr = peakInfo.peak_hours.map(h => `${h}:00`).join(', ');
    recommendations.push(
      `Peak hours detected: ${peakHoursStr}. Consider scaling up agents before these times.`
    );
  }

  if (peakInfo.off_peak_hours.length > 0) {
    const offPeakStr = peakInfo.off_peak_hours.map(h => `${h}:00`).join(', ');
    recommendations.push(
      `Low-activity hours: ${offPeakStr}. Consider scaling down or scheduling maintenance.`
    );
  }

  return {
    ...peakInfo,
    hourly_distribution: hourlyData,
    recommendations,
  };
}

// ── Agent Efficiency Prediction ──────────────────────────────────────────────────

/**
 * Predict which agents will be most efficient for upcoming work
 */
export function predictAgentEfficiency(companyId) {
  const workloadHistory = db.getAgentWorkloadHistory(companyId, 30);
  const agents = db.getAgentsByCompany(companyId);

  if (workloadHistory.length === 0) {
    return {
      agent_rankings: [],
      recommendations: ['Insufficient workload history'],
    };
  }

  // Aggregate performance by agent
  const agentStats = {};

  workloadHistory.forEach(record => {
    if (!record.agent_id) return;

    if (!agentStats[record.agent_id]) {
      agentStats[record.agent_id] = {
        agent_id: record.agent_id,
        agent_name: record.agent_name,
        role: record.role,
        total_tasks: 0,
        completed_tasks: 0,
        total_completion_time: 0,
        completion_count: 0,
      };
    }

    agentStats[record.agent_id].total_tasks += record.total_tasks || 0;
    agentStats[record.agent_id].completed_tasks += record.completed_tasks || 0;

    if (record.avg_completion_hours) {
      agentStats[record.agent_id].total_completion_time += record.avg_completion_hours;
      agentStats[record.agent_id].completion_count += 1;
    }
  });

  // Calculate efficiency scores
  const rankings = Object.values(agentStats).map(stat => {
    const completionRate = stat.total_tasks > 0 ? stat.completed_tasks / stat.total_tasks : 0;
    const avgCompletionTime = stat.completion_count > 0
      ? stat.total_completion_time / stat.completion_count
      : 999;

    // Efficiency score: higher completion rate + faster completion = better
    // Normalize: 100 = perfect (100% completion, 1 hour avg), 0 = worst
    const efficiencyScore = (completionRate * 50) + Math.max(0, 50 - avgCompletionTime * 2);

    return {
      agent_id: stat.agent_id,
      agent_name: stat.agent_name,
      role: stat.role,
      completion_rate: (completionRate * 100).toFixed(1),
      avg_completion_hours: avgCompletionTime < 999 ? avgCompletionTime.toFixed(1) : 'N/A',
      efficiency_score: Math.max(0, Math.min(100, efficiencyScore)).toFixed(1),
      total_tasks: stat.total_tasks,
      completed_tasks: stat.completed_tasks,
    };
  }).sort((a, b) => parseFloat(b.efficiency_score) - parseFloat(a.efficiency_score));

  // Generate recommendations
  const recommendations = [];

  if (rankings.length > 0) {
    const topAgent = rankings[0];
    recommendations.push(
      `Most efficient agent: ${topAgent.agent_name} (${topAgent.efficiency_score}/100 score)`
    );

    const slowAgents = rankings.filter(r => parseFloat(r.efficiency_score) < 40);
    if (slowAgents.length > 0) {
      recommendations.push(
        `${slowAgents.length} agent(s) underperforming. Consider retraining or reallocating tasks.`
      );
    }
  }

  return {
    agent_rankings: rankings,
    recommendations,
  };
}

// ── Comprehensive Workload Report ──────────────────────────────────────────────────

/**
 * Generate complete workload prediction and scaling recommendations
 */
export function generateWorkloadReport(companyId) {
  const volumeForecast = predictTaskVolume(companyId, 7);
  const scalingRecommendation = recommendAgentScaling(companyId);
  const peakHours = analyzePeakHours(companyId);
  const agentEfficiency = predictAgentEfficiency(companyId);

  // Combine all recommendations
  const allRecommendations = [
    ...volumeForecast.recommendations || [],
    ...peakHours.recommendations || [],
    ...agentEfficiency.recommendations || [],
  ];

  // Add scaling recommendation
  if (scalingRecommendation.change !== 0) {
    allRecommendations.unshift(scalingRecommendation.reason);
  }

  return {
    generated_at: new Date().toISOString(),
    company_id: companyId,

    volume_forecast: {
      predictions: volumeForecast.predictions,
      trend: volumeForecast.trend,
      confidence: volumeForecast.confidence,
      current_avg: volumeForecast.current_avg,
      predicted_avg: volumeForecast.predicted_avg,
      change_pct: volumeForecast.change_pct,
    },

    scaling_recommendation: scalingRecommendation,

    peak_hours: {
      peak_hours: peakHours.peak_hours,
      off_peak_hours: peakHours.off_peak_hours,
      avg_task_count: peakHours.avg_task_count,
    },

    agent_efficiency: {
      rankings: agentEfficiency.agent_rankings,
    },

    recommendations: allRecommendations,
  };
}
