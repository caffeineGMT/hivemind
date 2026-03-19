import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, Company } from './api';
import { wsClient } from './websocket';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorFallback';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Agents from './pages/Agents';
import Activity from './pages/Activity';
import AgentLog from './pages/AgentLog';
import TaskDetail from './pages/TaskDetail';
import Finance from './pages/Finance';
import Analytics from './pages/Analytics';
import Costs from './pages/Costs';
import Logs from './pages/Logs';
import AgentHealth from './pages/AgentHealth';
import HealthMonitor from './pages/HealthMonitor';
import Companies from './pages/Companies';
import CrossProjectAnalytics from './pages/CrossProjectAnalytics';
import Settings from './pages/Settings';
import Roadmap from './pages/Roadmap';
import AgentPerformance from './pages/AgentPerformance';
import TraceView from './pages/TraceView';

// Helper to create URL-safe slugs from company names
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper to find company by slug
function findCompanyBySlug(companies: Company[], slug: string): Company | undefined {
  return companies.find(c => slugify(c.name) === slug);
}

// Company routes wrapper - handles URL param for company selection
function CompanyRoutes() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: api.getCompanies,
  });

  // WebSocket connection and real-time updates
  useEffect(() => {
    // Connect WebSocket on mount
    wsClient.connect();

    // Handle incoming WebSocket events
    const handleMessage = (event: string, data: any) => {
      console.log('[ws] Event received:', event, data);

      // Invalidate relevant queries based on event type
      switch (event) {
        case 'agent_status_changed':
          queryClient.invalidateQueries({ queryKey: ['agents'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['agent-health'] });
          break;

        case 'task_updated':
        case 'task_created':
        case 'task_assigned':
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'cost_logged':
          queryClient.invalidateQueries({ queryKey: ['costs'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'comment_added':
          if (data?.taskId) {
            queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
          }
          queryClient.invalidateQueries({ queryKey: ['activity'] });
          break;

        case 'activity_logged':
        case 'nudge_received':
          queryClient.invalidateQueries({ queryKey: ['activity'] });
          break;

        case 'config_updated':
        case 'project_archived':
        case 'project_deleted':
          queryClient.invalidateQueries({ queryKey: ['companies'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'circuit_breaker_reset':
        case 'agent_restarted':
          queryClient.invalidateQueries({ queryKey: ['circuit-breaker'] });
          queryClient.invalidateQueries({ queryKey: ['agent-health'] });
          queryClient.invalidateQueries({ queryKey: ['incident-timeline'] });
          break;

        default:
          // For any other event, invalidate dashboard as a safe fallback
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    };

    wsClient.addMessageHandler(handleMessage);

    return () => {
      wsClient.removeMessageHandler(handleMessage);
    };
  }, [queryClient]);

  // Redirect to first company if no slug provided
  useEffect(() => {
    if (!companySlug && companies && companies.length > 0) {
      const sorted = [...companies].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      navigate(`/${slugify(sorted[0].name)}`, { replace: true });
    }
  }, [companySlug, companies, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
          <span className="text-sm text-zinc-500">Connecting to Hivemind...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-6 py-4 text-red-400">
          Failed to connect to API server. Is it running on port 3100?
        </div>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-4">
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">No Companies Found</h2>
          <p className="text-sm text-zinc-400">
            Use the CLI to create your first company: <code className="rounded bg-zinc-800 px-2 py-1">hivemind init</code>
          </p>
        </div>
      </div>
    );
  }

  // Find company by URL slug
  const selectedCompany = companySlug
    ? findCompanyBySlug(companies, companySlug) || companies[0]
    : companies[0];

  const handleSelectCompany = (id: string) => {
    const company = companies.find(c => c.id === id);
    if (company) {
      navigate(`/${slugify(company.name)}`);
    }
  };

  return (
    <Layout
      companies={companies}
      selectedCompany={selectedCompany}
      onSelectCompany={handleSelectCompany}
      companySlug={slugify(selectedCompany.name)}
    >
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<ErrorBoundary><Dashboard companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="companies" element={<ErrorBoundary><Companies /></ErrorBoundary>} />
          <Route path="tasks" element={<ErrorBoundary><Tasks companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="agents" element={<ErrorBoundary><Agents companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="agent-health" element={<ErrorBoundary><AgentHealth companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="health-monitor" element={<ErrorBoundary><HealthMonitor companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="activity" element={<ErrorBoundary><Activity companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="finance" element={<ErrorBoundary><Finance companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="analytics" element={<ErrorBoundary><Analytics companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="cross-project-analytics" element={<ErrorBoundary><CrossProjectAnalytics /></ErrorBoundary>} />
          <Route path="costs" element={<ErrorBoundary><Costs companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="agent-performance" element={<ErrorBoundary><AgentPerformance companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="logs-view" element={<ErrorBoundary><Logs /></ErrorBoundary>} />
          <Route path="trace/:traceId" element={<ErrorBoundary><TraceView /></ErrorBoundary>} />
          <Route path="roadmap" element={<ErrorBoundary><Roadmap /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><Settings companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="tasks/:taskId" element={<ErrorBoundary><TaskDetail /></ErrorBoundary>} />
          <Route path="logs/:agentName" element={<ErrorBoundary><AgentLog /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to={`/${slugify(selectedCompany.name)}`} replace />} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<CompanyRoutes />} />
        <Route path="/:companySlug/*" element={<CompanyRoutes />} />
      </Routes>
    </ErrorBoundary>
  );
}
