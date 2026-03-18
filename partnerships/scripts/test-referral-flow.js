#!/usr/bin/env node

/**
 * Test script to simulate the complete referral flow
 *
 * Usage: node test-referral-flow.js
 */

import { ReferralTracker } from '../src/partnerships/referral-tracker.js';

const tracker = new ReferralTracker();

console.log('🧪 Testing referral flow...\n');

// Step 1: Get or create test partners
console.log('Step 1: Setting up test partners...');

const testPartners = [
  { name: 'Test Cursor', type: 'cursor-test', commissionRate: 0.20, payoutEmail: 'test@cursor.com' },
  { name: 'Test v0', type: 'v0-test', commissionRate: 0.20, payoutEmail: 'test@v0.dev' }
];

const partners = [];

for (const partnerData of testPartners) {
  try {
    const partner = tracker.createPartner(partnerData);
    partners.push(partner);
    console.log(`✅ Created test partner: ${partner.name} (${partner.type})`);
  } catch (error) {
    console.log(`⚠️  Partner might already exist: ${partnerData.name}`);
  }
}

// Step 2: Simulate referrals
console.log('\nStep 2: Simulating user referrals...');

const referrals = [];

for (let i = 0; i < 5; i++) {
  const partnerId = partners[i % partners.length].id;
  const partnerType = partners[i % partners.length].type;

  const referral = tracker.trackReferral({
    partnerId,
    userId: `user_${Date.now()}_${i}`,
    sourceUserId: `${partnerType}_user_${i}`,
    utmParams: {
      source: partnerType,
      medium: 'landing-page',
      campaign: 'integration-launch'
    },
    metadata: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      landingPage: `https://hivemind.dev/${partnerType}`
    }
  });

  referrals.push(referral);
  console.log(`✅ Tracked referral #${i + 1}: User ${referral.userId} via ${partnerType}`);
}

// Step 3: Simulate conversions
console.log('\nStep 3: Simulating conversions...');

const plans = ['starter', 'pro', 'enterprise'];
const prices = { starter: 49, pro: 99, enterprise: 299 };

for (let i = 0; i < 3; i++) {
  const referral = referrals[i];
  const plan = plans[i % plans.length];
  const amount = prices[plan];

  const conversion = tracker.trackConversion({
    referralId: referral.id,
    userId: referral.userId,
    plan,
    amount,
    recurring: true
  });

  console.log(`✅ Conversion #${i + 1}: User ${referral.userId} → ${plan} plan ($${amount})`);
  console.log(`   Commission: $${conversion.commission.toFixed(2)}`);
}

// Step 4: Check partner stats
console.log('\nStep 4: Partner stats...\n');

for (const partner of partners) {
  const stats = tracker.getPartnerStats(partner.id);

  console.log(`Partner: ${partner.name}`);
  console.log(`─`.repeat(60));
  console.log(`Referrals: ${stats.total_referrals}`);
  console.log(`Conversions: ${stats.total_conversions}`);
  console.log(`Active MRR: $${stats.active_mrr.toFixed(2)}`);
  console.log(`Total Commissions: $${stats.total_commissions.toFixed(2)}`);
  console.log(`Pending Commissions: $${stats.pending_commissions.toFixed(2)}`);
  console.log(`Paid Commissions: $${stats.paid_commissions.toFixed(2)}`);
  console.log('');
}

// Step 5: Leaderboard
console.log('Step 5: Partner leaderboard...\n');

const leaderboard = tracker.getPartnerLeaderboard(5);

console.log('Rank | Partner              | Referrals | Conversions | Commission');
console.log('─'.repeat(70));

leaderboard.forEach((partner, index) => {
  console.log(
    `${String(index + 1).padStart(4)} | ${partner.name.padEnd(20)} | ${String(partner.total_referrals).padStart(9)} | ${String(partner.total_conversions).padStart(11)} | $${partner.total_commissions.toFixed(2)}`
  );
});

// Step 6: Monthly report
console.log('\n\nStep 6: Monthly commission report...\n');

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;

for (const partner of partners) {
  const report = tracker.getMonthlyReport(partner.id, year, month);

  if (report.length === 0) continue;

  console.log(`${partner.name} - ${year}-${String(month).padStart(2, '0')}`);
  console.log('─'.repeat(70));

  report.forEach((conversion) => {
    console.log(
      `  ${new Date(conversion.converted_at).toLocaleDateString()} | ${conversion.plan.padEnd(10)} | $${conversion.amount.toFixed(2).padStart(7)} | Commission: $${conversion.commission_amount.toFixed(2)} [${conversion.commission_status}]`
    );
  });

  const totalRevenue = report.reduce((sum, c) => sum + c.amount, 0);
  const totalCommission = report.reduce((sum, c) => sum + c.commission_amount, 0);

  console.log('─'.repeat(70));
  console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
  console.log(`Total Commission: $${totalCommission.toFixed(2)}`);
  console.log('');
}

// Step 7: Test commission payout
console.log('Step 7: Testing commission payout...\n');

for (const partner of partners) {
  const stats = tracker.getPartnerStats(partner.id);

  if (stats.pending_commissions > 0) {
    console.log(`Processing payout for ${partner.name}...`);

    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];
    const stripeTransferId = `tr_test_${Date.now()}`;

    const count = tracker.markCommissionsPaid(partner.id, periodStart, periodEnd, stripeTransferId);

    console.log(`✅ Marked ${count} commissions as paid`);
    console.log(`   Stripe Transfer ID: ${stripeTransferId}`);
    console.log(`   Amount: $${stats.pending_commissions.toFixed(2)}\n`);
  }
}

// Step 8: Verify final stats
console.log('Step 8: Final verification...\n');

for (const partner of partners) {
  const stats = tracker.getPartnerStats(partner.id);

  console.log(`${partner.name}:`);
  console.log(`  Pending: $${stats.pending_commissions.toFixed(2)}`);
  console.log(`  Paid: $${stats.paid_commissions.toFixed(2)}`);
  console.log('');
}

tracker.close();

console.log('✅ Referral flow test complete!\n');

console.log('📊 Test Summary:');
console.log(`  - Created ${partners.length} test partners`);
console.log(`  - Tracked ${referrals.length} referrals`);
console.log(`  - Generated 3 conversions`);
console.log(`  - Processed commission payouts`);
console.log('\n💡 Next steps:');
console.log('  1. Review the database at data/partnerships.db');
console.log('  2. Test the partner portal at http://localhost:3100/partners/portal');
console.log('  3. Use the API keys from setup-partners.js to authenticate\n');
