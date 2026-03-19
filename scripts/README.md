# Hivemind Engine Scripts

Utility scripts for managing the Hivemind Engine platform.

## 📧 Email Marketing

### Early Bird Campaign

Send 30% off pricing offer to beta users before public launch.

```bash
# Preview who will receive emails (dry run)
npm run campaign:preview

# Send test email to yourself
npm run campaign:test

# Actually send to all beta users
npm run campaign:send
```

**Files:**
- `early-bird-campaign.js` - Main campaign script with email templates
- `seed-beta-users.js` - Add sample beta users for testing

**Setup:** See [CAMPAIGN_SETUP.md](../CAMPAIGN_SETUP.md) for full configuration guide.

---

## 💾 Database Management

### Seed Beta Users

Add sample test accounts to validate email campaigns.

```bash
# Add 10 sample users
npm run seed:beta

# Add custom number
node scripts/seed-beta-users.js --count=50
```

---

## 📊 Usage & Billing

### Initialize Usage Tracking

Set up usage tracking tables and indexes.

```bash
npm run usage:init
```

### Daily Usage Check

Check current usage and send alerts if limits exceeded.

```bash
npm run usage:check
```

### Monthly Paddle Report

Generate monthly usage report for Paddle billing integration.

```bash
npm run usage:paddle-report
```

---

## 🛠️ Coming Soon

- `export-metrics.js` - Export analytics to CSV
- `user-engagement.js` - Calculate DAU/MAU/retention metrics
- `cleanup-inactive.js` - Archive inactive projects
- `backup-database.js` - Automated database backups

---

## Adding New Scripts

1. Create script in `scripts/` directory
2. Add shebang: `#!/usr/bin/env node`
3. Make executable: `chmod +x scripts/your-script.js`
4. Add npm script to `package.json`
5. Document in this README

---

## Environment Variables

Scripts use these environment variables (set in `.env`):

```bash
# Database
HIVEMIND_HOME=/path/to/.hivemind

# Email (for campaigns)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Billing (for usage tracking)
PADDLE_VENDOR_ID=your-vendor-id
PADDLE_API_KEY=your-api-key
```

---

## Need Help?

- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/caffeineGMT/hivemind/issues)
- 💬 [Discord Community](https://discord.gg/hivemind)
