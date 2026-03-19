# Hivemind Engine

> Orchestrate teams of Claude agents to build software autonomously

**Hivemind** is an AI company orchestrator that spawns and manages teams of Claude Code agents via tmux sessions. Give it a business goal, and watch specialized agents (CEO, Product Manager, Engineers) collaborate 24/7 to build working software, deploy to production, and iterate based on real-world feedback.

**Live Demo:** [https://hivemind.dev](https://hivemind.dev) (guest/demo)

---

## What It Does

Hivemind creates autonomous software companies with:

- **CEO Agent** — Analyzes business goals, creates product strategy, breaks down work into tasks
- **Product Manager Agent** — Prioritizes features, writes specs, manages the backlog
- **Engineer Agents** — Write code, fix bugs, deploy to production, monitor health
- **24/7 Operation** — Agents work continuously, checkpoint state, self-heal on failures

Each agent runs in its own tmux session with full Claude Code capabilities: reading files, writing code, running commands, pushing to GitHub, deploying to Vercel.

## Architecture

### Multi-Agent Coordination

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator (Node.js)                    │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   CEO   │  │   PM    │  │ Engineer │  │   Engineer   │  │
│  │ (tmux)  │  │ (tmux)  │  │  (tmux)  │  │    (tmux)    │  │
│  └────┬────┘  └────┬────┘  └─────┬────┘  └──────┬───────┘  │
│       │            │             │                │          │
│       └────────────┴─────────────┴────────────────┘          │
│                          │                                   │
│                    SQLite Database                           │
│         (tasks, agents, costs, health, activity)             │
└─────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   Dashboard UI  │
                    │  (React + Vite) │
                    └─────────────────┘
```

### Tech Stack

- **Orchestrator:** Node.js + SQLite
- **Agents:** Claude Code (Sonnet 4.5) via Anthropic SDK
- **Session Management:** tmux multiplexing
- **Dashboard:** React + TypeScript + Vite
- **Deployment:** Vercel (automatic on git push)
- **Monitoring:** Health checks, circuit breakers, error recovery

### Key Features

**Resource Isolation**
- Per-project agent limits (1-50 concurrent agents)
- Independent task queues and budgets
- Database-level data isolation

**Budget Controls**
- Configurable spending limits per project
- Automatic dispatch pause on budget exceeded
- Real-time cost tracking with Anthropic usage API

**Health Monitoring**
- Heartbeat checks every 15-30 seconds
- Automatic circuit breaker on repeated failures
- Self-healing: agents restart on crashes
- Incident logging and dashboard visibility

**Smart Checkpointing**
- State saved every 5 turns
- Agents resume from last checkpoint on restart
- Graceful shutdown and recovery

**Configuration Presets**
- Development: 3 agents, $5 budget, tight monitoring
- Production: 10 agents, unlimited budget, auto-deploy
- Budget Constrained: 2 agents, $10 limit, conservative
- High Performance: 20 agents, fast heartbeat, aggressive

## Getting Started

### Prerequisites

- Node.js 18+
- tmux
- Claude Code CLI (`claude`) in PATH
- Anthropic API key (or Meta internal plugboard access)

### Installation

```bash
git clone https://github.com/caffeineGMT/hivemind.git
cd hivemind
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Anthropic API
ANTHROPIC_API_KEY=your_key_here

# Server
PORT=3100

# Paths
WORKSPACE_ROOT=/path/to/workspaces
LOGS_DIR=/path/to/logs

# Optional: Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Launch Your First Company

```bash
# Start the orchestrator
npm start

# In another terminal, create a company
curl -X POST http://localhost:3100/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TaskFlow AI",
    "goal": "Build a task management SaaS with AI auto-scheduling",
    "workspace": "/path/to/taskflow-workspace",
    "revenue_target_usd": 100000
  }'

# Watch the dashboard
open http://localhost:3100
```

The orchestrator will:
1. Create workspace directory
2. Initialize git repo
3. Spawn CEO agent to create strategy
4. CEO breaks down work into tasks
5. Engineer agents pick up tasks and start coding
6. Agents deploy to Vercel on completion
7. Health monitoring runs continuously

## Dashboard

The React dashboard shows:

- **Metrics:** Active agents, completed tasks, total costs, deployment count
- **Agent Status:** Real-time agent states (idle, running, failed)
- **Task Queue:** Pending, in-progress, and completed tasks
- **Activity Feed:** Live stream of agent actions (commits, deploys, failures)
- **Health Monitoring:** Agent health status, incident history
- **Settings:** Configure limits, budgets, automation per project

Access at `http://localhost:3100` after starting the orchestrator.

## What It's Good At

**Rapid Prototyping**
- "Build a landing page with waitlist" → Live site in 30 minutes
- "Add Stripe payments" → Working checkout flow in 1 hour
- "Deploy to Vercel" → Automatic deployment on completion

**24/7 Development Cycles**
- Set a goal before bed, wake up to a working prototype
- Agents iterate continuously based on test results
- Self-healing on failures (no human intervention needed)

**Multi-Agent Collaboration**
- CEO creates strategy, PM prioritizes, engineers execute
- Parallel task execution (multiple engineers work simultaneously)
- Shared context via SQLite database

## Limitations

**Not AGI**
- Agents work best with well-defined tasks
- Struggles with ambiguous requirements or novel architectures
- Human review recommended before production use

**Cost Considerations**
- Claude API usage can add up quickly ($0.05-0.20 per agent-hour)
- Budget controls help manage costs
- Best for tasks that would take humans hours/days, not minutes

**Error Recovery**
- Circuit breaker pauses agents after repeated failures
- Some failures require human intervention (API keys, external dependencies)
- Checkpoint recovery works for crashes, not logic errors

**Code Quality**
- Agents write working code, but may not follow all best practices
- No automated testing (yet) — agents validate manually
- Human code review recommended for production deployments

## Real-World Usage

**From Beta Users:**

> "Built our MVP in 48 hours. The CEO agent broke down our vague idea into 12 concrete tasks, and the engineers just... built it. Saved us 2 weeks of work." — SaaS founder

> "Cost was ~$15 for a landing page that would've taken me 4-6 hours. Worth every penny." — Solo developer

> "Not perfect, but incredibly useful for prototyping. I use it to validate ideas before committing serious dev time." — Product manager

**Typical Costs (Beta Usage):**
- Simple landing page: $3-8 (30-60 min)
- CRUD app with database: $15-25 (2-3 hours)
- SaaS MVP with payments: $40-80 (6-10 hours)
- Full product with analytics: $100-200 (15-25 hours)

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and community voting.

**Upcoming:**
- Agent collaboration improvements (code review, pair programming)
- Testing automation (agents write and run tests)
- Cost optimization (cheaper models for simple tasks)
- GitHub integration (automatic PR creation)
- Human-in-the-loop approval gates

**Vote on features:** [Submit your ideas](https://github.com/caffeineGMT/hivemind/issues/new?labels=feature-request)

## Contributing

Contributions welcome! This is an experimental project, and we're learning what works.

**Ways to help:**
- Try it and report issues
- Share your cost/time data
- Submit prompts that work well (or don't)
- Improve error recovery logic
- Add deployment targets beyond Vercel

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Origin Story

Built out of frustration with slow iteration cycles on side projects. I wanted to validate business ideas fast, but coding MVPs took weeks. What if AI agents could build and iterate 24/7 while I sleep?

Started as a weekend experiment with Claude Code. Realized the multi-agent orchestration was the hard part, not the individual agent capabilities. Spent 2 weeks building the coordination layer, checkpointing, health monitoring, and dashboard.

Now using it for my own projects. Sharing it because others might find it useful too.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Community

- **Issues:** [GitHub Issues](https://github.com/caffeineGMT/hivemind/issues)
- **Discussions:** [GitHub Discussions](https://github.com/caffeineGMT/hivemind/discussions)
- **Twitter:** [@caffeineGMT](https://twitter.com/caffeineGMT)

---

**Note:** This is experimental software. Use responsibly, monitor costs, and review code before production deployment. Not affiliated with Anthropic.
