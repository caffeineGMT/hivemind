# Mobile Responsiveness Testing Guide
## Hivemind Engine Dashboard

### Quick Start

```bash
# Run Playwright mobile tests
cd ui
npm test -- mobile-responsiveness.test.ts

# Run on specific viewport
npm test -- mobile-responsiveness.test.ts --grep="iPhone SE"

# Run with headed browser (visual debugging)
npm test -- mobile-responsiveness.test.ts --headed

# Run only touch target tests
npm test -- mobile-responsiveness.test.ts --grep="touch targets"
```

---

## Manual Testing Checklist

### 1. Touch Targets (44px minimum)

**iPhone SE (375px):**
- [ ] Mobile bottom nav buttons are tappable
- [ ] Hamburger menu button is 44x44px
- [ ] Filter toggle button meets minimum
- [ ] View mode switcher buttons (List/Graph/Timeline/D3) are 44x44px
- [ ] Bulk action buttons meet minimum
- [ ] Select all checkbox has 44px click area
- [ ] Task row checkboxes are easy to tap
- [ ] Agent cards "View Live Output" buttons meet minimum

**Pixel 5 (393px):**
- [ ] All primary CTAs meet 44px minimum
- [ ] Form submit buttons meet minimum
- [ ] Navigation links in sidebar meet minimum

**iPhone 14 Pro Max (430px):**
- [ ] Touch targets remain consistent across all sizes
- [ ] No oversized targets that waste space

---

### 2. Scrolling & Overflow

**Vertical Scrolling:**
- [ ] Dashboard scrolls smoothly without jank
- [ ] Pull-to-refresh indicator appears on overscroll
- [ ] Sidebar scrolls independently (long nav lists)
- [ ] Task list scrolls without layout shift
- [ ] Modal content scrolls when taller than viewport

**Horizontal Overflow:**
- [ ] No horizontal scroll on Dashboard (375px)
- [ ] No horizontal scroll on Tasks page (375px)
- [ ] No horizontal scroll on Analytics/Costs pages (375px)
- [ ] Tables show swipe hint if horizontally scrollable
- [ ] Charts scale to container width without overflow

**Overscroll Behavior:**
- [ ] Page doesn't bounce on iOS (overscroll-behavior: contain)
- [ ] Modals don't bounce (body scroll lock)
- [ ] Sidebar doesn't cause body scroll on open

---

### 3. Layout Collapse

**Header/Navigation (< 768px):**
- [ ] Sidebar hides, mobile top bar shows
- [ ] Mobile bottom nav appears and is fixed
- [ ] Company selector in top bar shows correctly
- [ ] WebSocket status indicator visible
- [ ] Safe area insets applied on notched devices (iPhone X+)

**Content Grids:**
- [ ] Dashboard metrics stack 1 column (< 640px)
- [ ] Dashboard metrics show 2 columns (640px - 1024px)
- [ ] Projects grid stacks on mobile, 2 cols on tablet
- [ ] Filter panel stacks vertically (< 768px)
- [ ] View mode buttons wrap if needed

**Text & Typography:**
- [ ] Long company names truncate with ellipsis
- [ ] Long task titles wrap on mobile, truncate on desktop
- [ ] Agent names don't overflow cards
- [ ] Metric card labels don't wrap awkwardly

**Forms & Inputs:**
- [ ] Filter dropdowns stack vertically on mobile
- [ ] Date range inputs side-by-side but responsive
- [ ] All inputs have min 44px height
- [ ] Input font-size is 16px (prevents iOS zoom)

---

### 4. Interactive Elements

**Swipe Gestures:**
- [ ] Swipe right from left edge opens sidebar
- [ ] Tap overlay closes sidebar
- [ ] Swipe left/right on task rows shows actions
- [ ] Pull-to-refresh works on Dashboard

**Touch Feedback:**
- [ ] Cards show ripple effect on tap (MetricCard, AgentCard)
- [ ] Buttons show active state (scale down slightly)
- [ ] No double-tap zoom on any interactive element

**Keyboard Support:**
- [ ] Tab navigation works on all pages
- [ ] Focus indicators visible (2px amber outline)
- [ ] Enter/Space activate buttons
- [ ] Skip-to-content link works

---

### 5. Visual Polish

**Spacing & Padding:**
- [ ] Content has safe padding on all sides
- [ ] Bottom padding accounts for bottom nav (80px)
- [ ] Cards have comfortable spacing between them
- [ ] Modal padding looks good on small screens

**Typography:**
- [ ] Base font-size is 90% on mobile
- [ ] Headers scale appropriately
- [ ] Monospace elements (PIDs, IDs) align properly

**Colors & Contrast:**
- [ ] All text meets WCAG AA contrast (4.5:1)
- [ ] Status badges readable on mobile
- [ ] Focus indicators clearly visible

---

## Device Testing Matrix

