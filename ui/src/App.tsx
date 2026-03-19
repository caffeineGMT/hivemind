import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { api, Company } from './api';
import { wsClient } from './websocket';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPromptBanner } from './components/InstallPromptBanner';

// Lazy-loaded page components for code splitting (Task 3)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Agents = lazy(() => import('./pages/Agents'));
const Activity = lazy(() => import('./pages/Activity'));
const AgentLog = lazy(() => import('./pages/AgentLog'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const Finance = lazy(() => import('./pages/Finance'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Costs = lazy(() => import('./pages/Costs'));
const Logs = lazy(() => import('./pages/Logs'));
const AgentHealth = lazy(() => import('./pages/AgentHealth'));
const HealthMonitor = lazy(() => import('./pages/HealthMonitor'));
const Companies = lazy(() => import('./pages/Companies'));
const CrossProjectAnalytics = lazy(() => import('./pages/CrossProjectAnalytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const AgentPerformance = lazy(() => import('./pages/AgentPerformance'));
const TraceView = lazy(() => import('./pages/TraceView'));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
    </div>
  );
}

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
    wsClient.connect();

    const handleMessage = (event: string, data: any) => {
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
      navigate(`/projects/${slugify(sorted[0].name)}`, { replace: true });
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

  const selectedCompany = companySlug
    ? findCompanyBySlug(companies, companySlug) || companies[0]
    : companies[0];

  const handleSelectCompany = (id: string) => {
    const company = companies.find(c => c.id === id);
    if (company) {
      navigate(`/projects/${slugify(company.name)}`);
    }
  };

  return (
    <Layout
      companies={companies}
      selectedCompany={selectedCompany}
      onSelectCompany={handleSelectCompany}
      companySlug={slugify(selectedCompany.name)}
    >
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<ErrorBoundary level="route"><Dashboard companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="companies" element={<ErrorBoundary level="route"><Companies /></ErrorBoundary>} />
          <Route path="tasks" element={<ErrorBoundary level="route"><Tasks companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="agents" element={<ErrorBoundary level="route"><Agents companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="agent-health" element={<ErrorBoundary level="route"><AgentHealth companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="health-monitor" element={<ErrorBoundary level="route"><HealthMonitor companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="activity" element={<ErrorBoundary level="route"><Activity companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="finance" element={<ErrorBoundary level="route"><Finance companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="analytics" element={<ErrorBoundary level="route"><Analytics companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="cross-project-analytics" element={<ErrorBoundary level="route"><CrossProjectAnalytics /></ErrorBoundary>} />
          <Route path="costs" element={<ErrorBoundary level="route"><Costs companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="agent-performance" element={<ErrorBoundary level="route"><AgentPerformance companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="logs-view" element={<ErrorBoundary level="route"><Logs /></ErrorBoundary>} />
          <Route path="trace/:traceId" element={<ErrorBoundary level="route"><TraceView /></ErrorBoundary>} />
          <Route path="roadmap" element={<ErrorBoundary level="route"><Roadmap /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary level="route"><Settings companyId={selectedCompany.id} /></ErrorBoundary>} />
          <Route path="tasks/:taskId" element={<ErrorBoundary level="route"><TaskDetail /></ErrorBoundary>} />
          <Route path="logs/:agentName" element={<ErrorBoundary level="route"><AgentLog /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to={`/projects/${slugify(selectedCompany.name)}`} replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgb(24 24 27)',
            border: '1px solid rgb(39 39 42)',
            color: 'rgb(228 228 231)',
          },
          className: 'sonner-toast',
        }}
      />
      <InstallPromptBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<CompanyRoutes />} />
        <Route path="/projects/:companySlug/*" element={<CompanyRoutes />} />
      </Routes>
    </>
  );
}
