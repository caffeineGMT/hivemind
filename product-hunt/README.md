# Product Hunt Launch Package - Hivemind Engine

Complete launch coordination package for Product Hunt. Everything you need to execute a successful launch that drives 200+ upvotes and 100+ signups.

---

## 📁 Directory Structure

```
product-hunt/
├── README.md (this file)
├── LAUNCH_PLAYBOOK.md (master playbook, read this first)
├── PRODUCT_DESCRIPTION.md (copy-paste ready content for PH)
├── assets/
│   ├── cover.html (1200×630 cover image generator)
│   └── screenshots/ (5 required screenshots)
├── scripts/
│   ├── demo_video_script.md (60-second demo video plan)
│   ├── promo_code_implementation.md (PH50 code backend)
│   ├── screenshot_guide.md (how to capture perfect screenshots)
│   └── discord_setup.md (community server setup)
└── templates/
    ├── hunter_outreach.md (DM templates for hunters)
    ├── beta_email.md (email templates for beta users)
    └── social_media.md (Twitter, LinkedIn, Reddit, HN templates)
```

---

## 🚀 Quick Start (7-Day Launch Plan)

### Day -7: Preparation Phase
- [ ] Read `LAUNCH_PLAYBOOK.md` cover to cover
- [ ] Create Product Hunt account (if you don't have one)
- [ ] Identify 3 hunters to contact (see `templates/hunter_outreach.md`)
- [ ] Set launch date: **Next Tuesday, 12:01 AM PST**

### Day -5: Asset Creation
- [ ] Open `assets/cover.html` in browser, screenshot at 1200×630
- [ ] Follow `scripts/screenshot_guide.md` to capture 5 screenshots
- [ ] Record demo video using `scripts/demo_video_script.md`
- [ ] Write product description using `PRODUCT_DESCRIPTION.md` as template

### Day -3: Hunter Outreach
- [ ] Send DMs to 3 hunters using `templates/hunter_outreach.md`
- [ ] Prepare all assets (screenshots, video, cover, description)
- [ ] Test demo on staging/localhost (make sure it works)

### Day -2: Technical Setup
- [ ] Implement PH50 promo code (see `scripts/promo_code_implementation.md`)
- [ ] Set up UTM tracking (?ref=producthunt)
- [ ] Create Discord server (follow `scripts/discord_setup.md`)
- [ ] Test checkout flow end-to-end with promo code

### Day -1: Final Prep
- [ ] Confirm hunter commitment
- [ ] Send assets to hunter
- [ ] Email beta users (use `templates/beta_email.md`)
- [ ] Prepare 10 pre-written replies (see `LAUNCH_PLAYBOOK.md`)
- [ ] Set alarms for 12:01 AM PST launch

### Day 0: LAUNCH DAY 🚀
- [ ] 12:01 AM: Hunter posts to Product Hunt
- [ ] 12:02 AM: You post first comment with PH50 offer
- [ ] 12:05 AM: Tweet announcement (see `templates/social_media.md`)
- [ ] 12:10 AM: Email beta users with upvote link
- [ ] Monitor every 30 minutes, reply within 1 hour
- [ ] 8:00 AM: LinkedIn post, Reddit posts
- [ ] 6:00 PM: Hacker News post (if in top 10)
- [ ] 11:00 PM: Thank you post, screenshot final ranking

### Day +1: Post-Launch
- [ ] Email all signups with thank you + getting started guide
- [ ] Request testimonials from top 3-5 users
- [ ] Share results on Twitter ("We hit #X on Product Hunt!")
- [ ] Monitor Discord for support requests

---

## 📊 Success Metrics

### Minimum Viable Success
- ✅ 150+ upvotes
- ✅ Top 10 Product of the Day
- ✅ 75+ signups with PH50 code

### Target Success
- 🎯 **200+ upvotes**
- 🎯 **Top 5 Product of the Day**
- 🎯 **100+ signups with PH50 code**

### Exceptional Success
- 🌟 300+ upvotes
- 🌟 #1 Product of the Day
- 🌟 200+ signups
- 🌟 Hacker News front page

---

## 📝 Key Documents Overview

### LAUNCH_PLAYBOOK.md
Master guide with timeline, pre-written replies, emergency protocols. **Read this first.**

### PRODUCT_DESCRIPTION.md
- Tagline (60 chars)
- 3-paragraph description
- First comment for PH
- Screenshot captions
- Links to include

### templates/hunter_outreach.md
- 3 outreach templates (direct, community-first, warm intro)
- Follow-up templates
- Target hunter list (prioritized)
- What to send once hunter commits

### templates/beta_email.md
- Email 1: Pre-launch heads up (24h before)
- Email 2: Launch day upvote request (12:01 AM)
- Email 3: Thank you + Pro access (24h after)
- Email 4: Testimonial request (48h after)

### templates/social_media.md
- Twitter/X templates (5 tweets for launch day)
- LinkedIn post
- Hacker News submission
- Reddit posts (SideProject, Entrepreneur, artificial)
- Discord community posts
- Instagram/TikTok ideas

### scripts/demo_video_script.md
- 60-second shot-by-shot script
- Storyboard breakdown
- Recording checklist
- Post-production tips
- Music recommendations

### scripts/screenshot_guide.md
- 5 required screenshots (what to show)
- Setup instructions for each
- Captions (copy-paste ready)
- Post-processing tips
- Final checklist

### scripts/discord_setup.md
- Channel structure
- Roles & permissions
- Bot recommendations (MEE6, Carl-bot)
- Welcome automation
- Moderation guidelines

### scripts/promo_code_implementation.md
- Database schema (SQLite)
- Backend API endpoints
- Frontend checkout integration
- UTM tracking setup
- Admin analytics dashboard

---

## 🎯 Pre-Launch Checklist (48 Hours Before)

### Assets
- [ ] Cover image (1200×630 PNG)
- [ ] Demo video (60 seconds, <100MB)
- [ ] 5 screenshots (1920×1080 PNG)
- [ ] Product description finalized
- [ ] First comment drafted

### Technical
- [ ] PH50 promo code active in database
- [ ] Checkout flow tested with promo code
- [ ] UTM tracking confirmed working
- [ ] Discord server created and configured
- [ ] Website is live and fast (test on mobile)

### People
- [ ] Hunter confirmed and briefed
- [ ] Beta users emailed (heads up)
- [ ] Moderators recruited for Discord (2-3 people)
- [ ] Backup plan if hunter flakes (self-hunt)

### Marketing
- [ ] Social media posts drafted
- [ ] Email templates ready
- [ ] Reddit communities identified
- [ ] HN post prepared (if needed)

---

## 🔥 Launch Day Rapid Response

### If Engagement is Low (<50 upvotes by noon)
1. DM top supporters asking for shares
2. Post to Indie Hackers, Dev.to, Lobsters
3. Increase Twitter posting (every 2 hours)
4. Offer time-limited bonus (e.g., "First 50: lifetime deal")

### If Server/Demo Breaks
1. Post transparency comment on PH
2. Spin up backup Vercel deployment
3. Share demo video as fallback
4. Offer priority access when fixed

### If You Get Negative Comments
1. Respond within 15 minutes
2. Acknowledge concern with empathy
3. Offer to discuss in Discord DM
4. Follow up publicly when resolved

---

## 📈 Post-Launch Analysis

### Metrics to Track
- Upvotes by hour (hourly chart)
- Signups from ?ref=producthunt
- PH50 code redemptions
- Discord joins
- Twitter impressions
- Hacker News points (if posted)
- Conversion rate (PH visitor → signup → paid)

### SQL Query for Analysis
See `scripts/promo_code_implementation.md` for detailed analytics queries.

---

## 🎁 Special Offer Details

**Code:** PH50
**Discount:** 50% off Pro tier
**Price:** $14.50/mo (normally $29/mo)
**Duration:** 6 months (then reverts to $29/mo)
**Eligibility:** Pro tier only
**Limit:** Unlimited uses
**Expiry:** 30 days after launch

---

## 🔗 Links to Prepare

Before launch, ensure these are ready:

- [ ] **Website:** https://hivemind-engine.vercel.app
- [ ] **GitHub:** https://github.com/yourusername/hivemind-engine
- [ ] **Docs:** https://hivemind-docs.vercel.app (or README)
- [ ] **Discord:** https://discord.gg/hivemind (or custom invite)
- [ ] **Demo Video:** YouTube unlisted link
- [ ] **Twitter:** @HivemindEngine (or your handle)

---

## 💡 Pro Tips

### Maximize Engagement
1. **First 6 hours are critical** – Monitor constantly
2. **Reply to EVERY comment** – Builds rapport, boosts ranking
3. **Be genuine, not salesy** – PH community hates hype
4. **Show, don't tell** – Demo video > long descriptions
5. **Leverage beta users** – They're your secret weapon

### What NOT to Do
❌ Don't ask for upvotes via DM (banned on PH)
❌ Don't post-and-ghost (engagement matters)
❌ Don't argue with critics (respond professionally)
❌ Don't overhype ("revolutionary", "game-changing")
❌ Don't ignore mobile users (70% of PH is mobile)

### Hunter Relationship
- Give them all the assets (make it easy)
- Thank them publicly in your first comment
- Tag them in your launch tweet
- Send them a thank-you email after launch
- Consider sending a small gift (swag, coffee gift card)

---

## 📞 Support During Launch

**Primary Contact:** Michael Guo
- Discord: @mguo
- Email: [your email]
- Twitter: @yourusername

**Response Time Commitment:**
- Product Hunt comments: <1 hour
- Discord #support: <30 minutes
- Twitter mentions: <2 hours

---

## 🎯 Next Steps (Right Now)

1. **Read `LAUNCH_PLAYBOOK.md`** (15 minutes)
2. **Set launch date** (pick next Tuesday)
3. **Contact hunters** (use templates, send today)
4. **Create cover image** (open `assets/cover.html`, screenshot)
5. **Schedule time blocks** for screenshot capture, video recording

---

## 🏆 Success Stories (For Inspiration)

**Similar products that crushed PH:**

1. **Supabase** – #1 Product of the Day, 1,200+ upvotes
   - Open source (trust signal)
   - Great demo video
   - Active founder engagement

2. **Vercel** – Top 5, 800+ upvotes
   - Clean screenshots
   - Clear value prop
   - Developer-focused

3. **Railway** – #2 Product of the Day, 600+ upvotes
   - Strong community pre-launch
   - Polished UI in screenshots
   - Responsive support

**What they did right:**
- ✅ Launched on Tuesday (highest traffic day)
- ✅ Founder was active in comments all day
- ✅ Beta users rallied to support
- ✅ Demo was flawless (pre-tested heavily)
- ✅ Special PH offer (creates urgency)

---

## 📚 Additional Resources

- [Product Hunt Launch Guide](https://blog.producthunt.com/how-to-launch-on-product-hunt-7c1843e06399)
- [Indie Hackers PH Playbook](https://www.indiehackers.com/post/product-hunt-playbook-b9f5e5e5d0)
- [YC Startup School: Launching](https://www.startupschool.org/curriculum)

---

## ✅ Final Pre-Flight Checklist

**T-Minus 24 Hours:**
- [ ] All assets uploaded to Product Hunt (or ready to send hunter)
- [ ] PH50 code is live and tested
- [ ] Discord is configured and invite link works
- [ ] Beta users are notified and ready to upvote
- [ ] Social media posts are drafted
- [ ] Pre-written replies are in a doc for easy copy-paste
- [ ] Alarms set for 12:01 AM PST launch
- [ ] Snacks and coffee prepared (it's going to be a long day!)

---

**Let's make this the best Product Hunt launch ever. You've got this! 🚀**

Questions? Check the playbook or reach out in Discord.
