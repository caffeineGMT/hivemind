# Early Bird Campaign - Quick Start Guide

**Goal:** Email beta users with 30% off offer to convert free → paid before public launch.

---

## ⚡ 60-Second Setup

### 1. Configure Email (Gmail)

Add to `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Get App Password:** [Google Account](https://myaccount.google.com/apppasswords) → Security → App passwords

---

### 2. Test

```bash
# Send test email to yourself
npm run campaign:test

# Preview recipients (no emails sent)
npm run campaign:preview
```

---

### 3. Send

```bash
# Execute campaign
npm run campaign:send
```

**Done!** 🎉

---

## 📊 What Happens

- ✅ Finds all free-tier users
- ✅ Sends professional 30% off email
- ✅ Tracks sends (no duplicates)
- ✅ Rate-limited (1/sec)

---

## 📈 Expected Results

**For 100 beta users:**
- ~45 will open
- ~20 will click
- ~10-15 will convert
- **$1,974 revenue** (first 3 months)
- **$11,280 ARR** (after discount)

---

## 🛠️ Commands

```bash
npm run seed:beta          # Add test users
npm run campaign:test      # Test email
npm run campaign:preview   # Dry run
npm run campaign:send      # Execute
```

---

## 📧 Email Preview

**Subject:** 🚀 Early Bird Pricing: 30% Off Pro & Team (Beta Users Only)

**Offer:**
- Pro: $49 → $34.30/mo (save $44)
- Team: $199 → $139.30/mo (save $179)
- 7-day deadline
- 14-day free trial

---

## 🔧 Troubleshooting

**"No beta users found"**
→ Run `npm run seed:beta`

**"Invalid login"**
→ Use Gmail app password, not regular password

**"Spam folder"**
→ Use SendGrid/SES for production

---

## 📚 Full Docs

- [Detailed Setup](./CAMPAIGN_SETUP.md)
- [Execution Summary](./EARLY_BIRD_CAMPAIGN.md)
- [Scripts Docs](./scripts/README.md)

---

**Ready? Let's convert some users! 🚀**
