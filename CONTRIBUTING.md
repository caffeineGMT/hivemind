# Contributing to Hivemind Engine

Thanks for your interest in contributing! This is an experimental project, and we're learning what works. Contributions are welcome at all levels.

---

## Ways to Contribute

### 1. Report Issues
- Bug reports with reproduction steps
- Performance problems or cost inefficiencies
- Documentation gaps or unclear instructions
- Feature requests (use `[VOTE]` prefix)

### 2. Improve Documentation
- README clarifications
- Architecture explanations
- Setup guides for different platforms
- Tutorial blog posts or videos

### 3. Fix Bugs
- Check [GitHub Issues](https://github.com/caffeineGMT/hivemind/issues) for bugs
- Small fixes welcome without prior discussion
- Large refactors: open an issue first to discuss

### 4. Add Features
- Check [ROADMAP.md](ROADMAP.md) for prioritized features
- Upvote features you want to see
- Discuss implementation approach before coding

### 5. Share Usage Data
- Cost breakdowns (anonymized)
- Success/failure cases
- Prompt improvements
- Agent coordination patterns

---

## Getting Started

### Development Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/caffeineGMT/hivemind.git
   cd hivemind
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd ui && npm install && cd ..
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and paths
   ```

4. **Initialize database:**
   ```bash
   npm start  # This creates the SQLite database
   # Ctrl+C to stop
   ```

5. **Run in development:**
   ```bash
   # Terminal 1: Start orchestrator
   npm start

   # Terminal 2: Start UI dev server
   cd ui && npm run dev
   ```

### Project Structure

```
hivemind/
├── src/                 # Backend (Node.js)
│   ├── orchestrator.js  # Main coordination logic
│   ├── claude.js        # Claude API wrapper
│   ├── db.js            # SQLite schema and queries
│   ├── server.js        # Express API + WebSocket
│   ├── health-monitoring.js
│   ├── circuit-breaker.js
│   └── prompts.js       # Agent system prompts
├── ui/                  # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── pages/       # Dashboard, Tasks, Agents, Settings
│   │   ├── components/  # Reusable UI components
│   │   └── api.ts       # API client
│   └── vite.config.ts
├── bin/
│   └── hivemind.js      # CLI entry point
└── tests/               # (Coming soon)
```

---

## Contribution Guidelines

### Code Style

**JavaScript (Backend):**
- ES modules (`import`/`export`)
- Async/await for promises
- Descriptive variable names
- Comments for complex logic

**TypeScript (Frontend):**
- Strict mode enabled
- Functional components with hooks
- Props interfaces for all components
- Tailwind CSS for styling

**General:**
- Keep functions small and focused
- Avoid premature optimization
- Write self-documenting code
- Add comments for "why", not "what"

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add code review workflow for agents
fix: prevent race condition in task assignment
docs: clarify setup steps for Windows
refactor: simplify circuit breaker logic
test: add unit tests for health monitoring
```

### Pull Request Process

1. **Fork the repo** and create a feature branch:
   ```bash
   git checkout -b feat/code-review-workflow
   ```

2. **Make your changes:**
   - Write clear code
   - Add comments for complex logic
   - Update documentation if needed

3. **Test locally:**
   - Run the orchestrator
   - Create a test company
   - Verify your changes work end-to-end

4. **Commit and push:**
   ```bash
   git add -A
   git commit -m "feat: add code review workflow for agents"
   git push origin feat/code-review-workflow
   ```

5. **Open a Pull Request:**
   - Describe what you changed and why
   - Reference related issues (#123)
   - Include screenshots for UI changes
   - Mark as draft if work-in-progress

6. **Respond to feedback:**
   - Address review comments
   - Update PR description if scope changes
   - Re-request review when ready

### Review Process

- I'll review PRs within 48 hours
- Small fixes: merge quickly
- Large features: discuss design first
- Breaking changes: require version bump

---

## High-Priority Contributions

### Testing Automation (High Impact)
**What:** Agents automatically write and run tests
**Why:** Improves code quality, reduces manual testing
**Difficulty:** Medium
**Files:** `src/orchestrator.js`, new `src/testing.js`
**Acceptance:** Agents generate unit tests, run before deploy

### Cost Optimization (Immediate Value)
**What:** Use Haiku for simple tasks, Sonnet for complex
**Why:** 50-75% cost savings on routine work
**Difficulty:** Medium
**Files:** `src/claude.js`, `src/prompts.js`
**Acceptance:** Automatic model selection based on task type

### GitHub Integration (Community Request)
**What:** Agents create PRs instead of direct commits
**Why:** Human review before merge, better for teams
**Difficulty:** Medium
**Files:** `src/orchestrator.js`, new `src/github.js`
**Acceptance:** Agents create PR, human approves, auto-merge

### Multi-Model Strategy (Cost + Performance)
**What:** CEO uses Opus, Engineers use Sonnet, simple tasks use Haiku
**Why:** Optimize cost per task complexity
**Difficulty:** Medium-High
**Files:** `src/claude.js`, `src/orchestrator.js`, `src/prompts.js`
**Acceptance:** Model selection based on agent role + task type

---

## Feature Development Process

1. **Proposal:**
   - Open an issue with `[FEATURE]` prefix
   - Describe the problem and proposed solution
   - Get feedback from maintainer and community

2. **Design:**
   - Agree on implementation approach
   - Identify affected files and components
   - Estimate complexity and timeline

3. **Implementation:**
   - Create feature branch
   - Write code in small, reviewable commits
   - Test end-to-end with real agents

4. **Review:**
   - Open PR with description and screenshots
   - Address feedback
   - Update docs and roadmap

5. **Merge:**
   - Squash commits if needed
   - Update CHANGELOG
   - Deploy to production

---

## Testing Guidelines

**Manual Testing (Current):**
1. Start orchestrator
2. Create a test company with known goal
3. Watch agents execute tasks
4. Verify expected behavior (commits, deploys, health checks)
5. Test failure scenarios (kill agent, exceed budget)

**Automated Testing (Coming Soon):**
- Unit tests for orchestration logic
- Integration tests for API endpoints
- E2E tests for agent workflows

---

## Documentation Standards

### Code Comments

**Good:**
```javascript
// Prevent race condition: claim task atomically before agent starts
const task = db.claimTask(agentId, taskId);
```

**Bad:**
```javascript
// Get task from database
const task = db.getTask(taskId);
```

### README Updates

- Update README for user-facing changes
- Add setup instructions for new dependencies
- Include screenshots for UI changes

### ROADMAP Updates

- Add new features to roadmap
- Move completed features to "Completed" section
- Update vote counts from GitHub issues

---

## Getting Help

**Questions?**
- Open a [Discussion](https://github.com/caffeineGMT/hivemind/discussions)
- Ping me on Twitter [@caffeineGMT](https://twitter.com/caffeineGMT)
- Email: michael@hivemind.dev

**Stuck?**
- Share error logs and reproduction steps
- I'll respond within 24 hours
- Happy to hop on a call for complex issues

---

## Code of Conduct

**Be respectful:**
- Assume good intent
- Provide constructive feedback
- Welcome newcomers

**Be collaborative:**
- Share knowledge
- Help others debug
- Celebrate wins

**Be honest:**
- Report bugs without blame
- Admit when you don't know
- Ask for help when stuck

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Thanked in Show HN follow-ups

**Top contributors:**
- Invited to beta features early
- Recognized in dashboard credits
- Offered managed hosting credits

---

**Thank you for contributing to Hivemind!** Every PR, issue, and discussion helps make this tool more useful for the community.
