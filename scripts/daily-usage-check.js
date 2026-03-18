#!/usr/bin/env node

/**
 * Daily usage check and alert job
 * Run this script daily (e.g., via cron) to:
 * 1. Aggregate previous day's usage into daily summaries
 * 2. Check quota thresholds and send alerts
 */

import * as db from "../src/db.js";
import * as usageTracking from "../src/usage-tracking.js";
import * as usageAlerts from "../src/usage-alerts.js";

async function runDailyUsageCheck() {
  console.log(`[${new Date().toISOString()}] Starting daily usage check...`);

  try {
    // Step 1: Aggregate yesterday's usage
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(`\n📊 Aggregating usage for ${yesterday.toISOString().split('T')[0]}...`);

    const accounts = db.getDb().prepare("SELECT id, email FROM accounts").all();
    let aggregated = 0;

    for (const account of accounts) {
      try {
        const summary = usageTracking.saveDailyUsageSummary(account.id, yesterday);
        if (summary.agent_hours > 0 || summary.api_spend > 0) {
          console.log(`  ✓ ${account.email}: ${summary.agent_hours.toFixed(2)} hrs, $${summary.api_spend.toFixed(2)}`);
          aggregated++;
        }
      } catch (err) {
        console.error(`  ✗ ${account.email}: ${err.message}`);
      }
    }

    console.log(`\n✅ Aggregated usage for ${aggregated} accounts\n`);

    // Step 2: Check quota thresholds and send alerts
    console.log("🔔 Checking quota thresholds and sending alerts...");

    await usageAlerts.checkAndSendUsageAlerts();

    console.log("\n✅ Daily usage check complete!\n");
  } catch (err) {
    console.error("\n❌ Error during daily usage check:", err);
    process.exit(1);
  }
}

// Run the job
runDailyUsageCheck()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
