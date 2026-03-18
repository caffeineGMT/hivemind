# Product Hunt Launch Playbook - Hivemind Engine

## Launch Target
**Date:** Tuesday, 12:01 AM PST (optimal engagement time)
**Goal:** 200+ upvotes, Top 5 Product of the Day, 100+ signups with PH50 code

---

## Pre-Launch Checklist (72 hours before)

### Assets Ready
- [ ] Cover image (1200×630) uploaded to `/product-hunt/assets/cover.png`
- [ ] Demo video (60 seconds) uploaded and embedded
- [ ] 5 screenshots prepared and uploaded
- [ ] Product description finalized (see below)
- [ ] Hunter secured and briefed

### Hunter Outreach (48 hours before)
Target 3 established hunters with 500+ followers:
- [ ] @chrismessina (6.2k followers, tech products)
- [ ] @rrhoover (Product Hunt founder, selective but impactful)
- [ ] @bentossell (No Code community, AI tools)

**Outreach template:** See `/templates/hunter_outreach.md`

### Technical Setup
- [ ] Promo code PH50 implemented (50% off Pro for 6 months)
- [ ] UTM parameter tracking set up (?ref=producthunt)
- [ ] Discord server created for support
- [ ] Analytics tracking confirmed

---

## Launch Day Timeline

### 12:01 AM PST - GO LIVE
- [ ] Submit to Product Hunt
- [ ] Post initial comment with offer: "🎉 Product Hunt exclusive: 50% off Pro for 6 months (code: PH50)"
- [ ] Pin Discord link in comments
- [ ] Monitor every 30 minutes

### 8:00 AM PST - Morning Push
- [ ] Tweet announcement with PH link
- [ ] Post to LinkedIn
- [ ] Email beta users (template: `/templates/beta_email.md`)
- [ ] Post in relevant Slack/Discord communities

### 12:00 PM PST - Midday Check
- [ ] Respond to ALL comments (within 1 hour max)
- [ ] Update Discord with FAQs
- [ ] Share progress update on Twitter

### 6:00 PM PST - Evening Push
- [ ] Post to Hacker News (if momentum is strong)
- [ ] Thank top supporters publicly
- [ ] Final comment response sweep

### 11:00 PM PST - Day End
- [ ] Screenshot final ranking
- [ ] Thank you post to all supporters
- [ ] Compile metrics for post-mortem

---

## Pre-Written Replies (Copy/Paste Ready)

### Q: "How is this different from Auto-GPT/AgentGPT?"
**A:** Great question! Auto-GPT requires you to manually configure agents and tasks. Hivemind is an end-to-end orchestrator—just tell it your business goal (e.g., "Build an AI newsletter"), and it autonomously spawns specialized agents (content writer, web scraper, email sender), coordinates their work via tmux, and handles deployment. Think of it as a conductor for an AI orchestra, not just individual musicians.

### Q: "What's your pricing?"
**A:** Free tier: 10 tasks/month. Pro: $29/mo for unlimited tasks + priority agents. Enterprise: Custom (multi-company, SSO). Product Hunt exclusive: Use code **PH50** for 50% off Pro for 6 months ($14.50/mo).

### Q: "How do you handle errors/failures?"
**A:** Hivemind has built-in self-healing:
- Agents auto-retry failed tasks (3 attempts with exponential backoff)
- Health monitoring dashboard tracks agent status in real-time
- Failed workflows trigger alerting via Discord/email
- All agent logs are persisted for debugging

### Q: "Can I use my own API keys?"
**A:** Yes! Hivemind supports BYO API keys for Claude, OpenAI, Gemini. We also offer pooled credits if you prefer not to manage keys.

### Q: "What kind of businesses can I build?"
**A:** Anything AI-driven: newsletters, content agencies, data scrapers, research assistants, social media managers, SEO tools, email outreach, customer support bots. Our users have built 200+ unique businesses in beta. Check out our gallery: [link]

### Q: "Is this open source?"
**A:** Core orchestrator is open source (MIT license) on GitHub. Hosted dashboard/monitoring is our paid product. You can self-host everything if you prefer.

### Q: "How long does setup take?"
**A:** 5 minutes. Clone repo → Set API keys → Run `hivemind start` → Dashboard opens. First business can be live in 15 minutes.

### Q: "What models do you support?"
**A:** Claude 3.5 Sonnet, GPT-4, Gemini 1.5 Pro. We auto-select the best model for each agent's role (e.g., code agents use Sonnet, research uses Gemini).

### Q: "Do agents communicate with each other?"
**A:** Yes! Agents share context via a message bus. Example: Web scraper passes data → Content writer formats it → Email sender delivers. All coordinated automatically.

### Q: "What's your tech stack?"
**A:** Node.js backend, React frontend, SQLite for state, tmux for agent isolation, WebSocket for real-time updates, Vercel for deployment.

---

## Discord Setup

**Server Name:** Hivemind Engine Community
**Channels:**
- #announcements (read-only)
- #general (community chat)
- #support (questions, bugs)
- #showcase (user businesses)
- #feature-requests

**Moderators:** Assign 2-3 beta users as mods for launch day

**Welcome Message:**
> Welcome to Hivemind Engine! 🎉
>
> Use #support for questions, #showcase to share your AI businesses, and #feature-requests for ideas.
>
> **Product Hunt Special:** Code PH50 for 50% off Pro (6 months)
>
> Quick links:
> - Docs: [link]
> - GitHub: [link]
> - Dashboard: [link]

---

## Post-Launch (Day 2-7)

### Social Amplification
- [ ] Twitter thread: "What we learned launching on PH"
- [ ] LinkedIn post: "How we hit #1 on Product Hunt"
- [ ] Reddit: r/SideProject, r/Entrepreneur, r/artificial

### Outreach
- [ ] Email signups: "Thanks for trying Hivemind! Here's how to get started..."
- [ ] Follow up with commenters who asked detailed questions
- [ ] Interview top 3 users for testimonials

### Metrics to Track
- Upvotes by hour
- Signups from ?ref=producthunt
- PH50 code redemptions
- Discord joins
- Twitter impressions
- Hacker News points (if posted)

---

## Success Metrics

**Minimum Viable Success:**
- 150+ upvotes
- Top 10 Product of the Day
- 75+ signups with PH50

**Target Success:**
- 200+ upvotes
- Top 5 Product of the Day
- 100+ signups with PH50

**Exceptional Success:**
- 300+ upvotes
- #1 Product of the Day
- 200+ signups with PH50
- HN front page
- Twitter trending in tech

---

## Emergency Protocols

### If engagement is low (<50 upvotes by 12pm)
1. DM top 10 supporters asking them to share
2. Post to additional communities (Indie Hackers, Dev.to)
3. Increase Twitter posting frequency
4. Offer limited-time bonus (e.g., lifetime deal for first 50)

### If server/demo breaks
1. Post transparency comment: "We're experiencing high traffic! Working on it."
2. Spin up backup Vercel deployment
3. Share demo video + screenshots as fallback
4. Offer priority access when fixed

### If negative comments arise
1. Respond within 15 minutes with empathy
2. Acknowledge the concern
3. Offer to discuss privately via Discord DM
4. Follow up publicly when resolved

---

## Contact During Launch
- **Primary:** Michael Guo (Discord: @mguo)
- **Backup:** [Assign backup person]
- **Emergency:** [Phone number]

**Remember:** Be genuine, responsive, and helpful. The PH community values authenticity over hype.
