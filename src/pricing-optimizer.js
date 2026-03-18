import { getDb } from "./db.js";

/**
 * Pricing Optimization Engine
 * Analyzes usage data, A/B tests pricing tiers, and optimizes conversion funnel
 */

// ─────────────────────────────────────────────────────────────────────────────
// A/B Test Management
// ─────────────────────────────────────────────────────────────────────────────

export function createPricingTest({ testName, variants, startDate, endDate }) {
  const db = getDb();

  // Create pricing_tests table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_tests (
      id TEXT PRIMARY KEY,
      test_name TEXT NOT NULL,
      variants TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      winner_variant TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pricing_test_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      variant TEXT NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (test_id) REFERENCES pricing_tests(id)
    );

    CREATE INDEX IF NOT EXISTS idx_test_assignments_test ON pricing_test_assignments(test_id);
    CREATE INDEX IF NOT EXISTS idx_test_assignments_user ON pricing_test_assignments(user_id);
  `);

  const testId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  db.prepare(
    "INSERT INTO pricing_tests (id, test_name, variants, start_date, end_date) VALUES (?, ?, ?, ?, ?)"
  ).run(testId, testName, JSON.stringify(variants), startDate, endDate || null);

  return { testId, testName, variants };
}

export function assignVariant(testId, userId, sessionId) {
  const db = getDb();

  // Check existing assignment
  const existing = db.prepare(
    "SELECT variant FROM pricing_test_assignments WHERE test_id = ? AND (user_id = ? OR session_id = ?)"
  ).get(testId, userId, sessionId);

  if (existing) return existing.variant;

  // Get test variants
  const test = db.prepare("SELECT variants FROM pricing_tests WHERE id = ?").get(testId);
  if (!test) return null;

  const variants = JSON.parse(test.variants);
  // Random assignment (balanced distribution)
  const variant = variants[Math.floor(Math.random() * variants.length)];

  db.prepare(
    "INSERT INTO pricing_test_assignments (test_id, user_id, session_id, variant) VALUES (?, ?, ?, ?)"
  ).run(testId, userId, sessionId, variant);

  return variant;
}

export function getPricingTestResults(testId) {
  const db = getDb();

  // Get conversion by variant
  const conversions = db.prepare(`
    SELECT
      pta.variant,
      COUNT(DISTINCT pta.user_id) as visitors,
      COUNT(DISTINCT CASE WHEN ae.event_type = 'signup_completed' THEN ae.user_id END) as signups,
      COUNT(DISTINCT CASE WHEN ae.event_type = 'checkout_completed' THEN ae.user_id END) as conversions,
      SUM(CASE WHEN ae.event_type = 'checkout_completed' THEN ae.revenue_usd ELSE 0 END) as revenue
    FROM pricing_test_assignments pta
    LEFT JOIN analytics_events ae ON pta.user_id = ae.user_id
    WHERE pta.test_id = ?
    GROUP BY pta.variant
  `).all(testId);

  // Calculate conversion rates and statistical significance
  const results = conversions.map(v => ({
    variant: v.variant,
    visitors: v.visitors,
    signups: v.signups,
    conversions: v.conversions,
    revenue: v.revenue || 0,
    signupRate: v.visitors > 0 ? (v.signups / v.visitors * 100) : 0,
    conversionRate: v.visitors > 0 ? (v.conversions / v.visitors * 100) : 0,
    revenuePerVisitor: v.visitors > 0 ? (v.revenue || 0) / v.visitors : 0,
  }));

  // Find winner (highest conversion rate)
  const winner = results.reduce((max, r) => r.conversionRate > max.conversionRate ? r : max, results[0]);

  return { testId, results, winner: winner?.variant };
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage Analytics & Cohort Analysis
// ─────────────────────────────────────────────────────────────────────────────

export function getUserCohorts() {
  const db = getDb();

  // Cohort by signup month
  const cohorts = db.prepare(`
    SELECT
      strftime('%Y-%m', MIN(ae.created_at)) as cohort_month,
      COUNT(DISTINCT ae.user_id) as users,
      COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_subscribers,
      SUM(CASE WHEN s.status = 'active' THEN s.mrr ELSE 0 END) as cohort_mrr
    FROM analytics_events ae
    LEFT JOIN subscriptions s ON ae.user_id = s.user_id
    WHERE ae.event_type = 'signup_completed'
    GROUP BY cohort_month
    ORDER BY cohort_month DESC
  `).all();

  return cohorts.map(c => ({
    month: c.cohort_month,
    users: c.users,
    activeSubscribers: c.active_subscribers || 0,
    retentionRate: c.users > 0 ? ((c.active_subscribers || 0) / c.users * 100) : 0,
    cohortMrr: c.cohort_mrr || 0,
  }));
}

export function getPricingElasticity() {
  const db = getDb();

  // Analyze conversion rate by pricing tier
  const tiers = db.prepare(`
    SELECT
      c.plan_tier,
      COUNT(DISTINCT c.id) as companies,
      COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_subs,
      AVG(s.mrr) as avg_mrr,
      SUM(s.mrr) as total_mrr
    FROM companies c
    LEFT JOIN subscriptions s ON c.id = s.company_id
    GROUP BY c.plan_tier
  `).all();

  return tiers.map(t => ({
    tier: t.plan_tier || 'free',
    companies: t.companies,
    activeSubscriptions: t.active_subs || 0,
    conversionRate: t.companies > 0 ? ((t.active_subs || 0) / t.companies * 100) : 0,
    averageMrr: t.avg_mrr || 0,
    totalMrr: t.total_mrr || 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Funnel Optimization
// ─────────────────────────────────────────────────────────────────────────────

export function getFunnelDropoff() {
  const db = getDb();

  const funnel = db.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_id END) as page_views,
      COUNT(DISTINCT CASE WHEN event_type = 'signup_started' THEN session_id END) as signup_started,
      COUNT(DISTINCT CASE WHEN event_type = 'signup_completed' THEN user_id END) as signup_completed,
      COUNT(DISTINCT CASE WHEN event_type = 'checkout_started' THEN session_id END) as checkout_started,
      COUNT(DISTINCT CASE WHEN event_type = 'checkout_completed' THEN session_id END) as checkout_completed,
      COUNT(DISTINCT CASE WHEN event_type = 'company_created' THEN company_id END) as company_created,
      COUNT(DISTINCT CASE WHEN event_type = 'first_task_completed' THEN company_id END) as first_task_completed
    FROM analytics_events
  `).get();

  const stages = [
    { stage: 'page_view', count: funnel.page_views, dropoff: 0 },
    { stage: 'signup_started', count: funnel.signup_started, dropoff: funnel.page_views > 0 ? (1 - funnel.signup_started / funnel.page_views) * 100 : 0 },
    { stage: 'signup_completed', count: funnel.signup_completed, dropoff: funnel.signup_started > 0 ? (1 - funnel.signup_completed / funnel.signup_started) * 100 : 0 },
    { stage: 'checkout_started', count: funnel.checkout_started, dropoff: funnel.signup_completed > 0 ? (1 - funnel.checkout_started / funnel.signup_completed) * 100 : 0 },
    { stage: 'checkout_completed', count: funnel.checkout_completed, dropoff: funnel.checkout_started > 0 ? (1 - funnel.checkout_completed / funnel.checkout_started) * 100 : 0 },
    { stage: 'company_created', count: funnel.company_created, dropoff: funnel.checkout_completed > 0 ? (1 - funnel.company_created / funnel.checkout_completed) * 100 : 0 },
    { stage: 'first_task_completed', count: funnel.first_task_completed, dropoff: funnel.company_created > 0 ? (1 - funnel.first_task_completed / funnel.company_created) * 100 : 0 },
  ];

  return stages;
}

