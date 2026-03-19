# Sprint 03: Quality & Performance Polish

**Status:** Ready for dispatch
**Sprint Duration:** 3-5 days
**Focus:** Bug fixes, TypeScript quality, testing, performance optimization
**Engineers Required:** 5 (parallel execution)

---

## Critical Findings

### 🔴 **Blockers (P0)**
1. **16+ TypeScript type errors** in production code
2. **Empty catch blocks** swallowing errors silently
3. **9 files using console.log** instead of winston logger

### 🟠 **High Impact (P1)**
4. **SELECT * queries** throughout database layer (inefficient)
5. **Test coverage at ~5%** (only 4 E2E tests, 1 unit test)
6. **vendor-recharts bundle: 380.69 KB** (can be code-split further)

### 🔵 **Medium Priority (P2)**
7. **Inconsistent API error handling** (some endpoints lack validation)
8. **No API documentation** (Swagger/OpenAPI missing)
9. **Lighthouse performance unmeasured** (need baseline + targets)
10. **Memory leak risk** in long-running agent sessions (no profiling)

---

## Sprint 03 Tasks

### Task 1: Fix All TypeScript Type Errors (P0)
**Assigned to:** Engineer 1
**Estimated Time:** 2-3 hours
**Files Affected:**
- `ui/src/pages/AgentHealth.tsx` (ConfirmationModal props mismatch)
- `ui/src/pages/Companies.tsx` (ConfirmationModal props mismatch)
- `ui/src/pages/Tasks.tsx` (ConfirmationModal props mismatch)
- `ui/src/pages/Logs.tsx` (QueryClient type issues)
- `ui/src/pages/TraceView.tsx` (Date formatting, Span type issues)
- `ui/src/pages/Trends.tsx` (Missing API method, tooltip type mismatches)

**Success Criteria:**
- `cd ui && npx tsc --noEmit` passes with 0 errors
- All builds green on GitHub Actions

**Technical Details:**
```bash
# Current errors
src/pages/AgentHealth.tsx(290,13): error TS2322: Property 'onClose' does not exist
src/pages/Logs.tsx(252,13): error TS2345: Argument type mismatch
src/pages/TraceView.tsx(119,7): error TS2769: fractionalSecondDigits not in DateTimeFormatOptions
src/pages/Trends.tsx(153,24): error TS2339: Property 'getTrends' does not exist
```

---

### Task 2: Replace console.log with Winston Logger (P0)
**Assigned to:** Engineer 2
**Estimated Time:** 1-2 hours
**Files Affected:**
- `ui/src/websocket.ts`
- `ui/src/api.ts`
- `ui/src/components/ErrorFallback.tsx`
- `ui/src/components/DeploymentStatus.tsx`
- `ui/src/components/ErrorBoundary.tsx`
- `ui/src/hooks/usePullToRefresh.ts`
- `ui/src/hooks/useInstallPrompt.ts`
- `ui/src/pages/AgentPerformance.tsx`
- `ui/src/pages/Logs.tsx`

**Success Criteria:**
- All `console.log`, `console.error`, `console.warn` replaced with proper logger
- Create `ui/src/utils/logger.ts` for frontend logging
- Logs sent to backend `/api/logs/client` endpoint for centralization

**Implementation:**
```typescript
// ui/src/utils/logger.ts
export const logger = {
  info: (msg: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') console.log(msg, meta);
    fetch('/api/logs/client', {
      method: 'POST',
      body: JSON.stringify({ level: 'info', msg, meta })
    }).catch(() => {});
  },
  error: (msg: string, err?: any) => { /* similar */ },
  warn: (msg: string, meta?: any) => { /* similar */ }
};
```

---

### Task 3: Fix Empty Catch Blocks & Error Handling (P0)
**Assigned to:** Engineer 3
**Estimated Time:** 2 hours
**Files Affected:**
- `ui/src/pages/Logs.tsx:252` — `.catch(() => setData(null))` swallows errors
- `ui/src/pages/TraceView.tsx` — `.catch((err) => setError(err.message))` loses stack trace

**Success Criteria:**
- All catch blocks log errors properly
- User-facing error messages displayed via toast
- Full error details sent to backend logger

**Fix Pattern:**
```typescript
// BEFORE
.catch(() => setData(null))

// AFTER
.catch((err) => {
  logger.error('Failed to fetch logs', err);
  toast.error('Failed to load logs. Please try again.');
  setData(null);
})
```

---

