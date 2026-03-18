# Discord Community Setup Guide

## Overview
Set up a Discord server for Hivemind Engine to provide Product Hunt launch support, build community, and gather feedback.

**Goal:** Central hub for support, showcases, and feature requests during (and after) launch.

---

## Server Creation

### Basic Setup
1. **Create Server:**
   - Open Discord → Click "+" → "Create My Own"
   - Name: **Hivemind Engine Community**
   - Icon: Use Hivemind logo (🧠 or custom design)
   - Region: Auto (Discord handles routing)

2. **Server Settings:**
   - **Verification Level:** Medium (verified email required)
   - **Explicit Content Filter:** Scan messages from all members
   - **2FA Requirement:** Disabled (unless you have mod team)
   - **Default Notification:** Only @mentions

3. **Vanity URL (if eligible):**
   - discord.gg/hivemind (requires Server Boost Level 3)
   - Otherwise: discord.gg/XYZ123 (custom invite link)

---

## Channel Structure

### 📢 Information Channels (Read-Only)

#### #welcome
**Purpose:** First channel users see, orientation
**Permissions:** Read-only for @everyone

**Message:**
```
👋 Welcome to Hivemind Engine!

Hivemind is an autonomous AI orchestrator that builds businesses for you. Spawn agent teams, coordinate workflows, deploy to production—all from one dashboard.

🚀 **Get Started:**
- GitHub: https://github.com/yourusername/hivemind-engine
- Dashboard: https://hivemind-engine.vercel.app
- Docs: https://hivemind-docs.vercel.app

💬 **Channels:**
- #announcements → Product updates & news
- #general → Community chat
- #support → Get help
- #showcase → Share what you built
- #feature-requests → Suggest improvements

🎁 **Product Hunt Special:**
Use code **PH50** for 50% off Pro (6 months)
👉 https://producthunt.com/posts/hivemind-engine

Happy building! 🧠
```

#### #announcements
**Purpose:** Official updates, releases, events
**Permissions:** Read-only, only admins can post

**Sample Announcement:**
```
🎉 **We're #3 on Product Hunt!**

Thank you for the incredible support today. We hit 250+ upvotes and climbed to #3 Product of the Day.

**What's new in v0.2:**
- Multi-agent workflow visualization
- Real-time cost analytics
- Webhook support for task completion

**Coming soon:**
- Image generation agents
- Voice synthesis agents
- Agent marketplace

Keep sharing your builds in #showcase—we're featuring the best ones on our homepage! 🚀
```

#### #rules
**Purpose:** Community guidelines
**Permissions:** Read-only

**Rules:**
```
📜 **Community Rules**

1. **Be respectful** – No harassment, hate speech, or personal attacks
2. **Stay on topic** – Keep discussions relevant to Hivemind/AI
3. **No spam** – Don't advertise unrelated products or services
4. **Help others** – Share knowledge, answer questions, be kind
5. **Use proper channels** – #support for help, #showcase for projects, etc.
6. **No piracy** – Don't share leaked API keys or cracked software
7. **Search first** – Check #support and docs before asking common questions

**Violations:**
- 1st offense: Warning
- 2nd offense: Temporary mute (24 hours)
- 3rd offense: Kick
- Severe violations: Immediate ban

Questions? DM a moderator with 🛡️ badge.
```

---

### 💬 Community Channels

#### #general
**Purpose:** Open chat, introductions, casual discussion
**Permissions:** Everyone can post
**Slow Mode:** 10 seconds (prevent spam)

**Pinned Message:**
```
👋 Introduce yourself!

Who are you, what do you build, and what brought you to Hivemind?

Example: "Hey! I'm Alex, a solo founder building AI newsletters. Found Hivemind on Product Hunt and launched my first business in 20 minutes. Mind = blown 🤯"
```

#### #support
**Purpose:** Bug reports, troubleshooting, how-to questions
**Permissions:** Everyone can post
**Slow Mode:** 30 seconds (prevent duplicate questions)

