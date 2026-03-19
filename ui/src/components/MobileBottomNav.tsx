import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  Settings as SettingsIcon,
} from 'lucide-react';

interface MobileBottomNavProps {
  companySlug: string;
}

export default function MobileBottomNav({ companySlug }: MobileBottomNavProps) {
  const navItems = [
    { to: `/${companySlug}`, icon: LayoutDashboard, label: 'Dashboard' },
    { to: `/${companySlug}/tasks`, icon: ListTodo, label: 'Tasks' },
    { to: `/${companySlug}/agents`, icon: Users, label: 'Agents' },
    { to: `/${companySlug}/settings`, icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur md:hidden safe-area-inset-bottom">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === `/${companySlug}`}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition min-h-[56px] justify-center active:bg-zinc-800/30 ${
              isActive ? 'text-amber-400' : 'text-zinc-500'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          <span className="mt-0.5">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
