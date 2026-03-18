# Hivemind Viral Demo Campaign - Complete Guide

## 🎯 Campaign Overview

**Goal:** 10,000+ video views, 100+ sign-ups in Week 1
**Budget:** $100 Twitter Ads over 7 days
**Target Audience:** Indie hackers, solo founders, dev teams at startups

---

## 📹 Part 1: Video Production (60 seconds)

### Shot Breakdown
- **0-5s:** Hook - "Watch me build a SaaS app in 60 seconds"
- **5-10s:** Type command: `hivemind "Build a SaaS landing page..."`
- **10-20s:** Show tmux panes split into 4 agents (PM, Designer, Frontend, Backend)
- **20-35s:** Agents working - quick cuts of outputs
- **35-45s:** Deployment to Vercel with live URL
- **45-55s:** Browser scroll through completed landing page
- **55-60s:** CTA "Try it free: hivemind.dev"

### Technical Specs
- **Format:** MP4 (H.264), 1920x1080, 30fps
- **Size:** Under 512MB for Twitter
- **Overlays:** Add text captions (80% watch muted)
- **Tool:** QuickTime (Mac) or OBS Studio

---

## 🐦 Part 2: Twitter Campaign

### Primary Tweet (Pin This)
```
I built this SaaS landing page in 48 hours.

While I slept.

Just one command. AI agents did the rest:
• Designed the UI
• Wrote the code  
• Deployed to production

$15 in API costs vs $5,000 developer.

Try it free: https://hivemind.dev?ref=twitter_demo

[VIDEO ATTACHED]
```

### Thread (6 Tweets)
1. **Problem:** "Most founders waste weeks building MVPs..."
2. **Solution:** "Hivemind = your 24/7 dev team..."
3. **Cost:** "$220K/year team vs $49/month"
4. **Social Proof:** "Early users shipping in hours..."
5. **Features:** "Agents plan, design, code, deploy..."
6. **CTA:** "Try free + TWITTER50 promo code (50% off)"

### Hashtags (Reply Tweet)
```
#buildinpublic #indiehackers #AI #SaaS #startup #webdev
```

---

## 💰 Part 3: Twitter Ads ($100 Budget)

### Campaign 1: Video Views ($50)
- **Objective:** Brand awareness
- **Target:** 500-1,000 views @ $0.05-0.10 CPV
- **Duration:** 7 days
- **Budget:** $7.14/day (front-load Days 1-2)

### Campaign 2: Website Traffic ($50)
- **Objective:** Conversions
- **Target:** 50-100 clicks @ $0.50-1.00 CPC
- **Duration:** 7 days
- **Landing Page:** https://hivemind.dev?utm_source=twitter&utm_medium=paid&utm_campaign=demo_video

### Targeting
**Demographics:**
- Age: 22-45
- Locations: US, UK, Canada, Germany, Singapore, India

**Interests:**
- Programming, Web Development, Startups, SaaS, AI

**Follower Look-alikes:**
- @levelsio, @dannypostmaa, @patio11, @swyx
- @ProductHunt, @IndieHackers, @vercel

**Keywords:**
- #buildinpublic, #indiehackers, #webdev, #SaaS

### A/B Testing (3 Variations)
**Control:** "I built this SaaS in 48 hours while I slept"
**Variant A:** "Tired of spending weeks on MVPs? AI agents shipped this in 48h"
**Variant B:** "Ship 10x faster with AI agents that code 24/7"

Split: 40% / 30% / 30% → Kill worst after 48 hours

---

## 📊 Part 4: Analytics & Tracking

### Install Twitter Pixel
```html
<!-- Add to ui/index.html <head> -->
<script>
!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','YOUR_PIXEL_ID');
</script>
```

### Track Conversions
```javascript
// On signup
twq('event', 'tw-xxxxx-signup', {
  value: 0.00,
  currency: 'USD',
  conversion_id: userId
});

// On purchase
twq('event', 'tw-xxxxx-purchase', {
  value: 49.00,
  currency: 'USD',
  conversion_id: userId
});
```

### UTM Links
- Twitter organic: `?utm_source=twitter&utm_medium=organic&utm_campaign=demo_video&ref=twitter_demo`
- Twitter ads: `?utm_source=twitter&utm_medium=paid&utm_campaign=demo_video&ref=twitter_ads`
- Reddit: `?utm_source=reddit&utm_medium=organic&utm_campaign=demo_video&utm_content=sideproject`

### Success Metrics
| Metric | Target | Stretch |
|--------|--------|---------|
| Video views | 10,000 | 25,000 |
| Engagements | 500 | 1,000 |
| Website visits | 100 | 250 |
| Sign-ups | 25 | 50 |
| Paid conversions | 5 | 10 |
| CPA | <$4 | <$2 |

---

## 🚀 Part 5: Launch Timeline

### D-7: Video Production
- [ ] Record demo video
- [ ] Edit and add overlays
- [ ] Export MP4 (<512MB)

### D-5: Campaign Setup
- [ ] Create Twitter Ads campaigns (save as drafts)
- [ ] Install Twitter Pixel
- [ ] Create UTM links
- [ ] Set up promo code (TWITTER50)