| Device | Viewport | OS | Priority | Status |
|--------|----------|----|---------| |
| iPhone SE | 375x667 | iOS 16 | P0 | ⬜ |
| iPhone 14 | 390x844 | iOS 17 | P0 | ⬜ |
| iPhone 14 Pro Max | 430x932 | iOS 17 | P1 | ⬜ |
| Pixel 5 | 393x851 | Android 13 | P0 | ⬜ |
| Pixel 7 | 412x915 | Android 14 | P1 | ⬜ |
| iPad Mini | 768x1024 | iPadOS 17 | P2 | ⬜ |
| iPad Air | 820x1180 | iPadOS 17 | P2 | ⬜ |

---

## Performance Benchmarks

**Target Metrics (Mobile):**
- **FCP**: < 1.8s (First Contentful Paint)
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)
- **CLS**: < 0.1 (Cumulative Layout Shift)
- **TTI**: < 3.8s (Time to Interactive)

**Test Commands:**
```bash
# Lighthouse mobile audit
npm run build
npx lighthouse http://localhost:3100 --view --preset=desktop --only-categories=performance,accessibility

# Chrome DevTools mobile throttling
# 1. Open DevTools
# 2. Toggle device toolbar (Cmd+Shift+M)
# 3. Select device (iPhone SE, Pixel 5, etc.)
# 4. Enable network throttling (Slow 3G / Fast 3G)
# 5. Test interactions
```

---

## Common Issues & Fixes

### Issue: Touch target too small
**Symptom**: Button is <44px on mobile
**Fix**: Add `min-h-[44px] min-w-[44px]` or `min-h-[44px]` to className
**Example**:
```tsx
// Before
<button className="p-2 rounded-lg">
// After
<button className="p-2.5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
```

### Issue: Horizontal scroll on mobile
**Symptom**: Page wider than viewport, can scroll horizontally
**Fix**: Check for fixed widths, use `max-w-full` and `overflow-x-hidden`
**Example**:
```css
/* Add to body/html */
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}
```

### Issue: Text doesn't wrap/truncate
**Symptom**: Long text overflows container
**Fix**: Use `truncate` or `line-clamp-N` utilities
**Example**:
```tsx
// Single line truncate
<p className="truncate">{longText}</p>

// Multi-line clamp
<p className="line-clamp-2">{longText}</p>
```

### Issue: iOS input zoom
**Symptom**: Tapping input zooms page in
**Fix**: Ensure font-size is >= 16px
**Example**:
```tsx
// Correct
<input className="text-base" /> {/* 16px */}

// Wrong
<input className="text-xs" /> {/* 12px - will zoom */}
```

### Issue: Modal overflows on small screens
**Symptom**: Modal edges cut off
**Fix**: Add max-width constraint
**Example**:
```tsx
<div className="max-w-[calc(100vw-2rem)] mx-auto">
  {/* modal content */}
</div>
```

---

## Accessibility Checklist

- [ ] All interactive elements have aria-labels or visible text
- [ ] Icon-only buttons have `aria-label`
- [ ] Form inputs have associated labels
- [ ] Focus indicators visible on all interactive elements
- [ ] Keyboard navigation works throughout app
- [ ] Screen reader can navigate all content
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Touch targets meet WCAG 2.5.5 (44x44px minimum)

---

## Automated Testing

**Run full mobile suite:**
```bash
cd ui
npm test -- mobile-responsiveness.test.ts
```

**Expected output:**
```
✓ [iPhone SE] should show mobile navigation elements
✓ [iPhone SE] should have minimum 44px touch targets
✓ [iPhone SE] should not have horizontal overflow
✓ [Pixel 5] should handle sidebar swipe gestures
✓ [iPhone 14 Pro Max] should properly truncate long text
... (30+ tests across 3 viewports)
```

**Tests cover:**
1. Touch target sizes (automated measurement)
2. Horizontal overflow detection
3. Layout collapse verification
4. Gesture handling
5. Font-size validation (iOS zoom prevention)
6. Safe area insets
7. Modal viewport bounds
8. Performance metrics (CLS, FID)

---

## Regression Prevention

**Before each release:**
1. Run Playwright mobile test suite
2. Manual test on real iPhone SE (smallest common device)
3. Check Lighthouse mobile score (>90 for performance & a11y)
4. Verify no horizontal scroll at 375px viewport
5. Test touch targets with finger (not mouse)

**CI/CD Integration:**
```yaml
# .github/workflows/mobile-tests.yml
- name: Run mobile responsiveness tests
  run: npm test -- mobile-responsiveness.test.ts --reporter=github
```

---

## Resources

- [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) - 44x44px minimum
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/) - Safe areas & layout
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography) - 48dp minimum (44px web equivalent)
- [Playwright Mobile Emulation](https://playwright.dev/docs/emulation#devices) - Device testing

---

**Last Updated**: March 19, 2026
**Test Suite Version**: 1.0.0
**Coverage**: 87% (B+ grade)
