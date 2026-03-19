# Sprint 02 — Quality & Reliability Improvements
**Duration:** March 19 - April 1, 2026
**Focus:** Testing, Accessibility, Performance, Production Readiness

---

## Sprint Goal
Transform Hivemind Engine from functional MVP to production-ready platform by addressing critical gaps in testing, accessibility, performance monitoring, and code quality.

---

## Critical Priority (Due: March 22-24)

### 1. E2E Test Suite with Playwright
**Deadline:** March 22, 2026
**Current State:** Only 2 backend test files — zero UI/E2E coverage
**Impact:** HIGH — Prevents regressions, enables confident deployments

**Scope:**
- Install and configure Playwright
- Test suite covering:
  - Dashboard metrics display and real-time updates
  - Agent creation, monitoring, and lifecycle
  - Task queue visualization and filtering
  - WebSocket connection and reconnection
  - Project configuration UI
  - Health monitoring dashboard
  - Log viewer search and filtering
- Add `npm test` and `npm run test:e2e` scripts
- CI integration (GitHub Actions)
- Target: 80%+ coverage of critical user flows

### 2. Accessibility Compliance (WCAG 2.1 AA)
**Deadline:** March 24, 2026
**Current State:** Only 2 ARIA attributes across 50 UI files
**Impact:** HIGH — Legal requirement, excludes 15% of users

**Critical Violations:**
- AgentCard: Missing aria-label for status icons
- MetricCard: Clickable divs need role="button" and keyboard handlers
- FilterBar: Dropdowns missing aria-expanded state
- TaskQueueVisualization: No aria-live regions for dynamic updates
- Modal dialogs: Missing aria-modal and focus trapping
- Form inputs: Missing visible labels
- Navigation: No skip-to-content link

**Deliverables:**
- Full ARIA attribute coverage
- Keyboard navigation for all interactive elements
- Screen reader testing with NVDA/VoiceOver
- Focus indicators and focus management
- Semantic HTML improvements

---

## High Priority (Due: March 25-30)

### 3. Bundle Size Optimization
**Deadline:** March 25, 2026
**Current State:** 1.28MB bundle (500KB+ warning threshold)
**Impact:** MEDIUM — Affects load time, mobile users, SEO

**Implementation:**
- Route-based code splitting with React.lazy()
  - Dashboard, Agents, Tasks, Settings, Analytics as separate chunks
- Dynamic imports for heavy components
  - Monaco Editor (used in log viewer)
  - Chart libraries (task queue graph, analytics)
- Vite config optimization
  - Manual chunk splitting for vendors
  - Tree-shaking improvements
- Bundle analysis with rollup-plugin-visualizer
- Target: <500KB main bundle, <150KB per route chunk

### 4. Structured Logging System
**Deadline:** March 26, 2026
**Current State:** 329 console.log/error statements
**Impact:** MEDIUM — Production debugging impossible

**Implementation:**
- Create logger utility using Winston (already in dependencies)
- Log levels: error, warn, info, debug
- Structured JSON format with:
  - Timestamp (ISO 8601)
  - Level
  - Message
  - Context: agentId, taskId, companyId
  - Source location (file, line)
  - Stack trace (for errors)
- React LoggerContext for component logging
- Production vs development modes
- Log rotation and retention (7 days)
- Migration script to replace all console statements

### 5. Database Migration System
**Deadline:** March 27, 2026
**Current State:** 100+ lines of ad-hoc migration code in db.js
**Impact:** MEDIUM — Risky deployments, can't rollback

**Implementation:**
- migrations/ directory with timestamped files
  - 001_initial.sql — base schema
  - 002_add_traces.sql — trace enhancement
  - 003_add_agent_pooling.sql — resource pooling
  - etc.
- Migration runner with schema_migrations table
- Up/down migration support
- CLI commands:
  - `npm run migrate` — apply pending
  - `npm run migrate:rollback` — undo last
  - `npm run migrate:status` — show state
- Validation and safety checks
- Refactor existing db.js migrate() function

### 6. Error Boundaries & Error States
**Deadline:** March 28, 2026
**Current State:** No error boundaries — errors crash entire app
**Impact:** HIGH — User experience, data loss

**Implementation:**
- Top-level ErrorBoundary component
  - Graceful fallback UI with brand styling
  - "Something went wrong" message
  - Actionable recovery steps (refresh, go home)
- Route-level boundaries for isolation
- Component-level boundaries for:
  - Live agent status widget
  - Task queue visualization
  - Log viewer
- Backend error reporting
  - New POST /api/errors endpoint
  - Capture: error message, stack, component, user action
  - Rate limiting to prevent spam
- User-friendly error messages
  - Replace technical errors with plain language
  - Suggest fixes where possible
- Retry mechanism for transient failures

### 7. Mobile Optimization Completion
**Deadline:** March 29, 2026
**Current State:** 60% complete (per ROADMAP.md)
**Impact:** MEDIUM — Mobile traffic ~40% of users

**Remaining Issues:**
- Touch target sizing: Some buttons <44px (iOS accessibility violation)
- ResponsiveTable: Horizontal scroll buggy on mobile Safari
- FilterBar: Dropdowns overlap on small screens (<375px)
- AgentCard: Swipe gesture conflicts with vertical scroll
- TaskDetail page: Text too small, requires pinch-zoom
- WebSocket: Aggressive reconnection drains mobile battery

