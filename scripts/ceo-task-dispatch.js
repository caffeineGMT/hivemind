#!/usr/bin/env node
/**
 * CEO Task Dispatch Script
 *
 * Creates high-priority improvement tasks based on CEO evaluation report
 * Run: node scripts/ceo-task-dispatch.js
 */

import * as db from '../src/db.js';
import crypto from 'crypto';

// Get or create company
const companies = db.listCompanies();
let company = companies.find(c => c.name === 'Hivemind Engine');

if (!company) {
  console.log('⚠️  Company "Hivemind Engine" not found. Creating...\n');
  const companyId = crypto.randomUUID();
  company = db.createCompany({
    id: companyId,
    name: 'Hivemind Engine',
    goal: 'Build production-ready AI agent orchestrator dashboard',
    workspace: process.cwd(),
  });
}

console.log(`📊 Company: ${company.name} (${company.id.slice(0, 8)})\n`);

// Critical improvement tasks from CEO evaluation
const tasks = [
  {
    title: 'Implement Security Headers (helmet.js)',
    description: `**CRITICAL SECURITY FIX**

Add comprehensive security headers to protect against XSS, clickjacking, and MITM attacks.

**Requirements:**
- Install helmet.js middleware
- Configure CSP (Content-Security-Policy)
- Add X-Frame-Options: DENY
- Add X-Content-Type-Options: nosniff
- Add Strict-Transport-Security (HSTS)
- Add Referrer-Policy: strict-origin-when-cross-origin
- Add Permissions-Policy

**Implementation:**
\`\`\`javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in prod
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
\`\`\`

**Testing:**
- Run: \`curl -I http://localhost:3100\`
- Verify all security headers present
- Test dashboard still works with CSP

**Files to modify:**
- src/server.js (add helmet middleware)
- package.json (add helmet dependency)

**Acceptance criteria:**
✅ All 6 security headers present in response
✅ Dashboard loads without CSP violations
✅ securityheaders.com score > A

**Priority:** P0 (Blocker)
**Estimated time:** 1 day`,
    priority: 'critical',
  },
  {
    title: 'Add Input Sanitization with DOMPurify',
    description: `**CRITICAL SECURITY FIX**

Prevent XSS attacks by sanitizing all user inputs before rendering.

**Attack Vectors Found:**
- Task descriptions
- Agent names
- Activity log messages
- Nudge messages
- Company names

**Requirements:**
- Install DOMPurify (or use server-side sanitize-html)
- Sanitize all user inputs before storing in DB
- Escape HTML in all React components rendering user content
- Add input validation rules

**Implementation:**
\`\`\`javascript
import DOMPurify from 'dompurify';

// Sanitize before storing
function sanitizeInput(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href'],
  });
}

// Use in components
<div dangerouslySetInnerHTML={{ __html: sanitizeInput(task.description) }} />
\`\`\`

**Testing:**
- Try injecting: \`<img src=x onerror="alert('xss')">\`
- Try injecting: \`<script>alert(document.cookie)</script>\`
- Verify both are neutralized

**Files to modify:**
- src/db.js (sanitize on insert)
- ui/src/components/* (escape on render)
- Add sanitization utility: src/utils/sanitize.js

**Acceptance criteria:**
✅ XSS injection attempts neutralized
✅ Safe HTML (bold, links) still works
✅ No breaking changes to existing data

**Priority:** P0 (Blocker)
**Estimated time:** 1-2 days`,
    priority: 'critical',
  },
  {
    title: 'Implement React Error Boundaries',
    description: `**HIGH PRIORITY RELIABILITY FIX**

Prevent component errors from crashing the entire dashboard.

**Current Problem:**
- Single component error = blank white screen
- No error reporting
- No way to recover without refresh

**Requirements:**
- Create ErrorBoundary component
- Wrap all routes with error boundaries
- Add error logging to monitoring
- Show user-friendly error UI with retry button

**Implementation:**
\`\`\`typescript
// ui/src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to monitoring service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
\`\`\`

**Wrap routes:**
\`\`\`typescript
<ErrorBoundary>
  <Route path="/dashboard" element={<Dashboard />} />
</ErrorBoundary>
\`\`\`

**Testing:**
- Throw error in Dashboard component
- Verify error boundary catches it
- Verify retry button works
- Test error logging

**Files to create:**
- ui/src/components/ErrorBoundary.tsx
- ui/src/components/ErrorFallback.tsx (UI component)

**Files to modify:**
- ui/src/App.tsx (wrap routes)

**Acceptance criteria:**
✅ Component errors don't crash entire app
✅ User sees friendly error message
✅ Retry button recovers from error
✅ Errors logged for debugging

**Priority:** P0 (High)
**Estimated time:** 2 days`,
    priority: 'high',
  },
  {
    title: 'Full Accessibility (a11y) Audit + ARIA Implementation',
    description: `**CRITICAL ACCESSIBILITY FIX**

Make dashboard accessible to screen reader users and keyboard-only navigation.

**Current State:** 0 ARIA labels, fails WCAG 2.1 AA
**Target:** WCAG 2.1 AA compliance (Lighthouse a11y score > 95)

**Phase 1: Audit (Day 1)**
- Run axe-core automated scan
- Run Lighthouse accessibility audit
- Manual keyboard navigation test
- Manual screen reader test (NVDA/JAWS)

**Phase 2: Core Fixes (Day 2-3)**
- Add semantic HTML (<nav>, <main>, <header>)
- Add ARIA labels to all interactive elements
- Add focus indicators (visible outline)
- Add skip-to-content link
- Fix heading hierarchy (h1 → h2 → h3)

**Phase 3: Component Updates (Day 4-5)**

**Buttons:**
\`\`\`tsx
<button aria-label="Start agent" onClick={...}>
  <Play className="h-4 w-4" aria-hidden="true" />
</button>
\`\`\`

**Status badges:**
\`\`\`tsx
<span className="status-badge" role="status" aria-live="polite">
  <span className="sr-only">Agent status: </span>
  Running
</span>
\`\`\`

**Navigation:**
\`\`\`tsx
<nav aria-label="Main navigation">
  <a href="/dashboard" aria-current={isActive ? "page" : undefined}>
    Dashboard
  </a>
</nav>
\`\`\`

**Modals:**
\`\`\`tsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Action</h2>
</div>
\`\`\`

**Charts (accessible alternatives):**
\`\`\`tsx
<div role="img" aria-label="Agent performance chart showing 3 agents with 95% success rate">
  <svg>...</svg>
</div>
<table className="sr-only">
  <caption>Agent Performance Data</caption>
  {/* Data table for screen readers */}
</table>
\`\`\`

**Phase 4: Testing (Day 6)**
- Re-run axe-core (0 violations)
- Keyboard navigation test
- Screen reader test
- Update documentation

**Files to modify:**
- ui/src/components/*.tsx (all components)
- ui/src/index.css (add focus styles, sr-only utility)
- Add aria labels to: Layout, AgentCard, TaskRow, MetricCard, Charts

**Acceptance criteria:**
✅ Lighthouse a11y score > 95
✅ Zero axe-core violations
✅ Full keyboard navigation support
✅ Screen reader announces all content correctly
✅ Color contrast ratios meet WCAG AA (4.5:1)

**Priority:** P0 (Legal compliance)
**Estimated time:** 5-6 days`,
    priority: 'critical',
  },
  {
    title: 'Code Splitting & Bundle Size Optimization',
    description: `**HIGH PRIORITY PERFORMANCE FIX**

Reduce bundle size from 1.28MB to < 500KB initial load.

**Current:** 1.28MB bundle (12s load on 3G)
**Target:** < 500KB initial bundle, rest lazy-loaded

**Strategy:**
1. Route-based code splitting
2. Lazy load heavy dependencies
3. Tree shake unused code
4. Optimize icon imports

**Implementation:**

**1. Route-based splitting:**
\`\`\`typescript
// ui/src/App.tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Costs = lazy(() => import('./pages/Costs'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
\`\`\`

**2. Lazy load charts:**
\`\`\`typescript
const ReactFlow = lazy(() => import('reactflow'));
const Recharts = lazy(() => import('recharts'));
\`\`\`

**3. Optimize icons (lucide-react):**
\`\`\`typescript
// Before (imports entire library):
import { Play, Stop, Edit } from 'lucide-react';

// After (tree-shakeable):
import Play from 'lucide-react/dist/esm/icons/play';
import Stop from 'lucide-react/dist/esm/icons/stop';
\`\`\`

**4. Configure Vite code splitting:**
\`\`\`javascript
// ui/vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'charts': ['recharts', 'reactflow'],
        },
      },
    },
    chunkSizeWarningLimit: 500, // Enforce 500KB limit
  },
};
\`\`\`

**Testing:**
- Run: \`npm run build\`
- Verify main bundle < 500KB
- Test all routes load correctly
- Measure load time on throttled connection

**Expected Results:**
- Initial bundle: ~350KB (was 1.28MB)
- Chart bundle: ~200KB (lazy loaded)
- React vendor: ~150KB (cached)
- Total page load (3G): < 5s (was 12s)

**Files to modify:**
- ui/src/App.tsx (add lazy loading)
- ui/vite.config.ts (configure chunks)
- ui/src/components/* (optimize icon imports)

**Acceptance criteria:**
✅ Initial bundle < 500KB
✅ All routes lazy-load successfully
✅ Lighthouse performance score > 90
✅ 3G load time < 5 seconds

**Priority:** P0 (High)
**Estimated time:** 3 days`,
    priority: 'high',
  },
  {
    title: 'PWA Implementation: Service Worker + Offline Support',
    description: `**MEDIUM PRIORITY UX FIX**

Implement Progressive Web App features for offline capability and mobile install.

**Current:** Roadmap says "60% complete" but 0 files exist
**Target:** Full offline-capable PWA with install prompt

**Requirements:**
- Web app manifest
- Service worker for offline caching
- Offline fallback page
- Install prompt
- Background sync for queued actions

**Phase 1: Manifest (Day 1)**
\`\`\`json
// ui/public/manifest.json
{
  "name": "Hivemind Dashboard",
  "short_name": "Hivemind",
  "description": "AI Company Orchestrator",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#f59e0b",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
\`\`\`

**Phase 2: Service Worker (Day 2)**
\`\`\`javascript
// ui/public/sw.js
const CACHE_NAME = 'hivemind-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/assets/index.js',
        '/assets/index.css',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        return response || caches.match(OFFLINE_URL);
      });
    })
  );
});
\`\`\`

**Phase 3: Install Prompt (Day 3)**
\`\`\`typescript
// ui/src/hooks/useInstallPrompt.ts
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('Install outcome:', outcome);
      setDeferredPrompt(null);
    }
  };

  return { canInstall: !!deferredPrompt, installApp };
}
\`\`\`

**Testing:**
- Lighthouse PWA audit (score 100)
- Test offline mode (disconnect WiFi)
- Test install prompt on mobile
- Test background sync

**Files to create:**
- ui/public/manifest.json
- ui/public/sw.js
- ui/public/offline.html
- ui/public/icon-192.png, icon-512.png
- ui/src/hooks/useInstallPrompt.ts

**Files to modify:**
- ui/index.html (add manifest link, register SW)
- ui/src/App.tsx (add install prompt UI)

**Acceptance criteria:**
✅ Lighthouse PWA score = 100
✅ App works offline (cached pages)
✅ Install prompt shows on mobile
✅ App icon appears on home screen

**Priority:** P1 (Medium)
**Estimated time:** 3 days`,
    priority: 'medium',
  },
  {
    title: 'Fix WebSocket Infinite Retry + Exponential Backoff',
    description: `**MEDIUM PRIORITY RELIABILITY FIX**

Dashboard should never permanently disconnect from orchestrator.

**Current Problem:**
- WebSocket gives up after 10 failed reconnection attempts
- Dashboard goes offline permanently
- User has no indication of permanent disconnection

**Requirements:**
- Infinite retry attempts
- Exponential backoff with ceiling (max 30s)
- Visual indicator for degraded connection
- Reconnection notifications

**Implementation:**
\`\`\`typescript
// ui/src/websocket.ts
this.ws = new ReconnectingWebSocket(wsUrl, [], {
  // Remove maxRetries - never give up
  reconnectionDelayGrowFactor: 1.5,
  minReconnectionDelay: 1000,     // 1s
  maxReconnectionDelay: 30000,    // 30s max
  connectionTimeout: 5000,
});

this.ws.addEventListener('connecting', () => {
  this.setStatus('connecting');
  this.reconnectAttempts++;

  if (this.reconnectAttempts > 3) {
    // Show "Connection unstable" warning
    this.notifyUser('Connection issues - retrying...');
  }
});

this.ws.addEventListener('open', () => {
  this.setStatus('connected');
  this.reconnectAttempts = 0;

  if (this.wasDisconnected) {
    this.notifyUser('Reconnected successfully!');
  }
});
\`\`\`

**Visual Indicators:**
\`\`\`tsx
// ui/src/components/WebSocketStatus.tsx
function WebSocketStatus({ status, reconnectAttempts }) {
  if (status === 'connected') {
    return <span className="text-emerald-400">● Live</span>;
  }

  if (status === 'connecting') {
    return (
      <span className="text-amber-400">
        ◌ Reconnecting... (attempt {reconnectAttempts})
      </span>
    );
  }

  return <span className="text-red-400">● Disconnected</span>;
}
\`\`\`

**Testing:**
- Stop server mid-session
- Verify infinite reconnection attempts
- Verify exponential backoff (check intervals)
- Verify max backoff doesn't exceed 30s
- Verify user sees connection status

**Files to modify:**
- ui/src/websocket.ts (remove maxRetries, add backoff ceiling)
- ui/src/components/WebSocketStatus.tsx (show attempts)
- ui/src/components/Layout.tsx (add reconnection toast)

**Acceptance criteria:**
✅ No maxRetries limit (infinite attempts)
✅ Backoff capped at 30 seconds
✅ User sees connection status in header
✅ Toast notification on reconnect
✅ Test: survives 5-minute server outage

**Priority:** P1 (Medium)
**Estimated time:** 1 day`,
    priority: 'medium',
  },
  {
    title: 'API Rate Limiting with express-rate-limit',
    description: `**MEDIUM PRIORITY SECURITY FIX**

Protect API from DoS attacks and resource exhaustion.

**Current Problem:**
- No rate limiting on any endpoint
- Malicious user can flood server with requests
- No IP-based blocking
- No cost protection (API abuse = high OpenAI bills)

**Requirements:**
- Global rate limit (100 req/min per IP)
- Strict limits on expensive endpoints (nudge, task creation)
- Rate limit headers (X-RateLimit-*)
- 429 Too Many Requests response

**Implementation:**
\`\`\`javascript
// src/middleware/rate-limiter.js
import rateLimit from 'express-rate-limit';

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Strict limiter for expensive operations
export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // Only 10 nudges per minute
  message: 'Rate limit exceeded for this operation.',
});

// API key limiter (for future API access)
export const apiKeyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
});
\`\`\`

**Apply to server:**
\`\`\`javascript
// src/server.js
import { globalLimiter, strictLimiter } from './middleware/rate-limiter.js';

// Global rate limit
app.use('/api', globalLimiter);

// Strict limits on expensive endpoints
app.post('/api/nudge', strictLimiter, async (req, res) => { ... });
app.post('/api/tasks', strictLimiter, async (req, res) => { ... });
app.post('/api/agents/spawn', strictLimiter, async (req, res) => { ... });
\`\`\`

**Client-side handling:**
\`\`\`typescript
// ui/src/api.ts
async function fetchWithRetry(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(\`Rate limited. Retry after \${retryAfter}s\`);
  }

  return response;
}
\`\`\`

**Testing:**
- Spam nudge button 20 times
- Verify 429 after 10 requests
- Verify rate limit resets after 1 minute
- Check headers: X-RateLimit-Limit, X-RateLimit-Remaining

**Files to create:**
- src/middleware/rate-limiter.js

**Files to modify:**
- src/server.js (apply limiters)
- ui/src/api.ts (handle 429 responses)
- package.json (add express-rate-limit)

**Acceptance criteria:**
✅ Global limit: 100 req/min
✅ Nudge limit: 10 req/min
✅ 429 response includes Retry-After header
✅ Rate limit resets correctly
✅ UI shows friendly error on rate limit

**Priority:** P1 (Medium)
**Estimated time:** 1 day`,
    priority: 'medium',
  },
  {
    title: 'Database Migration System (node-migrate)',
    description: `**LOW-MEDIUM PRIORITY INFRASTRUCTURE FIX**

Replace fragile try/catch migration pattern with proper versioned migrations.

**Current Problem:**
- No migration version tracking
- Silent failures (empty catch blocks)
- No rollback capability
- Can't replay migrations
- Schema drift between environments

**Requirements:**
- Version-controlled migrations
- Up/down migration support
- Migration history tracking
- Rollback capability
- Dry-run mode for testing

**Implementation:**

**1. Install migration tool:**
\`\`\`bash
npm install migrate
\`\`\`

**2. Create migration structure:**
\`\`\`
migrations/
├── 001-initial-schema.js
├── 002-add-sprint-column.js
├── 003-add-deployment-url.js
├── 004-add-trace-columns.js
└── .migrate (state file)
\`\`\`

**3. Example migration:**
\`\`\`javascript
// migrations/002-add-sprint-column.js
export async function up(db) {
  return db.exec(\`
    ALTER TABLE companies ADD COLUMN sprint INTEGER NOT NULL DEFAULT 0;
  \`);
}

export async function down(db) {
  return db.exec(\`
    ALTER TABLE companies DROP COLUMN sprint;
  \`);
}
\`\`\`

**4. Migration runner:**
\`\`\`javascript
// src/migrate.js
import migrate from 'migrate';
import { getDb } from './db.js';

const db = getDb();

migrate.load({
  stateStore: '.migrate',
}, (err, set) => {
  if (err) throw err;

  set.up((err) => {
    if (err) throw err;
    console.log('Migrations complete!');
  });
});
\`\`\`

**5. NPM scripts:**
\`\`\`json
{
  "scripts": {
    "migrate": "node src/migrate.js",
    "migrate:rollback": "node src/migrate.js down",
    "migrate:create": "migrate create"
  }
}
\`\`\`

**Replace old migrations:**
- Extract all try/catch migrations from db.js
- Convert to numbered migration files
- Remove old migration code
- Test migration on fresh DB

**Testing:**
- Create fresh DB
- Run: \`npm run migrate\`
- Verify all tables/columns created
- Run: \`npm run migrate:rollback\`
- Verify rollback works
- Test idempotency (run twice = same result)

**Files to create:**
- migrations/001-initial-schema.js
- migrations/002-add-sprint-column.js
- migrations/003-add-deployment-url.js
- migrations/004-add-trace-columns.js
- migrations/005-add-depends-on.js
- src/migrate.js

**Files to modify:**
- src/db.js (remove old migration code)
- package.json (add migrate scripts)

**Acceptance criteria:**
✅ All migrations in versioned files
✅ Migration state tracked in .migrate file
✅ Rollback works correctly
✅ Fresh DB migration creates correct schema
✅ Idempotent migrations (safe to run twice)

**Priority:** P2 (Low-Medium)
**Estimated time:** 2 days`,
    priority: 'medium',
  },
  {
    title: 'Add Confirmation Modals for Destructive Actions',
    description: `**MEDIUM PRIORITY UX FIX**

Prevent accidental data loss from destructive operations.

**Current Problem:**
- Archive company - no confirmation (DANGEROUS)
- Delete task - no confirmation
- Reset circuit breaker - no confirmation
- Cancel running task - no confirmation
- One accidental click = data loss

**Requirements:**
- Confirmation modal component
- Type-to-confirm for critical actions
- Undo capability where possible
- Loading states during destructive operations

**Implementation:**

**1. Confirmation Modal Component:**
\`\`\`typescript
// ui/src/components/ConfirmModal.tsx
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmButtonText?: string;
  destructive?: boolean;
  requireTyping?: boolean; // For critical actions
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText, // e.g., "DELETE"
  confirmButtonText = "Confirm",
  destructive = false,
  requireTyping = false,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState('');
  const canConfirm = !requireTyping || inputValue === confirmText;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>

        {requireTyping && (
          <div>
            <Label>Type <code>{confirmText}</code> to confirm</Label>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
\`\`\`

**2. Usage Examples:**

**Archive Company (critical):**
\`\`\`typescript
const [showArchiveModal, setShowArchiveModal] = useState(false);

<ConfirmModal
  isOpen={showArchiveModal}
  onClose={() => setShowArchiveModal(false)}
  onConfirm={handleArchiveCompany}
  title="Archive Company?"
  message="This will stop all agents and archive all data. This action cannot be undone."
  confirmText="ARCHIVE"
  confirmButtonText="Archive Company"
  destructive={true}
  requireTyping={true} // Type "ARCHIVE" to confirm
/>
\`\`\`

**Delete Task:**
\`\`\`typescript
<ConfirmModal
  isOpen={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  onConfirm={handleDeleteTask}
  title="Delete Task?"
  message="This will permanently delete this task and all associated data."
  confirmButtonText="Delete Task"
  destructive={true}
  requireTyping={false} // Just click confirm
/>
\`\`\`

**Reset Circuit Breaker:**
\`\`\`typescript
<ConfirmModal
  isOpen={showResetModal}
  onClose={() => setShowResetModal(false)}
  onConfirm={handleResetCircuitBreaker}
  title="Reset Circuit Breaker?"
  message="This will clear the failure count and allow the agent to restart. Make sure the underlying issue is fixed first."
  confirmButtonText="Reset"
  destructive={false}
/>
\`\`\`

**3. Actions Requiring Confirmation:**
- ✅ Archive company (type "ARCHIVE")
- ✅ Delete company (type company name)
- ✅ Delete task (click confirm)
- ✅ Cancel running task (click confirm)
- ✅ Reset circuit breaker (click confirm)
- ✅ Bulk delete tasks (type "DELETE")
- ✅ Clear all logs (type "CLEAR")

**Testing:**
- Try each destructive action
- Verify modal appears
- Test type-to-confirm validation
- Test cancel button
- Verify action only executes on confirm

**Files to create:**
- ui/src/components/ConfirmModal.tsx

**Files to modify:**
- ui/src/pages/Companies.tsx (archive/delete)
- ui/src/pages/Tasks.tsx (delete task)
- ui/src/pages/AgentHealth.tsx (reset circuit breaker)
- ui/src/pages/Logs.tsx (clear logs)

**Acceptance criteria:**
✅ All destructive actions have confirmation
✅ Critical actions require typing confirmation text
✅ Modal is accessible (keyboard navigation, focus trap)
✅ Cancel button works correctly
✅ No accidental data loss possible

**Priority:** P1 (Medium-High)
**Estimated time:** 1-2 days`,
    priority: 'medium',
  },
];

