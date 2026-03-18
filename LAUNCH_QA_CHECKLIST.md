# Launch Readiness - QA Checklist

## Pre-Launch Quality Assurance Checklist
**Version**: 1.0
**Last Updated**: 2026-03-18
**Owner**: CTO + Designer
**Target**: Production Launch

---

## 1. Authentication & User Management

### Clerk Authentication
- [ ] Sign up flow works correctly
- [ ] Email verification works
- [ ] Social login (Google, GitHub) works
- [ ] Sign in with existing account works
- [ ] Password reset flow works
- [ ] Session persistence across page refreshes
- [ ] Logout works correctly
- [ ] Protected routes redirect to login
- [ ] Auth tokens are properly set for API calls

### User Data
- [ ] User data is correctly associated with Clerk user ID
- [ ] Multiple users can have separate companies
- [ ] User data is isolated (can't see other users' companies)

---

## 2. Core Functionality

### Company Creation
- [ ] Can create new AI company via CLI
- [ ] Company appears in dashboard immediately
- [ ] Company data persists after page refresh
- [ ] Multiple companies can be created
- [ ] Company selection works correctly

### Agent Orchestration
- [ ] CEO planning phase completes successfully
- [ ] CTO refinement phase works
- [ ] Designer phase creates design specs
- [ ] CMO phase creates marketing strategy
- [ ] Engineers are dispatched correctly
- [ ] Agent status updates in real-time
- [ ] Agent logs are written and readable
- [ ] Agents auto-restart on crash (health monitoring)

### Task Management
- [ ] Tasks are created from CEO planning
- [ ] Tasks can be refined by CTO
- [ ] Task status updates work (backlog → todo → in_progress → done)
- [ ] Task assignment to agents works
- [ ] Task priority system works (urgent tasks preempt lower priority)
- [ ] Parent/child task relationships work
- [ ] Task results are captured and displayed

### User Interaction
- [ ] Can add comments/nudges to company
- [ ] Nudges trigger immediate URGENT task creation
- [ ] Urgent tasks preempt running low-priority agents
- [ ] User feedback is processed by CEO
- [ ] Can create tasks via dashboard
- [ ] Can update task status manually

---

## 3. Dashboard UI/UX

### Layout & Navigation
- [ ] Navigation between pages works smoothly
- [ ] Active page is highlighted in sidebar
- [ ] Company selector works
- [ ] Responsive on mobile devices (320px+)
- [ ] Responsive on tablet devices (768px+)
- [ ] Desktop layout works (1024px+)

### Dashboard Page
- [ ] Metrics display correctly
- [ ] Progress bar updates in real-time
- [ ] Recent activity shows latest events
- [ ] Agent status cards update live
- [ ] Charts/graphs render correctly
- [ ] No layout shift on data load

### Tasks Page
- [ ] Task list displays all tasks
- [ ] Task filtering works (status, priority)
- [ ] Task detail view works
- [ ] Can create new tasks
- [ ] Can update task status
- [ ] Task priorities display correctly

### Agents Page
- [ ] Agent list displays all agents
- [ ] Agent status badges show correct state
- [ ] Agent logs link works
- [ ] Agent performance metrics display

### Activity Log
- [ ] Activity events display in chronological order
- [ ] Filtering by action type works
- [ ] Pagination works
- [ ] Event details are readable

### Finance/Costs Page
- [ ] Cost breakdown by agent displays
- [ ] Token usage charts render
- [ ] CSV export works
- [ ] Cost totals are accurate

### Analytics Page
- [ ] Usage metrics display correctly
- [ ] Time-series charts work
- [ ] Agent hours tracking works
- [ ] API call counts are accurate

---

## 4. Real-Time Updates

### WebSocket Connection
- [ ] WebSocket connects on dashboard load
- [ ] Connection survives page navigation
- [ ] Reconnects automatically if disconnected
- [ ] Events broadcast to all connected clients
- [ ] UI updates without page refresh

### Live Data
- [ ] New tasks appear immediately
- [ ] Agent status updates in real-time
- [ ] Activity log updates live
- [ ] Cost metrics update as agents work
- [ ] Task progress updates automatically

---

## 5. Stripe Integration & Billing

### Checkout Flow
- [ ] Stripe checkout session creation works
- [ ] Payment page loads correctly
- [ ] Test payment succeeds (use test card: 4242 4242 4242 4242)
- [ ] Subscription is created in Stripe
- [ ] User is redirected back to app after payment
- [ ] Subscription status is updated in database