**Pinned Message:**
```
🆘 **Need help? Follow this format:**

**What I'm trying to do:**
[Describe your goal]

**What's happening:**
[Error message, unexpected behavior, etc.]

**What I've tried:**
[Steps you've already taken]

**System info:**
- OS: [macOS, Windows, Linux]
- Node version: [18.x, 20.x, etc.]
- Hivemind version: [Check package.json]

**Pro tips:**
- Search this channel first (Ctrl+F)
- Check docs: https://hivemind-docs.vercel.app
- Include screenshots if UI issue
- Share error logs (use code blocks)

Response time: Usually <1 hour during launch week ⚡
```

#### #showcase
**Purpose:** Users share what they built with Hivemind
**Permissions:** Everyone can post
**Slow Mode:** 60 seconds

**Pinned Message:**
```
🎨 **Show off what you built!**

Share your Hivemind-powered projects:
- AI newsletters
- Content generators
- Customer support bots
- Research assistants
- Anything cool!

**Format:**
- **Name:** [Your project name]
- **What it does:** [1-2 sentences]
- **Tech:** [Agents used, models, etc.]
- **Link:** [If publicly accessible]
- **Screenshot/demo:** [Show it off!]

Best showcases get featured on our homepage 🌟
```

#### #feature-requests
**Purpose:** Suggest new features, vote on ideas
**Permissions:** Everyone can post
**Slow Mode:** 120 seconds

**Pinned Message:**
```
💡 **Suggest new features**

What would make Hivemind better?

**Before posting:**
- Search existing requests (use 🔍)
- Be specific (not "make it better")
- Explain the use case

**Format:**
**Feature:** [One-line summary]
**Problem:** [What pain point does this solve?]
**Proposed solution:** [How would it work?]
**Use case:** [Example scenario]

We review all requests weekly. Most upvoted ideas get prioritized 🚀

React with ✅ to upvote existing requests!
```

#### #off-topic
**Purpose:** Casual chat unrelated to Hivemind
**Permissions:** Everyone can post
**Slow Mode:** 5 seconds

**Description:**
> Chat about anything: AI news, side projects, memes, coffee preferences. Keep it friendly!

---

### 🔧 Developer Channels (Optional)

#### #dev-updates
**Purpose:** Technical changelog, API changes, breaking updates
**Permissions:** Read-only

#### #contributors
**Purpose:** Open-source contributors coordination
**Permissions:** Contributors role only

#### #bug-reports
**Purpose:** Structured bug reporting
**Permissions:** Everyone can post, use Discord forum feature

---

## Roles & Permissions

