import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, Clock, AlertTriangle, DollarSign } from 'lucide-react';

interface TrendsData {
  days: number;
  agentSuccessFailure: Array<{
    date: string;
    successes: number;
    failures: number;
    total: number;
  }>;
  costTrends: Array<{
    date: string;
    total_cost: number;
    total_tokens: number;
    sessions: number;
    input_tokens: number;
    output_tokens: number;
  }>;
  taskCompletionTimes: Array<{
    id: string;
    title: string;
    hoursToComplete: number;
    priority: string;
    completedDate: string;
  }>;
  completionDistribution: Array<{
    label: string;
    count: number;
  }>;
  errorHeatmap: Array<{
    day_of_week: number;
    hour: number;
    count: number;
  }>;
  taskStatusOverTime: Array<{
    date: string;
    done: number;
    in_progress: number;
    pending: number;
    blocked: number;
    total: number;
  }>;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ErrorHeatmap({ data }: { data: TrendsData['errorHeatmap'] }) {
  const maxCount = Math.max(1, ...data.map(d => d.count));

  // Build a 7x24 grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const { day_of_week, hour, count } of data) {
    if (day_of_week >= 0 && day_of_week < 7 && hour >= 0 && hour < 24) {
      grid[day_of_week][hour] = count;
    }
  }

  const totalErrors = data.reduce((sum, d) => sum + d.count, 0);

  function getColor(count: number): string {
    if (count === 0) return 'bg-zinc-800/40';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-amber-900/40';
    if (intensity < 0.5) return 'bg-amber-700/60';
    if (intensity < 0.75) return 'bg-red-700/60';
    return 'bg-red-500/80';
  }

