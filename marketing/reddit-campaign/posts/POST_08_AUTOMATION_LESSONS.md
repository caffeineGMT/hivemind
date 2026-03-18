# Post #8: I automated my prototype pipeline. Here's what worked (and what failed)

**Subreddit:** r/EntrepreneurRideAlong
**Post Date:** Monday, April 1 @ 8 AM PT
**Flair:** Lessons Learned

---

## Post Content

**Title:**
```
I automated my prototype pipeline. Here's what worked (and what failed)
```

**Body:**
```markdown
**Month 1 (Jan 2026):** Built 3 MVPs manually. Took 6 weeks total. All failed.

**Month 2 (Feb 2026):** Automated my build process with AI agents. Built 15 MVPs. 4 made money.

**Month 3 (Mar 2026):** Refined the system. Built 12 MVPs. 6 showing traction.

Here's exactly what I automated, what I couldn't automate, and the lessons learned.

---

## The Automation Stack

### What I Automated

#### 1. **Boilerplate Code Generation** ✅
**Before:** 4-6 hours setting up auth, database, routing
**After:** 15 minutes (agents do it)
**Success rate:** 95%

**What works:**
- Standard auth flows (email/password, magic links)
- Database schema from requirements
- API route structure
- Basic CRUD operations

**What doesn't:**
- Custom OAuth providers
- Complex permission systems
- Multi-tenancy architecture

---

#### 2. **UI Component Creation** ✅
**Before:** 8-12 hours building forms, layouts, navigation
**After:** 2-3 hours (agents create, I polish)
**Success rate:** 70%

**What works:**
- Standard forms (input, validation, submit)
- Layout grids and cards
- Navigation bars and menus
- Button styles and states

**What doesn't:**
- Custom animations
- Complex interactions (drag-drop, gestures)
- Brand-specific design systems

**Lesson:** Agents create functional UIs. You add personality.

---

#### 3. **Third-Party Integrations** ✅
**Before:** 2-4 hours per integration (reading docs, debugging)
**After:** 30 min - 1 hour (agents handle setup)
**Success rate:** 85%

**What works:**
- Stripe payments (standard flows)
- SendGrid emails
- Supabase database
- Vercel deployment
- Algolia search

**What doesn't:**
- Undocumented APIs
- Complex webhooks
- Multi-step OAuth

---

#### 4. **Deployment & Hosting** ✅
**Before:** 1-2 hours (config, env vars, debugging)
**After:** 10 minutes (fully automated)
**Success rate:** 98%

**What works:**
- Vercel deployment (git push → live)
- Environment variable setup
- Domain configuration
- SSL certificates

**What doesn't:**
- Custom server configs
- Docker containerization
- Complex CI/CD pipelines

---

### What I Couldn't Automate

#### 1. **Product Strategy** ❌
**Why it matters:** Agents can't figure out what users want.

**Still manual:**
- Choosing which idea to build
- Defining the core value proposition
- Deciding which features matter most
- Pricing strategy

**Time investment:** 2-3 hours per project

**Can't be automated (yet):** Requires market intuition

---

#### 2. **UX Polish** ❌
**Why it matters:** Generic UIs don't convert.

**Still manual:**
- Spacing and alignment tweaks
- Color scheme refinement
- Micro-interactions
- Copywriting and tone

**Time investment:** 3-5 hours per project

**Can't be automated:** Requires taste and brand sense

---

#### 3. **Customer Validation** ❌
**Why it matters:** Code doesn't talk to customers.

**Still manual:**
- Finding first 10 users
- Conducting user interviews
- Analyzing feedback
- Deciding what to build next

**Time investment:** 5-10 hours per project

**Can't be automated:** Requires human empathy

---

#### 4. **Security Review** ❌
**Why it matters:** Agents miss subtle vulnerabilities.

**Still manual:**
- Auth flow review
- Input sanitization checks
- Environment variable protection
- Rate limiting setup

**Time investment:** 1-2 hours per project

**Can't be automated (safely):** Too risky to trust blindly

---

## Real Numbers: Before vs. After

### Manual Pipeline (Jan 2026)

| Project | Build Time | Deploy Time | Polish Time | Total |
|---------|-----------|-------------|-------------|-------|
| Project 1 | 18 hrs | 2 hrs | 4 hrs | 24 hrs |
| Project 2 | 22 hrs | 3 hrs | 5 hrs | 30 hrs |
| Project 3 | 16 hrs | 2 hrs | 3 hrs | 21 hrs |
| **TOTAL** | **56 hrs** | **7 hrs** | **12 hrs** | **75 hrs** |

**Result:** 3 projects, 0 revenue, 75 hours invested

---

### Automated Pipeline (Feb-Mar 2026)

| Activity | Time per Project | Projects Built | Total Time |
|----------|-----------------|----------------|------------|
| Writing specs | 1 hr | 27 | 27 hrs |
| Agent build (automated) | 0 hrs | 27 | 0 hrs |
| Review & debug | 2 hrs | 27 | 54 hrs |
| UX polish | 3 hrs | 27 | 81 hrs |
| Customer validation | 4 hrs | 10* | 40 hrs |
| **TOTAL** | | **27 projects** | **202 hrs** |

*Only the 10 that showed early traction

**Result:** 27 projects, 10 with traction, $3,847 total revenue

---

### The Math

**Manual:** 75 hours → 3 projects → 0 revenue → $0/hour
**Automated:** 202 hours → 27 projects → $3,847 revenue → $19/hour

**But more importantly:**
- Manual: 0/3 winners (0%)
- Automated: 10/27 winners (37%)

**The automation didn't make me money directly. It increased my at-bats.**

---

## Failures (The Honest Part)

### ❌ Failure #1: Over-Automation

**What I tried:** Automate customer validation (AI analyzes Reddit threads, suggests who to reach out to)

**What happened:** AI found relevant threads but couldn't understand nuance. Suggestions were generic.

**Time wasted:** 8 hours building, 0 useful insights

**Lesson:** Automate execution, not strategy.

---

### ❌ Failure #2: Complex Projects

**What I tried:** Build a real-time collaboration tool (think Figma-lite)

**What happened:** Agents struggled with websockets, state sync, conflict resolution. Code was 30% working.

**Time wasted:** 12 hours debugging agent output, gave up

**Lesson:** Stick to boring tech for MVPs. Innovation after validation.

---

### ❌ Failure #3: Blind Trust

**What I tried:** Deploy without reviewing agent-generated auth code

**What happened:** Found a major security flaw 3 days later (user IDs in URLs, no validation). Luckily caught before anyone exploited it.

**Time wasted:** 4 hours fixing + 6 hours reviewing all previous projects

**Lesson:** ALWAYS review security-critical code manually.

---

### ❌ Failure #4: No Error Handling

**What I tried:** Let agents handle error cases

**What happened:** Users encountered errors, saw raw stack traces or blank screens. 8 support emails on day 1.

**Time wasted:** 3 hours adding try-catch blocks to 4 projects

**Lesson:** Agents optimize for happy path. You add defensive code.

---

## What I'd Do Differently

### 1. Start with Smaller Scopes

**Mistake:** "Build a marketplace with buyer/seller dashboards, payments, messaging."

**Better:** "Build a landing page where sellers list items. Just a form and public display page."

Start small, automate that, then layer complexity.

---

### 2. Create Reusable Templates

After building 27 projects, I noticed patterns:

**Common features:**
- Auth (magic link)
- Payment (Stripe checkout)
- Email (SendGrid transactional)
- Database (Supabase)

**Solution:** I created starter templates with these pre-configured.

**Time savings:** Reduced setup from 1 hour → 10 minutes per project.

---

### 3. Build a Quality Checklist

Before deploying, I now run through:
- [ ] Security review (auth, inputs, env vars)
- [ ] Error handling (try-catch, user-friendly messages)
- [ ] Mobile responsive (test on phone)
- [ ] Loading states (no blank screens)
- [ ] Analytics (track key user actions)

**Takes 30 minutes, prevents 90% of day-1 fires.**

---

### 4. Timebox Agent Work

**Mistake:** Let agents work for hours, even when stuck.

**Better:** Set a time limit (2 hours max). If agents aren't making progress, intervene or pivot.

**Saved:** 15+ hours of agents spinning in circles.

---

## The Tools I Use

### Orchestration
**Hivemind Engine** (my open source tool)
- GitHub: github.com/caffeineGMT/hivemind
- Coordinates multiple Claude agents
- Handles task assignment, conflict resolution
- Monitors progress, escalates when stuck

### Tech Stack (Same for All Projects)
- **Frontend:** React + TailwindCSS
- **Backend:** Next.js API routes
- **Database:** Supabase
- **Payments:** Stripe
- **Hosting:** Vercel
- **Email:** SendGrid

**Why the same stack?** Muscle memory. I can debug fast, agents can build reliably.

---

## Current Results (Month 3)

### Projects by Status

**Live & making money (6):**
1. Freelance contract generator: $892 MRR
2. Cold email analyzer: $634 MRR
3. PH launch copy tool: $418 MRR
4. Expense tracker for nomads: $279 MRR
5. Podcast show notes: $203 MRR
6. Code snippet manager: $127 MRR

**Live but not monetized yet (4):**
- Bookmark manager (adding paid tier)
- GitHub PR checklist (testing pricing)
- Newsletter curator (building features)
- Job board aggregator (low traction)

**Archived (17):**
- No traction after 7 days
- Killed fast, no regrets

---

### Revenue & Costs

**Total revenue (90 days):** $2,553 MRR + $1,294 one-time = $3,847

**Costs:**
- AI API calls: $547
- Hosting: $0 (Vercel free tier)
- Domains: $156 (13 domains × $12)
- **Total:** $703

**Profit:** $3,144
**ROI:** 4.5x

**Time invested:** 202 hours
**Effective hourly rate:** $15.56/hour

---

## Is This Worth It?

**For me? Yes.**

I'm not quitting my day job at Meta ($200K+). But:
- I'm learning what product-market fit looks like
- I'm building in public (growing audience)
- I have 6 potential businesses to scale
- I'm testing ideas 10x faster than before

**If one hits $10K MRR, I'll consider going full-time.**

**For you? Depends.**

This works if you:
- Have a day job (this is nights/weekends)
- Are technical (can review code)
- Value speed over perfection
- Have lots of ideas to test

This doesn't work if you:
- Want passive income (still requires work)
- Need production-quality code from day 1
- Aren't comfortable with uncertainty
- Prefer going deep on one idea

---

## Questions I'll Answer

- How do you prevent agents from going off the rails?
- What's your process for writing good specs?
- Can non-technical founders use this approach?
- How do you decide which projects to kill vs. keep?
- What's the biggest mistake you made (that you haven't shared)?

Building and learning in public. Happy to help if you're trying something similar!

---

*Context: I'm a SWE at Meta (InfraX team). This is my side project workflow. Not a course, not a product - just documenting what works.*
```

