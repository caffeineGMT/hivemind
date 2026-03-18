import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api, Company } from './api';
import Layout from './components/Layout';
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
import Marketing from './pages/Marketing';

export default function App() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: api.getCompanies,
  });

  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      const sorted = [...companies].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSelectedCompanyId(sorted[0].id);
    }
  }, [companies, selectedCompanyId]);

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
        <Route path="/costs" element={<Costs companyId={selectedCompany.id} />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/logs-view" element={<Logs />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
        <Route path="/logs/:agentName" element={<AgentLog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
