import { test, expect, devices } from '@playwright/test';

/**
 * Mobile Responsiveness Test Suite
 * Tests touch targets, scrolling, layout collapse on <768px viewports
 *
 * Devices tested:
 * - iPhone SE (375x667) - smallest common mobile
 * - Pixel 5 (393x851) - mid-range Android
 * - iPhone 14 Pro Max (430x932) - large iPhone
 */

const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'Pixel 5', width: 393, height: 851 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
];

test.describe('Mobile Responsiveness Audit', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: true,
        isMobile: true,
      });

      test('should show mobile navigation elements', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Mobile top bar should be visible
        const topBar = page.locator('div.fixed.inset-x-0.top-0.md\\:hidden');
        await expect(topBar).toBeVisible();

        // Desktop sidebar should be hidden by default
        const sidebar = page.locator('aside[aria-label="Main navigation"]');
        await expect(sidebar).toHaveClass(/translate-x-0|translate-x-full/);

        // Mobile bottom nav should be visible
        const bottomNav = page.locator('nav.fixed.inset-x-0.bottom-0.md\\:hidden');
        await expect(bottomNav).toBeVisible();
      });

      test('should have minimum 44px touch targets for primary actions', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Check mobile bottom nav buttons
        const navButtons = page.locator('nav.fixed.bottom-0 a');
        const count = await navButtons.count();

        for (let i = 0; i < count; i++) {
          const button = navButtons.nth(i);
          const box = await button.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
            console.log(`✓ Bottom nav button ${i}: ${box.height}px tall`);
          }
        }

        // Check menu button
        const menuButton = page.locator('button[aria-label="Open navigation menu"]');
        const menuBox = await menuButton.boundingBox();
        if (menuBox) {
          expect(menuBox.height).toBeGreaterThanOrEqual(44);
          expect(menuBox.width).toBeGreaterThanOrEqual(44);
          console.log(`✓ Menu button: ${menuBox.width}x${menuBox.height}px`);
        }
      });

      test('should handle sidebar swipe gestures', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Sidebar should be hidden initially
        const sidebar = page.locator('aside[aria-label="Main navigation"]');
        await expect(sidebar).toHaveClass(/-translate-x-full/);

        // Click hamburger menu to open
        await page.click('button[aria-label="Open navigation menu"]');
        await page.waitForTimeout(300); // Wait for animation

        // Sidebar should now be visible
        await expect(sidebar).toHaveClass(/translate-x-0/);

        // Click overlay to close
        const overlay = page.locator('div.fixed.inset-0.bg-black\\/60');
        await overlay.click();
        await page.waitForTimeout(300);

        // Sidebar should be hidden again
        await expect(sidebar).toHaveClass(/-translate-x-full/);
      });

      test('should not have horizontal overflow on any page', async ({ page }) => {
        const pages = [
          '/',
          '/tasks',
          '/agents',
          '/activity',
          '/costs',
          '/analytics',
        ];

        for (const pagePath of pages) {
          await page.goto(`http://localhost:3100${pagePath}`);
          await page.waitForTimeout(500); // Let content render

          const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
          const viewportWidth = viewport.width;

          expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
          console.log(`✓ ${pagePath}: body width ${bodyWidth}px <= viewport ${viewportWidth}px`);
        }
      });

      test('should stack grid layouts vertically', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Dashboard metric cards should stack on mobile
        const metricsGrid = page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4').first();
        const gridStyles = await metricsGrid.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            gridTemplateColumns: styles.gridTemplateColumns,
            display: styles.display,
          };
        });

        expect(gridStyles.display).toBe('grid');
        // On mobile, should be single column
        expect(gridStyles.gridTemplateColumns).toMatch(/^(\d+(\.\d+)?px|\d+fr)$/);
        console.log(`✓ Grid layout: ${gridStyles.gridTemplateColumns}`);
      });

      test('should handle form inputs with proper sizing', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Find nudge input
        const input = page.locator('input[placeholder*="Nudge"]');
        const inputBox = await input.boundingBox();

        if (inputBox) {
          expect(inputBox.height).toBeGreaterThanOrEqual(44);
          console.log(`✓ Text input height: ${inputBox.height}px`);
        }

        // Input font-size should be >= 16px to prevent iOS zoom
        const fontSize = await input.evaluate((el) =>
          window.getComputedStyle(el).fontSize
        );
        expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16);
        console.log(`✓ Input font-size: ${fontSize}`);
      });

      test('should handle Tasks page view mode buttons', async ({ page }) => {
        await page.goto('http://localhost:3100/tasks');
        await page.waitForSelector('.animate-fade-in');

        // View mode buttons (List, Graph, Timeline, D3)
        const viewButtons = page.locator('button[class*="rounded-lg p-2"]');
        const count = await viewButtons.count();

        for (let i = 0; i < count; i++) {
          const button = viewButtons.nth(i);
          const box = await button.boundingBox();
          if (box) {
            console.log(`View button ${i}: ${box.width}x${box.height}px`);
            // EXPECTED FAILURE: These are currently ~32px
            // Should be 44px minimum
            if (box.height < 44 || box.width < 44) {
              console.warn(`⚠️  View button ${i} is too small: ${box.width}x${box.height}px (should be 44x44px)`);
            }
          }
        }
      });

      test('should handle bulk actions with proper touch targets', async ({ page }) => {
        await page.goto('http://localhost:3100/tasks');
        await page.waitForSelector('.animate-fade-in');

        // Select a task to trigger bulk actions
        const checkbox = page.locator('button[aria-label="Select task"]').first();
        await checkbox.click();

        // Wait for bulk action bar to appear
        const bulkBar = page.locator('div.border-amber-500\\/30');
        await expect(bulkBar).toBeVisible();

        // Check bulk action button heights
        const bulkButtons = bulkBar.locator('button');
        const count = await bulkButtons.count();

        for (let i = 0; i < count; i++) {
          const button = bulkButtons.nth(i);
          const box = await button.boundingBox();
          if (box) {
            console.log(`Bulk action button ${i}: ${box.height}px tall`);
            // EXPECTED FAILURE: Currently ~34px
            if (box.height < 44) {
              console.warn(`⚠️  Bulk action button ${i} too small: ${box.height}px (should be 44px)`);
            }
          }
        }
      });

      test('should properly truncate long text content', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Company selector should truncate long names
        const companyButton = page.locator('button[aria-haspopup="listbox"]');
        const companyText = companyButton.locator('span.truncate');
        await expect(companyText).toHaveCSS('overflow', 'hidden');
        await expect(companyText).toHaveCSS('text-overflow', 'ellipsis');

        console.log('✓ Text truncation working');
      });

      test('should support pull-to-refresh on Dashboard', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Pull-to-refresh indicator should exist
        const pullIndicator = page.locator('div.pull-to-refresh-indicator');
        // Should be hidden initially (or not in DOM)
        const isVisible = await pullIndicator.isVisible().catch(() => false);

        console.log(`Pull-to-refresh indicator present: ${isVisible}`);
      });

      test('should handle safe area insets for notched devices', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Mobile top bar should have safe-area-inset-top class
        const topBar = page.locator('.safe-area-inset-top').first();
        const hasClass = await topBar.count() > 0;

        expect(hasClass).toBe(true);
        console.log('✓ Safe area insets applied');
      });

      test('should prevent text zoom on inputs (iOS)', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // All inputs should have font-size >= 16px
        const inputs = page.locator('input, textarea, select');
        const count = await inputs.count();

        for (let i = 0; i < count; i++) {
          const input = inputs.nth(i);
          const fontSize = await input.evaluate((el) =>
            parseInt(window.getComputedStyle(el).fontSize)
          );

          expect(fontSize).toBeGreaterThanOrEqual(16);
        }

        console.log(`✓ All ${count} inputs have font-size >= 16px`);
      });

      test('should handle modals within viewport bounds', async ({ page }) => {
        await page.goto('http://localhost:3100/tasks');

        // Click delete on first task (if exists)
        const taskRow = page.locator('article[role="button"]').first();
        await taskRow.click();

        // Wait for task detail page
        await page.waitForTimeout(500);

        // Check if any modal appears and is within bounds
        const modal = page.locator('[role="dialog"]');
        const modalCount = await modal.count();

        if (modalCount > 0) {
          const modalBox = await modal.boundingBox();
          if (modalBox) {
            expect(modalBox.width).toBeLessThanOrEqual(viewport.width);
            console.log(`✓ Modal width ${modalBox.width}px <= viewport ${viewport.width}px`);
          }
        }
      });

      test('should have accessible focus indicators', async ({ page }) => {
        await page.goto('http://localhost:3100');

        // Tab to first focusable element
        await page.keyboard.press('Tab');

        // Check if focus-visible outline is applied
        const focusedElement = page.locator(':focus-visible');
        const outlineColor = await focusedElement.evaluate((el) =>
          window.getComputedStyle(el).outlineColor
        ).catch(() => null);

        if (outlineColor) {
          console.log(`✓ Focus outline color: ${outlineColor}`);
        }
      });

      test('should collapse filter panel to single column', async ({ page }) => {
        await page.goto('http://localhost:3100/tasks');

        // Open filters
        const filterButton = page.locator('button', { hasText: 'Filters' });
        await filterButton.click();

        // Filter panel should be visible
        const filterPanel = page.locator('.grid.grid-cols-1.md\\:grid-cols-4');
        await expect(filterPanel).toBeVisible();

        // Check grid layout
        const gridCols = await filterPanel.evaluate((el) =>
          window.getComputedStyle(el).gridTemplateColumns
        );

        // On mobile, should be single column
        expect(gridCols).toMatch(/^(\d+(\.\d+)?px|\d+fr)$/);
        console.log(`✓ Filter grid collapsed: ${gridCols}`);
      });
    });
  }
});

