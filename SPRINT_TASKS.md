# Hivemind Engine - Sprint Improvement Tasks
**Created**: 2026-03-18
**Status**: Ready for execution
**Goal**: Continuous quality improvement - eliminate tech debt, polish UX, improve reliability

---

## 🔴 CRITICAL (P0) - Must Fix Immediately

### Task 1: Delete Forbidden Monetization Code
**Impact**: High - Violates CLAUDE.md project rules
**Effort**: 30 minutes
**Files**:
- `.env.example` - Remove Clerk, Stripe, license key variables (lines 9-10, 19-28)
- `package.json` - Delete campaign/billing scripts (lines 11-20)
- Delete: `scripts/seed-beta-users.js`, `scripts/early-bird-campaign.js`, `scripts/early-bird-followup.js`
- Delete: `scripts/init-usage-billing.js`, `scripts/daily-usage-check.js`, `scripts/monthly-paddle-report.js`

**Validation**: No references to "stripe", "clerk", "license", "billing", "campaign" in codebase

---

### Task 2: Fix Silent Error Suppression
**Impact**: High - Bugs are hidden, schema corruption risk
**Effort**: 1 hour
**Changes**:
- `src/db.js:23-37` - Replace `catch {}` with proper logging
- `src/server.js` - Add error handling for JSON.stringify() failures
- Add startup validation for required environment variables

**Validation**: All errors logged to console/file, no empty catch blocks

---

## 🟠 HIGH PRIORITY (P1) - This Sprint

### Task 3: Add Basic Test Infrastructure
**Impact**: High - Enable confident refactoring, prevent regressions
**Effort**: 3 hours
**Deliverables**:
- Install Vitest: `npm install -D vitest @vitest/ui`
- Add `"test": "vitest"` script to package.json
- Create `src/db.test.js` - Test CRUD operations, migrations
- Create `src/server.test.js` - Test critical API endpoints
- Create `ui/src/App.test.tsx` - Smoke test component rendering
- Target: 30% code coverage minimum

**Validation**: `npm test` passes, coverage report generated

---

### Task 4: Fix Performance Bottlenecks
**Impact**: High - Faster dashboard load, reduced server CPU
**Effort**: 2 hours
**Changes**:
1. **Database**: Optimize N+1 queries
   - `src/server.js` - Use JOIN queries instead of loops
   - Add indexes: `CREATE INDEX idx_tasks_assignee ON tasks(assignee_id)`

2. **React Query**: Add caching defaults
   ```typescript
   // ui/src/main.tsx
   new QueryClient({
     defaultOptions: {
       queries: { staleTime: 60_000, cacheTime: 300_000 }
     }
   })
   ```

3. **WebSocket**: Granular invalidation
   ```typescript
   // ui/src/App.tsx
   // Before: invalidateQueries({ queryKey: ['agents'] })
   // After: invalidateQueries({ queryKey: ['agents', companyId, agentId] })
   ```

**Validation**: Dashboard loads in <1s, WebSocket updates only affected queries

---

### Task 5: Accessibility Audit & Fixes
**Impact**: Medium - Better UX, WCAG compliance
**Effort**: 2 hours
**Changes**:
- Add ARIA labels to all form inputs
- Replace `<div onClick>` with `<button>` or add keyboard handlers
- Add text alternatives to color-only status indicators (icons/labels)
- Ensure 44px minimum touch targets on all interactive elements
- Test with keyboard navigation (no mouse)

**Validation**: Lighthouse accessibility score >90, keyboard-navigable

---

### Task 6: Environment Configuration Cleanup
**Impact**: High - Enable non-Meta deployments
**Effort**: 1.5 hours
**Changes**:
1. Make Meta paths configurable:
   ```bash
   # .env
   CLAUDE_BIN=/usr/local/bin/claude_code/native/claude
   ANTHROPIC_BASE_URL=http://plugboard.x2p.facebook.net
   HTTP_PROXY=http://localhost:10054
   ```

2. Add startup validation:
   ```javascript
   // src/config.js
   const REQUIRED_VARS = ['ANTHROPIC_API_KEY', 'CLAUDE_BIN'];
   for (const v of REQUIRED_VARS) {
     if (!process.env[v]) throw new Error(`Missing ${v}`);
   }
   ```

3. Create `.env.template` with required-only vars (remove optional)

**Validation**: App fails fast with clear error if env vars missing

---

## 🟡 MEDIUM PRIORITY (P2) - Next Sprint

