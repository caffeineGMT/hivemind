#!/usr/bin/env node
/**
 * Early Bird Pricing Campaign
 *
 * Sends 30% off offer to beta users (free tier) before public launch.
 * Converts free users to paid Pro/Team subscriptions.
 *
 * Usage:
 *   node scripts/early-bird-campaign.js               # Dry run (preview only)
 *   node scripts/early-bird-campaign.js --send        # Actually send emails
 *   node scripts/early-bird-campaign.js --test-email  # Send test to yourself
 */

import Database from "better-sqlite3";
import nodemailer from "nodemailer";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

// Configuration
const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");
const CAMPAIGN_NAME = "early-bird-2026";

// Email configuration (using Gmail SMTP - replace with your email service)
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "your-email@gmail.com",
    pass: process.env.SMTP_PASSWORD || "your-app-password",
  },
};

// Pricing tiers with early-bird discount (30% off first 3 months)
const PRICING = {
  pro: {
    name: "Pro",
    regular: 49,
    earlyBird: 34.30,
    savings: 44.10,
    features: [
      "Up to 10 AI agents",
      "5 concurrent projects",
      "$500/month AI budget",
      "Priority support",
      "Advanced analytics",
    ],
  },
  team: {
    name: "Team",
    regular: 199,
    earlyBird: 139.30,
    savings: 179.10,
    features: [
      "Up to 50 AI agents",
      "20 concurrent projects",
      "$2,000/month AI budget",
      "Team collaboration",
      "Advanced health monitoring",
    ],
  },
  enterprise: {
    name: "Enterprise",
    regular: 999,
    earlyBird: 699.30,
    savings: 899.10,
    features: [
      "Unlimited agents",
      "Unlimited projects",
      "Unlimited AI budget",
      "White-label options",
      "24/7 premium support",
    ],
  },
};

