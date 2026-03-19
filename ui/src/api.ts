// ── Types ──────────────────────────────────────────────────────────

export interface TaskMetrics {
  total: number;
  done: number;
  inProgress: number;
  backlog: number;
  todo: number;
  blocked: number;
  progressPct: number;
}

export interface Company {
  id: string;
  name: string;
  goal: string;
  status: string;
  workspace: string;
  deployment_url: string | null;
  created_at: string;
  taskMetrics?: TaskMetrics;
}

export interface Agent {
  id: string;
  name: string;
  role: 'ceo' | 'cto' | 'cfo' | 'cmo' | 'designer' | 'engineer';
  title: string;
  status: 'idle' | 'running' | 'error';
  pid: number | null;
  last_heartbeat: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assignee_id: string | null;
  assignee_name: string | null;
  parent_id: string | null;
  depends_on: string | null; // JSON string array of task IDs
  result: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  childTasks: Task[];
  [key: string]: unknown;
}

export interface ActivityEntry {
  id: string;
  company_id: string;
  agent_id: string | null;
  agent_name: string | null;
  task_id: string | null;
  action: string;
  detail: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalAgents: number;
  runningAgents: number;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  backlogTasks: number;
  progressPct: number;
  totalProjects: number;
}

export interface DashboardData {
  company: Company;
  metrics: DashboardMetrics;
  agents: Agent[];
  tasks: Task[];
  projects: Project[];
}

export interface Comment {
  id: number;
  company_id: string;
  task_id: string;
  agent_id: string | null;
  author: string;
  message: string;
  created_at: string;
}

export interface TaskDetail {
  task: Task;
  comments: Comment[];
}

export interface LogEntry {
  name: string;
  file: string;
}

export interface CostEntry {
  id: number;
  company_id: string;
  agent_name: string;
  task_id: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
  cost_usd: number;
  duration_ms: number;
  num_turns: number;
  model: string | null;
  created_at: string;
}

export interface CostSummaryEntry {
  agent_name: string;
  sessions: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  total_turns: number;
}

export interface CostTotals {
  total_sessions: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  total_turns: number;
}

export interface TaskCostEntry {
  task_id: string;
  sessions: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  total_turns: number;
}

export interface BudgetConfig {
  id: number;
  company_id: string;
  monthly_budget: number;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface CostData {
  summary: CostSummaryEntry[];
  totals: CostTotals;
  recent: CostEntry[];
  taskCosts: TaskCostEntry[];
  budget: BudgetConfig | null;
  monthlySpend: number;
}

export interface CostByDateEntry {
  date: string;
  sessions: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface Incident {
  id: number;
  company_id: string;
  agent_id: string;
  task_id: string | null;
  incident_type: string;
  description: string;
  recovery_action: string | null;
  created_at: string;
  time_to_recovery_seconds?: number | null;
}

// Removed duplicate - see IncidentTimeline below with IncidentTimelineEntry[]

export interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  pausedUntil: number | null;
  canAttempt: boolean;
}

export interface AgentHealthMetric {
  agent_id: string;
  agent_name: string;
  role: string;
  status: string;
  pid: number | null;
  last_heartbeat: string | null;
  total_incidents: number;
  crashes: number;
  restarts: number;
  error_rate: number;
  uptime_minutes: number;
}

export interface AgentHealthData {
  summary: {
    total_agents: number;
    running_agents: number;
    idle_agents: number;
    error_agents: number;
    total_crashes: number;
    total_restarts: number;
    avg_error_rate: number;
  };
  agents: AgentHealthMetric[];
  recent_incidents: Incident[];
}

export interface AgentHealthMetrics {
  agent: Agent;
  health: {
    status: string;
    uptime_minutes: number;
    last_heartbeat: string | null;
  };
  incidents: {
    total: number;
    crashes: number;
    restarts: number;
    recent: Incident[];
  };
  retries: {
    total: number;
    recent: any[];
  };
}

export interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutive_failures: number;
  paused_until: number | null;
  can_attempt: boolean;
  paused_seconds_remaining: number;
}