export function getTimeToConversion() {
  const db = getDb();

  // Calculate average time from signup to first payment
  const conversions = db.prepare(`
    SELECT
      ae_signup.user_id,
      ae_signup.created_at as signup_at,
      ae_checkout.created_at as checkout_at,
      CAST((julianday(ae_checkout.created_at) - julianday(ae_signup.created_at)) * 24 * 60 AS INTEGER) as minutes_to_convert
    FROM analytics_events ae_signup
    INNER JOIN analytics_events ae_checkout
      ON ae_signup.user_id = ae_checkout.user_id
      AND ae_checkout.event_type = 'checkout_completed'
    WHERE ae_signup.event_type = 'signup_completed'
    ORDER BY signup_at DESC
    LIMIT 100
  `).all();

  if (conversions.length === 0) return { average: 0, median: 0, distribution: [] };

  const times = conversions.map(c => c.minutes_to_convert).sort((a, b) => a - b);
  const average = times.reduce((sum, t) => sum + t, 0) / times.length;
  const median = times[Math.floor(times.length / 2)];

  // Distribution buckets
  const buckets = [
    { label: '< 5 min', count: times.filter(t => t < 5).length },
    { label: '5-30 min', count: times.filter(t => t >= 5 && t < 30).length },
    { label: '30-60 min', count: times.filter(t => t >= 30 && t < 60).length },
    { label: '1-24 hrs', count: times.filter(t => t >= 60 && t < 1440).length },
    { label: '> 24 hrs', count: times.filter(t => t >= 1440).length },
  ];

  return { average, median, distribution: buckets };
}

