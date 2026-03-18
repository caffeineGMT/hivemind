import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { api } from '../api';
import {
  TrendingUp,
  DollarSign,
  Target,
  Users,
  AlertCircle,
  Zap,
  Clock,
  Award,
} from 'lucide-react';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Pricing() {
  // Fetch all pricing data
  const { data: cohorts } = useQuery({
    queryKey: ['pricing-cohorts'],
    queryFn: () => api.getPricingCohorts(),
  });

  const { data: elasticity } = useQuery({
    queryKey: ['pricing-elasticity'],
    queryFn: () => api.getPricingElasticity(),
  });

  const { data: funnelDropoff } = useQuery({
    queryKey: ['pricing-funnel-dropoff'],
    queryFn: () => api.getPricingFunnelDropoff(),
  });

  const { data: timeToConversion } = useQuery({
    queryKey: ['pricing-time-to-conversion'],
    queryFn: () => api.getPricingTimeToConversion(),
  });

  const { data: recommendations } = useQuery({
    queryKey: ['pricing-recommendations'],
    queryFn: () => api.getPricingRecommendations(),
  });

  const { data: forecast } = useQuery({
    queryKey: ['pricing-forecast'],
    queryFn: () => api.getPricingForecast(6),
  });

  // Prepare funnel data for visualization
  const funnelData = useMemo(() => {
    if (!funnelDropoff) return [];
    return funnelDropoff.map(stage => ({
      name: stage.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: stage.count,
      dropoff: stage.dropoff,
    }));
  }, [funnelDropoff]);

  // Revenue forecast chart data
  const forecastData = useMemo(() => {
    if (!forecast?.forecast) return [];
    return forecast.forecast.map(f => ({
      month: f.month,
      MRR: f.projectedMrr,
      ARR: f.projectedArr / 1000, // Convert to thousands for readability
    }));
  }, [forecast]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalCohortUsers = cohorts?.reduce((sum, c) => sum + c.users, 0) || 0;
    const totalActiveSubs = cohorts?.reduce((sum, c) => sum + c.activeSubscribers, 0) || 0;
    const overallRetention = totalCohortUsers > 0 ? (totalActiveSubs / totalCohortUsers * 100) : 0;

    const totalCompanies = elasticity?.reduce((sum, e) => sum + e.companies, 0) || 0;
    const totalConversions = elasticity?.reduce((sum, e) => sum + e.activeSubscriptions, 0) || 0;
    const overallConversionRate = totalCompanies > 0 ? (totalConversions / totalCompanies * 100) : 0;

    return {
      retentionRate: overallRetention,
      conversionRate: overallConversionRate,
      avgTimeToConvert: timeToConversion?.average || 0,
      medianTimeToConvert: timeToConversion?.median || 0,
    };
  }, [cohorts, elasticity, timeToConversion]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Pricing Optimization</h1>
        <p className="text-sm text-zinc-400 mt-1">
          CFO Analytics: Usage data, A/B testing, and conversion funnel optimization
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <Users size={16} />
            Retention Rate
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.retentionRate.toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Active subs / Total users
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <Target size={16} />
            Conversion Rate
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.conversionRate.toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Signup → Paid conversion
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <Clock size={16} />
            Avg Time to Convert
          </div>
          <div className="text-2xl font-bold text-white">
            {metrics.avgTimeToConvert < 60
              ? `${Math.round(metrics.avgTimeToConvert)}m`
              : `${(metrics.avgTimeToConvert / 60).toFixed(1)}h`
            }
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Median: {metrics.medianTimeToConvert < 60
              ? `${Math.round(metrics.medianTimeToConvert)}m`
              : `${(metrics.medianTimeToConvert / 60).toFixed(1)}h`}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <TrendingUp size={16} />
            Growth Rate
          </div>
          <div className="text-2xl font-bold text-white">
            {forecast?.growthRate ? `${forecast.growthRate.toFixed(1)}%` : '—'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Month-over-month MRR
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-6">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-4">
            <Award size={20} />
            AI-Powered Pricing Recommendations
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <AlertCircle size={16} className="text-amber-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-white font-medium text-sm mb-1">
                    {rec.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-zinc-400 text-sm">{rec.reason}</div>
                  <div className="text-zinc-500 text-xs mt-1">
                    Confidence: {(rec.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Forecast */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            6-Month Revenue Forecast
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="month"
                stroke="#71717a"
                tick={{ fill: '#71717a' }}
              />
              <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Legend wrapperStyle={{ color: '#a1a1aa' }} />
              <Line
                type="monotone"
                dataKey="MRR"
                stroke="#10b981"
                strokeWidth={2}
                name="MRR ($)"
                dot={{ fill: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="ARR"
                stroke="#3b82f6"
                strokeWidth={2}
                name="ARR ($K)"
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pricing Elasticity by Tier */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={20} />
            Conversion Rate by Tier
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={elasticity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="tier"
                stroke="#71717a"
                tick={{ fill: '#71717a' }}
              />
              <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Legend wrapperStyle={{ color: '#a1a1aa' }} />
              <Bar dataKey="conversionRate" fill="#f59e0b" name="Conversion Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={20} />
            Conversion Funnel
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Funnel dataKey="value" data={funnelData}>
                {funnelData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList
                  position="right"
                  fill="#fff"
                  stroke="none"
                  dataKey="name"
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Cohort Retention */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={20} />
            Cohort Retention by Month
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cohorts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="month"
                stroke="#71717a"
                tick={{ fill: '#71717a' }}
              />
              <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Legend wrapperStyle={{ color: '#a1a1aa' }} />
              <Line
                type="monotone"
                dataKey="retentionRate"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Retention Rate (%)"
                dot={{ fill: '#8b5cf6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Time to Conversion Distribution */}
        {timeToConversion?.distribution && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={20} />
              Time to Conversion Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeToConversion.distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="label"
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                />
                <YAxis stroke="#71717a" tick={{ fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Bar dataKey="count" fill="#ec4899" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Pricing Elasticity Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Pricing Tier Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
                <th className="pb-3 font-medium">Tier</th>
                <th className="pb-3 font-medium">Companies</th>
                <th className="pb-3 font-medium">Active Subs</th>
                <th className="pb-3 font-medium">Conversion Rate</th>
                <th className="pb-3 font-medium">Avg MRR</th>
                <th className="pb-3 font-medium">Total MRR</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {elasticity?.map((tier, idx) => (
                <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 text-white font-medium capitalize">{tier.tier}</td>
                  <td className="py-3 text-zinc-400">{tier.companies}</td>
                  <td className="py-3 text-zinc-400">{tier.activeSubscriptions}</td>
                  <td className="py-3 text-amber-400 font-medium">
                    {tier.conversionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 text-zinc-400">
                    ${tier.averageMrr.toFixed(2)}
                  </td>
                  <td className="py-3 text-green-400 font-medium">
                    ${tier.totalMrr.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