### @Admin (Owner/Core Team)
- **Permissions:** All
- **Color:** Red (#E74C3C)
- **Members:** You + trusted core team (1-2 people max)

### @Moderator
- **Permissions:** Manage messages, kick/timeout users, manage nicknames
- **Color:** Purple (#9B59B6)
- **Members:** 2-3 active beta users (recruit on launch day)

### @Pro User
- **Permissions:** Standard + access to #pro-lounge (optional private channel)
- **Color:** Gold (#F39C12)
- **Members:** Anyone with active Pro subscription

### @Contributor
- **Permissions:** Standard + access to #contributors
- **Color:** Green (#27AE60)
- **Members:** GitHub contributors (PRs merged)

### @Beta Tester
- **Permissions:** Standard
- **Color:** Blue (#3498DB)
- **Members:** Original 50 beta users

### @everyone (Default)
- **Permissions:** Read, send messages, react, use voice
- **Color:** Default (gray)

---

## Bots & Integrations

### Recommended Bots

#### 1. **MEE6** (Moderation & Leveling)
- Auto-moderation (spam, links, caps)
- Leveling system (gamification)
- Welcome messages
- Custom commands

**Setup:**
- Add bot: mee6.xyz
- Enable moderation rules
- Set welcome message in #welcome
- Create custom command: `!phlabel` → "Use code PH50 for 50% off!"

#### 2. **Carl-bot** (Reaction Roles & Utilities)
- Reaction roles (assign roles via emoji)
- Auto-responder for FAQs
- Moderation tools

**Setup:**
- Add bot: carl.gg
- Create reaction role message in #welcome:
  > React to get notified:
  > 🔔 = @Announcements (product updates)
  > 💬 = @General (community chat)
  > 🛠️ = @Support (help requests)

#### 3. **Dyno** (Auto-Moderation)
- Auto-delete spam
- Auto-warn/mute offenders
- Backup moderation

#### 4. **GitHub Bot** (For #dev-updates)
- Post new issues/PRs to Discord
- Notify on releases
- Connect: github.com/discord-bot

**Setup:**
- Connect GitHub repo
- Set webhook to #dev-updates
- Filter: Only show releases + critical issues

#### 5. **Statbot** (Server Stats)
- Track member growth
- Monitor message activity
- Launch day metrics

---

## Auto-Moderation Rules

### MEE6 Rules

**Rule 1: Anti-Spam**
- Delete messages with 5+ duplicate characters (e.g., "heeeeelp")
- Mute user for 10 minutes on 3 violations

**Rule 2: Link Protection**
- Delete messages with links in #general (allow in #showcase)
- Exception: Allow hivemind-engine.vercel.app, github.com/yourusername

**Rule 3: Caps Lock**
- Warn users with >70% caps
- Auto-lowercase after 2 warnings

**Rule 4: Mention Spam**
- Mute users who @mention >5 people at once
- Prevent @everyone spam (role-restricted)

---

## Welcome Automation

### Welcome Message (DM New Members)
```
👋 Welcome to Hivemind Engine, [Username]!

Thanks for joining our community of AI builders.

**Quick links:**
🚀 Get started: https://hivemind-engine.vercel.app
📖 Docs: https://hivemind-docs.vercel.app
💬 Introduce yourself in #general

**Product Hunt special:**
Use code **PH50** for 50% off Pro (6 months)
👉 https://producthunt.com/posts/hivemind-engine

Need help? Ask in #support—we're super responsive!

Happy building 🧠
```

---

## Voice Channels (Optional)

### 🔊 Voice

#### General Voice
- Open voice chat for community

#### Office Hours
- Weekly Q&A with founder (schedule in #announcements)

#### Co-working
- Silent co-working sessions (popular with indie makers)

---

## Server Boost Perks

If server gets boosted (by members who Nitro):

**Level 1 (2 boosts):**
- 128kbps audio quality
- Custom server invite background
- Animated server icon

**Level 2 (15 boosts):**
- 256kbps audio quality
- Server banner
- 50MB upload limit (up from 8MB)

**Level 3 (30 boosts):**
- 384kbps audio quality
- Custom vanity URL (discord.gg/hivemind)
- 100MB upload limit

---

## Moderation Team

### Recruit Moderators on Launch Day

**Ideal moderators:**
- Active beta users who understand the product
- Helpful, friendly, responsive
- Available during US peak hours (9 AM - 9 PM PST)

**Responsibilities:**
- Answer questions in #support
- Delete spam/off-topic messages
- Welcome new members
- Escalate bugs to core team
- Post in #showcase when users share cool projects

**Compensation:**
- Free lifetime Pro subscription
- Exclusive @Moderator role
- Recognition in #announcements

### DM Template to Recruit Mods
```
Hey [Username],

I've noticed you've been super active and helpful in the Hivemind Discord—thank you!

Would you be interested in becoming a moderator? It's mostly answering questions in #support, welcoming new members, and keeping things on-topic.

**Perks:**
- Free lifetime Pro subscription
- Exclusive moderator role
- Early access to new features
- Direct line to me for feedback

No pressure! Let me know if you're interested.

— Michael
```

---

## Launch Day Checklist

**48 hours before launch:**
- [ ] Server created and channels set up
- [ ] Bots installed and configured
- [ ] Welcome message tested
- [ ] Invite link created (set to never expire)
- [ ] Moderators recruited (at least 2)

**24 hours before launch:**
- [ ] Test all channels (post, react, delete)
- [ ] Pin important messages (#support, #showcase, #welcome)
- [ ] Schedule announcement for launch time
- [ ] Brief moderators on launch plan

**Launch day (12:01 AM PST):**
- [ ] Post Product Hunt link in #announcements
- [ ] Pin Discord invite in PH comments
- [ ] Monitor #support every 30 minutes
- [ ] Welcome new members in #general
- [ ] Share top PH comments in #general for hype

**Post-launch (ongoing):**
- [ ] Daily check-in in #general (founder presence)
- [ ] Weekly feature request review
- [ ] Monthly community highlights in #announcements
- [ ] Quarterly AMA/office hours in voice channel

---

## Discord Invite Link

**For Product Hunt:**
- Create invite: discord.gg/hivemind (or custom link)
- Settings: Never expire, unlimited uses
- Track metrics: Discord analytics

**Where to share:**
- Product Hunt first comment
- Twitter bio during launch
- GitHub README
- Website footer
- Email signatures

---

## Analytics to Track

**Discord built-in analytics:**
- Member growth (daily)
- Message activity (by channel)
- Voice usage
- New member retention (7-day, 30-day)

**Custom tracking:**
- Support ticket resolution time
- Most common questions (for FAQ/docs)
- Feature request upvotes
- Showcase submissions

---

## Post-Launch Engagement Ideas

### Weekly Events

**Monday:** Feature request voting
- Review top 5 requests, community votes

**Wednesday:** Office hours
- Live Q&A in voice channel, 1 hour

**Friday:** Showcase spotlight
- Feature best community project in #announcements

### Monthly

**Community AMA**
- Founder answers anything, voice + text

**Contributor spotlight**
- Highlight top contributor, interview in #announcements

**Product roadmap share**
- Preview next month's features

---

## Emergency Protocols

### If Discord Gets Spammed

1. Enable verification level to "High" (10 min before messaging)
2. Activate slow mode (60 seconds) in all public channels
3. Mute @everyone (prevent mention spam)
4. Ban spammer + delete all messages
5. Post in #announcements explaining temporary lockdown

### If Negative Feedback Floods In

1. Don't delete (unless abusive/off-topic)
2. Respond transparently in #announcements
3. Create #feedback channel for structured input
4. Post resolution plan with timeline
5. Follow up when fixed

---

## Server Icon & Banner Assets

### Server Icon (512×512 PNG)
- Use Hivemind logo (🧠 or custom design)
- Purple gradient background
- High contrast for mobile visibility

### Server Banner (960×540 PNG, requires Level 2 boost)
- Cover image from Product Hunt
- Text: "Autonomous AI Orchestrator"
- CTA: "Get 50% off with code PH50"

---

## Final Pre-Launch Test

- [ ] Join server as new user (test welcome flow)
- [ ] Post in each channel (ensure permissions work)
- [ ] Trigger auto-moderation rules (test MEE6)
- [ ] Invite link works and doesn't expire
- [ ] Welcome DM sends correctly
- [ ] Moderators have proper permissions
- [ ] Bots are online and responsive
- [ ] Channels are in logical order
- [ ] All pinned messages are set
- [ ] Invite link is trackable

---

## Success Metrics

**Week 1 (Launch):**
- 100+ members joined
- 50+ messages in #support (shows engagement)
- 10+ showcases in #showcase
- <1 hour avg response time in #support

**Month 1:**
- 500+ members
- 20+ daily active users
- 5+ moderators
- 50+ showcases
- Active voice channel usage

**Month 3:**
- 1,000+ members
- Server Boost Level 2 (vanity URL)
- Community-run events
- 100+ open-source contributors engaged via Discord

---

Discord is now your central community hub—use it to build relationships, provide support, and turn users into advocates! 🚀
