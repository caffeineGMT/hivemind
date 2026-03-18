# Product Hunt Launch Package

Complete Product Hunt launch materials for Hivemind Engine.

## 📦 Package Contents

### Core Launch Assets
1. **launch-copy.md** - Complete Product Hunt copy (tagline, description, first comment)
2. **screenshot-guide.md** - Requirements and guide for 5 screenshots
3. **demo-video-script.md** - 60-second demo video script and production guide
4. **testimonials.md** - Beta user testimonial collection and templates
5. **cover-image-spec.md** - Cover image design specifications (1200x630)

### Strategy & Planning
6. **launch-playbook.md** - Hour-by-hour launch day playbook
7. **hunter-search-guide.md** - How to find and work with Product Hunt Hunters
8. **analytics-setup.md** - Analytics tracking implementation guide
9. **LAUNCH_CHECKLIST.md** - Complete pre-launch and launch day checklist

### Technical Implementation
10. **../src/promo-codes.js** - PH50 promo code system (backend)
11. **../src/db.js** - Database support for promo tracking
12. **../src/server.js** - API endpoints for promo codes

---

## 🎯 Launch Goals

**Primary Goal:** Top 5 Product of the Day

**Metrics:**
- 400+ upvotes
- 60+ comments
- 100+ signups
- $1,500+ revenue from PH50 code

**Timeline:** Tuesday, March 18, 2026 @ 12:01am PST

---

## 🚀 Quick Start Guide

### 1 Week Before Launch

1. **Find a Hunter**
   - Check Product Hunt leaderboard
   - Find Hunter with 1000+ followers
   - Use template in `hunter-search-guide.md`

2. **Create Assets**
   - Record demo video (follow `demo-video-script.md`)
   - Capture screenshots (follow `screenshot-guide.md`)
   - Design cover image (follow `cover-image-spec.md`)
   - Request testimonials (use `testimonials.md`)

3. **Prepare Product Hunt**
   - Create draft listing
   - Upload all assets
   - Write copy using `launch-copy.md`
   - Schedule for Tuesday 12:01am PST

4. **Set Up Analytics**
   - Follow `analytics-setup.md`
   - Install PostHog or Plausible
   - Test event tracking
   - Create dashboard

### 1 Day Before Launch

5. **Final Review**
   - Use `LAUNCH_CHECKLIST.md`
   - Test PH50 promo code
   - Brief team on upvote plan
   - Set alarms

### Launch Day

6. **Execute Playbook**
   - Follow `launch-playbook.md` hour-by-hour
   - Post first comment at 12:00am
   - Mobilize team for upvotes
   - Respond to ALL comments
   - Track metrics in real-time

---

## 📋 Files Overview

### launch-copy.md
- Tagline (60 chars)
- Full description (260 chars + extended)
- First comment template
- CTA buttons
- Maker intro

### screenshot-guide.md
- 5 screenshot requirements
- What to capture for each
- Annotation style guide
- Export settings
- Tools to use

### demo-video-script.md
- 60-second script breakdown
- Scene-by-scene timing
- Recording instructions
- Post-production checklist
- File size optimization

### testimonials.md
- Email templates for beta users
- Testimonial format
- Sample testimonials
- Backup plan if none respond

### cover-image-spec.md
- 1200x630px design specs
- Layout structure
- Color palette
- Typography guide
- Figma instructions

### launch-playbook.md
- Hour-by-hour schedule
- Team mobilization plan
- Content templates
- Emergency protocols
- Success metrics

### hunter-search-guide.md
- Where to find Hunters
- Vetting criteria
- Outreach templates
- Compensation guide
- Backup plan

### analytics-setup.md
- PostHog installation
- Event tracking code
- UTM parameters
- Real-time dashboard
- Weekly report template

### LAUNCH_CHECKLIST.md
- 7 days before checklist
- 3 days before checklist
- 1 day before checklist
- Launch day hour-by-hour
- Post-launch follow-up

---

## 🎁 PH50 Promo Code

**Code:** PH50
**Discount:** 50% off for 3 months
**Valid:** March 18 - April 18, 2026 (30 days)
**Max Redemptions:** 500 users

### How It Works

1. User enters PH50 at checkout
2. Backend validates code (see `src/promo-codes.js`)
3. Applies 50% discount to first 3 months
4. Tracks redemption in database
5. Analytics logged for reporting

### API Endpoints

