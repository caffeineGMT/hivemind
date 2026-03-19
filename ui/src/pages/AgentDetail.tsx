import { useParams, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Terminal, User, Crown, Monitor, Code2, Palette, DollarSign, Megaphone, Activity, AlertCircle, Cpu, Zap } from 'lucide-react';
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

type Tab = 'output' | 'api-calls' | 'errors' | 'metrics';

export default function AgentDetail({ companyId }: { companyId: string }) {
  const { agentId } = useParams<{ agentId: string }>();

  const [log, setLog] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('output');
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLPreElement>(null);

  // Fetch all agents to find the one we need
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => api.getAgents(companyId),
    enabled: !!companyId,
  });

  // Fetch API calls
  const { data: apiCallsData } = useQuery({
    queryKey: ['agent-api-calls', agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/api-calls`);
      if (!res.ok) throw new Error('Failed to fetch API calls');
      return res.json();
    },
    enabled: !!agentId && activeTab === 'api-calls',
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch errors
  const { data: errorsData } = useQuery({
    queryKey: ['agent-errors', agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/errors`);
      if (!res.ok) throw new Error('Failed to fetch errors');
      return res.json();
    },
    enabled: !!agentId && activeTab === 'errors',
    refetchInterval: 5000,
  });

  // Fetch execution logs
  const { data: executionLogsData } = useQuery({
    queryKey: ['agent-execution-logs', agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/execution-logs`);
      if (!res.ok) throw new Error('Failed to fetch execution logs');
      return res.json();
    },
    enabled: !!agentId && activeTab === 'metrics',
    refetchInterval: 5000,
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
    if (activeTab === 'output') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [log, activeTab]);

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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800/60">
        <button
          onClick={() => setActiveTab('output')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'output'
              ? 'border-b-2 border-amber-500 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Terminal className="h-4 w-4" />
          Live Output
        </button>
        <button
          onClick={() => setActiveTab('api-calls')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'api-calls'
              ? 'border-b-2 border-amber-500 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Activity className="h-4 w-4" />
          API Calls
          {apiCallsData?.count ? (
            <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs">
              {apiCallsData.count}
            </span>
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'errors'
              ? 'border-b-2 border-amber-500 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          Errors
          {errorsData?.count ? (
            <span className="ml-1 rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-400">
              {errorsData.count}
            </span>
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'metrics'
              ? 'border-b-2 border-amber-500 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Cpu className="h-4 w-4" />
          Metrics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'output' && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950">
          <div className="border-b border-zinc-800/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-300">Live Output</h3>
            <p className="mt-0.5 text-xs text-zinc-600">Real-time streaming from agent process</p>
          </div>
          <pre
            ref={containerRef}
            className="max-h-[calc(100vh-420px)] overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-300"
          >
            {log || (
              <span className="text-zinc-600">Waiting for agent output...</span>
            )}
            <div ref={bottomRef} />
          </pre>
        </div>
      )}

      {activeTab === 'api-calls' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {apiCallsData && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <span className="text-xs uppercase tracking-wider text-zinc-600">Total API Calls</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-zinc-100">{apiCallsData.count}</p>
              </div>
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-xs uppercase tracking-wider text-zinc-600">Total Tokens</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-zinc-100">
                  {apiCallsData.total_tokens.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs uppercase tracking-wider text-zinc-600">Total Cost</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-zinc-100">
                  ${apiCallsData.total_cost_usd.toFixed(4)}
                </p>
              </div>
            </div>
          )}

          {/* API Calls List */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950">
            <div className="border-b border-zinc-800/60 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-300">API Call History</h3>
              <p className="mt-0.5 text-xs text-zinc-600">Detailed logs of all Claude API calls</p>
            </div>
            <div className="max-h-[calc(100vh-520px)] overflow-auto">
              {apiCallsData?.api_calls?.length ? (
                <div className="divide-y divide-zinc-800/30">
                  {apiCallsData.api_calls.map((call: any) => (
                    <div key={call.id} className="p-4 hover:bg-zinc-900/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-zinc-500">
                              Turn {call.metadata?.turn}
                            </span>
                            <span className="rounded-full bg-blue-950/40 px-2 py-0.5 text-xs font-medium text-blue-400">
                              {call.metadata?.model || 'unknown'}
                            </span>
                            {call.metadata?.stopReason && (
                              <span className="text-xs text-zinc-600">
                                Stop: {call.metadata.stopReason}
                              </span>
                            )}
                          </div>
                          {call.metadata?.usage && (
                            <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                              <span>
                                In: <span className="font-mono text-zinc-400">{call.metadata.usage.inputTokens}</span>
                              </span>
                              <span>
                                Out: <span className="font-mono text-zinc-400">{call.metadata.usage.outputTokens}</span>
                              </span>
                              {call.metadata.usage.cacheReadTokens > 0 && (
                                <span>
                                  Cache: <span className="font-mono text-zinc-400">{call.metadata.usage.cacheReadTokens}</span>
                                </span>
                              )}
                            </div>
                          )}
                          {call.metadata?.contentSummary && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {call.metadata.contentSummary.map((item: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="rounded bg-zinc-800/60 px-2 py-1 text-xs text-zinc-400"
                                >
                                  {item.type}
                                  {item.name && `: ${item.name}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-600">
                            {new Date(call.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-600">
                  No API calls logged yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950">
          <div className="border-b border-zinc-800/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-300">Error Logs</h3>
            <p className="mt-0.5 text-xs text-zinc-600">Errors encountered during execution</p>
          </div>
          <div className="max-h-[calc(100vh-420px)] overflow-auto">
            {errorsData?.errors?.length ? (
              <div className="divide-y divide-zinc-800/30">
                {errorsData.errors.map((error: any) => (
                  <div key={error.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <span className="font-medium text-red-400">{error.action}</span>
                        </div>
                        {error.metadata?.code && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Code: <span className="font-mono">{error.metadata.code}</span>
                          </p>
                        )}
                        {error.metadata?.stack && (
                          <pre className="mt-2 overflow-x-auto rounded bg-zinc-900 p-2 font-mono text-xs text-zinc-400">
                            {error.metadata.stack}
                          </pre>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-600">
                          {new Date(error.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-600">
                No errors logged
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950">
          <div className="border-b border-zinc-800/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-300">Execution Metrics</h3>
            <p className="mt-0.5 text-xs text-zinc-600">Performance and resource usage</p>
          </div>
          <div className="p-4">
            {executionLogsData?.logs?.length ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg bg-zinc-900/50 p-3">
                    <p className="text-xs text-zinc-600">Total Logs</p>
                    <p className="mt-1 text-xl font-bold text-zinc-100">
                      {executionLogsData.count}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-600">
                No metrics available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
