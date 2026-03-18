import { useQuery } from '@tanstack/react-query';
import { api, AgentHealthMetric, Incident } from '../api';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'zinc';
}

function MetricCard({ title, value, subtitle, icon, trend, color = 'zinc' }: MetricCardProps) {
  const colorClasses = {
    green: 'border-emerald-900/30 bg-emerald-950/20',
    red: 'border-red-900/30 bg-red-950/20',
    yellow: 'border-amber-900/30 bg-amber-950/20',
    blue: 'border-blue-900/30 bg-blue-950/20',
    zinc: 'border-zinc-800/60 bg-zinc-900/50',
  };

  const iconColorClasses = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-amber-400',
    blue: 'text-blue-400',
    zinc: 'text-zinc-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-zinc-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        <div className={`rounded-lg bg-zinc-800/60 p-2 ${iconColorClasses[color]}`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
          <span className={trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500'}>
            {trend === 'up' ? 'Improving' : trend === 'down' ? 'Degrading' : 'Stable'}
          </span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    idle: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${colors[status as keyof typeof colors] || colors.idle}`}>
      {status === 'running' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />}
      {status}
    </span>
  );
}

function HealthStatusBadge({ status }: { status: string }) {
  const colors = {
    healthy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    degraded: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    stale: 'bg-red-500/20 text-red-400 border-red-500/30',
    idle: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    unknown: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  const icons = {
    healthy: <CheckCircle2 className="h-3 w-3" />,
    degraded: <AlertTriangle className="h-3 w-3" />,
    stale: <XCircle className="h-3 w-3" />,
    idle: <MinusCircle className="h-3 w-3" />,
    unknown: <MinusCircle className="h-3 w-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${colors[status as keyof typeof colors] || colors.unknown}`}>
      {icons[status as keyof typeof icons]}
      {status}
    </span>
  );
}

function formatUptime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return `${days}d ${hrs}h`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function AgentHealthRow({ agent }: { agent: AgentHealthMetric }) {
  // Determine health status based on multiple factors
  let healthStatus = 'unknown';
  if (agent.status === 'running') {
    if (agent.uptime_minutes < 1) healthStatus = 'healthy';
    else if (agent.uptime_minutes < 5) healthStatus = 'degraded';
    else healthStatus = 'stale';
  } else if (agent.status === 'idle') {
    healthStatus = 'idle';
  } else {
    healthStatus = 'stale';
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-4 transition hover:border-zinc-700/60">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/logs/${agent.agent_name}`}
              className="font-semibold text-zinc-200 hover:text-amber-400 transition"
            >
              {agent.agent_name}
            </Link>
            <span className="text-xs uppercase tracking-wider text-zinc-600">{agent.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={agent.status} />
            <HealthStatusBadge status={healthStatus} />
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-600">Uptime</p>
          <p className="mt-1 font-mono text-sm text-zinc-300">
            {agent.status === 'running' ? formatUptime(agent.uptime_minutes) : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-600">Error Rate</p>
          <p className={`mt-1 font-mono text-sm ${agent.error_rate > 1 ? 'text-red-400' : agent.error_rate > 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {agent.error_rate.toFixed(2)}/hr
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-600">Crashes</p>
          <p className={`mt-1 font-mono text-sm ${agent.crashes > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {agent.crashes}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-600">Restarts</p>
          <p className={`mt-1 font-mono text-sm ${agent.restarts > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
            {agent.restarts}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-600">PID</p>
          <p className="mt-1 font-mono text-xs text-zinc-500">{agent.pid ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const isRestart = incident.recovery_action && incident.recovery_action.includes('Auto-restart');

  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-3 text-sm">
      <div className={`mt-0.5 rounded-full p-1.5 ${incident.incident_type === 'agent_crash' ? 'bg-red-950/40' : 'bg-amber-950/40'}`}>
        {incident.incident_type === 'agent_crash' ? (
          <XCircle className="h-4 w-4 text-red-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-zinc-300">{incident.description}</p>
          <span className="shrink-0 text-xs text-zinc-600">{timeAgo(incident.created_at)}</span>
        </div>
        {incident.recovery_action && (
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            <RefreshCw className={`h-3 w-3 ${isRestart ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className={isRestart ? 'text-emerald-400' : 'text-amber-400'}>{incident.recovery_action}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentHealth({ companyId }: { companyId: string }) {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['agent-health', companyId],
    queryFn: () => api.getAgentHealth(companyId),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time monitoring
  });

  if (isLoading || !healthData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const { summary, agents, recent_incidents } = healthData;

  // Calculate health percentage
  const healthyAgents = agents.filter(a => a.status === 'running' && a.uptime_minutes < 5).length;
  const healthPercentage = summary.total_agents > 0 ? Math.round((healthyAgents / summary.total_agents) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Agent Health Monitor</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Real-time agent status, error tracking, and auto-restart history
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Agents"
          value={summary.total_agents}
          subtitle={`${summary.running_agents} running`}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="System Health"
          value={`${healthPercentage}%`}
          subtitle={`${healthyAgents} healthy agents`}
          icon={<Activity className="h-5 w-5" />}
          color={healthPercentage > 80 ? 'green' : healthPercentage > 50 ? 'yellow' : 'red'}
          trend={healthPercentage > 80 ? 'up' : healthPercentage < 50 ? 'down' : 'neutral'}
        />
        <MetricCard
          title="Total Crashes"
          value={summary.total_crashes}
          subtitle={`${summary.total_restarts} auto-restarts`}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={summary.total_crashes === 0 ? 'green' : summary.total_crashes < 5 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="Avg Error Rate"
          value={`${summary.avg_error_rate}/hr`}
          subtitle="Crashes per hour"
          icon={<Zap className="h-5 w-5" />}
          color={summary.avg_error_rate < 0.5 ? 'green' : summary.avg_error_rate < 1 ? 'yellow' : 'red'}
        />
      </div>

      {/* Agent status table */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Agent Status</h3>
        <div className="space-y-2">
          {agents.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
              No agents found
            </div>
          ) : (
            agents.map((agent) => <AgentHealthRow key={agent.agent_id} agent={agent} />)
          )}
        </div>
      </div>

      {/* Recent incidents */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Recent Incidents</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            Last 50 incidents
          </div>
        </div>
        <div className="space-y-2">
          {recent_incidents.length === 0 ? (
            <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm font-medium text-emerald-400">No incidents recorded</p>
              <p className="mt-1 text-xs text-emerald-600">All agents running smoothly</p>
            </div>
          ) : (
            recent_incidents.map((incident) => <IncidentRow key={incident.id} incident={incident} />)
          )}
        </div>
      </div>

      {/* Performance insights */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Performance Insights</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800/40 bg-zinc-800/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Auto-Restart Success Rate
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-100">
              {summary.total_crashes > 0
                ? Math.round((summary.total_restarts / summary.total_crashes) * 100)
                : 100}%
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.total_restarts} of {summary.total_crashes} crashes recovered
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800/40 bg-zinc-800/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Activity className="h-4 w-4 text-blue-400" />
              Active Agents
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-100">
              {summary.running_agents} / {summary.total_agents}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.total_agents > 0 ? Math.round((summary.running_agents / summary.total_agents) * 100) : 0}% utilization
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800/40 bg-zinc-800/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Error Status
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-100">{summary.error_agents}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {summary.idle_agents} idle agents
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
