import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Power,
  RotateCcw,
  AlertCircle,
  CircuitBoard,
  PlayCircle,
  BarChart3,
  LineChart,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import ConfirmationModal from '../components/ConfirmationModal';

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

function CircuitBreakerBadge({ state }: { state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' }) {
  const colors = {
    CLOSED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    OPEN: 'bg-red-500/20 text-red-400 border-red-500/30',
    HALF_OPEN: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${colors[state]}`}>
      <CircuitBoard className="h-3 w-3" />
      {state === 'CLOSED' ? 'Normal' : state === 'OPEN' ? 'Paused' : 'Testing'}
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

function formatRecoveryTime(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function AgentHealthRow({ agent }: { agent: AgentHealthMetric }) {
  const queryClient = useQueryClient();
  const [showResetModal, setShowResetModal] = useState(false);

  const restartMutation = useMutation({
    mutationFn: () => api.restartAgent(agent.agent_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-health'] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => api.resetAgent(agent.agent_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-health'] });
      setShowResetModal(false);
    },
  });

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

  // Show alert for problematic agents
  const hasIssues = agent.status === 'error' || agent.crashes > 0 || agent.error_rate > 1;

  return (
    <div className={`rounded-lg border p-4 transition ${
      hasIssues
        ? 'border-red-900/50 bg-red-950/20 shadow-lg shadow-red-900/10'
        : 'border-zinc-800/60 bg-zinc-900/50 hover:border-zinc-700/60'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/logs/${agent.agent_name}`}
              className="font-semibold text-zinc-200 hover:text-amber-400 transition"
            >
              {agent.agent_name}
            </Link>
            <span className="text-xs uppercase tracking-wider text-zinc-600">{agent.role}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={agent.status} />
            <HealthStatusBadge status={healthStatus} />
            {hasIssues && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[10px] font-medium uppercase text-red-400">
                <AlertCircle className="h-3 w-3" />
                NEEDS ATTENTION
              </span>
            )}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6">
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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-2 text-amber-400 transition hover:bg-amber-900/30 disabled:opacity-50"
            title="Soft restart (graceful)"
          >
            {restartMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="rounded-lg border border-red-900/30 bg-red-950/20 p-2 text-red-400 transition hover:bg-red-900/30"
            title="Hard reset (force kill)"
          >
            <Power className="h-4 w-4" />
          </button>

          <ConfirmationModal
            isOpen={showResetModal}
            onClose={() => setShowResetModal(false)}
            onConfirm={() => resetMutation.mutate()}
            onCancel={() => setShowResetModal(false)}
            title="Hard Reset Agent?"
            message={`This will force kill and restart "${agent.agent_name}". Use this only if the agent is stuck or unresponsive. Make sure the underlying issue is fixed first.`}
            confirmLabel="Force Reset"
            variant="danger"
            isLoading={resetMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const isRestart = incident.recovery_action && incident.recovery_action.includes('Auto-restart');
  const hasRecovery = incident.time_to_recovery_seconds !== null;

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
          <div className="flex-1">
            <p className="font-medium text-zinc-300">{incident.description}</p>
            {incident.recovery_action && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <RefreshCw className={`h-3 w-3 ${isRestart ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className={isRestart ? 'text-emerald-400' : 'text-amber-400'}>{incident.recovery_action}</span>
              </div>
            )}
            {hasRecovery && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>Recovered in {formatRecoveryTime(incident.time_to_recovery_seconds ?? null)}</span>
              </div>
            )}
          </div>
          <span className="shrink-0 text-xs text-zinc-600">{timeAgo(incident.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export default function AgentHealth({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [showResetCircuitModal, setShowResetCircuitModal] = useState(false);

  const { data: healthData, isLoading } = useQuery({
    queryKey: ['agent-health', companyId],
    queryFn: () => api.getAgentHealth(companyId),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time monitoring
  });

  const { data: timelineData } = useQuery({
    queryKey: ['incident-timeline', companyId],
    queryFn: () => api.getIncidentTimeline(companyId),
    refetchInterval: 10000,
  });

  const { data: circuitStatus } = useQuery({
    queryKey: ['circuit-breaker'],
    queryFn: () => api.getCircuitBreakerStatus(),
    refetchInterval: 5000,
  });

  const { data: healthHistory } = useQuery({
    queryKey: ['health-history', companyId],
    queryFn: () => api.getHealthHistory(companyId, 24),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const resetCircuitMutation = useMutation({
    mutationFn: () => api.resetCircuitBreaker(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-breaker'] });
      setShowResetCircuitModal(false);
    },
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

      {/* Circuit Breaker Status */}
      {circuitStatus && (
        <div className={`rounded-xl border p-4 ${
          circuitStatus.state === 'OPEN'
            ? 'border-red-900/30 bg-red-950/20'
            : circuitStatus.state === 'HALF_OPEN'
            ? 'border-amber-900/30 bg-amber-950/20'
            : 'border-emerald-900/30 bg-emerald-950/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CircuitBoard className={`h-6 w-6 ${
                circuitStatus.state === 'OPEN'
                  ? 'text-red-400'
                  : circuitStatus.state === 'HALF_OPEN'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`} />
              <div>
                <h3 className="font-semibold text-zinc-100">Circuit Breaker Status</h3>
                <p className="text-sm text-zinc-500">
                  {circuitStatus.state === 'OPEN' && 'API calls paused due to consecutive failures'}
                  {circuitStatus.state === 'HALF_OPEN' && 'Testing API recovery...'}
                  {circuitStatus.state === 'CLOSED' && 'All systems operational'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-zinc-600">Status</p>
                <CircuitBreakerBadge state={circuitStatus.state} />
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-zinc-600">Failures</p>
                <p className={`mt-1 font-mono text-sm ${circuitStatus.consecutiveFailures > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {circuitStatus.consecutiveFailures}
                </p>
              </div>
              {circuitStatus.state !== 'CLOSED' && (
                <button
                  onClick={() => setShowResetCircuitModal(true)}
                  className="rounded-lg border border-emerald-900/30 bg-emerald-950/20 px-4 py-2 text-sm text-emerald-400 transition hover:bg-emerald-900/30"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recovery Status with Exponential Backoff */}
      {/* {recoveryData && recoveryData.stats.recovering > 0 && (
        <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-4">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="h-6 w-6 text-amber-400 animate-spin" />
            <div>
              <h3 className="font-semibold text-zinc-100">Agent Recovery in Progress</h3>
              <p className="text-sm text-zinc-500">
                {recoveryData.stats.recovering} agent{recoveryData.stats.recovering > 1 ? 's' : ''} recovering with exponential backoff
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {[].map((agent: any) => (
                <div key={agent.agentId} className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-zinc-300">{agent.agentName}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                        <span>Attempt {agent.attemptCount}/8</span>
                        <span>•</span>
                        <span>{agent.totalCrashes} total crashes</span>
                        <span>•</span>
                        <span className="text-amber-400">
                          Retry in {Math.ceil(agent.timeUntilRetryMs / 1000)}s
                        </span>
                      </div>
                      {agent.recentFailures && agent.recentFailures.length > 0 && (
                        <p className="mt-1 text-xs text-zinc-600">
                          Last: {agent.recentFailures[agent.recentFailures.length - 1].reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="rounded-full bg-zinc-800/60 px-3 py-1">
                        <p className="text-xs text-zinc-400">Backoff</p>
                        <p className="font-mono text-sm text-amber-400">
                          {(agent.currentBackoffMs / 1000).toFixed(1)}s
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Permanently Failed Agents */}
      {/* {recoveryData && recoveryData.stats.failed_permanently > 0 && (
        <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-4">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="h-6 w-6 text-red-400" />
            <div>
              <h3 className="font-semibold text-zinc-100">Agents Requiring Manual Intervention</h3>
              <p className="text-sm text-zinc-500">
                {recoveryData.stats.failed_permanently} agent{recoveryData.stats.failed_permanently > 1 ? 's' : ''} exceeded max retry attempts
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {[].map((agent: any) => {
                const resetMutation = useMutation({
                  mutationFn: () => Promise.resolve({}),
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['recovery-status'] });
                  },
                });

                return (
                  <div key={agent.agentId} className="rounded-lg border border-red-800/60 bg-red-900/20 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-zinc-300">{agent.agentName}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                          <span className="text-red-400">Failed after {agent.attemptCount} attempts</span>
                          <span>•</span>
                          <span>{agent.totalCrashes} total crashes</span>
                        </div>
                        {agent.recentFailures && agent.recentFailures.length > 0 && (
                          <p className="mt-1 text-xs text-zinc-600">
                            Last: {agent.recentFailures[agent.recentFailures.length - 1].reason}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => resetMutation.mutate()}
                        disabled={resetMutation.isPending}
                        className="rounded-lg border border-amber-900/30 bg-amber-950/20 px-4 py-2 text-sm text-amber-400 transition hover:bg-amber-900/30 disabled:opacity-50"
                      >
                        {resetMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <RotateCcw className="h-4 w-4" />
                            Reset Recovery
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

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
          title="Avg Recovery"
          value={timelineData?.metrics.avg_recovery_minutes ? formatRecoveryTime(timelineData.metrics.avg_recovery_minutes) : '—'}
          subtitle="Time to recovery"
          icon={<Clock className="h-5 w-5" />}
          color="blue"
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

      {/* Health Metrics Charts */}
      {healthHistory && healthHistory.hourly.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-zinc-100">Health Metrics Over Time</h3>

            {/* Crashes and Restarts Over Time */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <LineChart className="h-5 w-5 text-blue-400" />
                <h4 className="font-semibold text-zinc-200">Crashes & Restarts (Last 24 Hours)</h4>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={healthHistory.hourly}>
                  <defs>
                    <linearGradient id="colorCrashes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRestarts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="hour"
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      color: '#e4e4e7'
                    }}
                    labelFormatter={(hour) => `Hour: ${hour}:00`}
                  />
                  <Legend
                    wrapperStyle={{ color: '#e4e4e7' }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="crashes"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorCrashes)"
                    strokeWidth={2}
                    name="Crashes"
                  />
                  <Area
                    type="monotone"
                    dataKey="auto_restarts"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorRestarts)"
                    strokeWidth={2}
                    name="Auto-Restarts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Error Rate Over Time */}
            <div className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-400" />
                <h4 className="font-semibold text-zinc-200">Error Rate Trend (Crashes per Agent)</h4>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <ReLineChart data={healthHistory.error_rates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(timestamp) => {
                      const date = new Date(timestamp);
                      return `${date.getHours()}:00`;
                    }}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      color: '#e4e4e7'
                    }}
                    labelFormatter={(timestamp) => {
                      const date = new Date(timestamp);
                      return date.toLocaleString();
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#e4e4e7' }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="crashes_per_agent"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Error Rate"
                  />
                </ReLineChart>
              </ResponsiveContainer>
            </div>

            {/* Recovery Success Rate */}
            <div className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
                <h4 className="font-semibold text-zinc-200">Recovery Success Rate by Hour</h4>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <ReBarChart data={healthHistory.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="hour"
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft', fill: '#71717a' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      color: '#e4e4e7'
                    }}
                    labelFormatter={(hour) => `Hour: ${hour}:00`}
                    formatter={(value: any) => [`${value}%`, 'Recovery Rate']}
                  />
                  <Legend
                    wrapperStyle={{ color: '#e4e4e7' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="recovery_rate"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Recovery Success Rate"
                  />
                </ReBarChart>
              </ResponsiveContainer>
            </div>

            {/* Agent-Specific Failure Rates */}
            {healthHistory.agent_history.some(a => a.total_crashes > 0) && (
              <div className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h4 className="font-semibold text-zinc-200">Agent Crash Distribution</h4>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ReBarChart
                    data={healthHistory.agent_history.filter(a => a.total_crashes > 0)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      type="number"
                      stroke="#71717a"
                      tick={{ fill: '#71717a', fontSize: 12 }}
                    />
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
                        border: '1px solid #3f3f46',
                        borderRadius: '8px',
                        color: '#e4e4e7'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ color: '#e4e4e7' }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="total_crashes"
                      fill="#ef4444"
                      radius={[0, 4, 4, 0]}
                      name="Total Crashes"
                    />
                    <Bar
                      dataKey="successful_restarts"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      name="Successful Restarts"
                    />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incident Timeline */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Incident Timeline</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            {timelineData ? `${timelineData.metrics.total_incidents} incidents` : 'Loading...'}
          </div>
        </div>
        <div className="space-y-2">
          {!timelineData || timelineData.timeline.length === 0 ? (
            <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm font-medium text-emerald-400">No incidents recorded</p>
              <p className="mt-1 text-xs text-emerald-600">All agents running smoothly</p>
            </div>
          ) : (
            timelineData.timeline.slice(0, 20).map((incident) => <IncidentRow key={incident.id} incident={incident} />)
          )}
        </div>
      </div>

      {/* Performance insights */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-zinc-100">Performance Insights</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800/40 bg-zinc-800/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Auto-Restart Success
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
              <Clock className="h-4 w-4 text-amber-400" />
              Avg Recovery Time
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-100">
              {formatRecoveryTime(timelineData?.metrics.avg_recovery_minutes || null)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Max: {formatRecoveryTime(timelineData?.metrics.avg_recovery_minutes || null)}
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

      {/* Circuit Breaker Reset Confirmation */}
      <ConfirmationModal
        isOpen={showResetCircuitModal}
        onClose={() => setShowResetCircuitModal(false)}
        onConfirm={() => resetCircuitMutation.mutate()}
        onCancel={() => setShowResetCircuitModal(false)}
        title="Reset Circuit Breaker?"
        message="This will clear the failure count and allow API calls to resume. Make sure the underlying issue is fixed first, or the circuit will break again."
        confirmLabel="Reset Circuit Breaker"
        variant="warning"
        isLoading={resetCircuitMutation.isPending}
      />
    </div>
  );
}
