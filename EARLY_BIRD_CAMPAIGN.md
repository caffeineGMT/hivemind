# Early Bird Pricing Campaign - Execution Summary

## 🎯 Campaign Goal

Convert free-tier beta users to paid Pro/Team subscriptions with a limited-time 30% discount offer before public launch.

---

## 📊 Campaign Details

### Offer Structure

| Plan | Regular Price | Early Bird Price | Savings (3mo) | Discount |
|------|--------------|------------------|---------------|----------|
| **Pro** | $49/mo | $34.30/mo | $44.10 | 30% off |
| **Team** | $199/mo | $139.30/mo | $179.10 | 30% off |
| **Enterprise** | $999/mo | $699.30/mo | $899.10 | 30% off |

### Key Features

- **Duration:** 30% off for first 3 months, then regular price
- **Trial:** 14-day free trial included
- **Target:** All accounts with `tier = 'free'` in database
- **Urgency:** 7-day deadline creates FOMO
- **Coupon Code:** EARLYBIRD30 (auto-applied via email link)

---

## 🚀 Quick Start (3 Steps)

### 1. Configure Email Service

```bash
# Edit .env file and add:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

**Get Gmail App Password:** [Google Account → Security → 2-Step Verification → App passwords](https://myaccount.google.com/apppasswords)

---

### 2. Test the Campaign

```bash
# Add sample beta users (optional, for testing)
npm run seed:beta

# Send test email to yourself
npm run campaign:test

# Preview who will receive emails (dry run)
npm run campaign:preview
```

---

### 3. Send to All Beta Users

```bash
# Execute the campaign
npm run campaign:send
```

**That's it!** The script will:
- ✅ Find all free-tier accounts
- ✅ Skip users who already received this campaign
- ✅ Send professional HTML emails with 30% off offer
- ✅ Track sends in database (prevents duplicates)
- ✅ Rate limit to 1 email/sec (avoids spam filters)

---

## 📈 Expected Results

### Conversion Metrics (Industry Benchmarks)

For a warm beta user audience:

| Metric | Target | Notes |
|--------|--------|-------|
| Open Rate | 40-50% | High engagement from beta users |
| Click-Through | 15-25% | Strong offer drives clicks |
| Conversion | 10-15% | Free → Paid with discount |
| Unsubscribe | <2% | Keep low by targeting engaged users |

### Revenue Projection (100 Beta Users)

**Conservative Estimate (10% conversion = 10 customers):**

Assuming 70% choose Pro, 30% choose Team:
- 7 Pro × $34.30/mo × 3mo = **$720**
- 3 Team × $139.30/mo × 3mo = **$1,254**
- **Total 3-month revenue: $1,974**

**After discount ends (month 4+):**
- 7 Pro × $49/mo = $343/mo
- 3 Team × $199/mo = $597/mo
- **Recurring: $940/mo = $11,280 ARR**

**Optimistic Estimate (15% conversion = 15 customers):**
- **3-month revenue: $2,961**
- **Recurring ARR: $16,920**

---

## 📧 Email Template Preview

### Subject Line
🚀 Early Bird Pricing: 30% Off Pro & Team (Beta Users Only)

### Key Elements
- Professional dark theme (matches Hivemind branding)
- Mobile-responsive HTML design
- Clear pricing comparison (old vs. new price)
- Savings calculation highlighted
- 7-day urgency with countdown
- Direct CTA button to pricing page
- UTM tracking for conversions

### Email Flow
1. Personalized greeting (uses first name)
2. Thank you for being a beta user
3. Exclusive 30% off offer reveal
4. Pricing cards with visual savings
5. Clear CTA button → pricing page
6. Urgency reminder (7 days)
7. Benefits of upgrading now
8. Personal signature from founder

---

## 🛠️ Technical Implementation

### Files Created

```
scripts/
├── early-bird-campaign.js      # Main campaign script
├── seed-beta-users.js          # Add sample test users
└── README.md                   # Scripts documentation