export interface IncidentTimelineEntry extends Incident {
  agent_name: string;
  agent_role: string;
  recovery_time_minutes: number | null;
}

export interface IncidentMetrics {
  by_type: Array<{ incident_type: string; count: number }>;
  total_incidents: number;
  with_recovery: number;
  avg_recovery_minutes: number;
}

export interface IncidentTimeline {
  timeline: IncidentTimelineEntry[];
  metrics: IncidentMetrics;
  summary: {
    total_incidents: number;
    total_crashes: number;
    recovered_crashes: number;
    avg_recovery_time_seconds: number | null;
    max_recovery_time_seconds: number | null;
  };
}

export interface HourlyHealthData {
  timestamp: string;
  hour: number;
  crashes: number;
  auto_restarts: number;
  manual_restarts: number;
  total_incidents: number;
  recovery_rate: string;
}

export interface AgentHistoryData {
  agent_id: string;
  agent_name: string;
  role: string;
  total_crashes: number;
  successful_restarts: number;
  failure_rate: string;
}

export interface ErrorRateData {
  timestamp: string;
  error_rate: number;
  crashes_per_agent: number;
}

export interface HealthHistory {
  hourly: HourlyHealthData[];
  agent_history: AgentHistoryData[];
  error_rates: ErrorRateData[];
  summary: {
    time_range_hours: number;
    total_crashes: number;
    total_restarts: number;
    total_agents: number;
  };
}

export interface AgentRecoveryStatus {
  agentId: string;
  agentName: string;
  status: 'healthy' | 'recovering' | 'failed_permanently';
  attemptCount: number;
  totalCrashes: number;
  currentBackoffMs: number;
  timeUntilRetryMs: number;
  canRetryNow: boolean;
  lastSuccessTime: number;
  recentFailures: Array<{
    timestamp: number;
    reason: string;
    taskId?: string;
  }>;
}

export interface RecoveryStats {
  total_agents: number;
  healthy: number;
  recovering: number;
  failed_permanently: number;
  total_crashes: number;
  total_recovery_attempts: number;
  agents_in_backoff: number;
}

export interface RecoveryData {
  status: AgentRecoveryStatus[];
  stats: RecoveryStats;
}

// ── Failure Pattern Types ──────────────────────────────────────────

export interface FailurePatternEntry {
  pattern_id: string;
  representative_message: string;
  count: number;
  first_seen: string;
  last_seen: string;
  hour_distribution: Record<string, number>;
  agent_types: Record<string, number>;
  task_types: Record<string, number>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  sample_entries: Array<{
    id: number;
    action: string;
    detail: string;
    agent_id: string;
    created_at: string;
    level: string;
  }>;
}

export interface FailurePatternSummary {
  total_failures: number;
  unique_patterns: number;
  top_pattern: {
    pattern_id: string;
    message: string;
    count: number;
  } | null;
  peak_failure_hour: { hour: number; count: number } | null;
  failure_rate_by_agent: Record<string, number>;
}

export interface FailurePatternData {
  patterns: FailurePatternEntry[];
  summary: FailurePatternSummary;
}

// ── Fetch helpers ──────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  // Handle rate limiting with retry information
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    const retryAfter = data.retryAfter ||
                       res.headers.get('Retry-After') ||
                       res.headers.get('X-RateLimit-Reset') ||
                       60; // Default to 60 seconds

    const error = new Error(
      data.error || `Rate limited. Please wait ${retryAfter} seconds before trying again.`
    ) as Error & { retryAfter: number; statusCode: number };
    error.retryAfter = Number(retryAfter);
    error.statusCode = 429;
    throw error;
  }

  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  return handleResponse<T>(res);
}

