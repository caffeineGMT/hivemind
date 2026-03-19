# Sprint 03 — Production Quality & Bug Fixes
**Duration:** March 19 - March 30, 2026 (2 weeks)
**Goal:** Fix critical bugs, optimize performance, add monitoring
**Previous Sprint:** Sprint 02 (Security & Accessibility) — 100% complete ✅

---

## Sprint Objectives

1. **Zero TypeScript errors** (currently 16)
2. **95%+ E2E test pass rate** (currently 70%)
3. **Bundle size <250KB gzipped** (currently 380KB)
4. **Full error monitoring** (Sentry integration)
5. **Production-ready quality**

---

## Task Board

### 🔴 P0 — Critical (Ship Blockers)

#### Task 1: Fix TypeScript Compilation Errors
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 2 hours
**Description:**
Fix 16 TypeScript errors across 4 files:
- [ ] Add `onClose?: () => void` to ConfirmationModalProps interface
- [ ] Fix Trends.tsx missing `api.getTrends()` (implement or remove page)
- [ ] Remove unsupported `fractionalSecondDigits` from TraceView.tsx
- [ ] Add proper typing to Logs.tsx mutations (3 errors)

**Acceptance Criteria:**
- `npx tsc --noEmit` returns 0 errors
- All components type-check successfully
- No `@ts-ignore` comments added

**Files:**
- `ui/src/components/ConfirmationModal.tsx`
- `ui/src/pages/Trends.tsx`
- `ui/src/pages/TraceView.tsx`
- `ui/src/pages/Logs.tsx`

---

#### Task 2: Fix E2E Test Failures
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 3 hours
**Description:**
Fix 9 failing E2E tests (30% failure rate):
- [ ] Update `/api/health` endpoint to include `db` field in response
- [ ] Fix duplicate Dashboard link selectors (use `.first()`)
- [ ] Fix mobile bottom navigation rendering
- [ ] Fix WebSocket status visibility (z-index/positioning)
- [ ] Fix navigation timeout (increase timeout or optimize)

**Acceptance Criteria:**
- `npm run test:e2e` passes 100% (30/30 tests)
- No flaky tests
- All tests run <30s total

**Files:**
- `src/server.js` (health endpoint)
- `ui/e2e/dashboard.spec.ts`
- `ui/e2e/mobile.spec.ts`
- `ui/e2e/navigation.spec.ts`

---

#### Task 3: Fix Broken Trends Page
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 4 hours (implement) OR 30min (remove)
**Description:**
**Decision Required:** Implement missing API endpoint OR remove Trends page entirely

**Option A — Implement:**
- [ ] Create `GET /api/trends/:companyId` endpoint
- [ ] Return time-series data (task completion, agent activity, costs)
- [ ] Update `api.ts` to include `getTrends()`
- [ ] Test with real data

**Option B — Remove:**
- [ ] Delete `ui/src/pages/Trends.tsx`
- [ ] Remove Trends route from `App.tsx`
- [ ] Remove Trends nav link from `Layout.tsx`

**Acceptance Criteria:**
- No TypeScript errors in Trends.tsx
- Page either works or is removed
- All tests pass

---

### 🟠 P1 — High Priority (Production Quality)

#### Task 4: Add Sentry Error Monitoring
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 2 hours
**Description:**
Implement production error monitoring:
- [ ] Install `@sentry/react` and `@sentry/node`
- [ ] Configure Sentry DSN in `.env`
- [ ] Add Sentry to React error boundaries
- [ ] Add Sentry to Express error middleware
- [ ] Configure source maps for production
- [ ] Test error reporting

**Acceptance Criteria:**
- Frontend errors appear in Sentry dashboard
- Backend errors appear in Sentry dashboard
- Source maps show original TypeScript code
- Error rate <5% in production

**Files:**
- `ui/src/main.tsx`
- `ui/src/components/ErrorBoundary.tsx`
- `src/server.js`
- `package.json`

---

#### Task 5: Optimize Bundle Size (<250KB)
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 4 hours
**Description:**
Reduce bundle size from 380KB to <250KB gzipped:
- [ ] Install Vite bundle analyzer (`rollup-plugin-visualizer`)
- [ ] Replace Recharts (104KB) with lighter library (uPlot or Chart.js)
- [ ] Update all chart components (Analytics, Costs, AgentPerformance, CrossProjectAnalytics)
- [ ] Implement dynamic chart imports (lazy load)
- [ ] Add bundle size check to CI/CD

**Acceptance Criteria:**
- Total bundle size <250KB gzipped
- All charts still functional
- 3G load time <5s (currently 12s)
- Bundle analyzer in CI/CD

**Files:**
- `ui/src/pages/Analytics.tsx`
- `ui/src/pages/Costs.tsx`
- `ui/src/pages/AgentPerformance.tsx`
- `ui/src/pages/CrossProjectAnalytics.tsx`
- `ui/vite.config.ts`