### Task 4: Optimize Database Queries (P1)
**Assigned to:** Engineer 4
**Estimated Time:** 3-4 hours
**Files Affected:** `src/db.js`

**Problem:** All queries use `SELECT *` which loads unnecessary columns

**Success Criteria:**
- Replace `SELECT *` with explicit column lists in all queries
- Add database indexes on frequently queried columns
- Measure query performance (before/after) using SQLite EXPLAIN QUERY PLAN

**Queries to Fix:**
```sql
-- BEFORE (db.js:40)
SELECT * FROM companies WHERE id = ?

-- AFTER
SELECT id, name, goal, workspace, status, deployment_url, created_at, updated_at
FROM companies WHERE id = ?

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
```

**Files to update:**
- `getCompany()` (line 39-41)
- `getActiveCompany()` (line 43-45)
- `listCompanies()` (line 81-83)
- `getAgent()` (line 94-96)
- `getAgentsByCompany()` (line 98-100)
- Plus ~30 more query functions

---

### Task 5: Comprehensive E2E Test Suite (P1)
**Assigned to:** Engineer 5
**Estimated Time:** 4-5 hours
**Current Coverage:** 4 E2E tests (dashboard, navigation, mobile, api-health)

**Success Criteria:**
- 20+ E2E tests covering critical user flows
- 80%+ test coverage on happy paths
- All tests pass on CI/CD

**Tests to Add:**
```typescript
// ui/e2e/company-management.spec.ts
- Create new company
- Edit company details
- Delete company with confirmation
- Archive company

// ui/e2e/task-workflow.spec.ts
- Create task manually
- Assign task to agent
- Mark task complete
- Filter tasks by status
- Search tasks by keyword
- Delete task with confirmation

// ui/e2e/agent-lifecycle.spec.ts
- Agent spawns and shows "running"
- Agent completes task
- Agent auto-recovery after failure
- Circuit breaker triggers after 3 failures
- Manual agent restart

// ui/e2e/websocket-reliability.spec.ts
- WebSocket connects on page load
- Auto-reconnect after network drop
- Real-time task updates appear
- Connection status indicator accurate

// ui/e2e/cost-tracking.spec.ts
- Cost breakdown by agent
- Budget warning at 80%
- Budget exceeded alert at 100%
- Export cost data to CSV

// ui/e2e/accessibility.spec.ts
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader labels present
- Focus indicators visible
- Color contrast WCAG AA
```

---

### Task 6: Bundle Size Optimization Round 2 (P1)
**Assigned to:** Engineer 1 (after Task 1)
**Estimated Time:** 2-3 hours
**Current Issue:** `vendor-recharts-Bco79vRE.js` is 380.69 KB (104.74 KB gzipped)

**Success Criteria:**
- Recharts loaded only on pages that need charts (not in main bundle)
- Main bundle < 250 KB gzipped
- Lighthouse Performance Score > 90

**Implementation:**
```typescript
// ui/src/pages/Analytics.tsx
import { lazy } from 'react';

// Instead of direct import
// import { LineChart, BarChart } from 'recharts';

// Use dynamic import
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));

// Wrap in Suspense
<Suspense fallback={<ChartSkeleton />}>
  <LineChart data={data} />
</Suspense>
```

**Pages using Recharts (lazy-load each):**
- `Analytics.tsx`
- `AgentPerformance.tsx`
- `Costs.tsx`
- `CrossProjectAnalytics.tsx`
- `HealthMonitor.tsx`
- `Trends.tsx` (if it exists in final build)

---

### Task 7: API Documentation with Swagger (P2)
**Assigned to:** Engineer 2 (after Task 2)
**Estimated Time:** 3-4 hours

**Success Criteria:**
- OpenAPI 3.0 spec generated
- Swagger UI available at `http://localhost:3100/api-docs`
- All 50+ endpoints documented with examples

**Implementation:**
```bash
npm install swagger-jsdoc swagger-ui-express
```

```javascript
// src/server.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hivemind Engine API',
      version: '1.0.0',
      description: 'Orchestrator API for managing AI agent companies'
    },
    servers: [{ url: 'http://localhost:3100' }]
  },
  apis: ['./src/server.js', './src/api/*.js']
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /api/companies:
 *   get:
 *     summary: List all companies
 *     responses:
 *       200:
 *         description: Array of companies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   goal: { type: string }
 */
```

---

### Task 8: API Error Handling Consistency (P2)
**Assigned to:** Engineer 3 (after Task 3)
**Estimated Time:** 2-3 hours

**Problem:** Inconsistent error responses across endpoints

