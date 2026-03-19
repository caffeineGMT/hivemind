import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Users, Activity, Target, Percent } from 'lucide-react';
import ResponsiveTable from '../components/ResponsiveTable';

interface FunnelData {
  page_view: number;
  signup_started: number;
  signup_completed: number;
  checkout_started: number;
  checkout_completed: number;
  company_created: number;
  first_task_completed: number;
}

interface RevenueMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  ltv: number;
  totalRevenue: number;
  activeSubscriptions: number;
}

interface AnalyticsEvent {
  id: number;
  company_id: string | null;
  user_id: string | null;
  session_id: string | null;
  event_type: string;
  event_data: string | null;
  revenue_usd: number;
  created_at: string;
}

async function fetchAnalytics<T>(endpoint: string): Promise<T> {
  const res = await fetch(`/api/analytics/${endpoint}`);
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function MetricCard({ label, value, icon: Icon, color, format }: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  format?: 'currency' | 'percent' | 'number';
}) {
  const formatted = format === 'currency'
    ? formatCurrency(value)
    : format === 'percent'
    ? formatPercent(value)
    : value.toLocaleString();

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${color}`}>
        {formatted}
      </p>
    </div>
  );
}

export default function Analytics({ companyId }: { companyId?: string }) {
  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['analytics-funnel', companyId],
    queryFn: () => fetchAnalytics<FunnelData>(`funnel${companyId ? `?companyId=${companyId}` : ''}`),
    refetchInterval: 10000,
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics-revenue', companyId],
    queryFn: () => fetchAnalytics<RevenueMetrics>(`revenue${companyId ? `?companyId=${companyId}` : ''}`),
    refetchInterval: 10000,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['analytics-events', companyId],
    queryFn: () => fetchAnalytics<AnalyticsEvent[]>(`events${companyId ? `?companyId=${companyId}` : ''}&limit=50`),
    refetchInterval: 10000,
  });

  if (funnelLoading || revenueLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  const funnelSteps = [
    { name: 'Page Views', count: funnel?.page_view || 0, color: 'bg-blue-500' },
    { name: 'Signup Started', count: funnel?.signup_started || 0, color: 'bg-indigo-500' },
    { name: 'Signup Completed', count: funnel?.signup_completed || 0, color: 'bg-purple-500' },
    { name: 'Checkout Started', count: funnel?.checkout_started || 0, color: 'bg-pink-500' },
    { name: 'Checkout Completed', count: funnel?.checkout_completed || 0, color: 'bg-emerald-500' },
    { name: 'Company Created', count: funnel?.company_created || 0, color: 'bg-amber-500' },
    { name: 'First Task Done', count: funnel?.first_task_completed || 0, color: 'bg-green-500' },
  ];

  const maxCount = Math.max(...funnelSteps.map(s => s.count), 1);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Analytics Dashboard</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Conversion metrics and revenue tracking {companyId ? '(filtered by company)' : '(all companies)'}
        </p>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <MetricCard
          label="MRR"
          value={revenue?.mrr || 0}
          icon={DollarSign}
          color="text-emerald-400"
          format="currency"
        />
        <MetricCard
          label="ARR"
          value={revenue?.arr || 0}
          icon={TrendingUp}
          color="text-blue-400"
          format="currency"
        />
        <MetricCard
          label="Total Revenue"
          value={revenue?.totalRevenue || 0}
          icon={DollarSign}
          color="text-purple-400"
          format="currency"
        />
        <MetricCard
          label="Active Subs"
          value={revenue?.activeSubscriptions || 0}
          icon={Users}
          color="text-amber-400"
        />
        <MetricCard
          label="Churn Rate"
          value={revenue?.churnRate || 0}
          icon={Percent}
          color="text-red-400"
          format="percent"
        />
        <MetricCard
          label="LTV"
          value={revenue?.ltv || 0}
          icon={Activity}
          color="text-cyan-400"
          format="currency"
        />
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Conversion Funnel</h3>
        </div>

        <div className="space-y-3">
          {funnelSteps.map((step, idx) => {
            const widthPct = (step.count / maxCount) * 100;
            const prevCount = idx > 0 ? funnelSteps[idx - 1].count : step.count;
            const conversionRate = prevCount > 0 ? (step.count / prevCount) * 100 : 100;

            return (
              <div key={step.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{step.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-300">{step.count.toLocaleString()}</span>
                    {idx > 0 && (
                      <span className="text-zinc-600">
                        ({conversionRate.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 w-full overflow-hidden rounded-lg bg-zinc-800/40">
                  <div
                    className={`h-full ${step.color} transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Events */}
      <ResponsiveTable>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
          <div className="border-b border-zinc-800/40 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-300">
              Recent Events
              <span className="ml-2 text-xs font-normal text-zinc-600">
                ({events?.length || 0})
              </span>
            </h3>
          </div>
          {eventsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
            </div>
          ) : !events || events.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-600">
              No events tracked yet
            </div>
          ) : (
            <div className="max-h-[400px] divide-y divide-zinc-800/20 overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 px-4 py-2.5 min-w-[600px] md:min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 whitespace-nowrap">
                      {event.event_type}
                    </span>
                    {event.event_data && (
                      <span className="text-xs text-zinc-500 hide-mobile">
                        {JSON.stringify(JSON.parse(event.event_data)).slice(0, 100)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {event.revenue_usd > 0 && (
                      <span className="text-xs font-medium text-emerald-400">
                        +{formatCurrency(event.revenue_usd)}
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ResponsiveTable>
    </div>
  );
}
