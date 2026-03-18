import * as db from "./db.js";
import { getDb } from "./db.js";

// Billing tier quotas
export const TIER_QUOTAS = {
  free: {
    monthly_agent_hours_included: 5,
    monthly_api_spend_included: 2,
  },
  pro: {
    monthly_agent_hours_included: 50,
    monthly_api_spend_included: 20,
  },
  team: {
    monthly_agent_hours_included: 200,
    monthly_api_spend_included: 100,
  },
  enterprise: {
    monthly_agent_hours_included: null, // unlimited
    monthly_api_spend_included: null, // unlimited
  },
};

// Overage pricing
export const OVERAGE_PRICING = {
  agent_hour_rate: 2, // $2 per extra agent hour
  api_markup: 0.20, // 20% markup on API costs
};

/**
 * Calculate monthly agent hours for an account
 */
export function calculateMonthlyAgentHours(accountId) {
  const startOfMonth = getStartOfMonth();
  const endOfMonth = getEndOfMonth();

  // Get all cost log entries for this account's companies in the current month
  const result = getDb().prepare(`
    SELECT SUM(duration_ms) as total_duration_ms
    FROM cost_log cl
    JOIN companies c ON cl.company_id = c.id
    JOIN accounts a ON c.account_id = a.id
    WHERE a.id = ?
      AND cl.created_at >= ?
      AND cl.created_at <= ?
  `).get(accountId, startOfMonth, endOfMonth);

  const totalMs = result?.total_duration_ms || 0;
  const hours = totalMs / (1000 * 60 * 60);
  return parseFloat(hours.toFixed(4));
}

/**
 * Calculate monthly API spend for an account
 */
export function calculateMonthlyApiSpend(accountId) {
  const startOfMonth = getStartOfMonth();
  const endOfMonth = getEndOfMonth();

  // Get all cost log entries for this account's companies in the current month
  const result = getDb().prepare(`
    SELECT SUM(cost_usd) as total_cost_usd
    FROM cost_log cl
    JOIN companies c ON cl.company_id = c.id
    JOIN accounts a ON c.account_id = a.id
    WHERE a.id = ?
      AND cl.created_at >= ?
      AND cl.created_at <= ?
  `).get(accountId, startOfMonth, endOfMonth);

  return parseFloat((result?.total_cost_usd || 0).toFixed(4));
}

/**
 * Get overage details for an account
 */
export function getOverages(accountId) {
  const account = getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(accountId);
  if (!account) return null;

  const agentHoursUsed = calculateMonthlyAgentHours(accountId);
  const apiSpendUsed = calculateMonthlyApiSpend(accountId);

  const agentHoursIncluded = account.monthly_agent_hours_included || 0;
  const apiSpendIncluded = account.monthly_api_spend_included || 0;

  // Calculate overages (null means unlimited)
  let agentHoursOverage = 0;
  let apiSpendOverage = 0;

  if (agentHoursIncluded !== null && agentHoursUsed > agentHoursIncluded) {
    agentHoursOverage = agentHoursUsed - agentHoursIncluded;
  }

  if (apiSpendIncluded !== null && apiSpendUsed > apiSpendIncluded) {
    apiSpendOverage = apiSpendUsed - apiSpendIncluded;
  }

  // Calculate overage charges
  const agentHoursCharge = agentHoursOverage * OVERAGE_PRICING.agent_hour_rate;
  const apiSpendCharge = apiSpendOverage * (1 + OVERAGE_PRICING.api_markup);

  return {
    agent_hours: {
      used: agentHoursUsed,
      included: agentHoursIncluded,
      overage: parseFloat(agentHoursOverage.toFixed(4)),
      overage_charge: parseFloat(agentHoursCharge.toFixed(2)),
    },
    api_spend: {
      used: apiSpendUsed,
      included: apiSpendIncluded,
      overage: parseFloat(apiSpendOverage.toFixed(4)),
      overage_charge: parseFloat(apiSpendCharge.toFixed(2)),
    },
    total_overage_charge: parseFloat((agentHoursCharge + apiSpendCharge).toFixed(2)),
    estimated_bill: parseFloat((agentHoursCharge + apiSpendCharge).toFixed(2)),
  };
}

/**
 * Aggregate daily usage for an account (for reporting)
 */
export function aggregateDailyUsage(accountId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const agentHours = getDb().prepare(`
    SELECT SUM(duration_ms) as total_duration_ms
    FROM cost_log cl
    JOIN companies c ON cl.company_id = c.id
    JOIN accounts a ON c.account_id = a.id
    WHERE a.id = ?
      AND cl.created_at >= ?
      AND cl.created_at <= ?
  `).get(accountId, startOfDay.toISOString(), endOfDay.toISOString());

  const apiSpend = getDb().prepare(`
    SELECT SUM(cost_usd) as total_cost_usd
    FROM cost_log cl
    JOIN companies c ON cl.company_id = c.id
    JOIN accounts a ON c.account_id = a.id
    WHERE a.id = ?
      AND cl.created_at >= ?
      AND cl.created_at <= ?
  `).get(accountId, startOfDay.toISOString(), endOfDay.toISOString());

  const totalMs = agentHours?.total_duration_ms || 0;
  const hours = totalMs / (1000 * 60 * 60);
  const spend = apiSpend?.total_cost_usd || 0;

  return {
    date: date.toISOString().split('T')[0],
    agent_hours: parseFloat(hours.toFixed(4)),
    api_spend: parseFloat(spend.toFixed(4)),
  };
}