**Success Criteria:**
- All errors return `{ error: string, details?: any }` format
- HTTP status codes used correctly (400, 404, 409, 500)
- Input validation using Zod schemas
- Error middleware catches all unhandled errors

**Implementation:**
```javascript
// src/middleware/error-handler.js
export function errorHandler(err, req, res, next) {
  logger.error('API Error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
}

// Apply globally
app.use(errorHandler);
```

**Add Zod validation to endpoints:**
```javascript
import { z } from 'zod';

const createCompanySchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().min(10).max(1000),
  workspace: z.string().optional()
});

app.post('/api/companies', (req, res, next) => {
  try {
    const data = createCompanySchema.parse(req.body);
    // ... rest of handler
  } catch (err) {
    next(err);
  }
});
```

---

### Task 9: Lighthouse Performance Baseline & Optimization (P2)
**Assigned to:** Engineer 4 (after Task 4)
**Estimated Time:** 3-4 hours

**Success Criteria:**
- Lighthouse CI automated in GitHub Actions
- Performance score > 90
- Accessibility score > 95 (already achieved)
- Best Practices score > 95
- SEO score > 90 (for GitHub Pages staging)

**Setup:**
```bash
npm install -D @lhci/cli
```

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push, pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npx @lhci/cli autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Optimizations to Apply:**
- Preload critical fonts
- Add resource hints (`<link rel="preconnect">`)
- Lazy-load images below fold
- Implement skeleton loaders for data fetching
- Add `fetchpriority="high"` to hero images

---

### Task 10: Memory Leak Detection & Profiling (P2)
**Assigned to:** Engineer 5 (after Task 5)
**Estimated Time:** 4-5 hours

**Problem:** Long-running agent sessions may leak memory (tmux processes, SQLite connections, WebSocket handlers)

**Success Criteria:**
- Memory usage profiled over 24-hour test run
- Memory leaks identified and fixed
- Automated memory regression tests in CI
- Dashboard shows memory usage per agent

**Tools:**
```bash
npm install -D clinic autocannon
```

**Run Profiling:**
```bash
# Backend memory profiling
clinic doctor -- node bin/hivemind.js

# Load testing
autocannon -c 10 -d 60 http://localhost:3100/api/companies
```

**Add Memory Metrics to Dashboard:**
```javascript
// src/server.js
app.get('/api/metrics/memory', (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    rss: usage.rss,           // Total memory
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers
  });
});
```

**Common Leak Sources to Check:**
- WebSocket event listeners not cleaned up
- tmux processes not killed on agent stop
- SQLite prepared statements not finalized
- Interval timers not cleared
- React query cache growing unbounded

---

## Dispatch Order

**Parallel Track 1 (Critical Path):**
- Engineer 1: Task 1 (TypeScript) → Task 6 (Bundle Size)
- Engineer 2: Task 2 (Logging) → Task 7 (API Docs)
- Engineer 3: Task 3 (Error Handling) → Task 8 (API Consistency)

**Parallel Track 2 (Independent):**
- Engineer 4: Task 4 (DB Optimization) → Task 9 (Lighthouse)
- Engineer 5: Task 5 (E2E Tests) → Task 10 (Memory Profiling)

**Estimated Completion:** 3-5 days (assuming 4-6 hours/day per engineer)

---

## Success Metrics

### Code Quality
- ✅ TypeScript: 0 errors
- ✅ Test Coverage: 80%+ (E2E), 60%+ (unit)
- ✅ Logging: 0 console.log statements
- ✅ Error Handling: 100% of catch blocks log properly

### Performance
- ✅ Main bundle: < 250 KB gzipped
- ✅ Lighthouse Performance: > 90
- ✅ Database queries: < 10ms average
- ✅ Memory usage: < 500 MB after 24 hours

### Documentation
- ✅ API docs: All 50+ endpoints documented
- ✅ Swagger UI: Live at /api-docs

### Reliability
- ✅ Memory leaks: 0 detected
- ✅ E2E tests: 20+ passing
- ✅ CI/CD: All checks green

---

## Post-Sprint Review

After completion, run full audit:
```bash
# Build verification
npm run build

# Type checking
cd ui && npx tsc --noEmit

# E2E tests
npm run test:e2e

# Lighthouse
npx @lhci/cli autorun

# Memory profiling
clinic doctor -- node bin/hivemind.js &
sleep 3600 && pkill -f clinic
```

Generate report comparing Sprint 02 baseline vs Sprint 03 results.
