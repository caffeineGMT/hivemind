# Sprint 03 — Production Readiness & Quality Improvements
**Duration:** March 19 - April 2, 2026
**Focus:** Critical bug fixes, performance optimization, test reliability, production monitoring
**Status:** 🚨 URGENT — 2 E2E tests failing, blocking deployments

---

## 🎯 Sprint Goal
Transform Hivemind Engine from feature-complete to production-ready by fixing critical bugs, optimizing bundle size, ensuring test reliability, and implementing production monitoring. Target: Zero test failures, <500KB bundle, 100% error visibility.

---

## 🚨 AUDIT FINDINGS (March 19, 2026)

### Critical Issues Found:
1. **🔴 E2E Tests Failing** — 2/30 tests broken (BLOCKING CI/CD)
2. **🔴 15 Empty Catch Blocks** — Silent error suppression across backend
3. **🔴 123 Console Statements** — Should use structured logging
4. **🟠 Bundle Size 1.1MB** — Exceeds 500KB target (recharts: 380KB)
5. **🟠 No Production Monitoring** — Sentry not configured
6. **🟠 No Component Tests** — Only E2E tests exist (0 unit tests)

### What's Working Well:
- ✅ Accessibility WCAG 2.1 AA compliant
- ✅ PWA implemented with service worker
- ✅ WebSocket reconnection with exponential backoff
- ✅ API rate limiting configured
- ✅ Database migrations system in place
- ✅ GitHub Actions CI/CD pipeline

---

## 🔴 CRITICAL (P0) — Fix Immediately

### Task 1: Fix Failing E2E Tests (BLOCKING)
**Deadline:** March 20, 2026
**Status:** 🚨 **BLOCKING** — CI is broken, 2/30 tests failing
**Impact:** CRITICAL — Cannot deploy with broken tests
**Owner:** Engineer 1
**Estimated Time:** 2 hours

**Test Failures:**

1. **`/api/health` endpoint test failure:**
   ```
   Error: expect(received).toBeDefined()
   Received: undefined
   Expected: body.db to be defined

   File: ui/e2e/api-health.spec.ts:9
   ```

   **Root Cause:** Response schema mismatch between test expectations and actual API response

   **Fix:**
   ```javascript
   // src/server.js:88-98 — Verify response format
   app.get('/api/health', (req, res) => {
     const dbOk = (() => { try { db.getDb(); return true; } catch { return false; } })();
     res.json({
       status: dbOk ? 'ok' : 'degraded',
       timestamp: new Date().toISOString(),
       uptime: process.uptime(),
       db: dbOk ? 'connected' : 'disconnected',  // ← ENSURE THIS FIELD EXISTS
       ws: { clients: clients.size, status: 'listening' },
       memory: process.memoryUsage(),
     });
   });
   ```

2. **Dashboard navigation test — Duplicate link error:**
   ```
   Error: strict mode violation: locator('a:has-text("Dashboard")') resolved to 2 elements
   Element 1: Sidebar navigation link
   Element 2: Mobile bottom navigation link

   File: ui/e2e/dashboard.spec.ts:12
   ```

   **Root Cause:** Both desktop sidebar and mobile bottom nav have identical "Dashboard" text, causing Playwright strict mode to fail

   **Fix:**
   ```tsx
   // Update test to use unique test IDs instead of text
   // ui/src/components/Layout.tsx
   <a data-testid="desktop-nav-dashboard" ...>Dashboard</a>

   // ui/src/components/MobileBottomNav.tsx
   <a data-testid="mobile-nav-dashboard" ...>Dashboard</a>

   // ui/e2e/dashboard.spec.ts:12
   await expect(page.getByTestId('desktop-nav-dashboard')).toBeVisible();
   ```

**Validation:**
- Run `npm run test:e2e` — All 30/30 tests pass
- No Playwright strict mode violations
- CI GitHub Actions workflow goes green

---

### Task 2: Eliminate Silent Error Suppression (15 empty catch blocks)
**Deadline:** March 21, 2026
**Impact:** CRITICAL — Security vulnerability, impossible to debug production
**Owner:** Engineer 2
**Estimated Time:** 3 hours

