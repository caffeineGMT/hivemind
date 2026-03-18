import { useQuery } from '@tanstack/react-query';
import { api, CrossProjectAnalytics as CrossProjectAnalyticsData } from '../api';
import {
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Activity,
  Zap,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  formatter = (v) => v.toLocaleString(),
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  formatter?: (v: any) => string;
}) {
  const displayValue = typeof value === 'number' ? formatter(value) : value;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{displayValue}</p>
    </div>
  );
}

export default function CrossProjectAnalytics() {
  const { data, isLoading, error } = useQuery<CrossProjectAnalyticsData>({
    queryKey: ['cross-project-analytics'],
    queryFn: api.getCrossProjectAnalytics,
    refetchInterval: 30000,
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
        Failed to load cross-project analytics
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-zinc-400">
        No analytics data available
      </div>
    );
  }

  const { totals, costSummary, taskMetrics, agentMetrics, costTrend, agentPerformance } = data;

  const taskCompletionRate =
    totals.total_tasks > 0 ? ((totals.done_tasks / totals.total_tasks) * 100).toFixed(1) : '0';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Cross-Project Analytics</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Aggregated metrics across all {totals.total_companies} managed companies
        </p>
      </div>

      {/* Overall Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Companies"
          value={totals.total_companies}
          icon={Building2}
          color="text-blue-400"
        />
        <MetricCard
          label="Total Cost"
          value={totals.total_cost_usd}
          icon={DollarSign}
          color="text-emerald-400"
          formatter={formatCurrency}
        />
        <MetricCard
          label="Total Tasks"
          value={totals.total_tasks}
          icon={CheckCircle}
          color="text-purple-400"
        />
        <MetricCard
          label="Total Agents"
          value={totals.total_agents}
          icon={Users}
          color="text-amber-400"
        />
        <MetricCard
          label="Tasks Completed"
          value={totals.done_tasks}
          icon={CheckCircle}
          color="text-green-400"
        />
        <MetricCard
          label="In Progress"
          value={totals.in_progress_tasks}
          icon={Clock}
          color="text-yellow-400"
        />
        <MetricCard
          label="Completion Rate"
          value={`${taskCompletionRate}%`}
          icon={TrendingUp}
          color="text-cyan-400"
        />
        <MetricCard
          label="Running Agents"
          value={totals.running_agents}
          icon={Activity}
          color="text-orange-400"
        />
      </div>

      {/* Cost Trend Chart */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Cost Trend (Last 7 Days)</h3>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={costTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
              labelStyle={{ color: '#a1a1aa' }}
              itemStyle={{ color: '#10b981' }}
              formatter={(value) => formatCurrency(Number(value) || 0)}
            />
            <Line type="monotone" dataKey="total_cost_usd" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cost by Project */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Cost by Project</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={costSummary.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="company_name" stroke="#71717a" fontSize={11} angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
              labelStyle={{ color: '#a1a1aa' }}
              formatter={(value) => formatCurrency(Number(value) || 0)}
            />
            <Bar dataKey="total_cost_usd" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tasks by Project */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Task Metrics by Project</h3>
        </div>
        <div className="space-y-3">
          {taskMetrics.slice(0, 10).map((project) => {
            const completionPct =
              project.total_tasks > 0 ? (project.done_tasks / project.total_tasks) * 100 : 0;

            return (
              <div key={project.company_id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300">{project.company_name}</span>
                  <div className="flex items-center gap-3 text-zinc-500">
                    <span>{project.done_tasks} / {project.total_tasks} done</span>
                    <span className="font-semibold text-purple-400">{completionPct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800/60">
                  <div
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
        <div className="border-b border-zinc-800/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-zinc-300">Top Agent Performance</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/40 text-xs text-zinc-500">
                <th className="px-4 py-2 text-left font-medium">Agent</th>
                <th className="px-4 py-2 text-left font-medium">Company</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-right font-medium">Tasks Done</th>
                <th className="px-4 py-2 text-right font-medium">Cost</th>
                <th className="px-4 py-2 text-right font-medium">Tokens</th>
                <th className="px-4 py-2 text-right font-medium">Incidents</th>
                <th className="px-4 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {agentPerformance.slice(0, 20).map((agent) => (
                <tr key={`${agent.company_id}-${agent.agent_name}`} className="text-xs">
                  <td className="px-4 py-2.5 font-medium text-zinc-300">{agent.agent_name}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{agent.company_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400">{agent.tasks_completed}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-emerald-400">
                    {formatCurrency(agent.total_cost || 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400">{formatNumber(agent.total_tokens || 0)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {agent.incidents > 0 ? (
                      <span className="text-red-400">{agent.incidents}</span>
                    ) : (
                      <span className="text-zinc-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {agent.status === 'running' ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                    ) : agent.status === 'idle' ? (
                      <span className="inline-flex h-2 w-2 rounded-full bg-zinc-500" />
                    ) : (
                      <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Health by Project */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Agent Health by Project</h3>
        </div>
        <div className="space-y-3">
          {agentMetrics.map((project) => {
            const healthPct =
              project.total_agents > 0 ? (project.running_agents / project.total_agents) * 100 : 0;

            return (
              <div key={project.company_id} className="rounded-lg border border-zinc-800/40 bg-zinc-900/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300">{project.company_name}</span>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>
                      <span className="text-green-400">{project.running_agents}</span> / {project.total_agents} running
                    </span>
                    <span className="text-red-400">{project.total_crashes} crashes</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/60">
                  <div
                    className={`h-full transition-all duration-500 ${
                      healthPct > 75 ? 'bg-green-500' : healthPct > 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