### Task 7: Error State UX
**Impact**: Medium - Better user experience on failures
**Effort**: 1.5 hours
**Changes**:
- Add error UI to all React Query hooks:
  ```typescript
  if (error) return <ErrorBanner message={error.message} retry={refetch} />
  ```
- Add 404 page for invalid company slugs (don't auto-redirect)
- Add WebSocket disconnection banner
- Add offline detection (navigator.onLine)

**Validation**: User sees clear error messages, not spinners/blank screens

---

### Task 8: Bundle Size Optimization
**Impact**: Medium - Faster initial load
**Effort**: 2 hours
**Changes**:
1. Lazy load analytics pages:
   ```typescript
   const Analytics = lazy(() => import('./pages/Analytics'));
   const Health = lazy(() => import('./pages/Health'));
   ```

2. Replace full D3 with specific modules:
   ```javascript
   // Before: import * as d3 from 'd3'
   // After: import { scaleLinear, axisBottom } from 'd3-scale'
   ```

3. Add bundle analyzer:
   ```bash
   npm install -D rollup-plugin-visualizer
   # Add to vite.config.ts
   ```

**Validation**: Initial bundle <500KB, code splitting visible in network tab

---

### Task 9: Add Skeleton Screens
**Impact**: Low - Perceived performance boost
**Effort**: 1 hour
**Changes**:
- Create `<SkeletonCard />`, `<SkeletonTable />` components
- Replace spinners with layout-matching skeletons
- Add stagger animations for multiple items

**Validation**: No layout shift when data loads

---

### Task 10: TypeScript Strict Mode
**Impact**: Medium - Catch bugs at compile time
**Effort**: 2 hours
**Changes**:
- Enable strict checks:
  ```json
  // ui/tsconfig.json
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "strictNullChecks": true
  ```
- Remove `as any` casts (found 1 in `App.tsx:74`)
- Add type guards for API responses

**Validation**: `npm run build` passes with no type errors

---

## 🟢 NICE-TO-HAVE (P3) - Backlog

### Task 11: Offline Support
**Impact**: Low - Better mobile UX on flaky networks
**Effort**: 3 hours
**Deliverables**:
- Add service worker for static asset caching
- Queue WebSocket messages when offline
- Show sync status indicator

---

### Task 12: Component Testing Suite
**Impact**: Low - Catch UI regressions
**Effort**: 4 hours
**Deliverables**:
- Install React Testing Library
- Test all pages: Dashboard, Analytics, Health, Settings
- Test critical interactions: nudge, task status change, agent restart

---

### Task 13: Storybook for UI Components
**Impact**: Low - Faster UI development
**Effort**: 2 hours
**Deliverables**:
- Setup Storybook
- Document core components: ResponsiveTable, MobileBottomNav, TouchRipple

---

### Task 14: CI/CD Pipeline
**Impact**: Medium - Prevent broken commits
**Effort**: 2 hours
**Deliverables**:
- GitHub Actions workflow:
  - Run tests on push
  - Lint check
  - TypeScript build check
  - Bundle size report

---

### Task 15: Database Migrations System
**Impact**: Medium - Safe schema changes
**Effort**: 3 hours
**Deliverables**:
- Create `migrations/` folder with versioned SQL files
- Add migration runner: `npm run migrate`
- Track applied migrations in `schema_version` table

---

## Metrics to Track

**Performance**:
- Dashboard load time: Target <1s
- Bundle size: Target <500KB initial
- Lighthouse score: Target >90

**Quality**:
- Test coverage: Target >30% (P1), >60% (P3)
- TypeScript errors: 0
- Accessibility score: >90

**Reliability**:
- Error rate: <1% of requests
- WebSocket reconnect time: <5s
- Agent crash recovery: <30s

---

## Sprint Planning Estimate

**P0 (Critical)**: 1.5 hours
**P1 (High)**: 9.5 hours
**P2 (Medium)**: 6.5 hours
**Total for 1 sprint**: ~17.5 hours (2-3 days)

**Recommended order**:
1. Task 1 (Delete monetization) - 30 min
2. Task 2 (Fix errors) - 1 hour
3. Task 6 (Env config) - 1.5 hours
4. Task 4 (Performance) - 2 hours
5. Task 3 (Tests) - 3 hours
6. Task 5 (Accessibility) - 2 hours

This ensures critical bugs are fixed first, then enables testing infrastructure for future work.