**Found 15 empty `catch {}` blocks:**
- `src/claude.js` — 6 instances (lines 83, 169, 315, 339, 343, 349)
- `src/orchestrator.js` — 4 instances (lines 374, 375, 516, 591)
- `src/self-healing.js` — 1 instance (line 364)
- `src/server.js` — 2 instances (lines 33, 310)
- `src/tmux.js` — 2 instances (lines 69, 75)

**Why Critical:**
- Production failures are invisible — no logs, no alerts
- Debugging impossible — "it stops working" with zero context
- Security risk — exceptions may indicate attacks or corruption

**Fix Strategy by Category:**

1. **Process checks** (server.js:33, orchestrator.js:374-375):
   ```javascript
   // BEFORE
   try { process.kill(a.pid, 0); hasLiveAgent = true; break; } catch {}

   // AFTER
   try {
     process.kill(a.pid, 0);
     hasLiveAgent = true;
     break;
   } catch (err) {
     logger.debug(`Process ${a.pid} not running: ${err.message}`);
   }
   ```

2. **JSON parsing** (claude.js:339, 343, 349):
   ```javascript
   // BEFORE
   try { return JSON.parse(text); } catch {}

   // AFTER
   try {
     return JSON.parse(text);
   } catch (err) {
     logger.warn(`JSON parse failed: ${err.message}`, { text: text.slice(0, 100) });
     return null;
   }
   ```

3. **Cleanup operations** (orchestrator.js:516, self-healing.js:364):
   ```javascript
   // BEFORE
   try { if (handle.proc) handle.proc.kill("SIGTERM"); } catch {}

   // AFTER
   try {
     if (handle.proc) handle.proc.kill("SIGTERM");
   } catch (err) {
     logger.error(`Failed to kill process ${handle.pid}: ${err.message}`);
   }
   ```

**Validation:**
- Zero `catch {}` blocks in codebase: `grep -rn "catch {}" src/` returns empty
- All errors logged with context (error message + metadata)
- Test each error path manually — verify logs appear

---

### Task 3: Bundle Size Optimization — 1.1MB → <500KB
**Deadline:** March 22, 2026
**Impact:** HIGH — Slow page load, poor mobile UX, hurts SEO
**Owner:** Engineer 3
**Estimated Time:** 5 hours

**Current Bundle Analysis:**
```
vendor-recharts: 380KB (104KB gzipped) ⚠️ EXCEEDS WARNING
index:           268KB (81KB gzipped)
vendor-flow:     237KB (80KB gzipped)
vendor-d3:       64KB (21KB gzipped)
Total:           ~1.1MB uncompressed
```

**Target:**
```
Main bundle:     <400KB uncompressed (<120KB gzipped)
Per-route chunk: <150KB uncompressed
Largest vendor:  <250KB uncompressed
```

**Implementation Plan:**

**Step 1: Replace Recharts with D3 (saves ~300KB)**

Recharts is 380KB and used only on 3 pages. D3 is already in bundle (64KB).

Create lightweight chart components using D3:

```tsx
// ui/src/components/charts/BarChart.tsx
import { scaleLinear, scaleBand } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';

export function BarChart({ data, width, height }) {
  const xScale = scaleBand()
    .domain(data.map(d => d.label))
    .range([0, width])
    .padding(0.2);

  const yScale = scaleLinear()
    .domain([0, Math.max(...data.map(d => d.value))])
    .range([height, 0]);

  return (
    <svg width={width} height={height}>
      {data.map((d, i) => (
        <rect
          key={i}
          x={xScale(d.label)}
          y={yScale(d.value)}
          width={xScale.bandwidth()}
          height={height - yScale(d.value)}
          fill="#f59e0b"
        />
      ))}
    </svg>
  );
}
```

**Files to update:**
- `ui/src/pages/Analytics.tsx` — Replace `<BarChart>`, `<LineChart>`
- `ui/src/pages/Costs.tsx` — Replace `<PieChart>`
- `ui/src/pages/AgentPerformance.tsx` — Replace `<AreaChart>`

**Step 2: Lazy Load Reactflow (saves ~150KB from main bundle)**

