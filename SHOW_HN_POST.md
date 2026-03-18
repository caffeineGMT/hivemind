# Show HN Post: Hivemind Engine

**Post this on Wednesday, 9 AM EST for maximum visibility**

---

## Title

```
Show HN: Hivemind – Orchestrate teams of Claude agents to build software autonomously
```

## Body

```
I built an AI company orchestrator that spawns teams of Claude Code agents via tmux to build software 24/7.

Give it a business goal like "Build a task management SaaS with Stripe payments", and it:
1. CEO agent creates product strategy and breaks it into tasks
2. Product Manager prioritizes the backlog
3. Engineer agents pick up tasks, write code, commit to git, deploy to Vercel
4. Health monitoring + circuit breakers handle failures
5. Agents checkpoint state and resume on crashes

Live demo: https://hivemind.dev (guest/demo)
GitHub: https://github.com/caffeineGMT/hivemind

──────────────────────────────────────────
Technical Architecture
──────────────────────────────────────────

Multi-Agent Coordination:
- Each agent runs in isolated tmux session
- Full Claude Code capabilities (file ops, shell commands, git, deployments)
- Shared SQLite database for task queue and coordination
- WebSocket dashboard for real-time monitoring

Resource Isolation:
- Per-project agent limits (1-50 concurrent agents)
- Budget controls with automatic dispatch pause
- Independent task queues, no cross-contamination

Health Monitoring:
- Heartbeat checks every 15-30 seconds
- Circuit breaker pauses agents after 3+ consecutive failures
- Automatic restart with checkpoint recovery
- Incident logging and dashboard visibility

Smart Checkpointing:
- Agents save state every 5 turns
- Resume from last checkpoint on crash/restart
- Graceful shutdown preserves in-progress work

Tech Stack:
- Orchestrator: Node.js + SQLite + WebSockets
- Agents: Claude Code (Sonnet 4.5) via Anthropic SDK
- Session Management: tmux multiplexing
- Dashboard: React + TypeScript + Vite
- Deployment: Vercel (automatic on git push)

──────────────────────────────────────────
Origin Story
──────────────────────────────────────────

I wanted to validate side project ideas fast, but coding MVPs took weeks. What if AI agents could build and iterate 24/7 while I sleep?

Started as a weekend experiment with Claude Code. Realized the multi-agent orchestration was the hard part — coordinating agents, handling failures, checkpointing state, preventing resource conflicts.

Spent 2 weeks building the coordination layer. Now I use it for my own projects. Sharing because others might find it useful.

──────────────────────────────────────────
What It's Good At
──────────────────────────────────────────

Rapid Prototyping:
- "Build a landing page with waitlist" → Live site in 30 minutes
- "Add Stripe checkout flow" → Working payments in 1 hour
- Set a goal before bed, wake up to a working prototype

Real Cost Data (from my usage):
- Simple landing page: $3-8 (30-60 min, ~600-1200 API calls)
- CRUD app with database: $15-25 (2-3 hours)
- SaaS MVP with payments: $40-80 (6-10 hours)
- Full product with analytics: $100-200 (15-25 hours)

For comparison: hiring a dev at $100/hr would cost $400-2500 for the same work. But the real win is speed — 24/7 execution with no context switching.

──────────────────────────────────────────
Limitations (Being Honest)
──────────────────────────────────────────

NOT AGI:
- Works best for well-defined tasks ("add login page", "integrate Stripe")
- Struggles with ambiguous requirements or novel architectures
- You still need to define the "what", agents figure out the "how"

Cost Considerations:
- Claude API usage adds up ($0.05-0.20 per agent-hour)
- Budget controls help, but monitor costs actively
- Best for tasks that would take humans hours/days, not minutes

Code Quality:
- Agents write working code, but may skip best practices
- No automated testing yet (agents validate manually)
- Human code review recommended for production

Error Recovery:
- Circuit breaker pauses agents after repeated failures
- Some failures need human intervention (expired API keys, external deps)
- Checkpoint recovery works for crashes, not logic errors

──────────────────────────────────────────
What's Next
──────────────────────────────────────────

Open roadmap at /roadmap — vote on features:
- Agent collaboration (code review, pair programming)
- Testing automation (agents write + run tests)
- Cost optimization (cheaper models for simple tasks)
- GitHub integration (automatic PR creation)
- Human-in-the-loop approval gates

──────────────────────────────────────────
Try It
──────────────────────────────────────────

Demo: https://hivemind.dev (guest/demo)
GitHub: https://github.com/caffeineGMT/hivemind
Docs: Full setup guide in README

Hacker News readers: DM me for early access to Team tier (multi-project orchestration, advanced budgets, priority support).

──────────────────────────────────────────

Happy to answer technical questions about the architecture, coordination logic, cost optimization, or anything else. This is an experiment, and I'm learning what works.

Not here to claim this replaces human developers — it doesn't. It's a tool for rapid prototyping and idea validation. Use it responsibly, monitor costs, review code before production.
```