### Subscription Management
- [ ] Subscription status displays correctly
- [ ] Customer portal link works
- [ ] Can upgrade/downgrade plans
- [ ] Can cancel subscription
- [ ] Webhook handles subscription updates
- [ ] Free trial period works

### Usage Metering
- [ ] API calls are tracked correctly
- [ ] Agent hours are metered
- [ ] Usage is reported to Stripe (if configured)
- [ ] Overage charges work (if applicable)

---

## 6. Performance & Reliability

### Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Page transitions are smooth (< 300ms)
- [ ] Large task lists render without lag
- [ ] API responses are fast (< 500ms p95)

### Error Handling
- [ ] API errors display user-friendly messages
- [ ] Network errors don't crash the app
- [ ] Invalid data is handled gracefully
- [ ] 404 pages work
- [ ] Error boundaries catch React errors

### Stability
- [ ] No memory leaks in long-running sessions
- [ ] WebSocket doesn't leak connections
- [ ] Agent processes don't accumulate on restart
- [ ] Database doesn't lock up under load
- [ ] Logs don't fill up disk space

---

## 7. Security

### Authentication
- [ ] All API routes require auth (except webhooks)
- [ ] JWT tokens expire correctly
- [ ] Refresh tokens work
- [ ] CORS is configured correctly
- [ ] No sensitive data in client-side code

### Data Access
- [ ] Users can only see their own companies
- [ ] API enforces user_id filtering
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Webhook signature validation works

---

## 8. Deployment & DevOps

### Vercel Deployment
- [ ] Production build succeeds
- [ ] Environment variables are set
- [ ] API routes work in production
- [ ] Static assets load correctly
- [ ] Domain/URL works
- [ ] SSL certificate is valid

### Backend Server
- [ ] Server starts without errors
- [ ] Database migrations run automatically
- [ ] Logs are written correctly
- [ ] Health check endpoint works
- [ ] Graceful shutdown works

---

## 9. Documentation

### User Documentation
- [ ] Getting started guide exists
- [ ] FAQ page is complete
- [ ] Troubleshooting guide exists
- [ ] API documentation (if applicable)
- [ ] Video tutorials linked (if available)

### Developer Documentation
- [ ] README is up to date
- [ ] Setup instructions are accurate
- [ ] Environment variables documented
- [ ] Architecture diagram exists
- [ ] Code is commented where needed

---

## 10. Beta User Feedback

### Testimonial Collection
- [ ] Feedback form works
- [ ] Testimonials are stored correctly
- [ ] Testimonials display on landing page
- [ ] Can approve/reject testimonials (admin)
- [ ] Email collection for follow-up works

### User Satisfaction
- [ ] At least 3 beta users have tested
- [ ] Critical bugs reported by beta users are fixed
- [ ] User feedback incorporated into design
- [ ] Beta users willing to provide testimonials

---

## Critical Path Items (Must Pass Before Launch)

1. **Auth works end-to-end** - Sign up → Login → Access dashboard
2. **Company creation works** - CLI creates company, appears in dashboard
3. **Agents execute tasks** - CEO → CTO → Engineers → Task completion
4. **Real-time updates work** - WebSocket events update UI
5. **Stripe checkout works** - Payment succeeds, subscription created
6. **Deployment stable** - Vercel deployment works, no crashes
7. **Mobile responsive** - Works on iPhone/Android screens
8. **3+ beta testimonials** - Real user feedback collected

---

## Testing Environments

### Test Cards (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

### Test Accounts
- Email: test@hivemind.ai
- Password: TestPassword123!

### Test Company
- Goal: "Build a SaaS product for task management"
- Expected: CEO creates 3-5 projects, CTO refines, Engineers execute

---

## Sign-Off

- [ ] CTO Approval: ________________
- [ ] Designer Approval: ________________
- [ ] QA Passed: ________________
- [ ] Ready for Launch: ________________

---

## Notes

Use this checklist before every major release. All items must be checked before production deployment.

**Testing Tools:**
- Manual testing for UI/UX
- Chrome DevTools for performance
- Stripe test mode for payments
- WebSocket test client for real-time updates

**Rollback Plan:**
- Keep previous Vercel deployment available
- Database backup before launch
- Can revert to previous git commit
