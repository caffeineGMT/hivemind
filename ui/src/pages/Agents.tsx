import { useQuery } from '@tanstack/react-query';
import { api, Agent } from '../api';
import AgentCard from '../components/AgentCard';

export default function Agents({ companyId }: { companyId: string }) {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => api.getAgents(companyId),
    refetchInterval: 3000,
  });

  if (isLoading || !agents) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  // Show leadership (non-engineer) + running engineers. Hide idle engineers.
  const leadership = agents.filter((a: Agent) => a.role !== 'engineer');
  const activeEngineers = agents.filter((a: Agent) => a.role === 'engineer' && a.status === 'running');
  const idleEngineersCount = agents.filter((a: Agent) => a.role === 'engineer' && a.status !== 'running').length;
  const visibleAgents = [...leadership, ...activeEngineers];
  const running = agents.filter((a: Agent) => a.status === 'running').length;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Agents</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {agents.length} agents — {running} running
          {idleEngineersCount > 0 && ` — ${idleEngineersCount} completed engineers hidden`}
        </p>
      </div>

      {visibleAgents.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
          No agents spawned yet
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAgents.map((agent: Agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