```tsx
// ui/src/pages/Roadmap.tsx
import { lazy, Suspense } from 'react';

const ReactFlowComponent = lazy(() =>
  import('reactflow').then(m => ({ default: m.ReactFlow }))
);

export default function Roadmap() {
  return (
    <Suspense fallback={<div>Loading workflow...</div>}>
      <ReactFlowComponent {...props} />
    </Suspense>
  );
}
```

**Step 3: Tree-shake D3 imports**

```typescript
// BEFORE
import * as d3 from 'd3';

// AFTER
import { scaleLinear, scaleTime } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { line, area } from 'd3-shape';
```

**Step 4: Add Bundle Analyzer**

```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// ui/vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

**Validation:**
- `npm run build` → Total bundle <500KB gzipped
- Open `dist/stats.html` → Largest chunk <250KB
- Test all chart pages → Functionality intact
- Lighthouse Performance > 90

---

## 🟠 HIGH PRIORITY (P1) — This Sprint

### Task 4: Implement Sentry Error Monitoring
**Deadline:** March 24, 2026
**Impact:** HIGH — Cannot detect production errors
**Owner:** Engineer 4
**Estimated Time:** 2 hours

**Current State:** Zero production error visibility

**Setup:**

```bash
npm install @sentry/node @sentry/react
cd ui && npm install @sentry/react @sentry/vite-plugin
```

**Backend:**
```javascript
// src/server.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.exception?.values?.[0]?.type === 'AbortError') return null;
    return event;
  },
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**Frontend:**
```typescript
// ui/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Environment Variables:**
```bash
# .env.example
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
VITE_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
```

**Validation:**
- Trigger test error → Appears in Sentry dashboard
- Source maps uploaded (readable stack traces)
- User context includes companyId, agentId

---

### Task 5: Add Component Unit Tests (React Testing Library)
**Deadline:** March 26, 2026
**Impact:** MEDIUM — Prevent UI regressions
**Owner:** Engineer 5
**Estimated Time:** 4 hours

**Current State:**
- ✅ 30 E2E tests (Playwright)
- ❌ 0 component unit tests
- ❌ 0 backend unit tests

**Target:** 20+ component tests, 60% coverage

**Setup:**
```bash
cd ui && npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
```

**Test Priority:**

1. **Interactive Components:**
   - `MetricCard.test.tsx` — Click, keyboard nav
   - `ConfirmationModal.test.tsx` — Open/close, confirm/cancel
   - `FilterBar.test.tsx` — Dropdown selection

2. **Data Display:**
   - `StatusBadge.test.tsx` — Correct colors
   - `ProjectCard.test.tsx` — Task rendering
   - `AgentCard.test.tsx` — Status display

**Example:**
```tsx
// ui/src/components/MetricCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetricCard from './MetricCard';
import { Users } from 'lucide-react';