---

#### Task 6: Add Lighthouse CI
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 2 hours
**Description:**
Automate performance monitoring:
- [ ] Install `@lhci/cli`
- [ ] Create `.lighthouserc.json` config
- [ ] Add Lighthouse CI to GitHub Actions
- [ ] Set performance budgets (FCP <2s, TTI <5s, LCP <2.5s)
- [ ] Block PRs if performance degrades >10%

**Acceptance Criteria:**
- Lighthouse runs on every PR
- Performance score >90
- PRs blocked if budgets fail
- Results visible in PR comments

**Files:**
- `.lighthouserc.json` (new)
- `.github/workflows/lighthouse.yml` (new)

---

### 🔵 P2 — Medium Priority (Polish)

#### Task 7: Database Query Optimization
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 3 hours
**Description:**
Optimize database performance:
- [ ] Add indexes on `company_id`, `status`, `created_at`, `agent_id`
- [ ] Create migration for index creation
- [ ] Implement connection pooling (better-sqlite3 WAL mode)
- [ ] Add query performance logging (log queries >100ms)
- [ ] Run EXPLAIN on slow queries

**Acceptance Criteria:**
- API response time p95: <100ms (currently 200ms)
- All queries <50ms
- No N+1 query issues
- Database handles 100 req/s

**Files:**
- `src/db.js`
- `migrations/008-add-indexes.js` (new)
- `src/logger.js`

---

#### Task 8: Implement Caching Layer
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 4 hours
**Description:**
Add in-memory caching to reduce database load:
- [ ] Install `node-cache` or `lru-cache`
- [ ] Cache company list (TTL: 60s)
- [ ] Cache agent status (TTL: 5s)
- [ ] Cache dashboard metrics (TTL: 10s)
- [ ] Invalidate cache on WebSocket updates
- [ ] Add cache hit/miss metrics

**Acceptance Criteria:**
- Database queries reduced by 70%
- Cache hit rate >80%
- Stale data <5s max
- Cache cleared on real-time updates

**Files:**
- `src/cache.js` (new)
- `src/server.js`
- `src/db.js`

---

#### Task 9: Mobile UX Improvements
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 3 hours
**Description:**
Polish mobile experience:
- [ ] Add pull-to-refresh on Tasks, Agents, Activity pages
- [ ] Implement infinite scroll for long lists (>50 items)
- [ ] Add haptic feedback on actions (delete, create, update)
- [ ] Fix 2 touch target violations from accessibility audit
- [ ] Test on real iOS and Android devices

**Acceptance Criteria:**
- Pull-to-refresh works smoothly
- Infinite scroll loads next page at bottom
- Touch targets all >44px
- No horizontal scroll issues
- Tested on iPhone + Android

**Files:**
- `ui/src/pages/Tasks.tsx`
- `ui/src/pages/Agents.tsx`
- `ui/src/pages/Activity.tsx`
- `ui/src/components/PullToRefreshIndicator.tsx`

---

#### Task 10: Improve Test Coverage (70% → 90%)
**Status:** 🔴 TODO
**Assignee:** Unassigned
**Estimate:** 6 hours
**Description:**
Increase test coverage and reliability:
- [ ] Add unit tests for API functions (api.ts)
- [ ] Add integration tests for critical endpoints (tasks, agents, costs)
- [ ] Add visual regression tests (Percy or Chromatic)
- [ ] Add mutation tests for database operations
- [ ] Add WebSocket message tests

**Acceptance Criteria:**
- Line coverage >90%
- All critical paths tested
- No flaky tests
- Tests run <60s total

**Files:**
- `ui/src/api.test.ts` (new)
- `src/__tests__/server.test.js` (new)
- `ui/e2e/` (expand)

---

## Sprint Metrics

| Metric | Start | Target | Current |
|--------|-------|--------|---------|
| TypeScript errors | 16 | 0 | 16 |
| E2E pass rate | 70% | 95% | 70% |
| Bundle size (gzip) | 380KB | <250KB | 380KB |
| Error monitoring | 0% | 100% | 0% |
| Lighthouse Performance | 85 | 95+ | 85 |
| API p95 latency | 200ms | <100ms | 200ms |
| Test coverage | 70% | 90% | 70% |

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Recharts replacement breaks charts | Thorough testing before merging |
| Sentry adds overhead | Use sampling (10% in prod) |
| Database indexes slow down writes | Monitor write performance |
| Cache invalidation bugs | Conservative TTLs, manual invalidation |
| Mobile testing on limited devices | Use BrowserStack or Sauce Labs |

---

## Daily Standup Notes

### March 19, 2026
- ✅ CEO evaluation complete
- ✅ Sprint 03 plan created
- 🔴 All tasks TODO, ready for dispatch

---

## Retrospective (Post-Sprint)

_To be filled after sprint completion_

**What went well:**

**What could improve:**

**Action items for next sprint:**
