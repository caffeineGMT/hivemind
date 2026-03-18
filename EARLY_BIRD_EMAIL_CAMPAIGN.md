# Early Bird Email Campaign System

Complete email marketing campaign system to convert beta users to paid subscriptions with 30% off for 3 months.

## Overview

**Campaign Goal:** Convert existing beta users (free tier) to paid plans before public launch

**Offer:** 30% off any plan for first 3 months using code `EARLYBETA`

**Timeline:**
- **Day 0:** Initial email sent to all beta users
- **Day 7:** Follow-up email to users who haven't converted

## Pricing Tiers

| Tier | Regular Price | Early Bird (30% off) | 3-Month Savings |
|------|---------------|----------------------|-----------------|
| **Starter** | $49/month | $34.30/month | $44.10 |
| **Pro** | $99/month | $69.30/month | $89.10 |
| **Team** | $199/month | $139.30/month | $179.10 |

## Setup Instructions

### 1. Configure Email Settings

Add SMTP credentials to `.env`:

```bash
# Email Configuration (for campaigns)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
```

**Gmail App Password Setup:**
1. Go to Google Account Settings > Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use that password in SMTP_PASSWORD

### 2. Seed Beta Users (Testing)

Add test beta users to database:

```bash
# Add 10 sample beta users
npm run seed:beta

# Or add custom number
node scripts/seed-beta-users.js --count=50
```

### 3. Preview the Campaign

Preview what will be sent (no emails sent):

```bash
# Preview initial campaign
npm run campaign:preview

# Preview follow-up campaign
npm run campaign:followup:preview
```

### 4. Send Test Email

Test email rendering and delivery:

```bash
# Test initial email
npm run campaign:test

# Test follow-up email
npm run campaign:followup:test

# Or specify custom test email
node scripts/early-bird-campaign.js --test-email=your-email@example.com
```

### 5. Send Campaign

**IMPORTANT:** Double-check everything before sending to real users.

```bash
# Send initial campaign to all beta users
npm run campaign:send

# Wait 7 days, then send follow-up to non-converters
npm run campaign:followup:send
```

## Email Content

### Initial Email (Day 0)

**Subject:** "You helped us build this. Here's 30% off for 3 months."

**Content:**
1. ✅ Thank you for beta testing
2. ✅ We're launching paid tiers
3. ✅ Exclusive offer: EARLYBETA code for 30% off
4. ✅ Pricing: Starter $49, Pro $99, Team $199
5. ✅ What's new since beta:
   - Health Monitoring Dashboard
   - Project Isolation
   - Smart Checkpointing
   - Usage Billing
   - Partnership Program
6. ✅ Social proof (3 testimonials from beta users)
7. ✅ CTA: Claim Your Discount with Code: EARLYBETA
8. ✅ Urgency: Offer expires in 7 days

### Follow-up Email (Day 7)

**Subject:** "⏰ Last Chance: 30% Off Expires Soon (Early Bird)"

**Content:**
1. Last chance reminder
2. 30% off expires soon
3. Why hundreds of developers are upgrading
4. Zero risk - 14-day free trial
5. Final CTA before price increase
6. Note: This is the last email about early-bird pricing

## Campaign Tracking

All emails are tracked in the `email_campaigns` table:

```sql
CREATE TABLE email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  email TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'sent'
);
```

**Campaign Names:**
- `early-bird-2026` — Initial email
- `early-bird-2026-followup` — 7-day follow-up

## Follow-up Logic

The follow-up script automatically:
1. ✅ Finds users who received initial email 7+ days ago
2. ✅ Filters to users still on `free` tier (haven't upgraded)
3. ✅ Skips users who already received follow-up
4. ✅ Sends reminder email with urgency

## Conversion Tracking

To check campaign performance:

```sql
-- Initial campaign stats
SELECT
  COUNT(*) as total_sent,
  COUNT(DISTINCT account_id) as unique_recipients
FROM email_campaigns
WHERE campaign_name = 'early-bird-2026';

-- Follow-up campaign stats
SELECT
  COUNT(*) as total_sent,
  COUNT(DISTINCT account_id) as unique_recipients
FROM email_campaigns
WHERE campaign_name = 'early-bird-2026-followup';

-- Conversion rate (users who upgraded)
SELECT
  COUNT(CASE WHEN tier != 'free' THEN 1 END) as converted,
  COUNT(*) as total_contacted,
  ROUND(100.0 * COUNT(CASE WHEN tier != 'free' THEN 1 END) / COUNT(*), 2) as conversion_rate
FROM accounts a
INNER JOIN email_campaigns ec ON a.id = ec.account_id
WHERE ec.campaign_name = 'early-bird-2026';
```

## Safety Features

### Rate Limiting
- 1 email per second to avoid spam filters
- Compliant with SMTP best practices

### Duplicate Prevention
- Tracks sent emails in database
- Skips users who already received campaign
- Won't send same email twice

### Dry Run Mode
- Default mode is preview-only
- Must explicitly use `--send` flag
- Prevents accidental sends

### Test Mode
- Send to yourself first
- Verify email rendering
- Check all links work

## Landing Page Integration

Campaign emails link to:
```
https://hivemind.dev/pricing?utm_source=email&utm_campaign=early-bird&coupon=EARLYBETA
```

**Requirements for landing page:**
1. Auto-apply `EARLYBETA` coupon code
2. Show 30% discount in pricing
3. Track UTM parameters for attribution
4. Stripe checkout with coupon applied

## Troubleshooting

### Emails not sending
- Check SMTP credentials in `.env`
- Verify Gmail App Password (not regular password)
- Check Gmail "Less secure app access" settings
- Look for error messages in console

### Database not found
- Ensure `HIVEMIND_HOME` environment variable is set
- Default location: `~/.hivemind/hivemind.db`
- Run `npm run seed:beta` to initialize

### No beta users found
- Run `npm run seed:beta` to add test users
- Check database: `sqlite3 ~/.hivemind/hivemind.db "SELECT * FROM accounts WHERE tier = 'free'"`

## Next Steps After Campaign

1. **Day 0:** Send initial campaign
2. **Day 1-6:** Monitor opens/clicks (if tracking added)
3. **Day 7:** Send follow-up to non-converters
4. **Day 8+:** Analyze conversion rate and revenue

## Revenue Projections

Assuming 100 beta users:
- **Conservative (5% conversion):** 5 users × $69/month average = $345 MRR
- **Moderate (10% conversion):** 10 users × $69/month = $690 MRR
- **Optimistic (20% conversion):** 20 users × $69/month = $1,380 MRR

With 30% off for 3 months, then full price after = **$1,380 → $1,971 MRR** after month 4.

## Files

- `scripts/early-bird-campaign.js` — Initial campaign sender
- `scripts/early-bird-followup.js` — 7-day follow-up sender
- `scripts/seed-beta-users.js` — Test user generator
- `.env` — Email configuration

## Support

Questions? Email: michael@hivemind.dev
