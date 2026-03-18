#!/usr/bin/env node

/**
 * Initialize usage-based billing for all accounts
 * Sets tier quotas based on current account tier
 */

import * as db from "../src/db.js";
import { TIER_QUOTAS } from "../src/usage-tracking.js";

async function initUsageBilling() {
  console.log("Initializing usage-based billing...\n");

  // Get all accounts
  const accounts = db.getDb().prepare("SELECT * FROM accounts").all();

  console.log(`Found ${accounts.length} accounts\n`);

  for (const account of accounts) {
    const tier = account.tier || 'free';
    const quotas = TIER_QUOTAS[tier];

    if (!quotas) {
      console.warn(`⚠️  Unknown tier "${tier}" for account ${account.email}, skipping`);
      continue;
    }

    // Check if quotas are already set
    if (account.monthly_agent_hours_included !== null && account.monthly_api_spend_included !== null) {
      console.log(`✓ ${account.email} (${tier}) - quotas already set`);
      continue;
    }

    // Set quotas
    db.setAccountQuotas(account.id, {
      monthlyAgentHours: quotas.monthly_agent_hours_included,
      monthlyApiSpend: quotas.monthly_api_spend_included,
    });

    console.log(`✓ ${account.email} (${tier}) - set quotas:
   - Agent hours: ${quotas.monthly_agent_hours_included || 'unlimited'} hrs/month
   - API spend: $${quotas.monthly_api_spend_included || 'unlimited'}/month`);
  }

  console.log("\n✅ Usage billing initialization complete!");

  // Print tier summary
  console.log("\n📊 Tier Quotas:");
  console.log("─".repeat(60));
  for (const [tier, quotas] of Object.entries(TIER_QUOTAS)) {
    console.log(`${tier.toUpperCase()}:`);
    console.log(`  Agent hours: ${quotas.monthly_agent_hours_included || 'unlimited'} hrs/month`);
    console.log(`  API spend: $${quotas.monthly_api_spend_included || 'unlimited'}/month`);
    console.log("");
  }

  console.log("📈 Overage Pricing:");
  console.log("  Agent hours: $2/extra hour");
  console.log("  API costs: actual cost + 20% markup\n");
}

// Run initialization
initUsageBilling()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