---

## Visual Assets

1. **Before/After Pipeline:** Manual (75hrs) vs. Automated (202hrs, 9x projects)
2. **Success Rate Chart:** 0% → 37% hit rate
3. **Revenue Dashboard:** $3,847 breakdown by project
4. **Automation Checklist:** What to automate vs. what to do manually

---

## Comment Responses

**Q: "202 hours for $3,847 = $19/hour. That's below minimum wage in some states."**
> True, but that's not the right way to look at it (IMO).
>
> **Short-term:** Yes, $19/hour is low.
>
> **Long-term:** I'm building assets, not trading time for money.
>
> If 1 of these 6 projects hits $10K MRR, that's $120K ARR from 202 hours of work. That's $594/hour annualized.
>
> Plus, I'm learning entrepreneurship while keeping my Meta job. Low-risk, high-upside.

**Q: "How do you have time for this with a full-time job?"**
> Fair question. My schedule:
>
> **Weekdays:**
> - 7 AM - 6 PM: Meta job
> - 6-8 PM: Family dinner, dog walk
> - 8-10 PM: Side projects (2 hrs/day)
>
> **Weekends:**
> - Saturday: 4-6 hours on side projects
> - Sunday: 2-4 hours on side projects
>
> **Total:** ~20 hours/week
>
> The key: Agents work overnight. I review in the morning. So my 20 hours feels like 40 because agents are building while I sleep.

---

## Success Metrics

**Minimum:** 25+ upvotes, 12+ comments, 5+ saves
**Target:** 70+ upvotes, 35+ comments, 20+ "this is helpful" responses
**Stretch:** 150+ upvotes, 80+ comments, top post of the week
