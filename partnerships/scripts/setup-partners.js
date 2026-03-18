#!/usr/bin/env node

/**
 * Setup script for creating initial partner accounts
 *
 * Usage: node setup-partners.js
 */

import { ReferralTracker } from '../src/partnerships/referral-tracker.js';

const tracker = new ReferralTracker();

console.log('🚀 Setting up partnership accounts...\n');

// Create partners
const partners = [
  {
    name: 'Cursor',
    type: 'cursor',
    commissionRate: 0.20,
    payoutEmail: 'partnerships@cursor.com'
  },
  {
    name: 'v0.dev',
    type: 'v0',
    commissionRate: 0.20,
    payoutEmail: 'partnerships@vercel.com'
  },
  {
    name: 'bolt.new',
    type: 'bolt',
    commissionRate: 0.25, // Higher rate for first 100 referrals
    payoutEmail: 'partnerships@bolt.new'
  }
];

const createdPartners = [];

for (const partnerData of partners) {
  try {
    console.log(`Creating partner: ${partnerData.name}...`);

    const partner = tracker.createPartner(partnerData);
    createdPartners.push(partner);

    console.log(`✅ Created ${partner.name}`);
    console.log(`   ID: ${partner.id}`);
    console.log(`   API Key: ${partner.apiKey}`);
    console.log(`   Commission Rate: ${partnerData.commissionRate * 100}%\n`);
  } catch (error) {
    console.error(`❌ Error creating ${partnerData.name}:`, error.message);
  }
}

console.log('\n📋 Partner Summary\n');
console.log('═'.repeat(80));

for (const partner of createdPartners) {
  console.log(`
Partner: ${partner.name}
Type: ${partner.type}
Referral Link: https://hivemind.dev/signup?ref=${partner.type}
Partner Portal: https://hivemind.dev/partners/portal
API Key: ${partner.apiKey}

Share this API key with ${partner.name} so they can access their partner portal.
  `.trim());
  console.log('─'.repeat(80));
}

console.log('\n🎯 Next Steps:\n');
console.log('1. Share API keys with partners (via secure channel)');
console.log('2. Activate partners after contract signing:');
console.log('   curl -X POST http://localhost:3100/api/partnerships/partners/{id}/activate');
console.log('3. Set up webhook endpoints for each partner');
console.log('4. Create co-marketing materials (blog posts, webinars)');
console.log('5. Track referrals at: /api/partnerships/leaderboard\n');

tracker.close();

console.log('✨ Setup complete!\n');
