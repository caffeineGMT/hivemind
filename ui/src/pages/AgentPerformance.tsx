import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import { api } from '../api';
import { TrendingUp, Zap, DollarSign, CheckCircle2, Target, Award, Activity, TrendingDown, Minus, AlertTriangle, Clock } from 'lucide-react';

interface AgentPerformanceProps {
  companyId: string;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

type SortBy = 'cost' | 'tasks' | 'efficiency' | 'tokens';

export default function AgentPerformance({ companyId }: AgentPerformanceProps) {
  const [sortBy, setSortBy] = useState<SortBy>('cost');

  // Fetch cost data
  const { data: costData, isLoading: costsLoading } = useQuery({
    queryKey: ['costs', companyId],
    queryFn: () => api.getCosts(companyId),
  });

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', companyId],
    queryFn: () => api.getTasks(companyId),
  });

  // Fetch agents
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => api.getAgents(companyId),
  });

  // Fetch workload forecast
  const { data: workloadForecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['workload-forecast', companyId],
    queryFn: () => api.getWorkloadForecast(companyId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isLoading = costsLoading || tasksLoading || agentsLoading;

  // Calculate comprehensive agent performance metrics
  const performanceData = useMemo(() => {
    if (!costData?.summary || !tasks || !agents) return [];

    return costData.summary.map((agentCost) => {
      const agent = agents.find((a) => a.name === agentCost.agent_name);
      const agentTasks = tasks.filter((t) => t.assignee_id === agent?.id);
      const completedTasks = agentTasks.filter((t) => t.status === 'done');
      const inProgressTasks = agentTasks.filter((t) => t.status === 'in_progress');

      const totalCost = parseFloat(agentCost.total_cost_usd.toFixed(4));
      const totalTokens = agentCost.total_tokens;
      const tasksCompleted = completedTasks.length;

      // Efficiency metrics
      const costPerTask = tasksCompleted > 0 ? totalCost / tasksCompleted : 0;
      const tokensPerTask = tasksCompleted > 0 ? totalTokens / tasksCompleted : 0;
      const avgDuration = agentCost.total_duration_ms / agentCost.sessions;
      const turnsPerSession = agentCost.total_turns / agentCost.sessions;

      // Efficiency score (lower cost per task and lower tokens per task = higher efficiency)
      // Normalized to 0-100 scale
      const efficiencyScore = tasksCompleted > 0
        ? Math.max(0, 100 - (costPerTask * 100) - (tokensPerTask / 10000))
        : 0;

      return {
        agent_name: agentCost.agent_name,
        agent_id: agent?.id,
        role: agent?.role || 'unknown',
        status: agent?.status || 'idle',

        // Cost metrics
        total_cost: totalCost,
        cost_per_task: parseFloat(costPerTask.toFixed(4)),

        // Token metrics
        total_tokens: totalTokens,
        input_tokens: agentCost.total_input_tokens,
        output_tokens: agentCost.total_output_tokens,
        cache_tokens: agentCost.total_cache_read_tokens,
        tokens_per_task: Math.round(tokensPerTask),

        // Task metrics
        tasks_completed: tasksCompleted,
        tasks_in_progress: inProgressTasks.length,
        total_tasks: agentTasks.length,
        completion_rate: agentTasks.length > 0 ? (completedTasks.length / agentTasks.length) * 100 : 0,

        // Session metrics
        sessions: agentCost.sessions,
        avg_duration_ms: Math.round(avgDuration),
        avg_turns: parseFloat(turnsPerSession.toFixed(1)),

        // Performance score
        efficiency_score: Math.max(0, Math.min(100, efficiencyScore)),
      };
    });
  }, [costData, tasks, agents]);

  // Sort performance data
  const sortedData = useMemo(() => {
    const data = [...performanceData];
    switch (sortBy) {
      case 'cost':
        return data.sort((a, b) => b.total_cost - a.total_cost);
      case 'tasks':
        return data.sort((a, b) => b.tasks_completed - a.tasks_completed);
      case 'efficiency':
        return data.sort((a, b) => b.efficiency_score - a.efficiency_score);
      case 'tokens':
        return data.sort((a, b) => b.total_tokens - a.total_tokens);
      default:
        return data;
    }
  }, [performanceData, sortBy]);

  // Top performers
  const topPerformers = useMemo(() => {
    const byEfficiency = [...performanceData].sort((a, b) => b.efficiency_score - a.efficiency_score);
    const byCost = [...performanceData].sort((a, b) => a.cost_per_task - b.cost_per_task);
    const byTasks = [...performanceData].sort((a, b) => b.tasks_completed - a.tasks_completed);

    return {
      most_efficient: byEfficiency[0],
      lowest_cost: byCost.find(a => a.tasks_completed > 0),
      most_productive: byTasks[0],
    };
  }, [performanceData]);

  // Cost vs Tasks scatter data
  const scatterData = useMemo(() => {
    return performanceData.map((agent) => ({
      x: agent.tasks_completed,
      y: agent.total_cost,
      name: agent.agent_name,
      size: agent.total_tokens / 100000, // Scale tokens for bubble size
    }));
  }, [performanceData]);

  // Radar chart data for top 5 agents
  const radarData = useMemo(() => {
    const top5 = [...performanceData]
      .sort((a, b) => b.tasks_completed - a.tasks_completed)
      .slice(0, 5);

    if (top5.length === 0) return [];

    // Normalize metrics to 0-100 scale
    const maxCost = Math.max(...top5.map(a => a.total_cost));
    const maxTokens = Math.max(...top5.map(a => a.total_tokens));
    const maxTasks = Math.max(...top5.map(a => a.tasks_completed));

    const metrics = ['Tasks', 'Efficiency', 'Speed', 'Cost Effective', 'Token Efficient'];

    return metrics.map((metric) => {
      const point: any = { metric };
      top5.forEach((agent) => {
        let value = 0;
        switch (metric) {
          case 'Tasks':
            value = (agent.tasks_completed / Math.max(maxTasks, 1)) * 100;
            break;
          case 'Efficiency':
            value = agent.efficiency_score;
            break;
          case 'Speed':
            value = Math.max(0, 100 - (agent.avg_duration_ms / 60000)); // Lower duration = higher score
            break;
          case 'Cost Effective':
            value = Math.max(0, 100 - ((agent.total_cost / Math.max(maxCost, 1)) * 100));
            break;
          case 'Token Efficient':
            value = Math.max(0, 100 - ((agent.total_tokens / Math.max(maxTokens, 1)) * 100));
            break;
        }
        point[agent.agent_name] = Math.max(0, Math.min(100, value));
      });
      return point;
    });
  }, [performanceData]);

  // Overall stats
  const overallStats = useMemo(() => {
    if (!costData?.totals || !tasks) return null;

    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const avgCostPerTask = completedTasks > 0 ? costData.totals.total_cost_usd / completedTasks : 0;
    const avgTokensPerTask = completedTasks > 0 ? costData.totals.total_tokens / completedTasks : 0;

    return {
      total_cost: costData.totals.total_cost_usd,
      total_tokens: costData.totals.total_tokens,
      total_tasks: completedTasks,
      avg_cost_per_task: avgCostPerTask,
      avg_tokens_per_task: avgTokensPerTask,
      total_agents: performanceData.length,
    };
  }, [costData, tasks, performanceData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  if (!costData || performanceData.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-8 text-center">
        <p className="text-zinc-400">No agent performance data available yet.</p>
        <p className="text-sm text-zinc-500 mt-2">Agents will appear here once they complete tasks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Performance Analytics</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Cost breakdown, efficiency metrics, productivity analysis, and workload predictions
        </p>
      </div>

      {/* Workload Prediction & Scaling Recommendations */}
      {workloadForecast && workloadForecast.scaling_recommendation && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-amber-500" />
            <h2 className="text-lg font-semibold text-white">Workload Prediction & Scaling</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Current vs Predicted Task Volume */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-sm text-zinc-400 mb-2">Task Volume Trend</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-white">
                  {Math.round(workloadForecast.volume_forecast.predicted_avg)}
                </div>
                <div className="text-sm text-zinc-500">tasks/day</div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {workloadForecast.volume_forecast.trend === 'increasing' && (
                  <TrendingUp size={16} className="text-amber-500" />
                )}
                {workloadForecast.volume_forecast.trend === 'decreasing' && (
                  <TrendingDown size={16} className="text-green-500" />
                )}
                {workloadForecast.volume_forecast.trend === 'stable' && (
                  <Minus size={16} className="text-blue-500" />
                )}
                <span className={`text-xs font-medium ${
                  workloadForecast.volume_forecast.trend === 'increasing' ? 'text-amber-400' :
                  workloadForecast.volume_forecast.trend === 'decreasing' ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {workloadForecast.volume_forecast.trend}
                </span>
                <span className="text-xs text-zinc-500">
                  ({workloadForecast.volume_forecast.change_pct > 0 ? '+' : ''}
                  {workloadForecast.volume_forecast.change_pct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Scaling Recommendation */}
            <div className={`rounded-lg border p-4 ${
              workloadForecast.scaling_recommendation.action === 'scale_up'
                ? 'border-amber-900/50 bg-amber-950/20'
                : workloadForecast.scaling_recommendation.action === 'scale_down'
                ? 'border-green-900/50 bg-green-950/20'
                : 'border-blue-900/50 bg-blue-950/20'
            }`}>
              <div className="text-sm text-zinc-400 mb-2">Agent Count Recommendation</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-white">
                  {workloadForecast.scaling_recommendation.recommended_agents}
                </div>
                <div className="text-sm text-zinc-500">
                  {workloadForecast.scaling_recommendation.change !== 0 && (
                    <span className={workloadForecast.scaling_recommendation.change > 0 ? 'text-amber-400' : 'text-green-400'}>
                      ({workloadForecast.scaling_recommendation.change > 0 ? '+' : ''}
                      {workloadForecast.scaling_recommendation.change})
                    </span>
                  )}
                </div>
              </div>
              <div className={`text-xs mt-2 font-medium ${
                workloadForecast.scaling_recommendation.action === 'scale_up' ? 'text-amber-400' :
                workloadForecast.scaling_recommendation.action === 'scale_down' ? 'text-green-400' : 'text-blue-400'
              }`}>
                {workloadForecast.scaling_recommendation.action === 'scale_up' && 'Scale up recommended'}
                {workloadForecast.scaling_recommendation.action === 'scale_down' && 'Scale down possible'}
                {workloadForecast.scaling_recommendation.action === 'maintain' && 'Current capacity optimal'}
              </div>
            </div>

            {/* Peak Hours */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-sm text-zinc-400 mb-2">Peak Activity Hours</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {workloadForecast.peak_hours.peak_hours.length > 0 ? (
                  workloadForecast.peak_hours.peak_hours.map((hour) => (
                    <span key={hour} className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 font-medium">
                      {hour}:00
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No peak hours detected</span>
                )}
              </div>
            </div>

            {/* Confidence Score */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-sm text-zinc-400 mb-2">Forecast Confidence</div>
              <div className="text-2xl font-bold text-white">
                {(workloadForecast.volume_forecast.confidence * 100).toFixed(0)}%
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    workloadForecast.volume_forecast.confidence > 0.7 ? 'bg-green-500' :
                    workloadForecast.volume_forecast.confidence > 0.5 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${workloadForecast.volume_forecast.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {workloadForecast.recommendations && workloadForecast.recommendations.length > 0 && (
            <div className="rounded-lg border border-amber-900/30 bg-amber-950/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-amber-400">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {workloadForecast.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 7-Day Volume Forecast Chart */}
          {workloadForecast.volume_forecast.predictions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-4">7-Day Task Volume Forecast</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={workloadForecast.volume_forecast.predictions.map(p => ({
                  date: new Date(p.time_bucket).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  tasks: Math.round(p.predicted_value),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tasks"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    name="Predicted Tasks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Overall Stats */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
              <DollarSign size={16} />
              Total Cost
            </div>
            <div className="text-2xl font-bold text-white">
              ${overallStats.total_cost.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              ${overallStats.avg_cost_per_task.toFixed(4)}/task
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
              <Zap size={16} />
              Total Tokens
            </div>
            <div className="text-2xl font-bold text-white">
              {(overallStats.total_tokens / 1_000_000).toFixed(2)}M
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {Math.round(overallStats.avg_tokens_per_task).toLocaleString()}/task
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
              <CheckCircle2 size={16} />
              Tasks Done
            </div>
            <div className="text-2xl font-bold text-white">
              {overallStats.total_tasks}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {overallStats.total_agents} agents
            </div>
          </div>

          {topPerformers.most_efficient && (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 text-amber-400 text-sm mb-2">
                <Award size={16} />
                Most Efficient
              </div>
              <div className="text-lg font-bold text-white truncate">
                {topPerformers.most_efficient.agent_name}
              </div>
              <div className="text-xs text-amber-500 mt-1">
                Score: {topPerformers.most_efficient.efficiency_score.toFixed(0)}
              </div>
            </div>
          )}

          {topPerformers.lowest_cost && (
            <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-4">
              <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                <DollarSign size={16} />
                Lowest Cost
              </div>
              <div className="text-lg font-bold text-white truncate">
                {topPerformers.lowest_cost.agent_name}
              </div>
              <div className="text-xs text-green-500 mt-1">
                ${topPerformers.lowest_cost.cost_per_task.toFixed(4)}/task
              </div>
            </div>
          )}

          {topPerformers.most_productive && (
            <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
              <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                <Target size={16} />
                Most Productive
              </div>
              <div className="text-lg font-bold text-white truncate">
                {topPerformers.most_productive.agent_name}
              </div>
              <div className="text-xs text-blue-500 mt-1">
                {topPerformers.most_productive.tasks_completed} tasks
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">Sort by:</span>
        <div className="flex gap-2">
          {(['cost', 'tasks', 'efficiency', 'tokens'] as SortBy[]).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                sortBy === sort
                  ? 'bg-amber-500 text-black font-medium'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {sort === 'cost' ? 'Total Cost' :
               sort === 'tasks' ? 'Tasks Completed' :
               sort === 'efficiency' ? 'Efficiency' : 'Tokens Used'}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost per Agent */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cost by Agent</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="agent_name"
                stroke="#71717a"
                tick={{ fill: '#71717a', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="total_cost" fill="#f59e0b" name="Total Cost (USD)">
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tokens by Agent */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tokens Used by Agent</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="agent_name"
                stroke="#71717a"
                tick={{ fill: '#71717a', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="total_tokens" fill="#3b82f6" name="Total Tokens" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost vs Tasks Scatter */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cost vs Tasks Completed</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                type="number"
                dataKey="x"
                name="Tasks"
                stroke="#71717a"
                tick={{ fill: '#71717a' }}
                label={{ value: 'Tasks Completed', position: 'insideBottom', offset: -5, fill: '#71717a' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Cost"
                stroke="#71717a"
                tick={{ fill: '#71717a' }}
                label={{ value: 'Total Cost (USD)', angle: -90, position: 'insideLeft', fill: '#71717a' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value: any) => {
                  if (typeof value === 'number') {
                    return [`$${value.toFixed(4)}`];
                  }
                  return [value];
                }}
              />
              <Scatter data={scatterData} fill="#f59e0b">
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Efficiency Scores */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Efficiency Score</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" stroke="#71717a" tick={{ fill: '#71717a' }} domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="agent_name"
                stroke="#71717a"
                tick={{ fill: '#71717a', fontSize: 12 }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="efficiency_score" name="Efficiency Score">
                {sortedData.map((entry, index) => {
                  const color = entry.efficiency_score > 75 ? '#10b981' :
                               entry.efficiency_score > 50 ? '#f59e0b' : '#ef4444';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Multi-dimensional Radar Chart */}
      {radarData.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top 5 Agents - Performance Comparison</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis dataKey="metric" stroke="#71717a" tick={{ fill: '#71717a' }} />
              <PolarRadiusAxis stroke="#71717a" tick={{ fill: '#71717a' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
              />
              <Legend wrapperStyle={{ color: '#a1a1aa' }} />
              {performanceData
                .sort((a, b) => b.tasks_completed - a.tasks_completed)
                .slice(0, 5)
                .map((agent, index) => (
                  <Radar
                    key={agent.agent_name}
                    name={agent.agent_name}
                    dataKey={agent.agent_name}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Performance Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Detailed Performance Metrics</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
                <th className="pb-3 font-medium">Agent</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Tasks</th>
                <th className="pb-3 font-medium text-right">Total Cost</th>
                <th className="pb-3 font-medium text-right">Cost/Task</th>
                <th className="pb-3 font-medium text-right">Tokens</th>
                <th className="pb-3 font-medium text-right">Tokens/Task</th>
                <th className="pb-3 font-medium text-right">Sessions</th>
                <th className="pb-3 font-medium text-right">Efficiency</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedData.map((agent, idx) => (
                <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 text-white font-medium">{agent.agent_name}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      agent.status === 'running' ? 'bg-green-500/10 text-green-400' :
                      agent.status === 'idle' ? 'bg-zinc-700 text-zinc-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-white">
                    {agent.tasks_completed}
                    {agent.tasks_in_progress > 0 && (
                      <span className="text-xs text-zinc-500 ml-1">
                        (+{agent.tasks_in_progress})
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right text-amber-400 font-medium">
                    ${agent.total_cost.toFixed(4)}
                  </td>
                  <td className="py-3 text-right text-zinc-400">
                    ${agent.cost_per_task.toFixed(4)}
                  </td>
                  <td className="py-3 text-right text-blue-400">
                    {(agent.total_tokens / 1000).toFixed(1)}K
                  </td>
                  <td className="py-3 text-right text-zinc-400">
                    {agent.tokens_per_task.toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-zinc-400">
                    {agent.sessions}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className={`h-2 w-16 rounded-full bg-zinc-800 overflow-hidden`}>
                        <div
                          className={`h-full transition-all ${
                            agent.efficiency_score > 75 ? 'bg-green-500' :
                            agent.efficiency_score > 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${agent.efficiency_score}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 w-8">
                        {agent.efficiency_score.toFixed(0)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Breakdown by Type */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Token Usage Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
                <th className="pb-3 font-medium">Agent</th>
                <th className="pb-3 font-medium text-right">Input Tokens</th>
                <th className="pb-3 font-medium text-right">Output Tokens</th>
                <th className="pb-3 font-medium text-right">Cache Read</th>
                <th className="pb-3 font-medium text-right">Total</th>
                <th className="pb-3 font-medium text-right">Cache Efficiency</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedData.map((agent, idx) => {
                const cacheEfficiency = agent.total_tokens > 0
                  ? (agent.cache_tokens / agent.total_tokens) * 100
                  : 0;

                return (
                  <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3 text-white font-medium">{agent.agent_name}</td>
                    <td className="py-3 text-right text-blue-400">
                      {agent.input_tokens.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-green-400">
                      {agent.output_tokens.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-purple-400">
                      {agent.cache_tokens.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-white font-medium">
                      {agent.total_tokens.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`${
                        cacheEfficiency > 30 ? 'text-green-400' :
                        cacheEfficiency > 10 ? 'text-amber-400' : 'text-zinc-400'
                      }`}>
                        {cacheEfficiency.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
