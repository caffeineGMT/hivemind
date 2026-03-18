# Early Bird Email Campaign Setup

This guide walks you through setting up and sending the early-bird pricing campaign to convert beta users to paid subscriptions.

---

## 📧 Campaign Overview

**Goal:** Convert free-tier beta users to Pro/Team subscriptions
**Offer:** 30% off for first 3 months ($34.30/mo for Pro, $139.30/mo for Team)
**Target:** All accounts with `tier = 'free'` in the database
**Expected Conversion:** 10-15% of beta users (industry standard for warm email campaigns)

---

## ⚙️ Email Service Configuration

### Option 1: Gmail SMTP (Quick Setup)

1. **Create a Gmail App Password:**
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate an app password for "Mail"
   - Copy the 16-character password

2. **Configure Environment Variables:**

```bash
# Add to .env file
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

**Sending Limits:** Gmail allows ~500 emails/day for free accounts, 2,000/day for Google Workspace.

---

### Option 2: SendGrid (Production Recommended)

1. **Sign up:** [SendGrid Free Tier](https://sendgrid.com/pricing/) (100 emails/day free)

2. **Get API Key:**
   - Dashboard → Settings → API Keys → Create API Key
   - Select "Full Access" permissions

3. **Configure:**

```bash
# Add to .env file
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Sending Limits:** Free: 100/day, Essentials ($20/mo): 50,000/mo

---

### Option 3: Amazon SES (High Volume)