// Create email HTML template
function createEmailHTML(firstName) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Early Bird Pricing - 30% Off</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0a0a0a;
      color: #e4e4e7;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-radius: 16px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 12px 0;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      font-size: 18px;
      color: #a1a1aa;
      margin: 0;
    }
    .badge {
      display: inline-block;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 20px;
      padding: 8px 16px;
      margin: 20px 0;
      font-size: 14px;
      font-weight: 600;
      color: #fbbf24;
    }
    .content {
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
    }
    p {
      line-height: 1.6;
      margin: 0 0 16px 0;
      color: #d4d4d8;
    }
    .pricing-cards {
      display: grid;
      gap: 16px;
      margin: 32px 0;
    }
    .pricing-card {
      background-color: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 12px;
      padding: 24px;
      transition: all 0.2s;
    }
    .pricing-card.popular {
      border-color: #f59e0b;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%);
    }
    .tier-name {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #fafafa;
    }
    .popular-badge {
      display: inline-block;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #0a0a0a;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
      margin-left: 8px;
      text-transform: uppercase;
    }
    .price-row {
      margin: 16px 0;
    }
    .old-price {
      font-size: 16px;
      color: #71717a;
      text-decoration: line-through;
      margin-right: 12px;
    }
    .new-price {
      font-size: 32px;
      font-weight: 700;
      color: #fbbf24;
    }
    .savings {
      font-size: 14px;
      color: #22c55e;
      font-weight: 600;
      margin-top: 4px;
    }
    .features {
      list-style: none;
      padding: 0;
      margin: 16px 0 0 0;
    }
    .features li {
      padding: 6px 0;
      font-size: 14px;
      color: #a1a1aa;
    }
    .features li:before {
      content: "✓";
      color: #22c55e;
      font-weight: bold;
      margin-right: 8px;
    }
    .cta-button {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #0a0a0a;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      margin: 24px 0;
      transition: all 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(245, 158, 11, 0.3);
    }
    .urgency {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin: 24px 0;
    }
    .urgency strong {
      color: #ef4444;
      font-weight: 700;
    }
    .footer {
      text-align: center;
      color: #71717a;
      font-size: 13px;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #27272a;
    }
    .footer a {
      color: #f59e0b;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚀</div>
      <h1>Early Bird Pricing</h1>
      <p class="subtitle">30% off for our beta users</p>
      <div class="badge">⏰ Limited Time Offer</div>
    </div>

    <div class="content">
      <p>Hi${firstName ? ` ${firstName}` : ''},</p>

      <p><strong>Thank you for being an early Hivemind Engine user.</strong> Your feedback helped us build something special.</p>

      <p>Before we launch publicly, we want to give our beta users an exclusive opportunity:</p>

      <p style="font-size: 18px; font-weight: 600; color: #fbbf24; text-align: center; margin: 24px 0;">
        Get 30% off Pro or Team for your first 3 months
      </p>

      <div class="pricing-cards">
        <!-- Pro Plan (Most Popular) -->
        <div class="pricing-card popular">
          <div class="tier-name">
            Pro
            <span class="popular-badge">Most Popular</span>
          </div>
          <div class="price-row">
            <span class="old-price">$${PRICING.pro.regular}/mo</span>
            <span class="new-price">$${PRICING.pro.earlyBird}/mo</span>
          </div>
          <div class="savings">Save $${PRICING.pro.savings} over 3 months</div>
          <ul class="features">
            ${PRICING.pro.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        <!-- Team Plan -->
        <div class="pricing-card">
          <div class="tier-name">Team</div>
          <div class="price-row">
            <span class="old-price">$${PRICING.team.regular}/mo</span>
            <span class="new-price">$${PRICING.team.earlyBird}/mo</span>
          </div>
          <div class="savings">Save $${PRICING.team.savings} over 3 months</div>
          <ul class="features">
            ${PRICING.team.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      </div>

      <a href="https://hivemind.dev/pricing?utm_source=email&utm_campaign=early-bird&coupon=EARLYBIRD30" class="cta-button">
        Claim Your Discount →
      </a>

      <div class="urgency">
        <strong>⏰ Offer expires in 7 days</strong><br>
        This early-bird pricing is only available to beta users before our public launch.
      </div>

      <p><strong>Why upgrade now?</strong></p>
      <ul style="color: #d4d4d8; line-height: 1.8;">
        <li>Lock in early-bird pricing before launch</li>
        <li>Get 14-day free trial to test Pro/Team features</li>
        <li>Priority support and advanced analytics</li>
        <li>Scale to 10-50 agents for serious projects</li>
        <li>Support development of new features</li>
      </ul>

      <p>Questions? Just reply to this email. We're here to help.</p>

      <p style="margin-top: 32px;">
        Best,<br>
        <strong>Michael</strong><br>
        Founder, Hivemind Engine
      </p>
    </div>

    <div class="footer">
      <p>
        Hivemind Engine<br>
        <a href="https://hivemind.dev">hivemind.dev</a> •
        <a href="https://hivemind.dev/unsubscribe">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Create plain text version
function createEmailText(firstName) {
  return `
Early Bird Pricing - 30% Off for Beta Users
============================================

Hi${firstName ? ` ${firstName}` : ''},

Thank you for being an early Hivemind Engine user. Your feedback helped us build something special.

Before we launch publicly, we want to give our beta users an exclusive opportunity:

🎁 Get 30% off Pro or Team for your first 3 months

PRO PLAN (MOST POPULAR)
- Regular price: $${PRICING.pro.regular}/month
- Early bird price: $${PRICING.pro.earlyBird}/month
- Save $${PRICING.pro.savings} over 3 months
- ${PRICING.pro.features.join('\n- ')}

TEAM PLAN
- Regular price: $${PRICING.team.regular}/month
- Early bird price: $${PRICING.team.earlyBird}/month
- Save $${PRICING.team.savings} over 3 months
- ${PRICING.team.features.join('\n- ')}

Claim your discount:
https://hivemind.dev/pricing?utm_source=email&utm_campaign=early-bird&coupon=EARLYBIRD30

⏰ OFFER EXPIRES IN 7 DAYS
This early-bird pricing is only available to beta users before our public launch.

Why upgrade now?
• Lock in early-bird pricing before launch
• Get 14-day free trial to test Pro/Team features
• Priority support and advanced analytics
• Scale to 10-50 agents for serious projects
• Support development of new features

Questions? Just reply to this email. We're here to help.

Best,
Michael
Founder, Hivemind Engine

---
Hivemind Engine
https://hivemind.dev
Unsubscribe: https://hivemind.dev/unsubscribe
  `.trim();
}

// Track email sends in database
function trackEmailSend(db, accountId, email, campaignName) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        email TEXT NOT NULL,
        campaign_name TEXT NOT NULL,
        sent_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL DEFAULT 'sent'
      );
    `);

    const stmt = db.prepare(`
      INSERT INTO email_campaigns (account_id, email, campaign_name, status)
      VALUES (?, ?, ?, 'sent')
    `);
    stmt.run(accountId, email, campaignName);
  } catch (error) {
    console.error(`Failed to track email for ${email}:`, error.message);
  }
}

// Check if email was already sent
function wasEmailSent(db, accountId, campaignName) {
  try {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM email_campaigns
      WHERE account_id = ? AND campaign_name = ?
    `);
    const result = stmt.get(accountId, campaignName);
    return result.count > 0;
  } catch {
    return false;
  }
}