export const api = {
  getHealth: () => fetchJson<{ status: string; version: string }>('/api/health'),

  getCompanies: () => fetchJson<Company[]>('/api/companies'),

  getDashboard: (companyId: string) =>
    fetchJson<DashboardData>(`/api/companies/${companyId}/dashboard`),

  getAgents: (companyId: string) =>
    fetchJson<Agent[]>(`/api/companies/${companyId}/agents`),

  getTasks: (companyId: string) =>
    fetchJson<Task[]>(`/api/companies/${companyId}/tasks`),

  getActivity: (companyId: string) =>
    fetchJson<ActivityEntry[]>(`/api/companies/${companyId}/activity`),

  getLogs: () => fetchJson<LogEntry[]>('/api/logs'),

  getAgentLog: (agentName: string) =>
    fetchJson<{ agentName: string; log: string }>(`/api/logs/${agentName}`),

  getTaskDetail: (taskId: string) =>
    fetchJson<TaskDetail>(`/api/tasks/${taskId}`),

  addComment: async (taskId: string, message: string) => {
    const headers = { 'Content-Type': 'application/json' };

    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });
    return handleResponse(res);
  },

  getCosts: (companyId: string) =>
    fetchJson<CostData>(`/api/companies/${companyId}/costs`),

  setCostBudget: async (companyId: string, monthlyBudget: number, alertThreshold: number) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(`/api/companies/${companyId}/budget`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ monthlyBudget, alertThreshold }),
    });
    return handleResponse(res);
  },

  getCostsByDateRange: (companyId: string, startDate: string, endDate: string) =>
    fetchJson<CostByDateEntry[]>(`/api/companies/${companyId}/costs/range?startDate=${startDate}&endDate=${endDate}`),

  nudge: async (companyId: string, message: string) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch('/api/nudge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId, message }),
    });
    return handleResponse(res);
  },

  // Structured logs
  searchLogs: async (filters: { keyword?: string; level?: string; source?: string }) => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.level) params.set('level', filters.level);
    if (filters.source) params.set('source', filters.source);
    const res = await fetch(`/api/logs/search?${params}`);
    return handleResponse(res);
  },

  // Agent health monitoring
  getAgentHealth: (companyId: string) =>
    fetchJson<AgentHealthData>(`/api/companies/${companyId}/agent-health`),

  getAgentHealthMetrics: (agentId: string) =>
    fetchJson<AgentHealthMetrics>(`/api/agents/${agentId}/health-metrics`),

  getIncidents: (companyId: string, limit = 50) =>
    fetchJson<Incident[]>(`/api/companies/${companyId}/incidents?limit=${limit}`),

  getIncidentTimeline: (companyId: string, limit = 100) =>
    fetchJson<IncidentTimeline>(`/api/companies/${companyId}/incident-timeline?limit=${limit}`),

  getHealthHistory: (companyId: string, hours = 24) =>
    fetchJson<HealthHistory>(`/api/companies/${companyId}/health-history?hours=${hours}`),

  getCircuitBreakerStatus: () =>
    fetchJson<CircuitBreakerStatus>('/api/circuit-breaker/status'),

  resetCircuitBreaker: async (companyId?: string) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch('/api/circuit-breaker/reset', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId }),
    });
    return handleResponse(res);
  },

  restartAgent: async (agentId: string) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(`/api/agents/${agentId}/restart`, {
      method: 'POST',
      headers,
    });
    return handleResponse(res);
  },

  resetAgent: async (agentId: string) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(`/api/agents/${agentId}/reset`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  // Company management
  createCompany: async (data: { name: string; goal: string }) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateCompany: async (id: string, data: Partial<Company>) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteCompany: async (id: string) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(`/api/companies/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  // Cross-project analytics
  getCrossProjectAnalytics: () =>
    fetchJson<CrossProjectAnalytics>('/api/analytics/cross-project'),

  // Failure pattern analysis
  getFailurePatterns: (companyId?: string) =>
    fetchJson<FailurePatternData>(
      companyId
        ? `/api/companies/${companyId}/failure-patterns`
        : '/api/analytics/failure-patterns'
    ),

  // Agent recovery manager
  getRecoveryStatus: (companyId: string) =>
    fetchJson<RecoveryData>(`/api/companies/${companyId}/recovery-status`),

  resetAgentRecovery: async (agentId: string) => {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(`/api/agents/${agentId}/recovery/reset`, {
      method: 'POST',
      headers,
    });
    return handleResponse(res);
  },

  // Workload prediction
  getWorkloadForecast: (companyId: string) =>
    fetchJson<WorkloadReport>(`/api/companies/${companyId}/workload/forecast`),

  getTaskVolumePredictions: (companyId: string, days = 7) =>
    fetchJson<TaskVolumePrediction>(`/api/companies/${companyId}/workload/predictions?days=${days}`),

  getScalingRecommendation: (companyId: string) =>
    fetchJson<ScalingRecommendation>(`/api/companies/${companyId}/workload/scaling`),

  getPeakHours: (companyId: string) =>
    fetchJson<PeakHoursAnalysis>(`/api/companies/${companyId}/workload/peak-hours`),

  getAgentEfficiencyPrediction: (companyId: string) =>
    fetchJson<AgentEfficiencyPrediction>(`/api/companies/${companyId}/workload/agent-efficiency`),

  // Alert management
  getAlertRules: (companyId: string) =>
    fetchJson<{ rules: AlertRule[] }>(`/api/companies/${companyId}/alerts/rules`),

  saveAlertRules: async (companyId: string, rules: AlertRule[]) => {
    const res = await fetch(`/api/companies/${companyId}/alerts/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    });
    return handleResponse(res);
  },

  getAlertChannels: (companyId: string) =>
    fetchJson<{ channels: AlertChannelConfig }>(`/api/companies/${companyId}/alerts/channels`),

  saveAlertChannels: async (companyId: string, channels: AlertChannelConfig) => {
    const res = await fetch(`/api/companies/${companyId}/alerts/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels }),
    });
    return handleResponse(res);
  },

  getAlertHistory: (companyId: string, hours = 24) =>
    fetchJson<{ alerts: AlertHistoryEntry[] }>(`/api/companies/${companyId}/alerts/history?hours=${hours}`),

  getAlertStats: (companyId: string, hours = 24) =>
    fetchJson<AlertStats>(`/api/companies/${companyId}/alerts/stats?hours=${hours}`),

  acknowledgeAlert: async (alertId: number) => {
    const res = await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
    return handleResponse(res);
  },

  acknowledgeAllAlerts: async (companyId: string) => {
    const res = await fetch(`/api/companies/${companyId}/alerts/acknowledge-all`, { method: 'POST' });
    return handleResponse(res);
  },

  testAlert: async (companyId: string, severity: string, title: string, message: string) => {
    const res = await fetch(`/api/companies/${companyId}/alerts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ severity, title, message }),
    });
    return handleResponse(res);
  },

  // Data export
  exportData: async (companyId: string, opts: {
    entities?: string[];
    startDate?: string;
    endDate?: string;
    format?: 'json' | 'csv';
  } = {}) => {
    const params = new URLSearchParams();
    if (opts.entities?.length) params.set('entities', opts.entities.join(','));
    if (opts.startDate) params.set('startDate', opts.startDate);
    if (opts.endDate) params.set('endDate', opts.endDate);
    if (opts.format) params.set('format', opts.format);
    const res = await fetch(`/api/export/${companyId}?${params}`);
    if (opts.format === 'csv') return res.text();
    return res.json();
  },

  exportLogs: async (opts: {
    companyId?: string;
    startDate?: string;
    endDate?: string;
    level?: string;
    source?: string;
    format?: 'json' | 'csv';
  } = {}) => {
    const params = new URLSearchParams();
    if (opts.startDate) params.set('startDate', opts.startDate);
    if (opts.endDate) params.set('endDate', opts.endDate);
    if (opts.level) params.set('level', opts.level);
    if (opts.source) params.set('source', opts.source);
    if (opts.format) params.set('format', opts.format);
    const url = opts.companyId
      ? `/api/export/${opts.companyId}/logs?${params}`
      : `/api/export/logs?${params}`;
    const res = await fetch(url);
    if (opts.format === 'csv') return res.text();
    return res.json();
  },

  triggerArchival: async (daysOld = 30) => {
    const res = await fetch('/api/export/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysOld }),
    });
    return handleResponse(res);
  },

  getArchives: () => fetchJson<Array<{ filename: string; size: number; created: string; modified: string }>>('/api/export/archives'),
};

