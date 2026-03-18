// ── Types ──────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  goal: string;
  status: string;
  workspace: string;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  role: 'ceo' | 'cto' | 'designer' | 'engineer';
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

// ── Fetch helpers ──────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
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

  nudge: async (companyId: string, message: string) => {
    const res = await fetch(`/api/companies/${companyId}/nudge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },
};