### D-3: Content Prep
- [ ] Write all tweets
- [ ] Create 4-image carousel
- [ ] Prepare Reddit/LinkedIn posts

### D-1: Final QA
- [ ] Test video on mobile
- [ ] Verify all links work
- [ ] Test sign-up flow
- [ ] Brief support team

### D-Day: Launch (9AM PT)
- **9:00 AM:** Post primary tweet with video
- **9:30 AM:** Post 6-tweet thread
- **10:00 AM:** Activate both ad campaigns
- **11:00 AM:** Cross-post to LinkedIn, Reddit
- **4:00 PM:** Submit to Hacker News

### D+1 to D+7: Optimize
- Monitor metrics daily
- Pause underperforming ads
- Scale winners
- Engage with comments

---

## 🎨 Part 6: Visual Assets

### 4-Image Carousel (800x418px)

**Image 1: Before/After**
```
TRADITIONAL DEV     VS     HIVEMIND
━━━━━━━━━━━━━━            ━━━━━━━━
⏰ 2-3 weeks               ⚡ 2-3 hours
💰 $220K/year              💵 $49/month
🔧 Management              🤖 Autonomous
```

**Image 2: Speed Chart**
```
Manual Coding: ████████████████ 14 days
Hivemind:      ██ 0.5 days

🚀 28x FASTER
```

**Image 3: Agent Diagram**
```
YOUR AUTONOMOUS DEV TEAM
ProductManager → Designer
Frontend ← Backend
    ↓
🚀 DEPLOYED
Working 24/7
```

**Image 4: Social Proof**
```
"Like having a CTO who never sleeps.
I shipped 3 projects in one week."
— Founder, YC S23

★★★★★ 4.9/5 from early users
```

---

## 🌐 Part 7: Cross-Platform

### Reddit Posts
**r/SideProject:**
"I built a SaaS landing page in 48 hours using AI agents (demo video)"

**r/webdev:**
"Autonomous AI agents that build and deploy web apps - 60-second demo"

**r/entrepreneur:**
"How I replaced a $220K dev team with $49/month AI (seriously)"

### LinkedIn Article
Professional version: "How AI is Changing Software Development"
Include video, focus on productivity gains

### Product Hunt
Launch D+1 or D+2
Link to Twitter thread in description

### Hacker News
"Show HN: Hivemind – AI agent swarm that builds production apps"

---

## 🚨 Part 8: Troubleshooting

### Low Views (<100 in first hour)
- Boost with personal network
- Post in more communities
- Increase ad spend 50%
- Create 30s cut for Instagram/TikTok

### High CPA (>$6)
- Pause worst ad variation
- Narrow targeting to engaged followers
- Update landing page copy
- Test different CTAs

### Ad Account Suspended
- Contact support: 1-844-939-2243
- Provide business verification
- Have backup account ready

### Website Crashes
- Check Vercel status
- Scale resources
- Add Cloudflare CDN
- Capture emails via Typeform

---

## ✅ Pre-Launch Checklist

**Content:**
- [ ] Video edited and exported
- [ ] All tweets drafted
- [ ] 4-image carousel created
- [ ] Cross-platform posts ready

**Technical:**
- [ ] Twitter Pixel installed
- [ ] Conversion events configured
- [ ] UTM links created
- [ ] Promo code active (TWITTER50)
- [ ] Landing page optimized

**Campaigns:**
- [ ] Video Views campaign configured
- [ ] Website Traffic campaign configured
- [ ] A/B variations created
- [ ] Targeting set
- [ ] Saved as drafts (not launched)

**Team:**
- [ ] Support briefed
- [ ] Response templates ready
- [ ] Monitoring schedule assigned

---

## 📈 Daily Monitoring

**Check at 10AM PT:**
- Total spend vs budget
- CPV and CPC metrics
- Engagement rate
- Conversion tracking
- Adjust bids if needed

**Red Flags:**
- CPV > $0.15 → Pause, adjust targeting
- CPC > $1.50 → Refine audience
- CTR < 1% → Update creative
- No conversions after 100 clicks → Fix landing page

---

## 🎯 Success Criteria

Campaign succeeds if:
- ✅ CPA < $4
- ✅ 25+ sign-ups in 7 days
- ✅ 5+ paid conversions ($245 revenue)
- ✅ Video views > 500
- ✅ CTR > 2%

**If successful:** Scale to $500/week, create lookalike audiences
**If not:** Analyze data, iterate, relaunch with learnings

---

## 💡 Response Templates

**"How does it work?"**
"Spawns multiple Claude agents in tmux. Each specializes (PM, Designer, Frontend, Backend). They collaborate via shared context and iterate until shipped. Source: [GitHub link]"

**"Is this real?"**
"100% real. Try it: `npm install -g hivemind` then `hivemind 'build [idea]'`. Takes 5 mins. GitHub: [link]"

**"What's the catch?"**
"No catch. Uses Claude API ($15-50/mo). Pro tier has more features, but basic version is free forever."

---

**Ready to launch? Follow this guide step-by-step. Let's go viral! 🚀**
