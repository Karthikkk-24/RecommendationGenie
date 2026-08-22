import { expect, test } from '@playwright/test';
import { mockProductApi, seedAuthCookies } from './mock-api';

test('forgot password shows confirmation', async ({ page }) => {
  await mockProductApi(page);
  await page.goto('/forgot-password');
  await page.getByPlaceholder('Email').fill('e2e@example.com');
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible();
});

test('reset password requires token in URL', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByRole('heading', { name: 'Invalid reset link' })).toBeVisible();
});

test('reset password with token submits', async ({ page }) => {
  await mockProductApi(page);
  await page.goto('/reset-password?token=test-token');
  await page.getByPlaceholder('New password').fill('new-password-long');
  await page.getByRole('button', { name: /update password/i }).click();
  await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();
});

test('verify email page loads for pending users', async ({ page }) => {
  await mockProductApi(page);
  await seedAuthCookies(page);
  await page.goto('/verify-email?pending=1');
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
});

test('settings logout returns home', async ({ page }) => {
  await mockProductApi(page);
  await seedAuthCookies(page);
  await page.goto('/app/settings');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/');
});