// ── Alert Types ────────────────────────────────────────────────────

export interface AlertRule {
  id: string;
  company_id?: string;
  name: string;
  description: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  cooldown_minutes: number;
  escalate_after_minutes: number | null;
}

export interface AlertChannelConfig {
  websocket: boolean;
  log_file: boolean;
  desktop: boolean;
}

export interface AlertHistoryEntry {
  id: number;
  company_id: string;
  rule_id: string | null;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metric: string | null;
  metric_value: number | null;
  threshold: number | null;
  agent_id: string | null;
  agent_name: string | null;
  task_id: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  escalated: boolean;
  channels_delivered: string[];
  context: unknown;
  created_at: string;
}

export interface AlertStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  acknowledged: number;
  unacknowledged: number;
  escalated: number;
}

// ── Cross-Project Analytics Types ──────────────────────────────────

export interface CrossProjectCostSummary {
  company_id: string;
  company_name: string;
  deployment_url: string | null;
  sessions: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  total_turns: number;
}

export interface CrossProjectTaskMetrics {
  company_id: string;
  company_name: string;
  total_tasks: number;
  done_tasks: number;
  in_progress_tasks: number;
  backlog_tasks: number;
  blocked_tasks: number;
  urgent_tasks: number;
  high_priority_tasks: number;
}