// Main campaign function
async function runCampaign(options = {}) {
  const { sendEmails = false, testEmail = null } = options;

  // Connect to database
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Get all free-tier accounts
  const accounts = db.prepare(`
    SELECT id, email, created_at FROM accounts
    WHERE tier = 'free'
    ORDER BY created_at ASC
  `).all();

  console.log(`\n📊 Campaign: ${CAMPAIGN_NAME}`);
  console.log(`📧 Found ${accounts.length} beta users (free tier)\n`);

  if (accounts.length === 0) {
    console.log("⚠️  No beta users found. Database might be empty.");
    console.log("💡 Run 'node scripts/seed-beta-users.js' to add test users.\n");
    db.close();
    return;
  }

  // Filter out users who already received this campaign
  const pendingAccounts = accounts.filter(
    (account) => !wasEmailSent(db, account.id, CAMPAIGN_NAME)
  );

  console.log(`✅ ${pendingAccounts.length} users pending (${accounts.length - pendingAccounts.length} already sent)\n`);

  if (pendingAccounts.length === 0 && !testEmail) {
    console.log("✨ Campaign already complete! All beta users have been contacted.\n");
    db.close();
    return;
  }

  // Test email mode
  if (testEmail) {
    console.log(`🧪 TEST MODE: Sending to ${testEmail}\n`);
    const transporter = nodemailer.createTransport(EMAIL_CONFIG);

    const mailOptions = {
      from: `"Hivemind Engine" <${EMAIL_CONFIG.auth.user}>`,
      to: testEmail,
      subject: "🚀 Early Bird Pricing: 30% Off Pro & Team (Beta Users Only)",
      text: createEmailText("Test User"),
      html: createEmailHTML("Test User"),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Test email sent to ${testEmail}\n`);
    } catch (error) {
      console.error(`❌ Failed to send test email: ${error.message}\n`);
    }

    db.close();
    return;
  }

  // Dry run mode (preview only)
  if (!sendEmails) {
    console.log("🔍 DRY RUN MODE (no emails will be sent)\n");
    console.log("Emails to be sent:");
    pendingAccounts.forEach((account, i) => {
      console.log(`  ${i + 1}. ${account.email} (created: ${account.created_at})`);
    });
    console.log(`\n💡 To actually send emails, run: node scripts/early-bird-campaign.js --send\n`);
    db.close();
    return;
  }

  // Actually send emails
  console.log("📤 SENDING EMAILS...\n");
  const transporter = nodemailer.createTransport(EMAIL_CONFIG);

  let successCount = 0;
  let failCount = 0;

  for (const account of pendingAccounts) {
    const firstName = account.email.split("@")[0].split(".")[0];

    const mailOptions = {
      from: `"Hivemind Engine" <${EMAIL_CONFIG.auth.user}>`,
      to: account.email,
      subject: "🚀 Early Bird Pricing: 30% Off Pro & Team (Beta Users Only)",
      text: createEmailText(firstName),
      html: createEmailHTML(firstName),
    };

    try {
      await transporter.sendMail(mailOptions);
      trackEmailSend(db, account.id, account.email, CAMPAIGN_NAME);
      successCount++;
      console.log(`✅ Sent to ${account.email}`);

      // Rate limiting: 1 email per second to avoid spam filters
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      failCount++;
      console.error(`❌ Failed to send to ${account.email}: ${error.message}`);
    }
  }

  console.log(`\n📊 Campaign Results:`);
  console.log(`  ✅ Sent: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📧 Total beta users: ${accounts.length}\n`);

  db.close();
}

// Parse CLI arguments
const args = process.argv.slice(2);
const sendEmails = args.includes("--send");
const testEmailArg = args.find((arg) => arg.startsWith("--test-email="));
const testEmail = testEmailArg ? testEmailArg.split("=")[1] : null;

// Run campaign
runCampaign({ sendEmails, testEmail }).catch((error) => {
  console.error("❌ Campaign failed:", error);
  process.exit(1);
});
