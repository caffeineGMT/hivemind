# Screenshot Guide for Product Hunt

## Requirements
- **Total Screenshots:** 5 (Product Hunt optimal)
- **Format:** PNG or JPG
- **Resolution:** 1920×1080 (1080p) minimum
- **Aspect Ratio:** 16:9 (landscape) or 9:16 (mobile)
- **File Size:** <5MB per image
- **Naming:** Numbered in order: `01-dashboard.png`, `02-tasks.png`, etc.

---

## Screenshot 1: Dashboard Overview

### What to Show
**Main dashboard with:**
- 2-3 active AI businesses (e.g., "AI Newsletter", "Support Bot", "Content Scraper")
- Real-time task list showing active/completed tasks
- Cost analytics chart with upward trend
- Agent status indicators (green = active, gray = idle)
- Navigation sidebar visible

### Setup Instructions
1. Create 3 demo businesses in dashboard
2. Start 2-3 tasks so there's activity
3. Wait for cost chart to populate with data
4. Ensure at least one agent is "active" (green status)

### Caption
**"Real-time dashboard showing active agents, tasks, and cost analytics across all your AI businesses"**

### Pro Tips
- Clean up any test data or debug info
- Use realistic business names (not "Test 1", "Test 2")
- Ensure timestamps are recent (shows it's actively used)
- Hide any API keys or sensitive data

### Screenshot Checklist
- [ ] All text is readable (no tiny fonts)
- [ ] No personal/sensitive information visible
- [ ] UI looks polished (no broken layouts)
- [ ] Colors are vibrant and appealing
- [ ] At least 2-3 businesses visible
- [ ] Cost chart shows real data (not empty)

---

## Screenshot 2: Task Detail View

### What to Show
**Expanded task view with:**
- Agent communication logs (multi-agent dialogue)
- Execution timeline (start/end times, duration)
- Resource usage (API calls, tokens used, cost)
- Task status (in progress, completed, or failed)
- Action buttons (retry, cancel, view output)

### Setup Instructions
1. Click into a completed task (preferably successful)
2. Ensure agent logs show interesting interactions (not just "Task started")
3. Make sure cost data is populated
4. Capture a mix of log levels (info, success, maybe one warning for realism)

### Caption
**"Drill down into any task to see agent logs, execution timeline, and resource usage"**

### Pro Tips
- Choose a task with multi-agent activity (shows collaboration)
- Ensure logs are verbose enough to be interesting but not overwhelming
- Highlight successful completion (green checkmark/success state)
- Show realistic cost (e.g., "$0.42" not "$0.00000001")

### Screenshot Checklist
- [ ] Logs are readable and interesting
- [ ] Timeline shows clear start/end
- [ ] Cost breakdown is visible
- [ ] No errors or broken UI elements
- [ ] Agent names are clear (e.g., "Web Scraper", "Content Writer")

---

## Screenshot 3: Cost Analytics

### What to Show
**Cost tracking page with:**
- Line chart showing cost trends over time (7-day or 30-day view)
- Per-agent cost breakdown (bar chart or pie chart)
- Per-business cost comparison
- Total spend summary (today, week, month)
- Cost filters (by date, by business, by agent)

### Setup Instructions
1. Generate enough task activity to populate charts (run 10-20 tasks)
2. Use different agents so breakdown chart has multiple bars
3. Switch to 7-day view for denser data visualization
4. Ensure at least $5-$10 total spend (shows real usage)

### Caption
**"Granular cost tracking per agent, per task, and per project—know exactly where your API spend goes"**

### Pro Tips
- Use vibrant colors for chart bars (purple, blue, green)
- Ensure data is realistic (not all zeros or huge spikes)
- Show trend line going up (indicates growth/usage)
- Include cost-saving insights if dashboard has them (e.g., "12% lower than last week")

### Screenshot Checklist
- [ ] Charts are populated with real data
- [ ] Color scheme matches brand (purple gradient)
- [ ] All labels are readable
- [ ] No "No data" placeholders
- [ ] Spend amount looks realistic ($5-$50 range)

---

## Screenshot 4: Settings & Configuration

### What to Show
**Settings page with:**
- API key configuration fields (Claude, OpenAI, Gemini)
- Model selection dropdowns (e.g., "Claude 3.5 Sonnet", "GPT-4")
- Agent retry policy settings (max retries, backoff strategy)
- Webhook URL for notifications
- Theme toggle (light/dark mode)
- Danger zone (account deletion, data export)

### Setup Instructions
1. Navigate to settings page
2. Fill in API key fields with masked values (••••••••key123)
3. Select model options to show dropdowns populated
4. Enable advanced settings if available

### Caption
**"Configure API keys, agent models, retry policies, and webhooks in one place"**

### Pro Tips
- Mask API keys (show last 4 chars only, e.g., "sk-••••••••abc123")
- Show tooltips or help text visible (aids discoverability)
- Ensure form looks clean and organized (not cluttered)
- Highlight one setting with hover state (shows interactivity)

### Screenshot Checklist
- [ ] No full API keys visible (security)
- [ ] All form fields are properly aligned
- [ ] Labels are clear and descriptive
- [ ] Save button is visible
- [ ] No validation errors showing

---

## Screenshot 5: Agent Workflow Visualization

### What to Show
**Flow diagram showing:**
- Agent nodes (Web Scraper → Content Writer → Email Sender)
- Connecting arrows showing data flow
- Real-time status indicators on each node
- Input/output data preview (optional)
- Zoom/pan controls for large workflows

### Setup Instructions
1. Create or use existing multi-agent workflow
2. Ensure at least 3 agents are connected
3. Activate workflow so agents show "active" state
4. Zoom to fit all nodes in frame

### Caption
**"See how agents collaborate: web scraper → content writer → email sender, all coordinated automatically"**

### Pro Tips
- Use emoji or icons for each agent type (🔍, ✍️, 📧)
- Show animated arrows if possible (screenshot mid-animation)
- Ensure nodes are evenly spaced (not overlapping)
- Highlight active connection (thicker line or glowing effect)

### Screenshot Checklist
- [ ] At least 3 agent nodes visible
- [ ] Arrows clearly show direction of flow
- [ ] Node labels are readable
- [ ] Layout is clean (not spaghetti diagram)
- [ ] Status indicators match agent states

---

## Bonus Screenshots (Optional, for Gallery)

### 6. Mobile Responsive View
Show dashboard on mobile (iPhone/Android simulator)
- Demonstrates mobile-first design
- Appeals to users who manage on-the-go

### 7. Terminal/tmux View
Show underlying tmux sessions with agents running
- Appeals to technical users
- Shows "under the hood" transparency

### 8. Example Business Output
Show real AI newsletter or content generated by Hivemind
- Proves it works (social proof)
- Shows end result, not just UI

---

## Technical Setup

### Screen Resolution
- **Desktop:** 1920×1080 (full HD)
- **Laptop:** 1440×900 (common MacBook resolution)
- **Mobile:** 375×812 (iPhone X/11/12 size)

### Browser Settings
1. Set zoom to 100% (Cmd/Ctrl + 0)
2. Hide browser chrome (F11 fullscreen mode)
3. Disable browser extensions that clutter UI
4. Clear cookies/cache for clean state
5. Use Incognito/Private mode to avoid logged-in states bleeding through

### Screenshot Tools

**Mac:**
- **Cmd + Shift + 4:** Select area (recommended)
- **Cmd + Shift + 3:** Full screen
- **CleanShot X:** Professional annotations and beautification

**Windows:**
- **Snipping Tool:** Built-in, simple
- **ShareX:** Advanced, customizable
- **Greenshot:** Open-source alternative

**Browser Extensions:**
- **Awesome Screenshot:** Full-page capture, annotations
- **Fireshot:** Full-page screenshots with editing
- **Nimbus:** Cloud-based screenshot tool

### Post-Processing

**Tools:**
- **Figma:** Add borders, shadows, annotations
- **Canva:** Quick edits, filters, text overlays
- **Photoshop/Affinity Photo:** Professional editing

**Enhancements:**
- Add subtle drop shadow (makes screenshots "pop")
- Add rounded corners (8-12px radius)
- Apply slight brightness/contrast boost
- Add thin border (1-2px, light gray) for definition

**Template:**
```css
/* Figma/CSS for screenshot frame */
.screenshot {
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## Screenshot Order & Strategy

### Upload Order on Product Hunt
1. **Dashboard Overview** – Hooks viewers immediately, shows full product
2. **Task Detail View** – Deepens engagement, shows functionality
3. **Agent Workflow** – Visual appeal, unique selling point
4. **Cost Analytics** – Trust signal (transparency), practical value
5. **Settings** – Comprehensive feel, shows flexibility

### Why This Order?
- **First impression matters:** Dashboard overview is most impressive
- **Progressive depth:** Each screenshot reveals more detail
- **Visual variety:** Mix of charts, logs, diagrams, forms
- **End on trust:** Settings shows you're transparent and configurable

---

## Do's and Don'ts

### Do:
✅ Use real data (not Lorem Ipsum or "Test 1, Test 2")
✅ Show success states (green checkmarks, completed tasks)
✅ Highlight unique features (multi-agent coordination)
✅ Make text readable (zoom in if needed)
✅ Use consistent branding (purple gradient theme)
✅ Show realistic usage (not empty dashboards)

### Don't:
❌ Show error states (unless it's a "self-healing" demo)
❌ Include sensitive data (API keys, real emails, personal info)
❌ Use low-resolution images (<1080p)
❌ Clutter with too much UI chrome (toolbars, bookmarks)
❌ Show loading states (looks broken)
❌ Use dark mode if UI isn't polished (shows flaws more)

---

## Final Checklist Before Upload

- [ ] All 5 screenshots are 1920×1080 or higher
- [ ] File sizes are <5MB each
- [ ] No personal/sensitive information visible
- [ ] All text is readable at thumbnail size (test by zooming out)
- [ ] Screenshots are numbered in correct order (01, 02, 03, 04, 05)
- [ ] Each has a clear, descriptive caption
- [ ] Colors are vibrant and appealing
- [ ] UI looks polished (no broken layouts or placeholder text)
- [ ] Screenshots tell a story (overview → detail → insights → config → workflow)
- [ ] Tested on multiple screen sizes (desktop, tablet, mobile)

---

## Screenshot Captions (Copy-Paste Ready)

1. **Dashboard Overview**
   > Real-time dashboard showing active agents, tasks, and cost analytics across all your AI businesses

2. **Task Detail View**
   > Drill down into any task to see agent logs, execution timeline, and resource usage

3. **Cost Analytics**
   > Granular cost tracking per agent, per task, and per project—know exactly where your API spend goes

4. **Settings & Configuration**
   > Configure API keys, agent models, retry policies, and webhooks in one place

5. **Agent Workflow Visualization**
   > See how agents collaborate: web scraper → content writer → email sender, all coordinated automatically

---

## Pro Tips for Maximum Impact

### 1. Add Subtle Animations (GIFs)
If Product Hunt supports GIFs in gallery:
- Record 3-second loop of agent workflow animating
- Show cost chart updating in real-time
- Capture task log streaming

### 2. Use Device Mockups
- Wrap screenshots in MacBook/iPhone frames using [Screely](https://screely.com) or [Mockuuups](https://mockuuups.studio.design/)
- Adds professional polish
- Makes screenshots stand out in gallery

### 3. Highlight Key Features
- Use arrows or circles to draw attention to unique features
- Add "NEW" badges to recently shipped features
- Annotate complex UI with explanatory text

### 4. A/B Test Thumbnails
- Product Hunt uses first screenshot as primary thumbnail
- Test dashboard vs. workflow diagram to see which gets more clicks
- If possible, switch after 6 hours if engagement is low

---

## Example Screenshot File Structure

```
product-hunt/assets/screenshots/
├── 01-dashboard-overview.png       (1920×1080, 2.4MB)
├── 02-task-detail-view.png         (1920×1080, 1.8MB)
├── 03-cost-analytics.png           (1920×1080, 2.1MB)
├── 04-settings-configuration.png   (1920×1080, 1.6MB)
├── 05-agent-workflow.png           (1920×1080, 2.3MB)
└── bonus-mobile-view.png           (375×812, 0.9MB)
```

---

## Accessibility Check

Ensure screenshots are accessible:
- **Color Contrast:** Text meets WCAG AA standards (4.5:1 ratio)
- **Alt Text:** Provide descriptive alt text for each screenshot (PH may not support this, but good practice)
- **Readable Fonts:** Use 14px+ font size, avoid script/decorative fonts
- **Color Blindness:** Test with tools like [Coblis](https://www.color-blindness.com/coblis-color-blindness-simulator/) to ensure charts are distinguishable

---

## Questions to Answer with Screenshots

Your screenshots should answer these questions visually:

1. **What does the product look like?** → Dashboard Overview
2. **How does it work?** → Task Detail View + Workflow
3. **Can I trust it?** → Cost Analytics (transparency)
4. **Is it configurable?** → Settings
5. **Is it complex to use?** → Clean, intuitive UI shown in all screenshots

If someone can understand your product in 30 seconds just from screenshots, you've succeeded.
