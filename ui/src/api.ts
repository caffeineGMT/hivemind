// ── Types ──────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  goal: string;
  status: string;
  workspace: string;
  deployment_url: string | null;
  created_at: string;
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

export interface CostData {
  summary: CostSummaryEntry[];
  totals: CostTotals;
  recent: CostEntry[];
}

export interface SubscriptionStatus {
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  limits: {
    companies: number;
    agents: number;
  } | null;
  allowed: boolean;
  reason: string | null;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface PortalSession {
  url: string;
}

export interface UsageData {
  current_month: {
    agent_hours: number;
    api_calls: number;
    period_start: string;
    period_end: string;
  };
  history: {
    id: number;
    company_id: string;
    metric: string;
    value: number;
    timestamp: string;
    agent_id: string | null;
    metadata: string | null;
  }[];
}

export interface BillingData {
  plan: string;
  base_price: number;
  included: {
    agent_hours: number;
    api_calls: number;
  };
  usage: {
    agent_hours: number;
    api_calls: number;
  };
  overages: {
    agent_hours: number;
    api_calls: number;
  };
  overage_costs: {
    agent_hours: number;
    api_calls: number;
    total: number;
  };
  total_cost: number;
  stripe_customer_id: string | null;
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

// ── Fetch helpers ──────────────────────────────────────────────────

// Token management - will be set by the app
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// Try live API first, fall back to static JSON snapshots (for Vercel deployment)
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  getCosts: (companyId: string) =>
    fetchJson<CostData>(`/api/companies/${companyId}/costs`),

  nudge: async (companyId: string, message: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch('/api/nudge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId, message }),
    });
    return res.json();
  },

  // Stripe / Billing APIs
  getSubscription: (companyId: string) =>
    fetchJson<SubscriptionStatus>(`/api/stripe/subscription/${companyId}`),

  createCheckout: async (data: {
    tier: string;
    companyId: string;
    email: string;
    successUrl?: string;
    cancelUrl?: string;
  }) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json() as Promise<CheckoutSession>;
  },

  createPortal: async (companyId: string, returnUrl?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers,
      body: JSON.stringify({ companyId, returnUrl }),
    });
    return res.json() as Promise<PortalSession>;
  },

  // Usage metering
  getUsage: (companyId: string) =>
    fetchJson<UsageData>(`/api/companies/${companyId}/usage`),

  getBilling: (companyId: string) =>
    fetchJson<BillingData>(`/api/companies/${companyId}/billing`),

  // Structured logs
  searchLogs: async (filters: { keyword?: string; level?: string; source?: string }) => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.level) params.set('level', filters.level);
    if (filters.source) params.set('source', filters.source);
    const res = await fetch(`/api/logs/search?${params}`);
    return res.json();
  },

  // Pricing Optimization APIs
  getPricingCohorts: () =>
    fetchJson<any[]>('/api/pricing/cohorts'),

  getPricingElasticity: () =>
    fetchJson<any[]>('/api/pricing/elasticity'),

  getPricingFunnelDropoff: () =>
    fetchJson<any[]>('/api/pricing/funnel-dropoff'),

  getPricingTimeToConversion: () =>
    fetchJson<any>('/api/pricing/time-to-conversion'),

  getPricingRecommendations: () =>
    fetchJson<any[]>('/api/pricing/recommendations'),

  getPricingForecast: (months = 6) =>
    fetchJson<any>(`/api/pricing/forecast?months=${months}`),

  createPricingTest: async (data: {
    testName: string;
    variants: string[];
    startDate: string;
    endDate?: string;
  }) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch('/api/pricing/ab-test', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getPricingTestResults: (testId: string) =>
    fetchJson<any>(`/api/pricing/ab-test/${testId}`),

  // Agent health monitoring
  getAgentHealth: (companyId: string) =>
    fetchJson<AgentHealthData>(`/api/companies/${companyId}/agent-health`),

  getAgentHealthMetrics: (agentId: string) =>
    fetchJson<AgentHealthMetrics>(`/api/agents/${agentId}/health-metrics`),

  getIncidents: (companyId: string, limit = 50) =>
    fetchJson<Incident[]>(`/api/companies/${companyId}/incidents?limit=${limit}`),
};

// ── WebSocket Integration ──────────────────────────────────────────
import { QueryClient } from '@tanstack/react-query';
import { wsClient } from './websocket';

let queryClientInstance: QueryClient | null = null;

export function setupWebSocket(queryClient: QueryClient) {
  queryClientInstance = queryClient;

  // Connect WebSocket
  wsClient.connect();

  // Handle WebSocket messages and invalidate queries
  wsClient.addMessageHandler((event, _data) => {
    if (!queryClientInstance) return;

    console.log('[ws] Received event:', event);

    // Invalidate relevant queries based on event type
    switch (event) {
      case 'comment_added':
      case 'nudge_received':
      case 'activity_logged':
      case 'task_updated':
      case 'agent_status_changed':
        // Invalidate all dashboard-related queries
        queryClientInstance.invalidateQueries({ queryKey: ['dashboard'] });
        queryClientInstance.invalidateQueries({ queryKey: ['activity'] });
        queryClientInstance.invalidateQueries({ queryKey: ['tasks'] });
        queryClientInstance.invalidateQueries({ queryKey: ['agents'] });
        break;

      case 'cost_updated':
        queryClientInstance.invalidateQueries({ queryKey: ['costs'] });
        break;

      default:
        // Unknown event, invalidate dashboard as a fallback
        queryClientInstance.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}

export { wsClient };