```bash
# Validate promo code
POST /api/promo/validate
{ "code": "PH50" }

# Apply promo code
POST /api/promo/apply
{ "accountId": "user_123", "code": "PH50", "plan": "pro" }

# Get promo stats (admin)
GET /api/promo/stats/PH50

# Get all promo analytics
GET /api/promo/analytics
```

---

## 📊 Success Metrics

### Product Hunt
- [ ] Top 5 Product of the Day
- [ ] 400+ upvotes
- [ ] 60+ comments
- [ ] Featured in PH newsletter

### Traffic
- [ ] 10,000+ visitors on launch day
- [ ] 3+ minute avg session duration
- [ ] < 50% bounce rate

### Conversions
- [ ] 100+ signups
- [ ] 70+ PH50 redemptions
- [ ] 60% signup → payment conversion

### Revenue
- [ ] $1,500+ MRR from launch
- [ ] $24.50 avg deal size (with PH50)
- [ ] 70%+ retention after 30 days

---

## 🛠️ Technical Setup

### Promo Code System

Database table (auto-created):
```sql
CREATE TABLE promo_redemptions (
  id INTEGER PRIMARY KEY,
  account_id TEXT NOT NULL,
  code TEXT NOT NULL,
  plan TEXT NOT NULL,
  discount_value REAL NOT NULL,
  duration_months INTEGER,
  applied_at TEXT NOT NULL
);
```

Backend implementation:
- `src/promo-codes.js` - Core logic
- `src/db.js` - Database functions
- `src/server.js` - API routes

Frontend integration:
```javascript
// Validate code
const response = await fetch('/api/promo/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'PH50' })
});

const validation = await response.json();

if (validation.valid) {
  // Apply discount
  await fetch('/api/promo/apply', {
    method: 'POST',
    body: JSON.stringify({
      accountId: user.id,
      code: 'PH50',
      plan: 'pro'
    })
  });
}
```

---

## 📞 Support

### During Launch

**If something breaks:**
1. Check `LAUNCH_CHECKLIST.md` → Emergency Protocols
2. Refer to `launch-playbook.md` → Emergency section
3. Post immediate update in PH comments
4. Fix and follow up

### After Launch

**Post-launch tasks:**
- Send thank-you emails (templates in `launch-playbook.md`)
- Analyze metrics (use `analytics-setup.md`)
- Implement feedback
- Write retrospective

---

## ✅ Pre-Launch Verification

Use this quick checklist before launching:

- [ ] All 5 screenshots created and uploaded
- [ ] Demo video recorded and uploaded (< 100MB)
- [ ] Cover image designed (1200x630)
- [ ] Hunter confirmed and ready
- [ ] PH50 promo code tested
- [ ] Analytics tracking live
- [ ] Team briefed on upvote plan
- [ ] First comment ready to paste
- [ ] Social posts scheduled
- [ ] Alarms set

---

## 🎯 Launch Day Quick Reference

**12:00am PST:**
- Confirm live on Product Hunt
- Post first comment
- Send launch tweet
- Mobilize Wave 1 upvotes

**9:00am PST:**
- Respond to all comments
- Mobilize Wave 2 upvotes
- Post on LinkedIn/IH

**6:00pm PST:**
- Final push (Wave 3)
- Last chance PH50 reminder
- Thank supporters

**11:59pm PST:**
- Check final ranking
- Screenshot results
- Post celebratory tweet

---

## 📚 Additional Resources

**Product Hunt Resources:**
- Official Guide: https://blog.producthunt.com/how-to-launch-on-product-hunt-7c1843e06399
- Success Stories: https://www.indiehackers.com/search?q=product+hunt

**Community Support:**
- Indie Hackers: https://www.indiehackers.com/
- MakerLog: https://getmakerlog.com/
- Twitter #BuildInPublic

**Tools:**
- Figma (design): https://figma.com
- PostHog (analytics): https://posthog.com
- Plausible (analytics): https://plausible.io
- TinyPNG (compress images): https://tinypng.com

---

## 🐝 Good Luck!

You've got everything you need for a successful Product Hunt launch.

**Remember:**
- Be authentic and transparent
- Respond to every comment quickly
- Focus on helping users, not just upvotes
- Have fun and enjoy the ride!

**Questions?**
Check the relevant guide in this folder or refer to the checklist.

Now go build something amazing! 🚀

---

**Created:** March 18, 2026
**Launch Date:** Tuesday, March 18, 2026 @ 12:01am PST
**Campaign:** PH50 (50% off for 3 months)
