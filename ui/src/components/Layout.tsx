import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  Activity,
  ChevronDown,
  Hexagon,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Company } from '../api';

interface LayoutProps {
  companies: Company[];
  selectedCompany: Company;
  onSelectCompany: (id: string) => void;
  children: React.ReactNode;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/agents', icon: Users, label: 'Agents' },
  { to: '/activity', icon: Activity, label: 'Activity' },
];

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

export default function Layout({ companies, selectedCompany, onSelectCompany, children }: LayoutProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-zinc-800/60 bg-zinc-925">
        {/* Logo area */}
        <div className="flex items-center gap-2.5 border-b border-zinc-800/60 px-5 py-4">
          <Hexagon className="h-7 w-7 text-amber-500" strokeWidth={1.5} />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-100">Hivemind</h1>
            <p className="text-[11px] text-zinc-500">AI Company Orchestrator</p>
          </div>
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
            <div className="absolute z-50 mt-1 w-[232px] rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onSelectCompany(c.id); setDropdownOpen(false); }}
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
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
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
        <div className="border-t border-zinc-800/60 px-4 py-3">
          <p className="truncate text-[11px] text-zinc-600" title={selectedCompany.goal}>
            Goal: {selectedCompany.goal}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
