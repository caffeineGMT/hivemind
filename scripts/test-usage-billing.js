#!/usr/bin/env node

/**
 * Test usage-based billing implementation
 * Validates the acceptance criteria: Pro user with 60 hours (50 included + 10 overage) = $20 overage
 */

import * as db from "../src/db.js";
import * as usageTracking from "../src/usage-tracking.js";
import crypto from "node:crypto";

async function testUsageBilling() {
  console.log("🧪 Testing usage-based billing implementation\n");

  // Step 1: Create a test account with Pro tier
  const testAccountId = crypto.randomUUID();
  const testEmail = `test-${Date.now()}@example.com`;

  console.log("1️⃣ Creating test account...");
  db.getDb().prepare(`
    INSERT INTO accounts (id, email, password_hash, tier)
    VALUES (?, ?, ?, ?)
  `).run(testAccountId, testEmail, "test_hash", "pro");

  // Set pro tier quotas
  db.setAccountQuotas(testAccountId, {
    monthlyAgentHours: 50,
    monthlyApiSpend: 20,
  });

  console.log(`   ✓ Created account: ${testEmail} (pro tier)`);
  console.log(`   ✓ Quotas: 50 hrs/month, $20 API/month\n`);

  // Step 2: Create a test company for this account
  const testCompanyId = crypto.randomUUID();
  db.getDb().prepare(`
    INSERT INTO companies (id, name, goal, workspace, account_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(testCompanyId, "Test Company", "Test usage billing", "/tmp/test", testAccountId);

  console.log("2️⃣ Creating test company...");
  console.log(`   ✓ Company: Test Company (${testCompanyId.slice(0, 8)})\n`);

  // Step 3: Simulate 60 hours of agent usage
  console.log("3️⃣ Simulating 60 hours of agent usage...");

  // Create cost log entries totaling 60 hours
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;

  for (let i = 0; i < 60; i++) {
    db.logCost({
      companyId: testCompanyId,
      agentName: "test-agent",
      taskId: null,
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 1500,
      costUsd: 0.05, // Small API cost per hour
      durationMs: oneHourMs, // 1 hour
      numTurns: 1,
      model: "claude-sonnet-4.5",
    });
  }

  console.log(`   ✓ Created 60 cost log entries (1 hour each)\n`);

  // Step 4: Calculate usage and overages
  console.log("4️⃣ Calculating usage and overages...\n");

  const agentHours = usageTracking.calculateMonthlyAgentHours(testAccountId);
  const apiSpend = usageTracking.calculateMonthlyApiSpend(testAccountId);
  const overages = usageTracking.getOverages(testAccountId);

  console.log("📊 Usage Summary:");
  console.log("─".repeat(60));
  console.log(`Agent Hours:`);
  console.log(`  Used: ${overages.agent_hours.used.toFixed(2)} hrs`);
  console.log(`  Included: ${overages.agent_hours.included} hrs`);
  console.log(`  Overage: ${overages.agent_hours.overage.toFixed(2)} hrs`);
  console.log(`  Overage charge: $${overages.agent_hours.overage_charge.toFixed(2)}`);
  console.log("");
  console.log(`API Spend:`);
  console.log(`  Used: $${overages.api_spend.used.toFixed(2)}`);
  console.log(`  Included: $${overages.api_spend.included}`);
  console.log(`  Overage: $${overages.api_spend.overage.toFixed(2)}`);
  console.log(`  Overage charge: $${overages.api_spend.overage_charge.toFixed(2)}`);
  console.log("");
  console.log(`Total Estimated Bill: $${overages.estimated_bill.toFixed(2)}`);
  console.log("─".repeat(60));
  console.log("");

  // Step 5: Validate acceptance criteria
  console.log("5️⃣ Validating acceptance criteria...\n");

  const expectedAgentHours = 60;
  const expectedOverageHours = 10;
  const expectedOverageCharge = 20; // $2 × 10 hours

  let passed = true;

  // Test 1: Agent hours used
  if (Math.abs(overages.agent_hours.used - expectedAgentHours) < 0.1) {
    console.log(`   ✅ Agent hours used: ${overages.agent_hours.used.toFixed(2)} hrs (expected: ${expectedAgentHours})`);
  } else {
    console.log(`   ❌ Agent hours used: ${overages.agent_hours.used.toFixed(2)} hrs (expected: ${expectedAgentHours})`);
    passed = false;
  }

  // Test 2: Overage hours
  if (Math.abs(overages.agent_hours.overage - expectedOverageHours) < 0.1) {
    console.log(`   ✅ Overage hours: ${overages.agent_hours.overage.toFixed(2)} hrs (expected: ${expectedOverageHours})`);
  } else {
    console.log(`   ❌ Overage hours: ${overages.agent_hours.overage.toFixed(2)} hrs (expected: ${expectedOverageHours})`);
    passed = false;
  }

  // Test 3: Overage charge
  if (Math.abs(overages.agent_hours.overage_charge - expectedOverageCharge) < 0.1) {
    console.log(`   ✅ Overage charge: $${overages.agent_hours.overage_charge.toFixed(2)} (expected: $${expectedOverageCharge})`);
  } else {
    console.log(`   ❌ Overage charge: $${overages.agent_hours.overage_charge.toFixed(2)} (expected: $${expectedOverageCharge})`);
    passed = false;
  }

  console.log("");

  // Step 6: Test usage export
  console.log("6️⃣ Testing usage export...\n");

  const startDate = new Date();
  startDate.setDate(1);
  const endDate = new Date();

  const csv = usageTracking.generateUsageExportCSV(
    testAccountId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  const lines = csv.split('\n').filter(l => l.trim());
  console.log(`   ✓ Generated CSV with ${lines.length - 1} rows (${lines.length} total including header)`);
  console.log(`   Preview (first 3 rows):\n`);
  console.log(lines.slice(0, 3).join('\n'));
  console.log("");

  // Step 7: Test quota threshold alerts
  console.log("7️⃣ Testing quota threshold alerts...\n");

  const thresholds = usageTracking.checkQuotaThresholds(testAccountId);
  console.log(`   Alerts triggered: ${thresholds.alerts.length}`);
  for (const alert of thresholds.alerts) {
    console.log(`   ${alert.type === 'overage_started' ? '🔴' : '🟡'} ${alert.resource}: ${alert.message}`);
  }
  console.log("");

  // Cleanup
  console.log("8️⃣ Cleaning up test data...\n");
  db.deleteCompany(testCompanyId);
  db.getDb().prepare("DELETE FROM accounts WHERE id = ?").run(testAccountId);
  console.log("   ✓ Test data cleaned up\n");

  // Final result
  if (passed) {
    console.log("✅ ALL TESTS PASSED!");
    console.log("\n🎉 Acceptance criteria validated:");
    console.log("   Pro user runs agents for 60 hours (50 included + 10 overage)");
    console.log("   Sees $20 overage charge ($2 × 10 hours) in estimated bill");
    process.exit(0);
  } else {
    console.log("❌ SOME TESTS FAILED");
    process.exit(1);
  }
}

// Run tests
testUsageBilling().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