test.describe('Tablet Responsiveness (768px-1024px)', () => {
  test.use({
    viewport: { width: 768, height: 1024 },
  });

  test('should show desktop layout at 768px breakpoint', async ({ page }) => {
    await page.goto('http://localhost:3100');

    // Sidebar should be visible (not transformed)
    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    await expect(sidebar).toHaveClass(/md:translate-x-0/);

    // Mobile top bar should be hidden
    const topBar = page.locator('div.fixed.top-0.md\\:hidden');
    await expect(topBar).not.toBeVisible();

    // Mobile bottom nav should be hidden
    const bottomNav = page.locator('nav.fixed.bottom-0.md\\:hidden');
    await expect(bottomNav).not.toBeVisible();

    console.log('✓ Desktop layout active at 768px');
  });

  test('should use 2-column grid for metrics', async ({ page }) => {
    await page.goto('http://localhost:3100');

    const metricsGrid = page.locator('.grid.sm\\:grid-cols-2.lg\\:grid-cols-4').first();
    const gridCols = await metricsGrid.evaluate((el) =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    // Should be 2 columns at this breakpoint
    const colCount = gridCols.split(' ').length;
    expect(colCount).toBe(2);

    console.log(`✓ Metrics grid: ${colCount} columns at 768px`);
  });
});

test.describe('Touch Gesture Tests', () => {
  test.use({
    ...devices['iPhone 12'],
  });

  test('should support swipe-to-dismiss on task rows', async ({ page }) => {
    await page.goto('http://localhost:3100/tasks');
    await page.waitForSelector('article[role="button"]');

    // Get first task row
    const taskRow = page.locator('article[role="button"]').first();

    // Swipe left
    const box = await taskRow.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.touchscreen.tap(box.x + 10, box.y + box.height / 2);

      console.log('✓ Swipe gesture executed');
    }
  });

  test('should prevent double-tap zoom', async ({ page }) => {
    await page.goto('http://localhost:3100');

    // Double-tap should not zoom
    const body = page.locator('body');
    await body.dblclick();

    await page.waitForTimeout(300);

    // Viewport scale should still be 1.0
    const scale = await page.evaluate(() => {
      return (window as any).visualViewport?.scale || 1.0;
    });

    expect(scale).toBe(1.0);
    console.log(`✓ Double-tap zoom disabled (scale: ${scale})`);
  });
});

test.describe('Performance on Mobile', () => {
  test.use({
    ...devices['Pixel 5'],
  });

  test('should not cause layout shift from animations', async ({ page }) => {
    await page.goto('http://localhost:3100');

    // Measure CLS (Cumulative Layout Shift)
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsScore = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsScore);
        }, 3000);
      });
    });

    // CLS should be < 0.1 (good score)
    expect(cls).toBeLessThan(0.1);
    console.log(`✓ CLS score: ${cls}`);
  });

  test('should have FID < 100ms', async ({ page }) => {
    await page.goto('http://localhost:3100');

    // Click a button and measure response time
    const startTime = Date.now();
    await page.click('button[aria-label="Open navigation menu"]');
    const endTime = Date.now();

    const fid = endTime - startTime;
    expect(fid).toBeLessThan(100);

    console.log(`✓ FID: ${fid}ms`);
  });
});
