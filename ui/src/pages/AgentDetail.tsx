import { useParams, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Terminal, User, Crown, Monitor, Code2, Palette, DollarSign, Megaphone } from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';

const roleIcon: Record<string, React.ReactNode> = {
  ceo: <Crown className="h-5 w-5 text-amber-400" />,
  cto: <Monitor className="h-5 w-5 text-blue-400" />,
  cfo: <DollarSign className="h-5 w-5 text-emerald-400" />,
  cmo: <Megaphone className="h-5 w-5 text-pink-400" />,
  designer: <Palette className="h-5 w-5 text-purple-400" />,
  engineer: <Code2 className="h-5 w-5 text-emerald-400" />,
};

export default function AgentDetail({ companyId }: { companyId: string }) {
  const { agentId } = useParams<{ agentId: string }>();

  const [log, setLog] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLPreElement>(null);

  // Fetch all agents to find the one we need
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => api.getAgents(companyId),
    enabled: !!companyId,
  });

  const agent = agents?.find(a => a.id === agentId);

  // Set up log streaming when we have the agent name
  useEffect(() => {
    if (!agent?.name) return;

    const evtSource = new EventSource(`/api/logs/${agent.name}/stream`);
    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLog((prev) => prev + data.text);
      } catch {}
    };
    evtSource.onerror = () => {
      // Fallback to polling if SSE fails
      evtSource.close();
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/logs/${agent.name}`);
          if (res.ok) {
            const data = await res.json();
            setLog(data.log || '');
          }
        } catch {}
      }, 2000);
      return () => clearInterval(poll);
    };

    return () => evtSource.close();
  }, [agent?.name]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="flex items-center gap-3">
          <Link
            to="../agents"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-400 transition hover:bg-zinc-700/60 hover:text-zinc-200"
            aria-label="Back to agents"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-xl font-bold text-zinc-100">Agent Not Found</h2>
        </div>
        <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-6 text-center">
          <p className="text-sm text-red-400">
            Could not find agent with ID: <code className="font-mono">{agentId}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header with agent info */}
      <div className="flex items-center gap-3">
        <Link
          to="../agents"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-400 transition hover:bg-zinc-700/60 hover:text-zinc-200"
          aria-label="Back to agents"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800/60" aria-hidden="true">
          {roleIcon[agent.role] || <User className="h-5 w-5 text-zinc-400" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-zinc-100">
              {agent.title || agent.name}
            </h2>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-zinc-500">{agent.role}</span>
            <StatusBadge status={agent.status} />
            {agent.status === 'running' && (
              <span className="rounded-full bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                Live
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Agent metadata */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 md:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Agent ID</p>
          <p className="mt-1 font-mono text-xs text-zinc-400" title={agent.id}>
            {agent.id.slice(0, 8)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">PID</p>
          <p className="mt-1 font-mono text-xs text-zinc-400">{agent.pid ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Name</p>
          <p className="mt-1 font-mono text-xs text-zinc-400">{agent.name}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Last Heartbeat</p>
          <p className="mt-1 font-mono text-xs text-zinc-400">
            {agent.last_heartbeat
              ? new Date(agent.last_heartbeat).toLocaleTimeString()
              : 'Never'}
          </p>
        </div>
      </div>

      {/* Live output */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950">
        <div className="border-b border-zinc-800/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-300">Live Output</h3>
          <p className="mt-0.5 text-xs text-zinc-600">Real-time streaming from agent process</p>
        </div>
        <pre
          ref={containerRef}
          className="max-h-[calc(100vh-320px)] overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-300"
        >
          {log || (
            <span className="text-zinc-600">Waiting for agent output...</span>
          )}
          <div ref={bottomRef} />
        </pre>
      </div>
    </div>
  );
}