export interface CrossProjectAgentMetrics {
  company_id: string;
  company_name: string;
  total_agents: number;
  running_agents: number;
  idle_agents: number;
  error_agents: number;
  total_incidents: number;
  total_crashes: number;
}

export interface CrossProjectTotals {
  total_companies: number;
  total_sessions: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  total_turns: number;
  total_tasks: number;
  done_tasks: number;
  in_progress_tasks: number;
  backlog_tasks: number;
  total_agents: number;
  running_agents: number;
  idle_agents: number;
  total_incidents: number;
}

export interface CrossProjectCostTrend {
  date: string;
  sessions: number;
  total_cost_usd: number;
  total_tokens: number;
}

export interface CrossProjectAgentPerformance {
  agent_name: string;
  role: string;
  company_name: string;
  company_id: string;
  tasks_completed: number;
  total_cost: number;
  total_tokens: number;
  incidents: number;
  status: string;
  last_heartbeat: string | null;
}

export interface CrossProjectAnalytics {
  costSummary: CrossProjectCostSummary[];
  taskMetrics: CrossProjectTaskMetrics[];
  agentMetrics: CrossProjectAgentMetrics[];
  totals: CrossProjectTotals;
  costTrend: CrossProjectCostTrend[];
  agentPerformance: CrossProjectAgentPerformance[];
}

// ── WebSocket Integration ──────────────────────────────────────────
import { QueryClient } from '@tanstack/react-query';
import { wsClient } from './websocket';

let queryClientInstance: QueryClient | null = null;

