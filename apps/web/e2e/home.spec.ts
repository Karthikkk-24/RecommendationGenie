import { expect, test } from '@playwright/test';
import { mockProductApi, seedAuthCookies } from './mock-api';

test('register → onboard → recommendations → feedback → library', async ({ page }) => {
  await mockProductApi(page, { onboardingStatus: 'IN_PROGRESS' });

  await page.goto('/register');
  await seedAuthCookies(page);
  await page.getByPlaceholder('Name', { exact: true }).fill('E2E Tester');
  await page.getByPlaceholder('Username', { exact: true }).fill('e2e_tester');
  await page.getByPlaceholder('Email', { exact: true }).fill('e2e@example.com');
  await page.getByPlaceholder('Password (10+ characters)', { exact: true }).fill('password-long-enough');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole('heading', { name: 'Tell Genie what you love' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Arrival' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'Generate preview' }).click();
  await expect(page.getByText('Matches your love of thoughtful sci-fi.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to calibrate' }).click();
  await page.getByRole('button', { name: 'Just right' }).click();
  await page.getByRole('button', { name: 'Open For You' }).click();

  await expect(page).toHaveURL(/\/app\/recommendations/);
  await expect(page.getByRole('heading', { name: 'For you' })).toBeVisible();
  await expect(page.getByText('Matches your love of thoughtful sci-fi.')).toBeVisible();

  await page.getByRole('button', { name: 'Love it' }).click();
  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page).toHaveURL(/\/app\/library/);
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
  await expect(page.getByText('Arrival')).toBeVisible();
});

test('homepage communicates the product', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your next obsession is waiting.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Build My Taste Profile' })).toBeVisible();
});

test('discover and library routes respond under expanded mock API', async ({ page }) => {
  await mockProductApi(page);
  await seedAuthCookies(page);

  await page.goto('/app/discover');
  await page.getByRole('button', { name: 'SURPRISE ME' }).click();
  await expect(page.getByText('Arrival')).toBeVisible();

  await page.goto('/app/library');
  await expect(page.getByText('Arrival')).toBeVisible();
});