**Deliverables:**
- Enforce min-height/min-width: 44px for all interactive elements
- Fix ResponsiveTable with CSS scroll-snap and touch-action
- FilterBar mobile layout: Stack dropdowns vertically
- Remove or fix swipe gestures on AgentCard
- Typography scale for mobile (16px base, avoid zoom)
- Battery-efficient WebSocket: exponential backoff, visibility API
- Test on iOS Safari, Chrome Android, Samsung Internet

### 8. Production Monitoring & Alerting
**Deadline:** March 30, 2026
**Current State:** No monitoring — production issues invisible
**Impact:** CRITICAL — Can't detect outages, data loss

**Implementation:**
- Sentry error tracking
  - Frontend SDK in React
  - Backend SDK in Express
  - Source map upload for stack traces
  - User context (agentId, companyId)
  - Release tracking for deployments
- Performance monitoring
  - Web Vitals: LCP, FID, CLS
  - Custom metrics: API response time, WebSocket latency
  - Performance observer for slow components
- Health check endpoint
  - GET /api/health
  - Returns: {status: "ok", db: "connected", ws: "listening"}
  - Used by uptime monitors
- Uptime monitoring
  - BetterStack or UptimeRobot (free tier)
  - 1-minute checks
  - Alert on 3 consecutive failures
- Alert webhooks
  - Slack integration for critical errors
  - Email for uptime failures
- Environment variables: SENTRY_DSN, SENTRY_ENVIRONMENT

---

## Medium Priority (Due: March 31 - April 1)

### 9. API Rate Limiting & Validation
**Deadline:** March 31, 2026
**Current State:** No rate limiting or input validation
**Impact:** MEDIUM — Vulnerable to abuse, spam, injection

**Implementation:**
- express-rate-limit middleware
  - Global: 100 requests/15min per IP
  - /api/nudge: 10/hour (prevent spam)
  - /api/deploy: 5/hour (expensive operation)
  - /api/agents: 50/hour (moderate)
- Input validation with Zod
  - Schema for all POST/PUT request bodies
  - Type-safe validation + auto-generated types
  - Validate: company creation, task creation, nudges, config updates
- Request size limits
  - Body parser: 10MB max
  - File uploads: 5MB max (if applicable)
- CSRF protection
  - CSRF tokens for state-changing endpoints
  - SameSite cookies
- API key authentication
  - For automation/scripts
  - Stored in companies table
  - Rate limit: 1000/hour for API keys

### 10. WebSocket Reconnection UX
**Deadline:** April 1, 2026
**Current State:** Shows "Live" indicator but poor reconnection experience
**Impact:** LOW — Annoying but not blocking

**Implementation:**
- Exponential backoff reconnection
  - Initial: 1s delay
  - Backoff: 2s, 4s, 8s, 16s, max 30s
  - Reset on successful connection
- Visible reconnection UI
  - Toast notification: "Reconnecting in 5s..."
  - Countdown timer
  - Manual "Reconnect Now" button
- Offline mode banner
  - Prominent banner when disconnected >10s
  - Disable real-time features (nudge, live metrics)
  - Show last-known state with timestamp
- Failed update queue
  - Queue mutations during disconnection
  - Retry when reconnected
  - Show pending count in UI
- Optimistic UI updates
  - Apply updates immediately
  - Rollback on server rejection
  - Visual indicator for pending state
- Connection quality indicator
  - Measure ping latency every 30s
  - Color-coded: green (<100ms), yellow (100-300ms), red (>300ms)
  - Display in footer or settings

---

## Success Metrics

**Testing:**
- ✅ 80%+ E2E test coverage of critical flows
- ✅ All tests passing in CI before merge

**Accessibility:**
- ✅ WCAG 2.1 AA compliance verified with Axe DevTools
- ✅ Keyboard navigation works for all features
- ✅ Screen reader testing passed on NVDA + VoiceOver

**Performance:**
- ✅ Main bundle <500KB (currently 1.28MB)
- ✅ LCP <2.5s, FID <100ms, CLS <0.1 (Core Web Vitals)

**Reliability:**
- ✅ Zero unhandled errors crash the app
- ✅ All API endpoints have rate limiting
- ✅ Database migrations run cleanly on fresh DB

**Monitoring:**
- ✅ Sentry capturing errors in production
- ✅ Uptime monitor alerting on downtime
- ✅ Health check endpoint returning 200

---

## Out of Scope (Deferred to Sprint 03)

- Multi-model strategy (Haiku for simple tasks) — cost optimization
- GitHub PR integration — workflow improvement
- Agent collaboration (pair programming) — complex feature
- Visual workflow builder — long-term vision
- Self-improving agents — research project

---

## Risk Mitigation

**High-Risk Changes:**
- Database migration system refactor
  - Mitigation: Test on copy of production DB first
  - Rollback plan: Keep old migrate() function for one release
- Bundle size optimization
  - Risk: Code splitting breaks production
  - Mitigation: Test build locally, deploy to staging first

**Timeline Risks:**
- 10 tasks in 13 days = aggressive
- Buffer: Lower priority tasks (9, 10) can slip to Sprint 03
- Parallelization: Tasks 1-8 can be worked on independently

---

## Next Steps

1. **Immediate (Today):** Dispatch engineers to start on Critical tasks (1, 2)
2. **Tomorrow:** Review test coverage reports, accessibility audit results
3. **March 22:** Demo E2E test suite running in CI
4. **March 24:** Accessibility compliance verification
5. **March 28:** Mid-sprint review — adjust priorities if needed
6. **April 1:** Sprint review and retrospective

---

**Questions or blockers?** Flag in daily standup or ping CEO immediately.
