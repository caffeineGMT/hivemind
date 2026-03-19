# URL Routing Implementation Summary

## ✅ Status: FULLY IMPLEMENTED AND WORKING

The Hivemind dashboard uses **URL-based routing** where each company and page has its own URL. Refreshing any page keeps you on that exact page.

## URL Structure

```
/                                   → Auto-redirects to /{first-company-slug}
/{company-slug}                     → Company dashboard
/{company-slug}/tasks               → Tasks page
/{company-slug}/agents              → Agents page
/{company-slug}/health-monitor      → Health monitor
/{company-slug}/activity            → Activity log
/{company-slug}/finance             → Finance
/{company-slug}/analytics           → Analytics
/{company-slug}/cross-project-analytics → Cross-project view
/{company-slug}/costs               → Cost tracking
/{company-slug}/agent-performance   → Agent performance
/{company-slug}/roadmap             → Roadmap
/{company-slug}/settings            → Settings
/{company-slug}/tasks/{taskId}      → Task detail
/{company-slug}/logs/{agentName}    → Agent logs
/{company-slug}/trace/{traceId}     → Trace viewer
```

## How It Works

### 1. Company Slug Generation
Company names are converted to URL-safe slugs:
```javascript
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
```

Examples:
- `TaxBridge` → `taxbridge`
- `My AI Startup` → `my-ai-startup`
- `SaaS_Platform-2024` → `saas-platform-2024`

### 2. React Router Setup
Main routes (`ui/src/App.tsx`):
```tsx
<Routes>
  <Route path="/" element={<CompanyRoutes />} />
  <Route path="/:companySlug/*" element={<CompanyRoutes />} />
</Routes>
```

### 3. Auto-Redirect Logic
When visiting `/` without a company slug:
```tsx
useEffect(() => {
  if (!companySlug && companies && companies.length > 0) {
    const sorted = [...companies].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    navigate(`/${slugify(sorted[0].name)}`, { replace: true });
  }
}, [companySlug, companies, navigate]);
```

### 4. SPA Fallback (Server)
Express server (`src/server.js`) serves `index.html` for all non-API routes:
```javascript
// Serve static files
app.use(express.static(uiDist, { index: false }));

// SPA fallback - all routes serve index.html
app.get("*", (req, res) => {
  const indexPath = path.join(uiDist, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "UI not built" });
  }
});
```

### 5. Navigation Links
All navigation links include the company slug (`ui/src/components/Layout.tsx`):
```tsx
function getNavItems(companySlug: string) {
  return [
    { to: `/${companySlug}`, icon: LayoutDashboard, label: 'Dashboard' },
    { to: `/${companySlug}/tasks`, icon: ListTodo, label: 'Tasks' },
    { to: `/${companySlug}/agents`, icon: Users, label: 'Agents' },
    // ... etc
  ];
}
```

## Testing

To verify routing works:

1. **Root redirect**:
   ```bash
   curl http://localhost:3100/
   # Should redirect to first company's slug
   ```

2. **Sub-route access**:
   ```bash
   curl http://localhost:3100/taxbridge/tasks
   # Should serve index.html (React handles routing)
   ```

3. **Refresh behavior**:
   - Navigate to `http://localhost:3100/taxbridge/agents`
   - Refresh the page
   - Should stay on `/taxbridge/agents` (not go back to dashboard)

## Development vs Production

### Development (Vite dev server on port 5173/5174)
- React Router handles all routes client-side
- Hot module reloading enabled
- Source maps available

### Production (Express server on port 3100)
- Server serves `ui/dist/index.html` for all routes
- React Router takes over after initial page load
- Optimized bundle served

## Company Switching

When switching companies via the dropdown:
```tsx
const handleSelectCompany = (id: string) => {
  const company = companies.find(c => c.id === id);
  if (company) {
    navigate(`/${slugify(company.name)}`);
  }
};
```

This updates the URL and triggers a re-render with the new company context.

## Key Files

- `ui/src/App.tsx` - Main routing logic and company context
- `ui/src/components/Layout.tsx` - Navigation links with company slugs
- `ui/src/components/MobileBottomNav.tsx` - Mobile nav with company slugs
- `ui/src/main.tsx` - BrowserRouter setup
- `src/server.js` - SPA fallback serving
- `ui/vite.config.ts` - Vite proxy config for API

## Benefits

✅ **Bookmarkable URLs** - Share direct links to specific pages
✅ **Browser history** - Back/forward buttons work correctly
✅ **Refresh persistence** - Page stays the same on refresh
✅ **SEO-friendly** - Crawlable URLs (when deployed)
✅ **Multi-company support** - Each company has its own URL namespace

## Production Deployment

Before deploying to production:
```bash
cd ui
npm run build
```

This creates `ui/dist/` which the Express server serves on port 3100.
