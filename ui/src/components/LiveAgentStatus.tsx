import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api, Agent, wsClient } from '../api';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';

interface LiveAgentStatusProps {
  companyId: string;
}

export default function LiveAgentStatus({ companyId }: LiveAgentStatusProps) {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // WebSocket status listener
  useEffect(() => {
    const statusListener = (status: 'connecting' | 'connected' | 'disconnected') => {
      setWsStatus(status);
    };

    wsClient.addStatusListener(statusListener);
    return () => wsClient.removeStatusListener(statusListener);
  }, []);

  // Listen for agent status changes
  useEffect(() => {
    const messageHandler = (event: string, _data: unknown) => {
      if (event === 'agent_status_changed') {
        setLastUpdate(new Date().toLocaleTimeString());
      }
    };

    wsClient.addMessageHandler(messageHandler);
    return () => wsClient.removeMessageHandler(messageHandler);
  }, []);

  const { data: agents } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => api.getAgents(companyId),
  });

  if (!agents) return null;

  const running = agents.filter((a: Agent) => a.status === 'running').length;
  const idle = agents.filter((a: Agent) => a.status === 'idle').length;
  const error = agents.filter((a: Agent) => a.status === 'error').length;

  const statusColor = wsStatus === 'connected' ? 'text-emerald-400' :
                     wsStatus === 'connecting' ? 'text-amber-400' :
                     'text-red-400';

  const statusIcon = wsStatus === 'connected' ? CheckCircle :
                    wsStatus === 'connecting' ? Activity :
                    AlertCircle;

  const StatusIcon = statusIcon;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300">Live Agent Status</h3>
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
          <span className={`text-xs ${statusColor}`}>
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="text-xs text-zinc-500">Running</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{running}</div>
        </div>

        <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/40 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="text-xs text-zinc-500">Idle</span>
          </div>
          <div className="text-2xl font-bold text-zinc-400">{idle}</div>
        </div>

        <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-xs text-zinc-500">Error</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{error}</div>
        </div>
      </div>

      {lastUpdate && wsStatus === 'connected' && (
        <div className="mt-3 pt-3 border-t border-zinc-800/40">
          <p className="text-xs text-zinc-600">
            Last update: <span className="text-zinc-500">{lastUpdate}</span>
          </p>
        </div>
      )}
    </div>
  );
}