---

## Posting Checklist

- [ ] GitHub repo is public
- [ ] Live demo is accessible at https://hivemind.dev
- [ ] README.md is comprehensive
- [ ] ROADMAP.md exists and is linked
- [ ] Post on Wednesday 9 AM EST
- [ ] Monitor comments every 2 hours
- [ ] Have cost breakdown data ready
- [ ] Prepare to share technical details (architecture diagrams, code snippets)

## Response Templates

### Technical Questions

**Q: How do you handle agent conflicts (two agents editing same file)?**
> Good question. Right now: task assignment is exclusive (one agent per task), and each agent works in its own tmux session. Race conditions are rare because agents claim tasks atomically via SQLite. But you're right, this could fail if agents both run `git pull` at the same time. On the roadmap: file-level locking via the orchestrator. Happy to share the task assignment code if you want to dig deeper.

**Q: What happens when an agent fails?**
> Circuit breaker logic. If an agent fails 3+ times in a row, it gets paused and marked as "failed" in the dashboard. The orchestrator logs the error, and a human can review + restart. On restart, agent resumes from last checkpoint (saved every 5 turns). For crashes (process dies), tmux session is dead but state is preserved — orchestrator spawns a new agent and resumes. Biggest gap: distinguishing between "retryable" and "needs human" failures. Working on smarter retry logic.

**Q: How much does this actually cost?**
> Real numbers from my usage:
> - Landing page (30 min): ~600 API calls, $3-8
> - CRUD app (2 hrs): ~1200-2000 calls, $15-25
> - SaaS MVP (8 hrs): ~4000-6000 calls, $50-80
> Sonnet 4.5 is ~$3/million input tokens, $15/million output. Agents are chatty (reading files, tool calls). Budget controls help — you can set a $20 cap and agents pause when hit. I've spent ~$300 total building 5 side projects. Worth it for me vs. nights/weekends coding.

### Limitations Discussion

**Q: This seems overhyped. Can it actually build production apps?**
> Fair criticism. "Build production apps" is a spectrum. Can it build a working MVP with auth, database, payments? Yes. Can it architect a complex system with microservices, caching, and edge cases? Not reliably. I use it for 0→1 prototyping, then take over for refinement. It's a tool, not a replacement. The hype around AI is real, but so is the utility for well-scoped tasks.

**Q: Why not just use Cursor/GitHub Copilot?**
> Different use case. Cursor is for augmented coding (you drive, AI assists). Hivemind is for autonomous execution (AI drives, you set goals). Cursor is better for nuanced work. Hivemind is better for "build this entire feature while I sleep". Both have a place. I use Cursor for my day job, Hivemind for side projects.

### Cost/Business Questions

**Q: What's your business model?**
> Honestly, still figuring it out. Right now: open source + optional managed hosting. Possible tiers:
> - Free: self-hosted, community support
> - Pro ($49/mo): managed hosting, priority support, advanced budgets
> - Team ($199/mo): multi-project orchestration, Slack integration, SSO
> But I'm not optimizing for revenue yet. Focused on making it genuinely useful first.

### Engagement

**Q: This is cool! Can I try it?**
> Yes! Demo at https://hivemind.dev (guest/demo). For self-hosting, clone the repo and follow the README. If you hit issues, open a GitHub issue and I'll help. Also: DM me if you want early access to the managed Team tier — happy to onboard beta users.

---

## Engagement Strategy

1. **First 2 hours:** Respond to every comment within 15 minutes
2. **Next 6 hours:** Check every 1-2 hours, prioritize technical questions
3. **After 8 hours:** Daily check-ins, respond to new threads

**Be transparent:**
- Share real costs, failures, limitations
- Don't oversell — be honest about what works and what doesn't
- Invite criticism and learn from it

**Share details:**
- Offer to share code snippets, architecture diagrams
- Link to specific files in GitHub for deep dives
- Offer to write follow-up posts on orchestration logic, cost optimization, etc.

**Build community:**
- Invite users to try it and share results
- Ask for feature requests and votes
- Recognize good questions and ideas publicly
