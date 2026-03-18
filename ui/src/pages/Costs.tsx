import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
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
import { Download, DollarSign, TrendingUp, Zap } from 'lucide-react';

interface CostsProps {
  companyId: string;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Costs({ companyId }: CostsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['costs', companyId],
    queryFn: () => api.getCosts(companyId),
  });

  // Transform data for cost over time line chart
  const costOverTime = useMemo(() => {
    if (!data?.recent) return [];
    const grouped = data.recent.reduce((acc, entry) => {
      const date = entry.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + entry.cost_usd;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped)
      .map(([date, cost]) => ({ date, cost: parseFloat(cost.toFixed(4)) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // Cost by agent pie chart data
  const costByAgent = useMemo(() => {
    if (!data?.summary) return [];
    return data.summary
      .map((s) => ({ name: s.agent_name, value: parseFloat(s.total_cost_usd.toFixed(4)) }))
      .sort((a, b) => b.value - a.value);
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

  // Projected monthly burn
  const projectedBurn = useMemo(() => {
    if (!data?.totals) return 0;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysSoFar = now.getDate();
    if (daysSoFar === 0) return 0;
    const dailyAvg = data.totals.total_cost_usd / daysSoFar;
    return parseFloat((dailyAvg * daysInMonth).toFixed(2));
  }, [data]);

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
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
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

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <DollarSign size={16} />
            Avg Cost/Session
          </div>
          <div className="text-2xl font-bold text-white">
            ${data.totals.total_sessions > 0 ? (data.totals.total_cost_usd / data.totals.total_sessions).toFixed(4) : '0.0000'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Per agent session
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Over Time */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cost Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costOverTime}>
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
                dot={{ fill: '#f59e0b' }}
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
    </div>
  );
}