CAMPAIGN_SETUP.md               # Detailed setup guide
EARLY_BIRD_CAMPAIGN.md          # This file (execution summary)
```

### Database Schema

New table created automatically on first run:

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

**Purpose:** Prevents duplicate sends, tracks campaign performance

---

## 📋 Pre-Launch Checklist

Before running `npm run campaign:send`:

- [ ] Email service configured (Gmail/SendGrid/SES)
- [ ] Test email sent and renders correctly
- [ ] Dry run completed, recipient list accurate
- [ ] Pricing page has EARLYBIRD30 coupon code
- [ ] Support inbox monitored for questions
- [ ] Unsubscribe link functional
- [ ] Database backup created

---

## 🔧 Troubleshooting

### Common Issues

**"Invalid SMTP credentials"**
- Check `.env` file has correct email/password
- Gmail users: Use app password, not regular password

**"No beta users found"**
- Run `npm run seed:beta` to add test accounts
- Or check database: `sqlite3 ~/.hivemind/hivemind.db "SELECT COUNT(*) FROM accounts WHERE tier = 'free';"`

**"Emails going to spam"**
- Use SendGrid/SES instead of Gmail for production
- Add SPF/DKIM DNS records to your domain
- Warm up sending (start with 10-20/day, increase gradually)

**"Campaign already complete"**
- All users already received this campaign
- To resend: Delete tracking records (see CAMPAIGN_SETUP.md)

---

## 📚 Additional Resources

- **Full Setup Guide:** [CAMPAIGN_SETUP.md](./CAMPAIGN_SETUP.md)
- **Scripts Documentation:** [scripts/README.md](./scripts/README.md)
- **Product Hunt Email Templates:** [product-hunt/templates/beta_email.md](./product-hunt/templates/beta_email.md)

---

## 🎨 Customization Options

### Change Discount Percentage

Edit `scripts/early-bird-campaign.js` and update the `PRICING` object:

```javascript
const PRICING = {
  pro: {
    regular: 49,
    earlyBird: 39.20,  // 20% off instead of 30%
    savings: 29.40,
    // ...
  }
}
```

### Modify Email Design

The HTML template is in `createEmailHTML()` function. You can:
- Change colors (search for `#f59e0b` = amber)
- Add testimonials
- Include product screenshots
- Adjust urgency window (7 days → 3 days)
- Add FAQ section

### Target Different User Segments

Edit the SQL query in `runCampaign()`:

```javascript
// Example: Only users who created projects
const accounts = db.prepare(`
  SELECT DISTINCT a.id, a.email, a.created_at
  FROM accounts a
  JOIN companies c ON a.id = c.account_id
  WHERE a.tier = 'free'
`).all();
```

---

## 🔄 Follow-Up Campaigns

### Suggested Timeline

**Day 0:** Initial email sent
**Day 3:** Reminder to users who opened but didn't click
**Day 6:** "Last 24 hours" urgency email
**Day 14:** Post-deadline re-engagement

### Future Campaign Ideas

1. **Product Launch Announcement**
   - Target: All users
   - Goal: Drive Product Hunt upvotes

2. **Feature Update Newsletter**
   - Target: Active users
   - Goal: Increase engagement

3. **Win-back Campaign**
   - Target: Churned users
   - Goal: Re-activate dormant accounts

4. **Referral Program**
   - Target: Pro/Team users
   - Goal: Viral growth

---

## 💡 Best Practices Learned

### Email Design
- Dark theme performs better for developer audience
- Clear pricing comparison (old vs. new) drives conversions
- Urgency works, but don't overdo it (7 days is sweet spot)
- Mobile-first design is critical (60%+ opens on mobile)

### Timing
- Tuesday-Thursday, 10 AM - 2 PM local time = best open rates
- Avoid Monday mornings (inbox overload) and Friday afternoons
- Stagger sends across timezones for global audience

### Copywriting
- Personalization (first name) increases engagement
- Focus on benefits (more agents, bigger budget) not features
- Social proof would boost conversion (add testimonials when available)
- Clear CTA above the fold

---

## 🎯 Success Metrics to Track

### Short-term (Week 1)
- Email delivery rate (target: 99%+)
- Open rate (target: 40-50%)
- Click-through rate (target: 15-25%)
- Unsubscribe rate (target: <2%)

### Medium-term (Week 2-4)
- Conversion rate (target: 10-15%)
- Revenue generated
- Average order value (Pro vs. Team split)
- Trial-to-paid conversion

### Long-term (Month 2-6)
- Retention rate after discount ends
- Churn rate
- Lifetime value (LTV)
- Referral rate from converted users

---

## 📞 Support

Questions or issues?

- 📧 Email: guomaitao@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/caffeineGMT/hivemind/issues)
- 💬 Discord: [Coming Soon]

---

**Built with ❤️ for Hivemind Engine beta users**

Good luck with your campaign launch! 🚀
