import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  ChevronDown,
  Hexagon,
  Menu,
  X,
  HeartPulse,
  Building2,
  BarChart3,
  Settings as SettingsIcon,
  Map,
  Shield,
  Gauge,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Company } from '../api';
import WebSocketStatus from './WebSocketStatus';

interface LayoutProps {
  companies: Company[];
  selectedCompany: Company;
  onSelectCompany: (id: string) => void;
  companySlug: string;
  children: React.ReactNode;
}

function getNavItems(companySlug: string) {
  return [
    { to: `/${companySlug}`, icon: LayoutDashboard, label: 'Dashboard' },
    { to: `/${companySlug}/companies`, icon: Building2, label: 'Companies' },
    { to: `/${companySlug}/tasks`, icon: ListTodo, label: 'Tasks' },
    { to: `/${companySlug}/agents`, icon: Users, label: 'Agents' },
    { to: `/${companySlug}/health-monitor`, icon: Shield, label: 'Health Monitor' },
    { to: `/${companySlug}/activity`, icon: Activity, label: 'Activity' },
    { to: `/${companySlug}/finance`, icon: DollarSign, label: 'Finance' },
    { to: `/${companySlug}/analytics`, icon: TrendingUp, label: 'Analytics' },
    { to: `/${companySlug}/cross-project-analytics`, icon: BarChart3, label: 'Cross-Project' },
    { to: `/${companySlug}/costs`, icon: DollarSign, label: 'Costs' },
    { to: `/${companySlug}/agent-performance`, icon: Gauge, label: 'Agent Performance' },
    { to: `/${companySlug}/roadmap`, icon: Map, label: 'Roadmap' },
    { to: `/${companySlug}/settings`, icon: SettingsIcon, label: 'Settings' },
  ];
}

function statusColor(status: string) {
  switch (status) {
    case 'running':
      return 'bg-emerald-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-zinc-500';
  }
}

export default function Layout({ companies, selectedCompany, onSelectCompany, companySlug, children }: LayoutProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navItems = getNavItems(companySlug);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close sidebar on route change (mobile)
  const closeSidebar = () => setSidebarOpen(false);

  const sidebarContent = (
    <>
      {/* Logo area */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Hexagon className="h-7 w-7 text-amber-500" strokeWidth={1.5} />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-100">Hivemind</h1>
            <p className="text-[11px] text-zinc-500">AI Company Orchestrator</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Company selector */}
      <div className="border-b border-zinc-800/60 px-3 py-3" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm transition hover:border-zinc-700"
        >
          <div className="flex items-center gap-2 truncate">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor(selectedCompany.status)} ${selectedCompany.status === 'running' ? 'animate-pulse-dot' : ''}`} />
            <span className="truncate text-zinc-200">{selectedCompany.name}</span>
          </div>
          {companies.length > 1 && (
            <ChevronDown className={`h-4 w-4 text-zinc-500 transition ${dropdownOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
        {dropdownOpen && companies.length > 1 && (
          <div className="absolute z-50 mt-1 w-[232px] max-h-[60vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelectCompany(c.id); setDropdownOpen(false); closeSidebar(); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-zinc-800 ${
                  c.id === selectedCompany.id ? 'text-amber-400' : 'text-zinc-300'
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor(c.status)}`} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === `/${companySlug}`}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-zinc-800/80 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800/60 px-4 py-3 space-y-2">
        <WebSocketStatus />
        <p className="truncate text-[11px] text-zinc-600" title={selectedCompany.goal}>
          Goal: {selectedCompany.goal}
        </p>
        {(selectedCompany as any).deployment_url && (
          <a
            href={(selectedCompany as any).deployment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-[11px] text-amber-500 hover:text-amber-400"
          >
            Live: {(selectedCompany as any).deployment_url}
          </a>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/95 px-4 backdrop-blur md:hidden safe-area-inset-top">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 transition active:bg-zinc-800 active:text-zinc-200 md:hover:bg-zinc-800 md:hover:text-zinc-200"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-zinc-100">{selectedCompany.name}</span>
        </div>
        <WebSocketStatus />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-800/60 bg-zinc-950 transition-transform duration-200 md:static md:w-64 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur md:hidden safe-area-inset-bottom">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === `/${companySlug}`}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition min-h-[56px] justify-center active:bg-zinc-800/30 ${
                isActive ? 'text-amber-400' : 'text-zinc-500'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="mt-0.5">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
