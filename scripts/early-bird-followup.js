#!/usr/bin/env node
/**
 * Early Bird Follow-up Campaign
 *
 * Sends follow-up email 7 days after initial early-bird email to users who haven't converted.
 * Only sends to users who are still on free tier (haven't upgraded).
 *
 * Usage:
 *   node scripts/early-bird-followup.js               # Dry run (preview only)
 *   node scripts/early-bird-followup.js --send        # Actually send emails
 *   node scripts/early-bird-followup.js --test-email  # Send test to yourself
 */

import Database from "better-sqlite3";
import nodemailer from "nodemailer";
import path from "node:path";
import os from "node:os";

// Configuration
const HIVEMIND_HOME = process.env.HIVEMIND_HOME || path.join(os.homedir(), ".hivemind");
const DB_PATH = path.join(HIVEMIND_HOME, "hivemind.db");
const INITIAL_CAMPAIGN = "early-bird-2026";
const FOLLOWUP_CAMPAIGN = "early-bird-2026-followup";
const DAYS_AFTER_INITIAL = 7;

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "your-email@gmail.com",
    pass: process.env.SMTP_PASSWORD || "your-app-password",
  },
};

// Create follow-up email HTML template
function createFollowupHTML(firstName) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Last Chance: Early Bird 30% Off</title>
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
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 20px;
      padding: 8px 16px;
      margin: 20px 0;
      font-size: 14px;
      font-weight: 600;
      color: #ef4444;
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
    .highlight-box {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
      border: 2px solid #ef4444;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }
    .big-number {
      font-size: 48px;
      font-weight: 700;
      color: #ef4444;
      margin: 0;
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
      <div class="logo">⏰</div>
      <h1>Last Chance</h1>
      <p class="subtitle">Your 30% discount expires soon</p>
      <div class="badge">🔥 Final Reminder</div>
    </div>

    <div class="content">
      <p>Hi${firstName ? ` ${firstName}` : ''},</p>

      <p>Quick reminder: Your exclusive early-bird discount expires in just a few days.</p>

      <div class="highlight-box">
        <p class="big-number">30% OFF</p>
        <p style="font-size: 18px; font-weight: 600; color: #fbbf24; margin: 8px 0;">
          For your first 3 months
        </p>
        <p style="color: #a1a1aa; margin: 0;">
          Use code: <strong style="color: #fbbf24;">EARLYBETA</strong>
        </p>
      </div>

      <p><strong>Why hundreds of developers are upgrading:</strong></p>
      <ul style="color: #d4d4d8; line-height: 1.8;">
        <li><strong>Ship 10x faster</strong> — AI agents build, deploy, and iterate 24/7</li>
        <li><strong>Save weeks of work</strong> — Beta users built MVPs in 48 hours</li>
        <li><strong>Pay less than a coffee</strong> — Starter plan is just $34/month with early-bird discount</li>
        <li><strong>Zero risk</strong> — 14-day free trial, cancel anytime</li>
      </ul>

      <a href="https://hivemind.dev/pricing?utm_source=email&utm_campaign=early-bird-followup&coupon=EARLYBETA" class="cta-button">
        Claim 30% Off Before It Expires →
      </a>

      <p style="font-size: 14px; color: #71717a; text-align: center; margin-top: 24px;">
        This is the last email about early-bird pricing. After launch, pricing goes up and this discount won't be available.
      </p>

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
function createFollowupText(firstName) {
  return `
Last Chance: Your 30% Discount Expires Soon
============================================

Hi${firstName ? ` ${firstName}` : ''},

Quick reminder: Your exclusive early-bird discount expires in just a few days.

🔥 30% OFF FOR YOUR FIRST 3 MONTHS
Use code: EARLYBETA

Why hundreds of developers are upgrading:
• Ship 10x faster — AI agents build, deploy, and iterate 24/7
• Save weeks of work — Beta users built MVPs in 48 hours
• Pay less than a coffee — Starter plan is just $34/month with early-bird discount
• Zero risk — 14-day free trial, cancel anytime

Claim your discount:
https://hivemind.dev/pricing?utm_source=email&utm_campaign=early-bird-followup&coupon=EARLYBETA

This is the last email about early-bird pricing. After launch, pricing goes up and this discount won't be available.

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

// Main follow-up function
async function runFollowup(options = {}) {
  const { sendEmails = false, testEmail = null } = options;

  // Connect to database
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Get accounts that:
  // 1. Received initial campaign 7+ days ago
  // 2. Are still on free tier (haven't upgraded)
  // 3. Haven't received follow-up yet
  const eligibleAccounts = db.prepare(`
    SELECT a.id, a.email, a.created_at, ec.sent_at
    FROM accounts a
    INNER JOIN email_campaigns ec ON a.id = ec.account_id
    WHERE a.tier = 'free'
      AND ec.campaign_name = ?
      AND julianday('now') - julianday(ec.sent_at) >= ?
    ORDER BY ec.sent_at ASC
  `).all(INITIAL_CAMPAIGN, DAYS_AFTER_INITIAL);

  console.log(`\n📊 Follow-up Campaign: ${FOLLOWUP_CAMPAIGN}`);
  console.log(`📧 Found ${eligibleAccounts.length} eligible users (received initial email ${DAYS_AFTER_INITIAL}+ days ago, still on free tier)\n`);

  if (eligibleAccounts.length === 0) {
    console.log("⚠️  No eligible users found.");
    console.log("💡 Users must have received initial campaign 7+ days ago and still be on free tier.\n");
    db.close();
    return;
  }

  // Filter out users who already received follow-up
  const pendingAccounts = eligibleAccounts.filter(
    (account) => !wasEmailSent(db, account.id, FOLLOWUP_CAMPAIGN)
  );

  console.log(`✅ ${pendingAccounts.length} users pending (${eligibleAccounts.length - pendingAccounts.length} already sent)\n`);

  if (pendingAccounts.length === 0 && !testEmail) {
    console.log("✨ Follow-up campaign already complete!\n");
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
      subject: "⏰ Last Chance: 30% Off Expires Soon (Early Bird)",
      text: createFollowupText("Test User"),
      html: createFollowupHTML("Test User"),
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
    console.log("Follow-up emails to be sent:");
    pendingAccounts.forEach((account, i) => {
      const daysAgo = Math.floor((new Date() - new Date(account.sent_at)) / (1000 * 60 * 60 * 24));
      console.log(`  ${i + 1}. ${account.email} (initial email sent ${daysAgo} days ago)`);
    });
    console.log(`\n💡 To actually send emails, run: node scripts/early-bird-followup.js --send\n`);
    db.close();
    return;
  }

  // Actually send emails
  console.log("📤 SENDING FOLLOW-UP EMAILS...\n");
  const transporter = nodemailer.createTransport(EMAIL_CONFIG);

  let successCount = 0;
  let failCount = 0;

  for (const account of pendingAccounts) {
    const firstName = account.email.split("@")[0].split(".")[0];

    const mailOptions = {
      from: `"Hivemind Engine" <${EMAIL_CONFIG.auth.user}>`,
      to: account.email,
      subject: "⏰ Last Chance: 30% Off Expires Soon (Early Bird)",
      text: createFollowupText(firstName),
      html: createFollowupHTML(firstName),
    };

    try {
      await transporter.sendMail(mailOptions);
      trackEmailSend(db, account.id, account.email, FOLLOWUP_CAMPAIGN);
      successCount++;
      console.log(`✅ Sent to ${account.email}`);

      // Rate limiting: 1 email per second
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      failCount++;
      console.error(`❌ Failed to send to ${account.email}: ${error.message}`);
    }
  }

  console.log(`\n📊 Follow-up Results:`);
  console.log(`  ✅ Sent: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}\n`);

  db.close();
}

// Parse CLI arguments
const args = process.argv.slice(2);
const sendEmails = args.includes("--send");
const testEmailArg = args.find((arg) => arg.startsWith("--test-email="));
const testEmail = testEmailArg ? testEmailArg.split("=")[1] : null;

// Run follow-up
runFollowup({ sendEmails, testEmail }).catch((error) => {
  console.error("❌ Follow-up failed:", error);
  process.exit(1);
});
