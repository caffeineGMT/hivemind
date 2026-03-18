import { useQuery } from '@tanstack/react-query';
import { DollarSign, Zap, Clock, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { api, CostSummaryEntry } from '../api';

function formatTokens(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(ms: number): string {
  if (!ms) return '0s';
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(0)}s`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)}m`;
  return `${(min / 60).toFixed(1)}h`;
}

function formatCost(usd: number): string {
  if (!usd) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export default function Finance({ companyId }: { companyId: string }) {
  const { data: costData, isLoading: costLoading } = useQuery({
    queryKey: ['costs', companyId],
    queryFn: () => api.getCosts(companyId),
    refetchInterval: 5000,
  });

  const { data: billingData, isLoading: billingLoading } = useQuery({
    queryKey: ['billing', companyId],
    queryFn: () => api.getBilling(companyId),
    refetchInterval: 10000,
  });

  if (costLoading || !costData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const { summary, totals, recent } = costData;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Finance</h2>
        <p className="mt-1 text-sm text-zinc-500">CFO — Token usage and cost tracking</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            Total Cost
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {formatCost(totals?.total_cost_usd || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Total Tokens
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {formatTokens(totals?.total_tokens || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
            Sessions
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-400">
            {totals?.total_sessions || 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5 text-purple-400" />
            Total Time
          </div>
          <p className="mt-1 text-2xl font-bold text-purple-400">
            {formatDuration(totals?.total_duration_ms || 0)}
          </p>
        </div>
      </div>

      {/* Cost by agent */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
        <div className="border-b border-zinc-800/40 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-300">Cost by Agent</h3>
        </div>
        {summary.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-600">
            No cost data yet — costs are tracked when agent sessions complete
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/30 text-xs text-zinc-500">
                  <th className="px-4 py-2 font-medium">Agent</th>
                  <th className="px-4 py-2 font-medium text-right">Sessions</th>
                  <th className="px-4 py-2 font-medium text-right">Input</th>
                  <th className="px-4 py-2 font-medium text-right">Output</th>
                  <th className="px-4 py-2 font-medium text-right">Cache Read</th>
                  <th className="px-4 py-2 font-medium text-right">Total Tokens</th>
                  <th className="px-4 py-2 font-medium text-right">Time</th>
                  <th className="px-4 py-2 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row: CostSummaryEntry) => {
                  const costPct = totals?.total_cost_usd
                    ? ((row.total_cost_usd / totals.total_cost_usd) * 100)
                    : 0;
                  return (
                    <tr key={row.agent_name} className="border-b border-zinc-800/20 hover:bg-zinc-800/20">
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-zinc-200">{row.agent_name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-zinc-400">{row.sessions}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zinc-400">
                        {formatTokens(row.total_input_tokens)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zinc-400">
                        {formatTokens(row.total_output_tokens)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zinc-400">
                        {formatTokens(row.total_cache_read_tokens)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-zinc-400">
                        {formatTokens(row.total_tokens)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-zinc-400">
                        {formatDuration(row.total_duration_ms)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-medium text-emerald-400">{formatCost(row.total_cost_usd)}</span>
                        <span className="ml-1 text-[10px] text-zinc-600">({costPct.toFixed(0)}%)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent sessions */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
        <div className="border-b border-zinc-800/40 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-300">
            Recent Sessions
            <span className="ml-2 text-xs font-normal text-zinc-600">({recent.length})</span>
          </h3>
        </div>
        <div className="max-h-[400px] divide-y divide-zinc-800/20 overflow-y-auto">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-600">No sessions recorded yet</div>
          ) : (
            recent.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-300 text-sm">{entry.agent_name}</span>
                  <span className="text-[10px] text-zinc-600">{entry.created_at}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-zinc-500">{formatTokens(entry.total_tokens)} tok</span>
                  <span className="text-zinc-500">{entry.num_turns} turns</span>
                  <span className="text-zinc-500">{formatDuration(entry.duration_ms)}</span>
                  <span className="font-medium text-emerald-400">{formatCost(entry.cost_usd)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
