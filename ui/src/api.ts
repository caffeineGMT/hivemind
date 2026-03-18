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
  priority: 'high' | 'medium' | 'low';
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

// ── Fetch helpers ──────────────────────────────────────────────────

// Try live API first, fall back to static JSON snapshots (for Vercel deployment)
async function fetchJson<T>(url: string): Promise<T> {
  try {
    const res = await fetch(url);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  getCosts: (companyId: string) =>
    fetchJson<CostData>(`/api/companies/${companyId}/costs`),

  nudge: async (companyId: string, message: string) => {
    const res = await fetch('/api/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, message }),
    });
    return res.json();
  },
};
