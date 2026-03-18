import * as db from "./db.js";
import * as usageTracking from "./usage-tracking.js";
import nodemailer from "nodemailer";

// Email configuration (using environment variables)
const emailConfig = {
  host: process.env.SMTP_HOST || "smtp.sendgrid.net",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

let transporter = null;

function getTransporter() {
  if (!transporter && emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransporter(emailConfig);
  }
  return transporter;
}

/**
 * Check all accounts for quota thresholds and send alerts
 */
export async function checkAndSendUsageAlerts() {
  try {
    // Get all accounts
    const accounts = db.getDb().prepare("SELECT * FROM accounts").all();

    for (const account of accounts) {
      await checkAccountUsageAndAlert(account.id);
    }
  } catch (err) {
    console.error("[usage-alerts] Error checking usage alerts:", err);
  }
}

/**
 * Check a single account and send alert if needed
 */
export async function checkAccountUsageAndAlert(accountId) {
  try {
    const thresholds = usageTracking.checkQuotaThresholds(accountId);
    if (!thresholds || thresholds.alerts.length === 0) {
      return; // No alerts needed
    }

    const account = db.getAccount(accountId);
    if (!account || !account.email) {
      return;
    }

    // Check if we've already sent an alert today for this account
    const today = new Date().toISOString().split('T')[0];
    const lastAlertSent = await getLastAlertDate(accountId);

    if (lastAlertSent === today) {
      return; // Already sent alert today
    }

    // Send email alert
    await sendUsageAlertEmail(account, thresholds);

    // Record that we sent the alert
    await recordAlertSent(accountId, today, thresholds.alerts);

    console.log(`[usage-alerts] Sent usage alert to ${account.email}`);
  } catch (err) {
    console.error(`[usage-alerts] Error sending alert for account ${accountId}:`, err);
  }
}

/**
 * Send usage alert email
 */
async function sendUsageAlertEmail(account, thresholds) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn("[usage-alerts] Email not configured, skipping alert email");
    return;
  }

  const { alerts, overages } = thresholds;

  // Build email content
  let subject = "Hivemind Usage Alert";
  let htmlContent = `
    <h2>Hivemind Usage Alert</h2>
    <p>Hi,</p>
    <p>We wanted to notify you about your current usage:</p>
    <ul>
  `;

  for (const alert of alerts) {
    htmlContent += `<li><strong>${alert.resource === 'agent_hours' ? 'Agent Hours' : 'API Spend'}:</strong> ${alert.message}</li>`;

    if (alert.type === 'overage_started') {
      subject = "⚠️ Hivemind Overage Charges Started";
    }
  }

  htmlContent += `
    </ul>
    <h3>Current Usage Summary:</h3>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr style="background-color: #f5f5f5;">
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Resource</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Used</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Included</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Overage</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Overage Charge</th>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">Agent Hours</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${overages.agent_hours.used.toFixed(2)} hrs</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${overages.agent_hours.included || '∞'} hrs</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${overages.agent_hours.overage.toFixed(2)} hrs</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; ${overages.agent_hours.overage_charge > 0 ? 'color: red; font-weight: bold;' : ''}">$${overages.agent_hours.overage_charge.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">API Spend</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${overages.api_spend.used.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${overages.api_spend.included || '∞'}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${overages.api_spend.overage.toFixed(2)}</td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; ${overages.api_spend.overage_charge > 0 ? 'color: red; font-weight: bold;' : ''}">$${overages.api_spend.overage_charge.toFixed(2)}</td>
      </tr>
    </table>
  `;

  if (overages.total_overage_charge > 0) {
    htmlContent += `
      <p style="font-size: 18px; margin: 20px 0;">
        <strong>Total Estimated Overage Charges: <span style="color: red;">$${overages.total_overage_charge.toFixed(2)}</span></strong>
      </p>
      <p>These charges will be billed monthly via Paddle.</p>
    `;
  }

  htmlContent += `
    <h3>What to do next:</h3>
    <ul>
      <li>Review your usage and consider optimizing agent workloads</li>
      <li>Upgrade to a higher tier plan to avoid overage charges</li>
      <li>Download detailed usage reports from your dashboard</li>
    </ul>
    <p>
      <a href="${process.env.APP_URL || 'http://localhost:3100'}/dashboard" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
    </p>
    <p>Thanks,<br/>The Hivemind Team</p>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Hivemind" <noreply@hivemind.ai>',
    to: account.email,
    subject,
    html: htmlContent,
  };

  await mailer.sendMail(mailOptions);
}

/**
 * Get the last date an alert was sent for an account
 */
async function getLastAlertDate(accountId) {
  const result = db.getDb().prepare(`
    SELECT date FROM usage_alerts
    WHERE account_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(accountId);

  return result?.date || null;
}

/**
 * Record that an alert was sent
 */
async function recordAlertSent(accountId, date, alerts) {
  db.getDb().prepare(`
    INSERT INTO usage_alerts (account_id, date, alert_type, alert_data)
    VALUES (?, ?, ?, ?)
  `).run(accountId, date, alerts.map(a => a.type).join(','), JSON.stringify(alerts));
}

// Create usage_alerts table if it doesn't exist
export function ensureAlertsTable() {
  db.getDb().exec(`
    CREATE TABLE IF NOT EXISTS usage_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      date TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      alert_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_usage_alerts_account ON usage_alerts(account_id);
    CREATE INDEX IF NOT EXISTS idx_usage_alerts_date ON usage_alerts(date);
  `);
}

// Initialize the alerts table
ensureAlertsTable();