console.log(`📋 Creating ${tasks.length} improvement tasks...\n`);

tasks.forEach((task, index) => {
  const taskId = crypto.randomUUID();

  db.createTask({
    id: taskId,
    companyId: company.id,
    parentId: null,
    title: task.title,
    description: task.description,
    priority: task.priority,
    assigneeId: null, // CEO will dispatch engineers
    createdById: 'ceo-evaluation',
    dependsOn: null,
  });

  console.log(`✅ [${index + 1}/${tasks.length}] Created: ${task.title}`);
  console.log(`   Priority: ${task.priority.toUpperCase()}`);
  console.log(`   ID: ${taskId.slice(0, 8)}\n`);
});

console.log(`\n🎯 Task dispatch complete!`);
console.log(`\n📊 Summary:`);
console.log(`   - P0 Critical: ${tasks.filter(t => t.priority === 'critical').length} tasks`);
console.log(`   - P1 High: ${tasks.filter(t => t.priority === 'high').length} tasks`);
console.log(`   - P2 Medium: ${tasks.filter(t => t.priority === 'medium').length} tasks`);
console.log(`\n🚀 Next steps:`);
console.log(`   1. View tasks: http://localhost:3100/${company.id.slice(0, 8)}/tasks`);
console.log(`   2. Start orchestrator: node bin/hivemind.js resume`);
console.log(`   3. Monitor dashboard for engineer assignments\n`);
