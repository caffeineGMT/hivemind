# Accessibility Quick Test Guide

This guide provides manual testing steps to verify WCAG 2.1 AA compliance.

## 🧪 Quick Tests (5 minutes)

### 1. Keyboard Navigation Test
**Time: 2 minutes**

1. Open http://localhost:3100
2. Press `Tab` repeatedly
3. Verify:
   - ✅ First focus is on "Skip to main content" link
   - ✅ All interactive elements are focusable (buttons, links, cards)
   - ✅ Focus indicator is visible (2px amber outline)
   - ✅ Tab order is logical (top to bottom, left to right)
4. Press `Enter` on skip link
5. Verify: Focus jumps to main content area
6. Navigate to a task card
7. Press `Enter` or `Space`
8. Verify: Task opens (keyboard activation works)

**Expected Result:** All interactive elements keyboard accessible ✅

---

### 2. Screen Reader Test (VoiceOver - macOS only)
**Time: 2 minutes**

1. Enable VoiceOver: `Cmd + F5`
2. Navigate with `VO + Right Arrow`
3. Listen for announcements:
   - ✅ "Skip to main content, link"
   - ✅ "Agent: CEO Agent, role: ceo, status: running"
   - ✅ "Task: Build landing page, in progress, high priority"
   - ✅ "Status: Running, status, polite live region"
   - ✅ "Connected, latency: 45ms, status"
4. Navigate to a button
5. Press `VO + Space`
6. Verify: Button activates

**Expected Result:** All content announced correctly ✅

---

### 3. Focus Indicator Test
**Time: 1 minute**

1. Tab through the page
2. Look for visual focus indicator on each element
3. Verify:
   - ✅ 2px solid amber outline
   - ✅ 2px offset from element
   - ✅ Visible on all backgrounds (dark/light)

**Expected Result:** Focus always visible ✅

---

### 4. Color Contrast Test (Browser DevTools)
**Time: 1 minute**

1. Right-click any text element
2. Select "Inspect"
3. Open "Accessibility" panel (in DevTools)
4. Check "Contrast ratio" section
5. Verify: Shows "AA ✅" (4.5:1 minimum)

Test these text combinations:
- Primary text (zinc-100 on zinc-950): ~17.8:1 ✅
- Secondary text (zinc-400 on zinc-950): ~8.2:1 ✅
- Links (amber-500 on zinc-950): ~8.9:1 ✅

**Expected Result:** All text meets WCAG AA ✅

---

## 🔬 Automated Testing

### Lighthouse Audit
**Time: 2 minutes**

```bash
# Build the app
cd ui
npm run build
npm run preview

# Open Chrome DevTools (F12)
# Go to "Lighthouse" tab
# Select "Accessibility" only
# Click "Generate report"
```

**Expected Score:** > 95 ✅

---

### axe DevTools Browser Extension
**Time: 2 minutes**

1. Install: [axe DevTools](https://www.deque.com/axe/devtools/)
2. Open http://localhost:3100
3. Open DevTools (F12)
4. Go to "axe DevTools" tab
5. Click "Scan ALL of my page"

**Expected Result:** 0 violations, 0 critical issues ✅

---

### Browser Console Test
**Time: 1 minute**

1. Open http://localhost:3100
2. Open Console (F12)
3. Paste and run:

```javascript
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.8.0/axe.min.js';
document.head.appendChild(script);
script.onload = () => {
  axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
  }).then(results => {
    console.log('Violations:', results.violations.length);
    console.log('Passes:', results.passes.length);
    if (results.violations.length === 0) {
      console.log('✅ WCAG 2.1 AA Compliant!');
    } else {
      console.log('❌ Found violations:', results.violations);
    }
  });
};
```

**Expected Output:**
```
Violations: 0
Passes: 50+
✅ WCAG 2.1 AA Compliant!
```

---

## 📱 Mobile Accessibility

### Touch Target Test
1. Open http://localhost:3100 on mobile device
2. Try tapping buttons with thumb
3. Verify: All buttons are at least 44x44px

### Mobile Screen Reader (iOS VoiceOver)
1. Settings → Accessibility → VoiceOver → On
2. Swipe right to navigate
3. Double-tap to activate

---

## 🐛 Known Issues

None! All components are WCAG 2.1 AA compliant.

---

## 📊 Compliance Summary

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.1.1 Non-text Content | ✅ | Icons marked aria-hidden |
| 1.3.1 Info and Relationships | ✅ | Semantic HTML + ARIA |
| 1.4.3 Contrast (Minimum) | ✅ | 4.5:1+ for all text |
| 2.1.1 Keyboard | ✅ | All interactive elements |
| 2.1.2 No Keyboard Trap | ✅ | ESC works in modals |
| 2.4.1 Bypass Blocks | ✅ | Skip-to-content link |
| 2.4.7 Focus Visible | ✅ | 2px amber outline |
| 4.1.2 Name, Role, Value | ✅ | ARIA labels everywhere |
| 4.1.3 Status Messages | ✅ | aria-live on dynamic content |

**Overall Compliance: WCAG 2.1 AA ✅**

---

**Last Updated:** 2026-03-19