1. **Sign up:** [AWS SES](https://aws.amazon.com/ses/)

2. **Verify Domain:** Follow AWS SES setup guide

3. **Get SMTP Credentials:**
   - SES Console → SMTP Settings → Create SMTP Credentials

4. **Configure:**

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

**Sending Limits:** 62,000 emails/month free (first 12 months), then $0.10/1,000 emails

---

## 🧪 Testing the Campaign

### Step 1: Add Test Users

```bash
# Add 10 sample beta users to database
node scripts/seed-beta-users.js

# Or add more
node scripts/seed-beta-users.js --count=50
```

This creates test accounts with emails like `beta.user1@example.com`, `test.founder@startup.io`, etc.

---

### Step 2: Send Test Email to Yourself

```bash
# Replace with your actual email
node scripts/early-bird-campaign.js --test-email=your-email@gmail.com
```

**What to check:**
- ✅ Email arrives in inbox (not spam)
- ✅ HTML renders correctly on desktop and mobile
- ✅ All links work (pricing page, unsubscribe)
- ✅ Images and styling load properly
- ✅ Subject line is compelling

---

### Step 3: Dry Run (Preview Mode)

```bash
# See who will receive emails without actually sending
node scripts/early-bird-campaign.js
```

Output example:
```
📊 Campaign: early-bird-2026
📧 Found 47 beta users (free tier)
✅ 47 users pending (0 already sent)

🔍 DRY RUN MODE (no emails will be sent)

Emails to be sent:
  1. beta.user1@example.com (created: 2026-02-15 08:23:11)
  2. test.founder@startup.io (created: 2026-02-18 14:35:22)
  ...
```

---

## 🚀 Sending the Campaign

### Send to All Beta Users

```bash
# Actually send emails (production mode)
node scripts/early-bird-campaign.js --send
```

**What happens:**
- ✉️ Sends to all free-tier accounts that haven't received this campaign
- 📊 Tracks sends in `email_campaigns` table (prevents duplicates)
- ⏱️ Rate limiting: 1 email per second (avoids spam filters)
- 📝 Logs success/failure for each send

**Expected output:**
```
📤 SENDING EMAILS...

✅ Sent to beta.user1@example.com
✅ Sent to test.founder@startup.io
✅ Sent to engineer@techco.dev
...

📊 Campaign Results:
  ✅ Sent: 47
  ❌ Failed: 0
  📧 Total beta users: 47
```

---

## 📊 Tracking Results

### Check Email Sends

```bash
sqlite3 ~/.hivemind/hivemind.db "
  SELECT email, campaign_name, sent_at, status
  FROM email_campaigns
  WHERE campaign_name = 'early-bird-2026'
  ORDER BY sent_at DESC;
"
```

### Monitor Conversions

```bash
# Check how many users upgraded
sqlite3 ~/.hivemind/hivemind.db "
  SELECT
    tier,
    COUNT(*) as count
  FROM accounts
  GROUP BY tier;
"
```

---

## 🎯 Expected Conversion Metrics

Based on industry benchmarks for warm email campaigns to engaged users:

| Metric | Target | Notes |
|--------|--------|-------|
| **Open Rate** | 40-50% | Beta users are warm audience |
| **Click-Through Rate** | 15-25% | Strong offer should drive clicks |
| **Conversion Rate** | 10-15% | Free → Paid with 30% discount |
| **Unsubscribe Rate** | <2% | Keep low by targeting engaged users only |

**For 100 beta users:**
- ~45 will open the email
- ~20 will click pricing page
- ~10-15 will upgrade to Pro/Team

**Revenue impact (assuming 10 conversions, 70% Pro / 30% Team):**
- 7 Pro × $34.30/mo × 3 months = **$720**
- 3 Team × $139.30/mo × 3 months = **$1,254**
- **Total: $1,974** in first 3 months
- **After discount ends:** $2,826/mo recurring (~$34K ARR from 10 customers)

---

## 🛡️ Best Practices

### Before Sending

- ✅ Test email renders on Gmail, Outlook, Apple Mail
- ✅ Verify all links work and have UTM tracking
- ✅ Check subject line doesn't trigger spam filters (no ALL CAPS, excessive emojis)
- ✅ Confirm SMTP credentials are correct
- ✅ Review email content for typos/errors
- ✅ Ensure unsubscribe link is functional

### During Send

- 📊 Monitor send progress in terminal
- 🚨 Watch for high failure rates (indicates SMTP issues)
- ⏱️ Don't interrupt the script (sends are tracked, can resume)

### After Send

- 📈 Track open/click rates (if using SendGrid/Mailchimp)
- 💬 Monitor support inbox for questions
- 🔄 Follow up with non-responders after 3-4 days
- 📊 Measure conversion rate after 7 days

---

## 🔧 Troubleshooting

### "Failed to send email: Invalid login"
- **Fix:** Check SMTP credentials in `.env`
- Gmail users: Use app password, not regular password
- SendGrid users: Username must be `apikey` (literally)

### "All emails going to spam"
- **Fix 1:** Warm up your sending domain (start with 10-20 emails/day)
- **Fix 2:** Add SPF/DKIM records to your domain
- **Fix 3:** Use a dedicated email service (SendGrid, SES) instead of Gmail

### "No beta users found"
- **Fix:** Run `node scripts/seed-beta-users.js` to add test accounts
- Or check database path: `echo $HIVEMIND_HOME`

### "Campaign already complete"
- **Info:** All users have already received this campaign
- **To resend:** Delete tracking records:
  ```bash
  sqlite3 ~/.hivemind/hivemind.db "DELETE FROM email_campaigns WHERE campaign_name = 'early-bird-2026';"
  ```

---

## 📧 Email Content Summary

**Subject:** 🚀 Early Bird Pricing: 30% Off Pro & Team (Beta Users Only)

**Key Points:**
- Thank you for being a beta user
- Exclusive 30% off offer (not available to public)
- Clear pricing breakdown with savings calculation
- 7-day urgency (limited time offer)
- 14-day free trial to test features risk-free
- Direct CTA to pricing page with auto-applied coupon

**Design:**
- Dark theme (matches Hivemind brand)
- Mobile-responsive
- Clear visual hierarchy
- Professional gradient buttons
- Testimonial-ready (can add social proof)

---

## 🎨 Customization

### Change Discount Amount

Edit `scripts/early-bird-campaign.js`:

```javascript
const PRICING = {
  pro: {
    regular: 49,
    earlyBird: 39.20,  // 20% off instead of 30%
    savings: 29.40,    // Recalculate
    // ...
  }
}
```

### Extend/Shorten Urgency Window

Edit email template:

```html
<strong>⏰ Offer expires in 3 days</strong>  <!-- Change 7 to 3 -->
```

### Add Testimonials

Insert before the urgency block:

```html
<div style="background: #27272a; padding: 20px; border-left: 4px solid #f59e0b; margin: 24px 0;">
  <p style="font-style: italic; margin: 0 0 8px 0;">
    "Hivemind helped me launch my SaaS in 48 hours. Incredible."
  </p>
  <p style="font-size: 13px; color: #71717a; margin: 0;">
    — Jane Doe, Founder @ StartupCo
  </p>
</div>
```

---

## 📈 Follow-Up Campaign Ideas

### Day 3: Reminder Email
- Subject: "⏰ 4 days left: 30% off ending soon"
- Target: Users who opened but didn't click

### Day 7: Last Chance
- Subject: "🚨 Final hours: Early bird pricing expires tonight"
- Target: All non-converters

### Day 14: Post-Launch Re-Engagement
- Subject: "What held you back? Let's chat"
- Target: Users who didn't respond to any emails
- Offer: Personal demo call or extended trial

---

## 💡 Tips for Maximum Conversion

1. **Timing Matters:** Send Tuesday-Thursday, 10 AM - 2 PM local time
2. **Personalization:** Email uses first name extracted from email address
3. **Clear Value:** Focus on benefits (more agents, bigger budget) not features
4. **Social Proof:** Add testimonials or "Join 500+ founders" badge
5. **Urgency:** 7-day deadline creates FOMO without being pushy
6. **Risk Reversal:** 14-day free trial + 30-day refund removes buyer hesitation

---

## ✅ Pre-Launch Checklist

Before running `--send`:

- [ ] SMTP credentials configured in `.env`
- [ ] Test email sent to yourself and renders correctly
- [ ] Dry run completed, recipient list looks accurate
- [ ] Pricing page live with EARLYBIRD30 coupon code
- [ ] Support inbox ready for incoming questions
- [ ] Analytics/tracking set up (UTM params in links)
- [ ] Unsubscribe page functional
- [ ] Database backup created (just in case)

---

## 🎯 Campaign Launch Command

When ready:

```bash
# Final check
node scripts/early-bird-campaign.js

# Send it!
node scripts/early-bird-campaign.js --send
```

Good luck! 🚀