/**
 * Save daily usage summary to database
 */
export function saveDailyUsageSummary(accountId, date) {
  const summary = aggregateDailyUsage(accountId, date);

  getDb().prepare(`
    INSERT INTO usage_summary (account_id, date, agent_hours, api_spend)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, date) DO UPDATE SET
      agent_hours = excluded.agent_hours,
      api_spend = excluded.api_spend
  `).run(accountId, summary.date, summary.agent_hours, summary.api_spend);

  return summary;
}

/**
 * Get monthly usage summary from aggregated data
 */
export function getMonthlyUsageSummary(accountId) {
  const startOfMonth = getStartOfMonth();

  const result = getDb().prepare(`
    SELECT
      SUM(agent_hours) as total_agent_hours,
      SUM(api_spend) as total_api_spend,
      COUNT(*) as days_with_usage
    FROM usage_summary
    WHERE account_id = ?
      AND date >= ?
  `).get(accountId, startOfMonth.split('T')[0]);

  return {
    agent_hours: parseFloat((result?.total_agent_hours || 0).toFixed(4)),
    api_spend: parseFloat((result?.total_api_spend || 0).toFixed(4)),
    days_with_usage: result?.days_with_usage || 0,
  };
}

/**
 * Check if account is approaching quota limits (for alerts)
 */
export function checkQuotaThresholds(accountId) {
  const account = getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(accountId);
  if (!account) return null;

  const overages = getOverages(accountId);
  if (!overages) return null;

  const alerts = [];

  // Agent hours threshold
  if (account.monthly_agent_hours_included !== null) {
    const hoursUsedPct = (overages.agent_hours.used / account.monthly_agent_hours_included) * 100;

    if (hoursUsedPct >= 100 && overages.agent_hours.overage > 0) {
      alerts.push({
        type: 'overage_started',
        resource: 'agent_hours',
        message: `Agent hours quota exceeded. ${overages.agent_hours.overage.toFixed(2)} hours over quota ($${overages.agent_hours.overage_charge.toFixed(2)} overage charge).`,
      });
    } else if (hoursUsedPct >= 80) {
      alerts.push({
        type: 'quota_warning',
        resource: 'agent_hours',
        message: `Agent hours at ${hoursUsedPct.toFixed(0)}% of quota (${overages.agent_hours.used.toFixed(2)}/${account.monthly_agent_hours_included} hours).`,
      });
    }
  }

  // API spend threshold
  if (account.monthly_api_spend_included !== null) {
    const spendUsedPct = (overages.api_spend.used / account.monthly_api_spend_included) * 100;

    if (spendUsedPct >= 100 && overages.api_spend.overage > 0) {
      alerts.push({
        type: 'overage_started',
        resource: 'api_spend',
        message: `API spend quota exceeded. $${overages.api_spend.overage.toFixed(2)} over quota ($${overages.api_spend.overage_charge.toFixed(2)} overage charge).`,
      });
    } else if (spendUsedPct >= 80) {
      alerts.push({
        type: 'quota_warning',
        resource: 'api_spend',
        message: `API spend at ${spendUsedPct.toFixed(0)}% of quota ($${overages.api_spend.used.toFixed(2)}/$${account.monthly_api_spend_included}).`,
      });
    }
  }

  return {
    account_id: accountId,
    account_email: account.email,
    alerts,
    overages,
  };
}

/**
 * Generate usage export CSV for an account
 */
export function generateUsageExportCSV(accountId, startDate, endDate) {
  const rows = getDb().prepare(`
    SELECT
      cl.created_at,
      c.name as company_name,
      cl.agent_name,
      cl.task_id,
      cl.duration_ms,
      cl.cost_usd,
      cl.input_tokens,
      cl.output_tokens,
      cl.cache_read_tokens,
      cl.cache_write_tokens,
      cl.model
    FROM cost_log cl
    JOIN companies c ON cl.company_id = c.id
    JOIN accounts a ON c.account_id = a.id
    WHERE a.id = ?
      AND cl.created_at >= ?
      AND cl.created_at <= ?
    ORDER BY cl.created_at ASC
  `).all(accountId, startDate, endDate);

  // CSV header
  let csv = 'Timestamp,Company,Agent,Task ID,Duration (hours),Cost (USD),Input Tokens,Output Tokens,Cache Read Tokens,Cache Write Tokens,Model\n';

  // CSV rows
  for (const row of rows) {
    const durationHours = (row.duration_ms / (1000 * 60 * 60)).toFixed(4);
    csv += `${row.created_at},${row.company_name},${row.agent_name},${row.task_id || ''},${durationHours},${row.cost_usd},${row.input_tokens},${row.output_tokens},${row.cache_read_tokens},${row.cache_write_tokens},${row.model || ''}\n`;
  }

  return csv;
}

// Helper functions
function getStartOfMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function getEndOfMonth() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}
