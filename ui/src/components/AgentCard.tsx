import { User, Crown, Monitor, Code2, Palette, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { Agent } from '../api';

const roleIcon: Record<string, React.ReactNode> = {
  ceo: <Crown className="h-5 w-5 text-amber-400" />,
  cto: <Monitor className="h-5 w-5 text-blue-400" />,
  designer: <Palette className="h-5 w-5 text-purple-400" />,
  engineer: <Code2 className="h-5 w-5 text-emerald-400" />,
};

const roleBg: Record<string, string> = {
  ceo: 'bg-amber-950/30 border-amber-900/30',
  cto: 'bg-blue-950/30 border-blue-900/30',
  designer: 'bg-purple-950/30 border-purple-900/30',
  engineer: 'bg-emerald-950/30 border-emerald-900/30',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className={`rounded-xl border bg-zinc-900/50 p-4 transition hover:border-zinc-700/60 ${roleBg[agent.role] || 'border-zinc-800/60'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800/60">
            {roleIcon[agent.role] || <User className="h-5 w-5 text-zinc-400" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">{agent.title || agent.name}</p>
            <p className="text-xs uppercase tracking-wider text-zinc-500">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {agent.status === 'running' && (
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          )}
          <StatusBadge status={agent.status} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/40 pt-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">PID</p>
            <p className="font-mono text-xs text-zinc-400">{agent.pid ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">Heartbeat</p>
            <p className="font-mono text-xs text-zinc-400">{timeAgo(agent.last_heartbeat)}</p>
          </div>
        </div>
        <span className="font-mono text-[10px] text-zinc-600" title={agent.id}>{agent.id.slice(0, 8)}</span>
      </div>
      <Link
        to={`/logs/${agent.name}`}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800/40 bg-zinc-800/20 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-700/60 hover:bg-zinc-800/40 hover:text-zinc-200"
      >
        <Terminal className="h-3 w-3" />
        View Live Output
      </Link>
    </div>
  );
}