export function setupWebSocket(queryClient: QueryClient) {
  queryClientInstance = queryClient;

  // Connect WebSocket
  wsClient.connect();

  // Handle WebSocket messages and invalidate queries
  wsClient.addMessageHandler((event, data) => {
    if (!queryClientInstance) return;

    console.log('[ws] Received event:', event, data);

    // Invalidate relevant queries based on event type
    switch (event) {
      case 'comment_added':
      case 'nudge_received':
        // Invalidate activity and dashboard
        queryClientInstance.invalidateQueries({ queryKey: ['activity'] });
        queryClientInstance.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'activity_logged':
        // Just invalidate activity feed
        queryClientInstance.invalidateQueries({ queryKey: ['activity'] });
        break;

      case 'task_updated':
        // Invalidate tasks and dashboard metrics
        queryClientInstance.invalidateQueries({ queryKey: ['tasks'] });
        queryClientInstance.invalidateQueries({ queryKey: ['dashboard'] });
        queryClientInstance.invalidateQueries({ queryKey: ['activity'] });
        break;

      case 'agent_status_changed':
        // Invalidate agents and dashboard metrics
        queryClientInstance.invalidateQueries({ queryKey: ['agents'] });
        queryClientInstance.invalidateQueries({ queryKey: ['dashboard'] });
        queryClientInstance.invalidateQueries({ queryKey: ['agent-health'] });
        break;

      case 'cost_updated':
        // Invalidate costs and dashboard (affects metrics)
        queryClientInstance.invalidateQueries({ queryKey: ['costs'] });
        queryClientInstance.invalidateQueries({ queryKey: ['dashboard'] });
        break;

      case 'alert_fired':
      case 'alert_acknowledged':
      case 'alerts_acknowledged':
        queryClientInstance.invalidateQueries({ queryKey: ['alert-stats'] });
        break;

      case 'alert_rules_updated':
      case 'alert_channels_updated':
        queryClientInstance.invalidateQueries({ queryKey: ['alert-rules'] });
        queryClientInstance.invalidateQueries({ queryKey: ['alert-channels'] });
        break;

      case 'config_updated':
      case 'project_archived':
      case 'project_deleted':
        // Major changes - invalidate everything
        queryClientInstance.invalidateQueries({ queryKey: ['dashboard'] });
        queryClientInstance.invalidateQueries({ queryKey: ['companies'] });
        break;

      default:
        // Unknown event, invalidate dashboard as a fallback
        queryClientInstance.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}

export { wsClient };

// ── Workload Prediction Types ──────────────────────────────────────────

export interface ForecastPrediction {
  time_bucket: string;
  predicted_value: number;
  confidence_score: number;
}

export interface TaskVolumePrediction {
  predictions: ForecastPrediction[];
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  confidence: number;
  current_avg: number;
  predicted_avg: number;
  change_pct: number;
  recommendations?: string[];
}

export interface ScalingRecommendation {
  current_agents: number;
  recommended_agents: number;
  change: number;
  action: 'scale_up' | 'scale_down' | 'maintain';
  reason: string;
  confidence: number;
  predicted_daily_tasks: number;
  tasks_per_agent: string;
}

export interface PeakHoursAnalysis {
  peak_hours: number[];
  off_peak_hours: number[];
  avg_task_count: number;
  peak_threshold?: number;
  hourly_distribution?: Array<{
    hour: number;
    task_count: number;
    avg_completion_hours: number | null;
  }>;
  recommendations: string[];
}

export interface AgentEfficiencyRanking {
  agent_id: string;
  agent_name: string;
  role: string;
  completion_rate: string;
  avg_completion_hours: string;
  efficiency_score: string;
  total_tasks: number;
  completed_tasks: number;
}

export interface AgentEfficiencyPrediction {
  agent_rankings: AgentEfficiencyRanking[];
  recommendations: string[];
}

export interface WorkloadReport {
  generated_at: string;
  company_id: string;
  volume_forecast: {
    predictions: ForecastPrediction[];
    trend: string;
    confidence: number;
    current_avg: number;
    predicted_avg: number;
    change_pct: number;
  };
  scaling_recommendation: ScalingRecommendation;
  peak_hours: {
    peak_hours: number[];
    off_peak_hours: number[];
    avg_task_count: number;
  };
  agent_efficiency: {
    rankings: AgentEfficiencyRanking[];
  };
  recommendations: string[];
}

// ── Trace and Span Types ───────────────────────────────────────────────

export interface TraceSpan {
  id: number;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  operation: string;
  timestamp: string;
  duration_ms: number | null;
  status: string | null;
  metadata: any;
  company_id: string | null;
  agent_id: string | null;
  task_id: string | null;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface TraceTree extends TraceSpan {
  children: TraceTree[];
}

export interface TraceSummary {
  totalSpans: number;
  startTime: string;
  endTime: string;
  totalDuration: number;
}

export interface TraceData {
  traceId: string;
  spans: TraceSpan[];
  tree: TraceTree[];
  summary: TraceSummary;
}

export interface RecentTrace {
  trace_id: string;
  start_time: string;
  end_time: string;
  span_count: number;
}

