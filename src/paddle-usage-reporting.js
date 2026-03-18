import * as db from "./db.js";
import * as usageTracking from "./usage-tracking.js";

const PADDLE_API_URL = "https://api.paddle.com";
const PADDLE_VENDOR_ID = process.env.PADDLE_VENDOR_ID;
const PADDLE_AUTH_CODE = process.env.PADDLE_AUTH_CODE;

/**
 * Report monthly usage overages to Paddle for billing
 * This should be called at the end of each billing cycle
 */
export async function reportMonthlyUsageToPaddle() {
  try {
    if (!PADDLE_VENDOR_ID || !PADDLE_AUTH_CODE) {
      console.warn("[paddle] Paddle credentials not configured, skipping usage reporting");
      return;
    }

    // Get all accounts with active subscriptions
    const accounts = db.getDb().prepare(`
      SELECT a.*, s.paddle_subscription_id, s.paddle_customer_id
      FROM accounts a
      JOIN subscriptions s ON a.id = s.account_id
      WHERE s.status = 'active'
        AND s.paddle_subscription_id IS NOT NULL
    `).all();

    console.log(`[paddle] Reporting usage for ${accounts.length} accounts`);

    for (const account of accounts) {
      await reportAccountUsageToPaddle(account);
    }

    console.log("[paddle] Usage reporting complete");
  } catch (err) {
    console.error("[paddle] Error reporting usage to Paddle:", err);
    throw err;
  }
}

/**
 * Report a single account's usage to Paddle
 */
export async function reportAccountUsageToPaddle(account) {
  try {
    const overages = usageTracking.getOverages(account.id);
    if (!overages || overages.total_overage_charge === 0) {
      console.log(`[paddle] Account ${account.email} has no overages, skipping`);
      return;
    }

    // Paddle metered billing API call
    // Note: This is a simplified example. Actual Paddle API may differ.
    // See: https://developer.paddle.com/api-reference/subscription-api/usage-based-billing

    const usageData = {
      vendor_id: PADDLE_VENDOR_ID,
      vendor_auth_code: PADDLE_AUTH_CODE,
      subscription_id: account.paddle_subscription_id,
      usage: [
        {
          event_name: "agent_hours_overage",
          quantity: overages.agent_hours.overage,
          unit_price: usageTracking.OVERAGE_PRICING.agent_hour_rate,
        },
        {
          event_name: "api_spend_overage",
          quantity: 1, // Single charge
          unit_price: overages.api_spend.overage_charge,
        },
      ],
    };

    // Make API call to Paddle
    const response = await fetch(`${PADDLE_API_URL}/2.0/subscription/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(usageData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Paddle API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log(`[paddle] Reported usage for ${account.email}:`, result);

    // Log the usage report in database
    logUsageReport(account.id, overages, result);
  } catch (err) {
    console.error(`[paddle] Error reporting usage for account ${account.id}:`, err);
    throw err;
  }
}

/**
 * Log usage report to database
 */
function logUsageReport(accountId, overages, paddleResponse) {
  db.getDb().prepare(`
    INSERT INTO usage_reports (account_id, reporting_period, overage_data, paddle_response)
    VALUES (?, ?, ?, ?)
  `).run(
    accountId,
    new Date().toISOString().slice(0, 7), // YYYY-MM format
    JSON.stringify(overages),
    JSON.stringify(paddleResponse)
  );
}

/**
 * Initialize usage reporting table
 */
export function ensureUsageReportsTable() {
  db.getDb().exec(`
    CREATE TABLE IF NOT EXISTS usage_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      reporting_period TEXT NOT NULL,
      overage_data TEXT NOT NULL,
      paddle_response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_usage_reports_account ON usage_reports(account_id);
    CREATE INDEX IF NOT EXISTS idx_usage_reports_period ON usage_reports(reporting_period);
  `);
}

/**
 * Preview usage charges without sending to Paddle (for testing)
 */
export function previewMonthlyUsageCharges() {
  const accounts = db.getDb().prepare(`
    SELECT a.*, s.paddle_subscription_id
    FROM accounts a
    LEFT JOIN subscriptions s ON a.id = s.account_id
  `).all();

  const preview = [];

  for (const account of accounts) {
    const overages = usageTracking.getOverages(account.id);
    if (overages && overages.total_overage_charge > 0) {
      preview.push({
        account_id: account.id,
        email: account.email,
        tier: account.tier,
        has_subscription: !!account.paddle_subscription_id,
        overages,
      });
    }
  }

  return preview;
}

// Initialize the table
ensureUsageReportsTable();
