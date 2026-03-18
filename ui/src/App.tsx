import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
import AgentHealth from './pages/AgentHealth';
import Companies from './pages/Companies';
import CrossProjectAnalytics from './pages/CrossProjectAnalytics';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import Roadmap from './pages/Roadmap';
import Onboarding from './components/Onboarding';

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: api.getCompanies,
  });

  // Check onboarding status on first load
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const status = await api.getOnboardingStatus();
        if (!status.onboarding_completed && (!companies || companies.length === 0)) {
          setShowOnboarding(true);
          // Track onboarding started
          await api.markOnboardingStarted();
        }
        setOnboardingChecked(true);
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        setOnboardingChecked(true);
      }
    };

    if (!onboardingChecked) {
      checkOnboarding();
    }
  }, [companies, onboardingChecked]);

  // Redirect to first company if no slug provided
  useEffect(() => {
    if (!companySlug && companies && companies.length > 0 && !showOnboarding) {
      const sorted = [...companies].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      navigate(`/${slugify(sorted[0].name)}`, { replace: true });
    }
  }, [companySlug, companies, navigate, showOnboarding]);

  const handleOnboardingComplete = async (companyData: { name: string; goal: string }) => {
    try {
      // Create the company
      const newCompany = await api.createCompany(companyData);

      // Mark onboarding as completed
      await api.markOnboardingCompleted();

      // Refresh companies list
      await queryClient.invalidateQueries({ queryKey: ['companies'] });

      // Close onboarding (will auto-navigate to new company)
      setShowOnboarding(false);

      // Navigate to the new company
      if (newCompany && newCompany.name) {
        navigate(`/${slugify(newCompany.name)}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to create company:', error);
      throw error; // Re-throw to let onboarding component handle it
    }
  };

  const handleOnboardingSkip = async () => {
    try {
      // Mark onboarding as skipped
      await api.markOnboardingSkipped();
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      setShowOnboarding(false);
    }
  };

  if (isLoading || !onboardingChecked) {
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

  // Show onboarding if no companies and onboarding not completed
  if (showOnboarding) {
    return (
      <div className="h-screen bg-zinc-950">
        <Onboarding onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-4">
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">No Companies Found</h2>
          <p className="mb-4 text-sm text-zinc-400">
            Create your first AI company to get started.
          </p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-500"
          >
            Create First Company
          </button>
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
      <Routes>
        <Route path="/" element={<Dashboard companyId={selectedCompany.id} />} />
        <Route path="companies" element={<Companies />} />
        <Route path="tasks" element={<Tasks companyId={selectedCompany.id} />} />
        <Route path="agents" element={<Agents companyId={selectedCompany.id} />} />
        <Route path="agent-health" element={<AgentHealth companyId={selectedCompany.id} />} />
        <Route path="activity" element={<Activity companyId={selectedCompany.id} />} />
        <Route path="finance" element={<Finance companyId={selectedCompany.id} />} />
        <Route path="analytics" element={<Analytics companyId={selectedCompany.id} />} />
        <Route path="cross-project-analytics" element={<CrossProjectAnalytics />} />
        <Route path="costs" element={<Costs companyId={selectedCompany.id} />} />
        <Route path="logs-view" element={<Logs />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="settings" element={<Settings companyId={selectedCompany.id} />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="tasks/:taskId" element={<TaskDetail />} />
        <Route path="logs/:agentName" element={<AgentLog />} />
        <Route path="*" element={<Navigate to={`/${slugify(selectedCompany.name)}`} replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CompanyRoutes />} />
      <Route path="/:companySlug/*" element={<CompanyRoutes />} />
    </Routes>
  );
}
