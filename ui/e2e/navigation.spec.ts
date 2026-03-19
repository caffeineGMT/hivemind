import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navigates between pages without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Navigate to Tasks
    await page.click('a:has-text("Tasks")');
    await expect(page.locator('body')).toBeVisible();

    // Navigate to Agents
    await page.click('a:has-text("Agents")');
    await expect(page.locator('body')).toBeVisible();

    // Navigate to Activity
    await page.click('a:has-text("Activity")');
    await expect(page.locator('body')).toBeVisible();

    // Navigate back to Dashboard
    await page.click('a:has-text("Dashboard")');
    await expect(page.locator('body')).toBeVisible();
  });

  test('company selector dropdown works', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const companyButton = page.locator('button[aria-label*="Select company"]');
    if (await companyButton.isVisible()) {
      await companyButton.click();
      await expect(companyButton).toHaveAttribute('aria-expanded', 'true');
      // Click elsewhere to close
      await page.click('body', { position: { x: 0, y: 0 } });
    }
  });

  test('error boundary catches route errors gracefully', async ({ page }) => {
    // Navigate to a non-existent route
    await page.goto('/nonexistent-company/nonexistent-page');
    // Should either redirect or show error UI, not crash
    await expect(page.locator('body')).toBeVisible();
    // Should not show raw error stack
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('TypeError');
    expect(body).not.toContain('Cannot read properties');
  });
});

test.describe('Keyboard Navigation', () => {
  test('tab key navigates through interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Tab through the page - should have focus visible styles
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus-visible');
    await expect(focused).toBeVisible({ timeout: 5000 });
  });
});
