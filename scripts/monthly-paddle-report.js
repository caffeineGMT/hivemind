#!/usr/bin/env node

/**
 * Monthly Paddle usage reporting
 * Run this at the end of each billing cycle to report metered usage to Paddle
 */

import * as paddleReporting from "../src/paddle-usage-reporting.js";

async function runMonthlyReport() {
  console.log(`[${new Date().toISOString()}] Starting monthly Paddle usage report...`);

  try {
    // Preview charges first
    console.log("\n📊 Previewing monthly usage charges...\n");
    const preview = paddleReporting.previewMonthlyUsageCharges();

    if (preview.length === 0) {
      console.log("✓ No accounts with overage charges this month.");
      return;
    }

    console.log(`Found ${preview.length} accounts with overage charges:\n`);
    let totalOverages = 0;

    for (const account of preview) {
      console.log(`${account.email} (${account.tier}):`);
      console.log(`  Agent hours: ${account.overages.agent_hours.overage.toFixed(2)} hrs overage = $${account.overages.agent_hours.overage_charge.toFixed(2)}`);
      console.log(`  API spend: $${account.overages.api_spend.overage.toFixed(2)} overage = $${account.overages.api_spend.overage_charge.toFixed(2)}`);
      console.log(`  Total charge: $${account.overages.total_overage_charge.toFixed(2)}`);
      console.log(`  Has Paddle subscription: ${account.has_subscription ? 'Yes' : 'No'}`);
      console.log("");

      totalOverages += account.overages.total_overage_charge;
    }

    console.log(`Total overage revenue: $${totalOverages.toFixed(2)}\n`);

    // Report to Paddle (if credentials are configured)
    console.log("📤 Reporting usage to Paddle...\n");
    await paddleReporting.reportMonthlyUsageToPaddle();

    console.log("\n✅ Monthly Paddle report complete!\n");
  } catch (err) {
    console.error("\n❌ Error during monthly report:", err);
    process.exit(1);
  }
}

// Run the report
runMonthlyReport()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
