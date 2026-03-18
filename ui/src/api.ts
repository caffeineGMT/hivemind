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
  parent_id: string | null;
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

// ── Fetch helpers ──────────────────────────────────────────────────

// Token management - will be set by the app

// Try live API first, fall back to static JSON snapshots (for Vercel deployment)
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge with provided headers
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) return res.json();
    }
  } catch {
    // Live API unavailable
  }

  // Map API URL to static JSON file path
  const staticUrl = mapToStaticUrl(url);
  const staticRes = await fetch(staticUrl);
  if (!staticRes.ok) throw new Error(`Data unavailable: ${url}`);
  return staticRes.json();
}

function mapToStaticUrl(url: string): string {
  // Truncate full UUIDs to 8-char prefixes (static files use prefixes as dir names)
  const shortened = url.replace(
    /\/api\/companies\/([0-9a-f]{8})[0-9a-f-]*/,
    '/api/companies/$1'
  );

  if (/^\/api\/companies\/([^/]+)\/(dashboard|agents|tasks|activity)/.test(shortened)) {
    return shortened.replace(/(\?.*)?$/, '.json');
  }
  if (/^\/api\/companies\/[^/]+$/.test(shortened)) {
    return shortened + '/index.json';
  }
  if (shortened === '/api/companies') return '/api/companies.json';
  if (shortened === '/api/health') return '/api/health.json';
  if (shortened === '/api/logs') return '/api/logs.json';
  return shortened + '.json';
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
    
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  getCosts: (companyId: string) =>
    fetchJson<CostData>(`/api/companies/${companyId}/costs`),

  setCostBudget: async (companyId: string, monthlyBudget: number, alertThreshold: number) => {
    
    const res = await fetch(`/api/companies/${companyId}/budget`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ monthlyBudget, alertThreshold }),
    });
    return res.json();
  },

  getCostsByDateRange: (companyId: string, startDate: string, endDate: string) =>
    fetchJson<CostByDateEntry[]>(`/api/companies/${companyId}/costs/range?startDate=${startDate}&endDate=${endDate}`),

  nudge: async (companyId: string, message: string) => {
    
    const res = await fetch('/api/nudge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId, message }),
    });
    return res.json();
  },

  // Structured logs
  searchLogs: async (filters: { keyword?: string; level?: string; source?: string }) => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.level) params.set('level', filters.level);
    if (filters.source) params.set('source', filters.source);
    const res = await fetch(`/api/logs/search?${params}`);
    return res.json();
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

  getCircuitBreakerStatus: () =>
    fetchJson<CircuitBreakerStatus>('/api/circuit-breaker/status'),

  resetCircuitBreaker: async (companyId?: string) => {
    
    const res = await fetch('/api/circuit-breaker/reset', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId }),
    });
    return res.json();
  },

  restartAgent: async (agentId: string) => {
    
    const res = await fetch(`/api/agents/${agentId}/restart`, {
      method: 'POST',
      headers,
    });
    return res.json();
  },

  resetAgent: async (agentId: string) => {
    
    const res = await fetch(`/api/agents/${agentId}/reset`, {
      method: 'DELETE',
      headers,
    });
    return res.json();
  },

  // Company management
  createCompany: async (data: { name: string; goal: string }) => {
    
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateCompany: async (id: string, data: Partial<Company>) => {
    
    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteCompany: async (id: string) => {
    
    const res = await fetch(`/api/companies/${id}`, {
      method: 'DELETE',
      headers,
    });
    return res.json();
  },

  // Cross-project analytics
  getCrossProjectAnalytics: () =>
    fetchJson<CrossProjectAnalytics>('/api/analytics/cross-project'),
};

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