  const hours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div>
      {totalErrors === 0 ? (
        <div className="flex h-48 items-center justify-center text-zinc-500">
          No errors recorded in this period
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Hour labels */}
            <div className="mb-1 flex pl-10">
              {hours.map(h => (
                <div
                  key={h}
                  className="text-[10px] text-zinc-500"
                  style={{ width: `${(3 / 24) * 100}%` }}
                >
                  {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                </div>
              ))}
            </div>
            {/* Grid rows */}
            {DAY_NAMES.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1 mb-[2px]">
                <span className="w-8 text-right text-[10px] text-zinc-500 mr-1">{day}</span>
                <div className="flex flex-1 gap-[2px]">
                  {grid[dayIdx].map((count, hourIdx) => (
                    <div
                      key={hourIdx}
                      className={`flex-1 h-4 rounded-[2px] ${getColor(count)} transition-colors`}
                      title={`${day} ${hourIdx}:00 - ${count} error${count !== 1 ? 's' : ''}`}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Legend */}
            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-zinc-500">
              <span>Less</span>
              <div className="flex gap-[2px]">
                <div className="h-3 w-3 rounded-[2px] bg-zinc-800/40" />
                <div className="h-3 w-3 rounded-[2px] bg-amber-900/40" />
                <div className="h-3 w-3 rounded-[2px] bg-amber-700/60" />
                <div className="h-3 w-3 rounded-[2px] bg-red-700/60" />
                <div className="h-3 w-3 rounded-[2px] bg-red-500/80" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};

const DIST_COLORS = ['#10b981', '#34d399', '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function Trends({ companyId }: { companyId: string }) {
  const [days, setDays] = useState(7);

  const { data, isLoading, error } = useQuery<TrendsData>({
    queryKey: ['trends', companyId, days],
    queryFn: () => api.getTrends(companyId, days),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-red-400">
        Failed to load trends data
      </div>
    );
  }

  if (!data) return null;

  const hasActivityData = data.agentSuccessFailure.length > 0;
  const hasCostData = data.costTrends.length > 0;
  const hasCompletionData = data.completionDistribution.some(d => d.count > 0);
  const hasErrorData = data.errorHeatmap.length > 0;

  // Compute summary stats
  const totalSuccesses = data.agentSuccessFailure.reduce((s, d) => s + d.successes, 0);
  const totalFailures = data.agentSuccessFailure.reduce((s, d) => s + d.failures, 0);
  const successRate = totalSuccesses + totalFailures > 0
    ? ((totalSuccesses / (totalSuccesses + totalFailures)) * 100).toFixed(1)
    : '0';
  const totalCost = data.costTrends.reduce((s, d) => s + d.total_cost, 0);
  const totalTasks = data.taskCompletionTimes.length;
  const avgCompletionHours = totalTasks > 0
    ? (data.taskCompletionTimes.reduce((s, t) => s + t.hoursToComplete, 0) / totalTasks).toFixed(1)
    : '0';
  const totalErrors = data.errorHeatmap.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Historical Trends</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {days}-day analysis of agent performance, costs, and errors
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <TrendingUp className="h-4 w-4" />
            Success Rate
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-400">{successRate}%</div>
          <div className="mt-1 text-xs text-zinc-600">
            {totalSuccesses} ok / {totalFailures} failed
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <DollarSign className="h-4 w-4" />
            Total Cost
          </div>
          <div className="mt-2 text-2xl font-semibold text-blue-400">${totalCost.toFixed(2)}</div>
          <div className="mt-1 text-xs text-zinc-600">
            {data.costTrends.reduce((s, d) => s + d.sessions, 0)} sessions
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Clock className="h-4 w-4" />
            Avg Completion
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-400">{avgCompletionHours}h</div>
          <div className="mt-1 text-xs text-zinc-600">
            {totalTasks} tasks completed
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <AlertTriangle className="h-4 w-4" />
            Total Errors
          </div>
          <div className="mt-2 text-2xl font-semibold text-red-400">{totalErrors}</div>
          <div className="mt-1 text-xs text-zinc-600">
            across {days} days
          </div>
        </div>
      </div>

      {/* Chart 1: Agent Success/Failure Rate */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-lg font-medium text-zinc-200">Agent Success / Failure Rate</h2>
        {hasActivityData ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.agentSuccessFailure}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  color: '#e4e4e7',
                }}
                labelFormatter={formatDate}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="successes"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
                name="Successes"
              />
              <Area
                type="monotone"
                dataKey="failures"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.3}
                name="Failures"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-48 items-center justify-center text-zinc-500">
            No activity data for this period
          </div>
        )}
      </div>

      {/* Chart 2: Cost Trends */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-lg font-medium text-zinc-200">Cost Trends</h2>
        {hasCostData ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.costTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <YAxis
                yAxisId="cost"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              />
              <YAxis
                yAxisId="sessions"
                orientation="right"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  color: '#e4e4e7',
                }}
                labelFormatter={formatDate}
                formatter={(value: number, name: string) => {
                  if (name === 'Cost') return [`$${value.toFixed(4)}`, name];
                  if (name === 'Tokens') return [value.toLocaleString(), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="total_cost"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Cost"
              />
              <Line
                yAxisId="sessions"
                type="monotone"
                dataKey="sessions"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-48 items-center justify-center text-zinc-500">
            No cost data for this period
          </div>
        )}
      </div>

      {/* Chart 3: Task Completion Time Distribution */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-lg font-medium text-zinc-200">Task Completion Time Distribution</h2>
        {hasCompletionData ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.completionDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="label"
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  color: '#e4e4e7',
                }}
                formatter={(value: number) => [`${value} tasks`, 'Count']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tasks">
                {data.completionDistribution.map((_, index) => (
                  <Cell key={index} fill={DIST_COLORS[index % DIST_COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-48 items-center justify-center text-zinc-500">
            No completed tasks in this period
          </div>
        )}

        {/* Individual task list */}
        {data.taskCompletionTimes.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="pb-2 font-medium">Task</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 text-right font-medium">Time</th>
                  <th className="pb-2 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.taskCompletionTimes.slice(0, 10).map(task => (
                  <tr key={task.id} className="border-b border-zinc-800/50">
                    <td className="py-1.5 text-zinc-300 truncate max-w-[200px]" title={task.title}>
                      {task.title}
                    </td>
                    <td className="py-1.5">
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-xs font-medium"
                        style={{
                          color: PRIORITY_COLORS[task.priority] || '#71717a',
                          backgroundColor: `${PRIORITY_COLORS[task.priority] || '#71717a'}20`,
                        }}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-zinc-400">
                      {task.hoursToComplete < 1
                        ? `${Math.round(task.hoursToComplete * 60)}m`
                        : task.hoursToComplete < 24
                          ? `${task.hoursToComplete}h`
                          : `${(task.hoursToComplete / 24).toFixed(1)}d`}
                    </td>
                    <td className="py-1.5 text-right text-zinc-500 text-xs">
                      {formatDate(task.completedDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chart 4: Error Frequency Heatmap */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-lg font-medium text-zinc-200">Error Frequency Heatmap</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Error distribution by day of week and hour (UTC)
        </p>
        <ErrorHeatmap data={data.errorHeatmap} />
      </div>

      {/* Bonus: Task Status Over Time */}
      {data.taskStatusOverTime.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-lg font-medium text-zinc-200">Task Volume Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.taskStatusOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  color: '#e4e4e7',
                }}
                labelFormatter={formatDate}
              />
              <Legend />
              <Area type="monotone" dataKey="done" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Done" />
              <Area type="monotone" dataKey="in_progress" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="In Progress" />
              <Area type="monotone" dataKey="pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Pending" />
              <Area type="monotone" dataKey="blocked" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Blocked" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
