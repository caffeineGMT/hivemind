import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  AgentHealthMetric,
  CircuitBreakerStatus,
  IncidentTimelineEntry,
} from '../api';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Power,
  Timer,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'zinc';
}

function MetricCard({ title, value, subtitle, icon, color = 'zinc' }: MetricCardProps) {
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
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
        colors[status as keyof typeof colors] || colors.idle
      }`}
    >
      {status === 'running' && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
      )}
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
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
        colors[status as keyof typeof colors] || colors.unknown
      }`}
    >
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

function CircuitBreakerPanel({ status }: { status: CircuitBreakerStatus | undefined }) {
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () => api.resetCircuitBreaker(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-breaker'] });
    },
  });

  if (!status) return null;

  const stateColors = {
    CLOSED: 'border-emerald-900/30 bg-emerald-950/20',
    OPEN: 'border-red-900/30 bg-red-950/20',
    HALF_OPEN: 'border-amber-900/30 bg-amber-950/20',
  };

  const stateIcons = {
    CLOSED: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
    OPEN: <ShieldAlert className="h-6 w-6 text-red-400" />,
    HALF_OPEN: <Shield className="h-6 w-6 text-amber-400" />,
  };

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset the circuit breaker? This will allow API calls to resume immediately.'
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      await resetMutation.mutateAsync();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={`rounded-xl border p-6 ${stateColors[status.state]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-zinc-800/60 p-3">{stateIcons[status.state]}</div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Circuit Breaker</h3>
            <p className="mt-1 text-sm text-zinc-500">
              API failure protection — currently {status.state}
            </p>
          </div>
        </div>
        {status.state !== 'CLOSED' && (
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800/40 bg-zinc-800/20 p-3">
          <div className="text-xs uppercase tracking-wider text-zinc-600">State</div>
          <div className="mt-1 text-lg font-bold text-zinc-100">{status.state}</div>
        </div>
        <div className="rounded-lg border border-zinc-800/40 bg-zinc-800/20 p-3">
          <div className="text-xs uppercase tracking-wider text-zinc-600">
            Consecutive Failures
          </div>
          <div className="mt-1 text-lg font-bold text-zinc-100">
            {status.consecutive_failures}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800/40 bg-zinc-800/20 p-3">
          <div className="text-xs uppercase tracking-wider text-zinc-600">Paused For</div>
          <div className="mt-1 text-lg font-bold text-zinc-100">
            {status.paused_seconds_remaining > 0
              ? `${Math.floor(status.paused_seconds_remaining / 60)}m ${status.paused_seconds_remaining % 60}s`
              : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AgentHealthRowProps {
  agent: AgentHealthMetric;
  onRestart: (agentId: string) => void;
  isRestarting: boolean;
}

function AgentHealthRow({ agent, onRestart, isRestarting }: AgentHealthRowProps) {
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

  const needsAttention = healthStatus === 'stale' || agent.error_rate > 1;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 transition ${
        needsAttention
          ? 'border-red-900/40 bg-red-950/10 hover:border-red-900/60'
          : 'border-zinc-800/60 bg-zinc-900/50 hover:border-zinc-700/60'
      }`}
    >
      <div className="flex flex-1 items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/logs/${agent.agent_name}`}
              className="font-semibold text-zinc-200 transition hover:text-amber-400"
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

      <div className="hidden items-center gap-8 md:flex">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-600">Uptime</p>
          <p className="mt-1 font-mono text-sm text-zinc-300">
            {agent.status === 'running' ? formatUptime(agent.uptime_minutes) : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-600">Error Rate</p>
          <p
            className={`mt-1 font-mono text-sm ${
              agent.error_rate > 1
                ? 'text-red-400'
                : agent.error_rate > 0.5
                  ? 'text-amber-400'
                  : 'text-emerald-400'
            }`}
          >
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
          <p
            className={`mt-1 font-mono text-sm ${agent.restarts > 0 ? 'text-amber-400' : 'text-zinc-500'}`}
          >
            {agent.restarts}
          </p>
        </div>
        <button
          onClick={() => onRestart(agent.agent_id)}
          disabled={isRestarting}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
          title="Restart agent"
        >
          <Power className="h-3.5 w-3.5" />
          Restart
        </button>
      </div>
    </div>
  );
}

