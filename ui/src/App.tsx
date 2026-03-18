import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api, Company } from './api';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Agents from './pages/Agents';
import Activity from './pages/Activity';
import AgentLog from './pages/AgentLog';
import TaskDetail from './pages/TaskDetail';
import Finance from './pages/Finance';
import Analytics from './pages/Analytics';
import Billing from './pages/Billing';
import { trackPageView } from './tracking';

function AppRoutes() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const location = useLocation();

  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: api.getCompanies,
  });

  // Auto-select the most recent company
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      const sorted = [...companies].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSelectedCompanyId(sorted[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Track page views
  useEffect(() => {
    trackPageView(location.pathname, selectedCompanyId || undefined);
  }, [location.pathname, selectedCompanyId]);

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
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-4 text-zinc-400">
          No companies found. Start a Hivemind company first.
        </div>
      </div>
    );
  }

  const selectedCompany = companies.find((c: Company) => c.id === selectedCompanyId) || companies[0];

  return (
    <Layout
      companies={companies}
      selectedCompany={selectedCompany}
      onSelectCompany={setSelectedCompanyId}
    >
      <Routes>
        <Route path="/" element={<Dashboard companyId={selectedCompany.id} />} />
        <Route path="/tasks" element={<Tasks companyId={selectedCompany.id} />} />
        <Route path="/agents" element={<Agents companyId={selectedCompany.id} />} />
        <Route path="/activity" element={<Activity companyId={selectedCompany.id} />} />
        <Route path="/finance" element={<Finance companyId={selectedCompany.id} />} />
        <Route path="/analytics" element={<Analytics companyId={selectedCompany.id} />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
        <Route path="/logs/:agentName" element={<AgentLog />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppRoutes />} />
    </Routes>
  );
}
