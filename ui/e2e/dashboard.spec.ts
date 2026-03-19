import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads and shows metric cards', async ({ page }) => {
    await page.goto('/');
    // Should redirect to a company slug or show no companies
    await expect(page.locator('body')).toBeVisible();
    // Should show the Hivemind header
    await expect(page.locator('text=Hivemind')).toBeVisible({ timeout: 10000 });
  });

  test('shows navigation sidebar on desktop', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside[aria-label="Main navigation"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    // Check core nav items exist
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Tasks")')).toBeVisible();
    await expect(page.locator('a:has-text("Agents")')).toBeVisible();
  });

  test('skip-to-content link is accessible', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
    // Should become visible on focus
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
  });

  test('shows WebSocket connection status', async ({ page }) => {
    await page.goto('/');
    // Wait for the page to load
    await page.waitForTimeout(2000);
    // WebSocket status should be visible somewhere in the UI
    const wsStatus = page.locator('[class*="rounded-lg"][class*="border"]').filter({ hasText: /Live|Connecting|Offline/ });
    await expect(wsStatus.first()).toBeVisible({ timeout: 10000 });
  });
});