function IncidentRow({ incident }: { incident: IncidentTimelineEntry }) {
  const isRestart =
    incident.recovery_action && incident.recovery_action.includes('Auto-restart');
  const hasRecovery = incident.recovery_time_minutes !== null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-3 text-sm">
      <div
        className={`mt-0.5 rounded-full p-1.5 ${
          incident.incident_type === 'agent_crash' ? 'bg-red-950/40' : 'bg-amber-950/40'
        }`}
      >
        {incident.incident_type === 'agent_crash' ? (
          <XCircle className="h-4 w-4 text-red-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-zinc-300">{incident.description}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
              <span>{incident.agent_name}</span>
              <span>•</span>
              <span className="uppercase">{incident.agent_role}</span>
              <span>•</span>
              <span>{timeAgo(incident.created_at)}</span>
            </div>
          </div>
          {hasRecovery && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Timer className="h-3 w-3" />
              <span>{Math.round(incident.recovery_time_minutes!)}m recovery</span>
            </div>
          )}
        </div>
        {incident.recovery_action && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <RefreshCw className={`h-3 w-3 ${isRestart ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className={isRestart ? 'text-emerald-400' : 'text-amber-400'}>
              {incident.recovery_action}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HealthMonitor({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [restartingAgent, setRestartingAgent] = useState<string | null>(null);

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['agent-health', companyId],
    queryFn: () => api.getAgentHealth(companyId),
    refetchInterval: 5000,
  });

  const { data: circuitBreakerData } = useQuery({
    queryKey: ['circuit-breaker'],
    queryFn: () => api.getCircuitBreakerStatus(),
    refetchInterval: 5000,
  });

  const { data: incidentData, isLoading: incidentLoading } = useQuery({
    queryKey: ['incident-timeline', companyId],
    queryFn: () => api.getIncidentTimeline(companyId),
    refetchInterval: 10000,
  });

  const restartMutation = useMutation({
    mutationFn: (agentId: string) => api.restartAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-health', companyId] });
      queryClient.invalidateQueries({ queryKey: ['incident-timeline', companyId] });
    },
  });

  const handleRestart = async (agentId: string) => {
    if (!confirm('Are you sure you want to restart this agent?')) return;
    setRestartingAgent(agentId);
    try {
      await restartMutation.mutateAsync(agentId);
    } finally {
      setRestartingAgent(null);
    }
  };

  if (healthLoading || incidentLoading || !healthData || !incidentData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const { summary, agents } = healthData;
  const { timeline, metrics } = incidentData;

  const healthyAgents = agents.filter((a) => a.status === 'running' && a.uptime_minutes < 5).length;
  const healthPercentage =
    summary.total_agents > 0 ? Math.round((healthyAgents / summary.total_agents) * 100) : 0;

  const recoveryRate =
    metrics.total_incidents > 0 ? Math.round((metrics.with_recovery / metrics.total_incidents) * 100) : 100;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Health Monitoring Dashboard</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Real-time agent health, circuit breaker status, and incident tracking
        </p>
      </div>

      {/* Circuit Breaker */}
      <CircuitBreakerPanel status={circuitBreakerData} />

      {/* Summary metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="System Health"
          value={`${healthPercentage}%`}
          subtitle={`${healthyAgents}/${summary.total_agents} healthy`}
          icon={<Activity className="h-5 w-5" />}
          color={healthPercentage > 80 ? 'green' : healthPercentage > 50 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="Total Crashes"
          value={summary.total_crashes}
          subtitle={`${summary.total_restarts} auto-restarts`}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={
            summary.total_crashes === 0 ? 'green' : summary.total_crashes < 5 ? 'yellow' : 'red'
          }
        />
        <MetricCard
          title="Recovery Rate"
          value={`${recoveryRate}%`}
          subtitle={`${metrics.with_recovery}/${metrics.total_incidents} recovered`}
          icon={<RefreshCw className="h-5 w-5" />}
          color={recoveryRate >= 90 ? 'green' : recoveryRate >= 70 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="Avg Recovery Time"
          value={`${Math.round(metrics.avg_recovery_minutes)}m`}
          subtitle="Time to restore service"
          icon={<Clock className="h-5 w-5" />}
          color={
            metrics.avg_recovery_minutes < 5
              ? 'green'
              : metrics.avg_recovery_minutes < 15
                ? 'yellow'
                : 'red'
          }
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
            agents.map((agent) => (
              <AgentHealthRow
                key={agent.agent_id}
                agent={agent}
                onRestart={handleRestart}
                isRestarting={restartingAgent === agent.agent_id}
              />
            ))
          )}
        </div>
      </div>

      {/* Incident timeline */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Incident Timeline</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            Last {timeline.length} incidents
          </div>
        </div>
        <div className="space-y-2">
          {timeline.length === 0 ? (
            <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm font-medium text-emerald-400">No incidents recorded</p>
              <p className="mt-1 text-xs text-emerald-600">All agents running smoothly</p>
            </div>
          ) : (
            timeline.map((incident) => <IncidentRow key={incident.id} incident={incident} />)
          )}
        </div>
      </div>

      {/* Incident metrics breakdown */}
      {metrics.by_type.length > 0 && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">Incident Breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.by_type.map((type) => (
              <div
                key={type.incident_type}
                className="rounded-lg border border-zinc-800/40 bg-zinc-800/20 p-4"
              >
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  {type.incident_type.replace(/_/g, ' ')}
                </div>
                <p className="mt-2 text-2xl font-bold text-zinc-100">{type.count}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {Math.round((type.count / metrics.total_incidents) * 100)}% of total
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
