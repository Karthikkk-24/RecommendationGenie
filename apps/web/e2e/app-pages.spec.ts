import { expect, test } from '@playwright/test';
import { mockProductApi, seedAuthCookies } from './mock-api';

test.describe('app pages with mocked API', () => {
  test.beforeEach(async ({ page }) => {
    await page.unroute('**/api/**');
    await mockProductApi(page, { role: 'ADMIN' });
    await seedAuthCookies(page);
  });

  test('discover generates recommendations', async ({ page }) => {
    await page.goto('/app/discover');
    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();
    await page.getByRole('button', { name: 'HIDDEN GEMS' }).click();
    await expect(page.getByText('Matches your love of thoughtful sci-fi.')).toBeVisible();
  });

  test('taste page shows DNA heading', async ({ page }) => {
    await page.goto('/app/taste');
    await expect(page.getByRole('heading', { name: 'Taste DNA' })).toBeVisible();
  });

  test('analytics page shows totals', async ({ page }) => {
    await page.goto('/app/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    await expect(page.getByText('Likes', { exact: true })).toBeVisible();
    await expect(page.getByText('5', { exact: true }).first()).toBeVisible();
  });

  test('admin page shows health for admin role', async ({ page }) => {
    await page.goto('/app/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    await expect(page.getByText(/users/i)).toBeVisible();
  });

  test('media detail page loads title', async ({ page }) => {
    await page.goto('/media/media-arrival');
    await expect(page.getByRole('heading', { name: 'Arrival' })).toBeVisible({ timeout: 15_000 });
  });

  test('activity page loads', async ({ page }) => {
    await page.goto('/app/activity');
    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();
  });
});
