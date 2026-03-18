import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { api } from '../api';
import { Download, DollarSign, TrendingUp, Zap, AlertTriangle, Settings, X, Calendar } from 'lucide-react';

interface CostsProps {
  companyId: string;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

type TimePeriod = '7d' | '30d' | '90d' | 'all';

export default function Costs({ companyId }: CostsProps) {
  const queryClient = useQueryClient();
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');

  const { data, isLoading, error } = useQuery({
    queryKey: ['costs', companyId],
    queryFn: () => api.getCosts(companyId),
  });

  // Budget mutation
  const budgetMutation = useMutation({
    mutationFn: ({ budget, threshold }: { budget: number; threshold: number }) =>
      api.setCostBudget(companyId, budget, threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costs', companyId] });
      setShowBudgetModal(false);
    },
  });

  // Filter data by time period
  const filteredRecentCosts = useMemo(() => {
    if (!data?.recent) return [];
    const now = new Date();
    let cutoffDate = new Date();

    switch (timePeriod) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        cutoffDate = new Date(0);
        break;
    }

    return data.recent.filter(entry => new Date(entry.created_at) >= cutoffDate);
  }, [data?.recent, timePeriod]);

  // Transform data for cost over time line chart
  const costOverTime = useMemo(() => {
    if (!filteredRecentCosts.length) return [];
    const grouped = filteredRecentCosts.reduce((acc, entry) => {
      const date = entry.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + entry.cost_usd;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped)
      .map(([date, cost]) => ({ date, cost: parseFloat(cost.toFixed(4)) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecentCosts]);

  // Cost by agent pie chart data
  const costByAgent = useMemo(() => {
    if (!data?.summary) return [];
    return data.summary
      .map((s) => ({ name: s.agent_name, value: parseFloat(s.total_cost_usd.toFixed(4)) }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Cost by task data
  const costByTask = useMemo(() => {
    if (!data?.taskCosts) return [];
    return data.taskCosts
      .slice(0, 10)
      .map((t) => ({
        task: t.task_id.slice(0, 8),
        cost: parseFloat(t.total_cost_usd.toFixed(4)),
        sessions: t.sessions,
      }));
  }, [data]);

  // Token usage breakdown (stacked area chart)
  const tokenData = useMemo(() => {
    if (!data?.summary) return [];
    return data.summary.map((s) => ({
      agent: s.agent_name,
      input: s.total_input_tokens,
      output: s.total_output_tokens,
      cache: s.total_cache_read_tokens,
    }));
  }, [data]);

  // Model usage breakdown
  const modelData = useMemo(() => {
    if (!filteredRecentCosts.length) return [];
    const modelCosts = filteredRecentCosts.reduce((acc, entry) => {
      const model = entry.model || 'Unknown';
      if (!acc[model]) {
        acc[model] = { model, cost: 0, sessions: 0, tokens: 0 };
      }
      acc[model].cost += entry.cost_usd;
      acc[model].sessions += 1;
      acc[model].tokens += entry.total_tokens;
      return acc;
    }, {} as Record<string, { model: string; cost: number; sessions: number; tokens: number }>);

    return Object.values(modelCosts)
      .sort((a, b) => b.cost - a.cost)
      .map(m => ({ ...m, cost: parseFloat(m.cost.toFixed(4)) }));
  }, [filteredRecentCosts]);

  // Efficiency metrics
  const efficiencyMetrics = useMemo(() => {
    if (!data?.totals || !data.summary) return null;
    const totalTasks = data.taskCosts?.length || 0;
    const avgCostPerTask = totalTasks > 0 ? data.totals.total_cost_usd / totalTasks : 0;
    const avgCostPer1KTokens = data.totals.total_tokens > 0
      ? (data.totals.total_cost_usd / data.totals.total_tokens) * 1000
      : 0;
    const avgTokensPerSession = data.totals.total_sessions > 0
      ? data.totals.total_tokens / data.totals.total_sessions
      : 0;
    const avgDurationPerSession = data.totals.total_sessions > 0
      ? data.totals.total_duration_ms / data.totals.total_sessions / 1000
      : 0;

    return {
      avgCostPerTask: parseFloat(avgCostPerTask.toFixed(4)),
      avgCostPer1KTokens: parseFloat(avgCostPer1KTokens.toFixed(4)),
      avgTokensPerSession: Math.round(avgTokensPerSession),
      avgDurationPerSession: parseFloat(avgDurationPerSession.toFixed(2)),
    };
  }, [data]);

  // Hourly usage pattern
  const hourlyPattern = useMemo(() => {
    if (!filteredRecentCosts.length) return [];
    const hourly = filteredRecentCosts.reduce((acc, entry) => {
      const hour = new Date(entry.created_at).getHours();
      if (!acc[hour]) acc[hour] = { hour, cost: 0, sessions: 0 };
      acc[hour].cost += entry.cost_usd;
      acc[hour].sessions += 1;
      return acc;
    }, {} as Record<number, { hour: number; cost: number; sessions: number }>);

    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      cost: parseFloat((hourly[i]?.cost || 0).toFixed(4)),
      sessions: hourly[i]?.sessions || 0,
    }));
  }, [filteredRecentCosts]);

  // Projected monthly burn
  const projectedBurn = useMemo(() => {
    if (!data?.totals) return 0;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysSoFar = now.getDate();
    if (daysSoFar === 0) return 0;
    const dailyAvg = (data.monthlySpend || 0) / daysSoFar;
    return parseFloat((dailyAvg * daysInMonth).toFixed(2));
  }, [data]);

  // Budget alert check
  const budgetAlert = useMemo(() => {
    if (!data?.budget || !data.monthlySpend) return null;
    const percentUsed = (data.monthlySpend / data.budget.monthly_budget) * 100;
    const threshold = data.budget.alert_threshold * 100;

    if (percentUsed >= 100) {
      return { level: 'critical', message: 'Budget exceeded!', percent: percentUsed };
    } else if (percentUsed >= threshold) {
      return { level: 'warning', message: 'Approaching budget limit', percent: percentUsed };
    }
    return null;
  }, [data]);

  // Trend analysis - simple linear regression for forecasting
  const forecastData = useMemo(() => {
    if (costOverTime.length < 3) return [];

    // Calculate daily trend
    const costs = costOverTime.map((d, i) => ({ x: i, y: d.cost }));
    const n = costs.length;
    const sumX = costs.reduce((sum, p) => sum + p.x, 0);
    const sumY = costs.reduce((sum, p) => sum + p.y, 0);
    const sumXY = costs.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = costs.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Forecast next 7 days
    const forecast = [];
    const lastDate = new Date(costOverTime[costOverTime.length - 1].date);
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i);
      const forecastCost = Math.max(0, slope * (n + i - 1) + intercept);
      forecast.push({
        date: nextDate.toISOString().split('T')[0],
        cost: parseFloat(forecastCost.toFixed(4)),
        forecast: true,
      });
    }

    return [...costOverTime.map(d => ({ ...d, forecast: false })), ...forecast];
  }, [costOverTime]);

  // CSV export handler
  const exportCSV = () => {
    if (!data?.recent) return;
    const headers = ['Date', 'Agent', 'Task ID', 'Input Tokens', 'Output Tokens', 'Cache Read', 'Cache Write', 'Cost USD', 'Duration (ms)', 'Model'];
    const rows = data.recent.map((r) => [
      r.created_at,
      r.agent_name,
      r.task_id || 'N/A',
      r.input_tokens,
      r.output_tokens,
      r.cache_read_tokens,
      r.cache_write_tokens,
      r.cost_usd,
      r.duration_ms,
      r.model || 'N/A',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `costs-${companyId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSetBudget = () => {
    const budget = parseFloat(monthlyBudget);
    const threshold = parseFloat(alertThreshold) / 100;
    if (budget > 0 && threshold > 0 && threshold <= 1) {
      budgetMutation.mutate({ budget, threshold });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-6 py-4 text-red-400">
        Failed to load cost data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cost Analytics</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Agent API usage and cost breakdown
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBudgetModal(true)}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            <Settings size={16} />
            Budget
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Budget Alert */}
      {budgetAlert && (
        <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
          budgetAlert.level === 'critical'
            ? 'border-red-900/50 bg-red-950/20 text-red-400'
            : 'border-amber-900/50 bg-amber-950/20 text-amber-400'
        }`}>
          <AlertTriangle size={20} />
          <div className="flex-1">
            <div className="font-medium">{budgetAlert.message}</div>
            <div className="text-sm opacity-80">
              ${data.monthlySpend.toFixed(2)} / ${data.budget?.monthly_budget.toFixed(2)} ({budgetAlert.percent.toFixed(1)}%)
            </div>
          </div>
        </div>
      )}

      {/* Time Period Selector */}
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-zinc-400" />
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timePeriod === period
                  ? 'bg-amber-500 text-black font-medium'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : period === '90d' ? 'Last 90 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <DollarSign size={16} />
            Total Spend
          </div>
          <div className="text-2xl font-bold text-white">
            ${data.totals.total_cost_usd.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {data.totals.total_sessions} sessions
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <TrendingUp size={16} />
            This Month
          </div>
          <div className="text-2xl font-bold text-white">
            ${data.monthlySpend.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {data.budget ? `${((data.monthlySpend / data.budget.monthly_budget) * 100).toFixed(1)}% of budget` : 'No budget set'}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <TrendingUp size={16} />
            Projected Monthly
          </div>
          <div className="text-2xl font-bold text-white">
            ${projectedBurn.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Based on current usage
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <Zap size={16} />
            Total Tokens
          </div>
          <div className="text-2xl font-bold text-white">
            {(data.totals.total_tokens / 1_000_000).toFixed(2)}M
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {data.totals.total_turns} turns
          </div>
        </div>
      </div>

      {/* Efficiency Metrics */}
      {efficiencyMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-xs text-zinc-500 mb-1">Avg Cost per Task</div>
            <div className="text-lg font-semibold text-amber-400">
              ${efficiencyMetrics.avgCostPerTask.toFixed(4)}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-xs text-zinc-500 mb-1">Cost per 1K Tokens</div>
            <div className="text-lg font-semibold text-amber-400">
              ${efficiencyMetrics.avgCostPer1KTokens.toFixed(4)}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-xs text-zinc-500 mb-1">Avg Tokens/Session</div>
            <div className="text-lg font-semibold text-blue-400">
              {efficiencyMetrics.avgTokensPerSession.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-xs text-zinc-500 mb-1">Avg Duration/Session</div>
            <div className="text-lg font-semibold text-blue-400">
              {efficiencyMetrics.avgDurationPerSession.toFixed(2)}s
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Over Time with Forecast */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cost Trend & 7-Day Forecast</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                tick={{ fill: '#71717a' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
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
              <Legend wrapperStyle={{ color: '#a1a1aa' }} />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Cost (USD)"
                dot={{ fill: '#f59e0b', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Agent */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cost by Agent</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.summary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="agent_name"
                stroke="#71717a"
                tick={{ fill: '#71717a' }}
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
              <Bar dataKey="total_cost_usd" fill="#f59e0b" name="Cost (USD)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Distribution Pie Chart */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cost Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={costByAgent}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  (percent ?? 0) > 0.05 ? `${name}: ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {costByAgent.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Task */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Tasks by Cost</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByTask} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" stroke="#71717a" tick={{ fill: '#71717a' }} />
              <YAxis
                type="category"
                dataKey="task"
                stroke="#71717a"
                tick={{ fill: '#71717a' }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="cost" fill="#10b981" name="Cost (USD)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Token Usage Breakdown */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Token Usage Breakdown</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={tokenData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="agent"
              stroke="#71717a"
              tick={{ fill: '#71717a' }}
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
            <Legend wrapperStyle={{ color: '#a1a1aa' }} />
            <Area
              type="monotone"
              dataKey="input"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              name="Input Tokens"
            />
            <Area
              type="monotone"
              dataKey="output"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              name="Output Tokens"
            />
            <Area
              type="monotone"
              dataKey="cache"
              stackId="1"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              name="Cache Read"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Costs Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent API Calls</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Agent</th>
                <th className="pb-3 font-medium">Task</th>
                <th className="pb-3 font-medium">Input</th>
                <th className="pb-3 font-medium">Output</th>
                <th className="pb-3 font-medium">Cache</th>
                <th className="pb-3 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data.recent.slice(0, 20).map((entry, idx) => (
                <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 text-zinc-400">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 text-white">{entry.agent_name}</td>
                  <td className="py-3 text-zinc-400 font-mono text-xs">
                    {entry.task_id ? entry.task_id.slice(0, 8) : '—'}
                  </td>
                  <td className="py-3 text-zinc-400">
                    {entry.input_tokens.toLocaleString()}
                  </td>
                  <td className="py-3 text-zinc-400">
                    {entry.output_tokens.toLocaleString()}
                  </td>
                  <td className="py-3 text-zinc-400">
                    {entry.cache_read_tokens.toLocaleString()}
                  </td>
                  <td className="py-3 text-amber-400 font-medium">
                    ${entry.cost_usd.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Set Monthly Budget</h2>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Monthly Budget (USD)
                </label>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder={data.budget?.monthly_budget.toString() || '100.00'}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  placeholder="80"
                  min="1"
                  max="100"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Alert when spending reaches this percentage of budget
                </p>
              </div>

              {data.budget && (
                <div className="bg-zinc-800 rounded-lg p-3 text-sm">
                  <div className="text-zinc-400">Current Budget</div>
                  <div className="text-white font-medium">${data.budget.monthly_budget.toFixed(2)}/month</div>
                  <div className="text-zinc-400 text-xs mt-1">
                    Alert at {(data.budget.alert_threshold * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetBudget}
                  disabled={budgetMutation.isPending}
                  className="flex-1 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  {budgetMutation.isPending ? 'Saving...' : 'Set Budget'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
