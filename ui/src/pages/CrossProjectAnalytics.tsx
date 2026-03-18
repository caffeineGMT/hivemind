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
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import FilterBar from '../components/FilterBar';
import Sparkline from '../components/Sparkline';
import { useState, useMemo } from 'react';

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

type SortField = 'agent_name' | 'company_name' | 'tasks_completed' | 'total_cost' | 'total_tokens' | 'incidents';
type SortDirection = 'asc' | 'desc';

function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
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
    <div className="rounded-xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/50 to-zinc-900/30 p-4">
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

  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('tasks_completed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  // Extract unique companies for filter
  const companies = useMemo(() => {
    const uniqueCompanies = new Map<string, { id: string; name: string }>();
    costSummary.forEach((c) => uniqueCompanies.set(c.company_id, { id: c.company_id, name: c.company_name }));
    return Array.from(uniqueCompanies.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [costSummary]);

  // Initialize selected companies to all companies on first render
  useMemo(() => {
    if (selectedCompanyIds.length === 0 && companies.length > 0) {
      setSelectedCompanyIds(companies.map((c) => c.id));
    }
  }, [companies, selectedCompanyIds.length]);

  // Filter data based on selected companies
  const filteredCostSummary = useMemo(() => {
    if (selectedCompanyIds.length === 0) return costSummary;
    return costSummary.filter((c) => selectedCompanyIds.includes(c.company_id));
  }, [costSummary, selectedCompanyIds]);

  const filteredTaskMetrics = useMemo(() => {
    if (selectedCompanyIds.length === 0) return taskMetrics;
    return taskMetrics.filter((c) => selectedCompanyIds.includes(c.company_id));
  }, [taskMetrics, selectedCompanyIds]);

  const filteredAgentMetrics = useMemo(() => {
    if (selectedCompanyIds.length === 0) return agentMetrics;
    return agentMetrics.filter((c) => selectedCompanyIds.includes(c.company_id));
  }, [agentMetrics, selectedCompanyIds]);

  const filteredAgentPerformance = useMemo(() => {
    if (selectedCompanyIds.length === 0) return agentPerformance;
    return agentPerformance.filter((a) => selectedCompanyIds.includes(a.company_id));
  }, [agentPerformance, selectedCompanyIds]);

  // Recalculate totals for filtered data
  const filteredTotals = useMemo(() => {
    return {
      total_companies: selectedCompanyIds.length,
      total_cost_usd: filteredCostSummary.reduce((sum, c) => sum + c.total_cost_usd, 0),
      total_tasks: filteredTaskMetrics.reduce((sum, c) => sum + c.total_tasks, 0),
      done_tasks: filteredTaskMetrics.reduce((sum, c) => sum + c.done_tasks, 0),
      in_progress_tasks: filteredTaskMetrics.reduce((sum, c) => sum + c.in_progress_tasks, 0),
      total_agents: filteredAgentMetrics.reduce((sum, c) => sum + c.total_agents, 0),
      running_agents: filteredAgentMetrics.reduce((sum, c) => sum + c.running_agents, 0),
    };
  }, [filteredCostSummary, filteredTaskMetrics, filteredAgentMetrics, selectedCompanyIds]);

  // Sort agent performance table
  const sortedAgentPerformance = useMemo(() => {
    const sorted = [...filteredAgentPerformance];
    sorted.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return sorted;
  }, [filteredAgentPerformance, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    const exportData = sortedAgentPerformance.map((agent) => ({
      Agent: agent.agent_name,
      Company: agent.company_name,
      Role: agent.role,
      'Tasks Completed': agent.tasks_completed,
      'Total Cost (USD)': agent.total_cost?.toFixed(2) || '0.00',
      'Total Tokens': agent.total_tokens || 0,
      Incidents: agent.incidents,
      Status: agent.status,
    }));
    exportToCSV(exportData, `cross-project-analytics-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Generate mock 7-day trend data for sparklines (in a real app, this would come from the API)
  const generateSparklineData = (baseValue: number) => {
    const days = 7;
    const variance = 0.2;
    return Array.from({ length: days }, () => baseValue * (1 + (Math.random() - 0.5) * variance));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-zinc-600" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-blue-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-400" />
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header with Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Cross-Project Analytics</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Aggregated metrics across {filteredTotals.total_companies} of {totals.total_companies} companies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FilterBar
            items={companies}
            selectedIds={selectedCompanyIds}
            onSelectionChange={setSelectedCompanyIds}
            label="Filter Projects"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Overall Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Companies"
          value={filteredTotals.total_companies}
          icon={Building2}
          color="text-blue-400"
        />
        <MetricCard
          label="Total Cost"
          value={filteredTotals.total_cost_usd}
          icon={DollarSign}
          color="text-emerald-400"
          formatter={formatCurrency}
        />
        <MetricCard
          label="Total Tasks"
          value={filteredTotals.total_tasks}
          icon={CheckCircle}
          color="text-purple-400"
        />
        <MetricCard
          label="Total Agents"
          value={filteredTotals.total_agents}
          icon={Users}
          color="text-amber-400"
        />
        <MetricCard
          label="Tasks Completed"
          value={filteredTotals.done_tasks}
          icon={CheckCircle}
          color="text-green-400"
        />
        <MetricCard
          label="In Progress"
          value={filteredTotals.in_progress_tasks}
          icon={Clock}
          color="text-yellow-400"
        />
        <MetricCard
          label="Completion Rate"
          value={`${
            filteredTotals.total_tasks > 0
              ? ((filteredTotals.done_tasks / filteredTotals.total_tasks) * 100).toFixed(1)
              : '0'
          }%`}
          icon={TrendingUp}
          color="text-cyan-400"
        />
        <MetricCard
          label="Running Agents"
          value={filteredTotals.running_agents}
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
          <BarChart data={filteredCostSummary.slice(0, 10)}>
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
          {filteredTaskMetrics.slice(0, 10).map((project) => {
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
            <h3 className="text-sm font-semibold text-zinc-300">Agent Performance</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/40 text-xs text-zinc-500">
                <th
                  className="cursor-pointer px-4 py-2 text-left font-medium transition-colors hover:text-zinc-300"
                  onClick={() => handleSort('agent_name')}
                >
                  <div className="flex items-center gap-1.5">
                    Agent
                    <SortIcon field="agent_name" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-2 text-left font-medium transition-colors hover:text-zinc-300"
                  onClick={() => handleSort('company_name')}
                >
                  <div className="flex items-center gap-1.5">
                    Company
                    <SortIcon field="company_name" />
                  </div>
                </th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th
                  className="cursor-pointer px-4 py-2 text-right font-medium transition-colors hover:text-zinc-300"
                  onClick={() => handleSort('tasks_completed')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Tasks
                    <SortIcon field="tasks_completed" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-2 text-right font-medium transition-colors hover:text-zinc-300"
                  onClick={() => handleSort('total_cost')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Cost
                    <SortIcon field="total_cost" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-2 text-right font-medium transition-colors hover:text-zinc-300"
                  onClick={() => handleSort('total_tokens')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Tokens
                    <SortIcon field="total_tokens" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-2 text-right font-medium transition-colors hover:text-zinc-300"
                  onClick={() => handleSort('incidents')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Incidents
                    <SortIcon field="incidents" />
                  </div>
                </th>
                <th className="px-4 py-2 text-center font-medium">7d Trend</th>
                <th className="px-4 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {sortedAgentPerformance.slice(0, 20).map((agent) => (
                <tr key={`${agent.company_id}-${agent.agent_name}`} className="text-xs hover:bg-zinc-800/20">
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
                    <Sparkline
                      data={generateSparklineData(agent.tasks_completed)}
                      width={60}
                      height={24}
                      color="#10b981"
                    />
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
          {filteredAgentMetrics.map((project) => {
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
