import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api, Agent, wsClient } from '../api';
import AgentCard from '../components/AgentCard';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';

export default function Agents({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const swipeHandlers = useSwipeNavigation();
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agents', companyId] });
    },
  });

  // WebSocket status listener
  useEffect(() => {
    const statusListener = (status: 'connecting' | 'connected' | 'disconnected') => {
      setWsStatus(status);
    };

    wsClient.addStatusListener(statusListener);
    return () => wsClient.removeStatusListener(statusListener);
  }, []);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => api.getAgents(companyId),
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
    <div {...swipeHandlers} className="animate-fade-in space-y-6">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
      />
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Agents</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {agents.length} agents — {running} running
          {idleEngineersCount > 0 && ` — ${idleEngineersCount} completed engineers hidden`}
          {wsStatus === 'connected' && (
            <span className="ml-2 text-xs text-emerald-400">• Live</span>
          )}
        </p>
      </div>

      {visibleAgents.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
          No agents spawned yet
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAgents.map((agent: Agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