test('renders with label and value', () => {
  render(<MetricCard label="Agents" value={5} icon={Users} />);
  expect(screen.getByText('Agents')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
});

test('handles click', async () => {
  const onClick = vi.fn();
  render(<MetricCard label="Tasks" value={10} icon={Users} onClick={onClick} />);
  await userEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
```

**Validation:**
- Run `npm test` — All pass
- Coverage >60% for components/

---

### Task 6: Database Query Optimization
**Deadline:** March 28, 2026
**Impact:** MEDIUM — Faster API responses
**Owner:** Engineer 1 (after Task 1)
**Estimated Time:** 3 hours

**Optimizations:**

1. **Combine dashboard queries (4 → 1):**
   ```sql
   -- CURRENT: 4 separate queries
   SELECT COUNT(*) FROM agents WHERE company_id = ?
   SELECT COUNT(*) FROM agents WHERE company_id = ? AND status = 'running'
   SELECT COUNT(*) FROM tasks WHERE company_id = ?
   SELECT COUNT(*) FROM tasks WHERE company_id = ? AND status = 'completed'

   -- OPTIMIZED: 1 query
   SELECT
     COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN a.id END) as totalAgents,
     COUNT(DISTINCT CASE WHEN a.status = 'running' THEN a.id END) as runningAgents,
     COUNT(DISTINCT t.id) as totalTasks,
     COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completedTasks
   FROM companies c
   LEFT JOIN agents a ON a.company_id = c.id
   LEFT JOIN tasks t ON t.company_id = c.id
   WHERE c.id = ?
   ```

2. **Add missing indexes:**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
   CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
   CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
   CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);
   CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
   ```

3. **Log slow queries:**
   ```javascript
   // src/db.js
   function logSlowQuery(query, duration) {
     if (duration > 100) {
       logger.warn(`Slow query (${duration}ms): ${query}`);
     }
   }
   ```

**Validation:**
- Dashboard API <100ms response time
- Zero slow queries (>100ms) under load

---

### Task 7: Replace Console with Structured Logging
**Deadline:** March 30, 2026
**Impact:** MEDIUM — Production debugging
**Owner:** Engineer 2 (after Task 2)
**Estimated Time:** 2 hours

**Current State:** 123 console.log/error/warn statements

**Implementation:**

1. **Automated migration:**
   ```bash
   find src/ ui/src/ -name "*.js" -o -name "*.ts" -o -name "*.tsx" | \
   xargs sed -i '' \
     -e 's/console\.log(/logger.info(/g' \
     -e 's/console\.error(/logger.error(/g' \
     -e 's/console\.warn(/logger.warn(/g'
   ```

2. **Add context to logs:**
   ```javascript
   // BEFORE
   console.log('Agent started', agentId);

   // AFTER
   logger.info('Agent started', { agentId, companyId, taskId });
   ```

3. **Frontend logger:**
   ```typescript
   // ui/src/utils/logger.ts
   export const logger = {
     info: (msg: string, meta?: any) => {
       if (import.meta.env.DEV) console.log(msg, meta);
       fetch('/api/logs/client', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ level: 'info', msg, meta }),
       }).catch(() => {});
     },
   };
   ```

**Validation:**
- Zero console.* in production code
- Logs written to logs/combined.log
- JSON format

---

## 🟡 MEDIUM PRIORITY (P2) — If Time Permits

### Task 8: Lighthouse CI Performance Monitoring
**Deadline:** April 1, 2026
**Impact:** LOW — Regression detection
**Owner:** Engineer 3 (after Task 3)
**Estimated Time:** 2 hours

**Setup:**
```bash
npm install -D @lhci/cli
```

**Config:**
```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

---

### Task 9: Skeleton Loaders for Loading States
**Deadline:** April 2, 2026
**Impact:** LOW — Perceived performance
**Owner:** Engineer 4 (after Task 4)
**Estimated Time:** 2 hours

Create `<SkeletonCard />`, `<SkeletonTable />` to replace spinners.

---

### Task 10: PostgreSQL Migration Guide
**Deadline:** April 2, 2026
**Impact:** LOW — SQLite works for localhost
**Owner:** Engineer 5 (after Task 5)
**Estimated Time:** 2 hours

Document migration from SQLite → Postgres for production deployments.

---

## 📊 Success Metrics

**Reliability:**
- ✅ E2E tests: 30/30 passing
- ✅ Empty catch blocks: 0
- ✅ Console statements: 0
- ✅ Error visibility: 100% (Sentry)

**Performance:**
- ✅ Bundle size: <500KB gzipped
- ✅ Dashboard API: <100ms
- ✅ Lighthouse: >90

**Quality:**
- ✅ Component tests: 20+
- ✅ Test coverage: >60%
- ✅ TypeScript errors: 0

---

## ⏱️ Timeline

**Day 1 (Mar 19):** Task 1 (Fix tests) - BLOCKING
**Day 2 (Mar 20):** Task 2 (Empty catches)
**Day 3 (Mar 21):** Task 3 (Bundle size)
**Day 4 (Mar 22):** Task 4 (Sentry)
**Day 5+ (Mar 23-30):** Tasks 5-7 (parallel)

**Total:** 22-26 hours (3-4 days for team of 5)

---

## 🎯 Dispatch NOW

**Critical Path:**
- Engineer 1: Task 1 → Task 6
- Engineer 2: Task 2 → Task 7
- Engineer 3: Task 3 → Task 8
- Engineer 4: Task 4 → Task 9
- Engineer 5: Task 5 → Task 10

**START IMMEDIATELY!**