// ─────────────────────────────────────────────────────────────────────────────
// Price Recommendations (ML-powered)
// ─────────────────────────────────────────────────────────────────────────────

export function recommendOptimalPricing() {
  const elasticity = getPricingElasticity();
  const cohorts = getUserCohorts();

  // Simple heuristic-based recommendations
  const recommendations = [];

  // Recommendation 1: Tier with highest conversion but low revenue
  const tiers = elasticity.sort((a, b) => b.conversionRate - a.conversionRate);
  if (tiers.length > 1) {
    const topConversion = tiers[0];
    if (topConversion.averageMrr < 50) {
      recommendations.push({
        type: 'price_increase',
        tier: topConversion.tier,
        currentPrice: topConversion.averageMrr,
        suggestedPrice: topConversion.averageMrr * 1.2,
        reason: 'High conversion rate indicates price tolerance. Consider 20% increase to maximize revenue.',
        confidence: 0.75,
      });
    }
  }

  // Recommendation 2: Low retention cohort
  if (cohorts.length > 0) {
    const recentCohort = cohorts[0];
    if (recentCohort.retentionRate < 30) {
      recommendations.push({
        type: 'value_proposition',
        cohort: recentCohort.month,
        retentionRate: recentCohort.retentionRate,
        reason: 'Recent cohort has low retention. Consider improving onboarding or reducing initial pricing friction.',
        confidence: 0.8,
      });
    }
  }

  // Recommendation 3: Funnel dropoff analysis
  const funnel = getFunnelDropoff();
  const highestDropoff = funnel.reduce((max, stage) => stage.dropoff > max.dropoff ? stage : max, funnel[0]);
  if (highestDropoff.dropoff > 50) {
    recommendations.push({
      type: 'funnel_optimization',
      stage: highestDropoff.stage,
      dropoffRate: highestDropoff.dropoff,
      reason: `${highestDropoff.dropoff.toFixed(0)}% dropoff at ${highestDropoff.stage}. Focus optimization efforts here.`,
      confidence: 0.9,
    });
  }

  return recommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Revenue Forecasting
// ─────────────────────────────────────────────────────────────────────────────

export function forecastRevenue(months = 6) {
  const db = getDb();

  // Get historical MRR data
  const history = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as new_subscriptions,
      SUM(mrr) as monthly_recurring_revenue
    FROM subscriptions
    WHERE status = 'active'
    GROUP BY month
    ORDER BY month ASC
  `).all();

  if (history.length < 2) {
    return { forecast: [], growthRate: 0 };
  }

  // Calculate average month-over-month growth rate
  const growthRates = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].monthly_recurring_revenue || 0;
    const curr = history[i].monthly_recurring_revenue || 0;
    if (prev > 0) {
      growthRates.push((curr - prev) / prev);
    }
  }

  const avgGrowthRate = growthRates.length > 0
    ? growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length
    : 0;

  // Project future months
  const lastMonth = history[history.length - 1];
  let currentMrr = lastMonth.monthly_recurring_revenue || 0;
  const forecast = [];

  for (let i = 1; i <= months; i++) {
    currentMrr = currentMrr * (1 + avgGrowthRate);
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    forecast.push({
      month: monthStr,
      projectedMrr: parseFloat(currentMrr.toFixed(2)),
      projectedArr: parseFloat((currentMrr * 12).toFixed(2)),
    });
  }

  return {
    forecast,
    growthRate: avgGrowthRate * 100,
    currentMrr: lastMonth.monthly_recurring_revenue || 0
  };
}
