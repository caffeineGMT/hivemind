# Hivemind Engine

> Orchestrate teams of Claude agents to build software autonomously

**Hivemind** is an AI company orchestrator that spawns and manages teams of Claude Code agents via tmux sessions. Give it a business goal, and watch specialized agents (CEO, Product Manager, Engineers) collaborate 24/7 to build working software and iterate based on real-world feedback.

**This is a LOCAL DASHBOARD** — runs on localhost:3100 for managing your AI agent companies. Not a SaaS product.

---

## What It Does

Hivemind creates autonomous software companies with:

- **CEO Agent** — Analyzes business goals, creates product strategy, breaks down work into tasks
- **Product Manager Agent** — Prioritizes features, writes specs, manages the backlog
- **Engineer Agents** — Write code, fix bugs, deploy to production, monitor health
- **24/7 Operation** — Agents work continuously, checkpoint state, self-heal on failures

Each agent runs in its own tmux session with full Claude Code capabilities: reading files, writing code, running commands, pushing to GitHub.

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
6. Agents commit and push code to GitHub
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

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the deployment workflow:

1. Write code
2. Run `npm run build` to verify zero errors
3. Fix any build errors
4. Commit and push to GitHub (staging environment)
5. Production deployment is manual only

**GitHub is the staging environment.** Do NOT use Vercel or any auto-deploy services.

## What It's Good At

**Rapid Prototyping**
- Build functional prototypes in hours instead of days
- Agents iterate continuously based on test results
- Self-healing on failures (no human intervention needed)

**24/7 Development Cycles**
- Set a goal before bed, wake up to a working prototype
- Parallel task execution (multiple engineers work simultaneously)
- Shared context via SQLite database

**Multi-Agent Collaboration**
- CEO creates strategy, PM prioritizes, engineers execute
- Agents communicate via database comments and task dependencies
- Resource pooling and load balancing across agents

## Limitations

**Not AGI**
- Agents work best with well-defined tasks
- Struggles with ambiguous requirements or novel architectures
- Human review recommended before production use

**Cost Considerations**
- Claude API usage can add up quickly
- Budget controls help manage costs
- Monitor costs via the dashboard

**Error Recovery**
- Circuit breaker pauses agents after repeated failures
- Some failures require human intervention (API keys, external dependencies)
- Checkpoint recovery works for crashes, not logic errors

**Code Quality**
- Agents write working code, but may not follow all best practices
- Human code review recommended for production deployments

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and community voting.

**Upcoming:**
- Agent collaboration improvements (code review, pair programming)
- Testing automation (agents write and run tests)
- Cost optimization (cheaper models for simple tasks)
- GitHub integration (automatic PR creation)
- Human-in-the-loop approval gates

## Contributing

Contributions welcome! This is an experimental project, and we're learning what works.

**Ways to help:**
- Try it and report issues
- Share your cost/time data
- Submit prompts that work well (or don't)
- Improve error recovery logic
- Add deployment targets beyond GitHub

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
