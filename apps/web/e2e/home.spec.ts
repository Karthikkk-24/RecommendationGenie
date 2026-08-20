import { expect, test, type Page, type Route } from '@playwright/test';

const sampleMedia = {
  id: 'media-arrival',
  type: 'MOVIE',
  title: 'Arrival',
  posterUrl: null,
  genres: ['sci-fi'],
  qualityScore: 0.9,
};

const recItem = {
  id: 'rec-item-1',
  explanation: 'Matches your love of thoughtful sci-fi.',
  scores: {
    final: 0.86,
    content: 0.8,
    taste: 0.9,
    novelty: 0.4,
    quality: 0.9,
  },
  media: sampleMedia,
};

function ok(data: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  };
}

async function mockProductApi(page: Page) {
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '') || '/';
    const method = request.method().toUpperCase();

    if (method === 'POST' && path === '/auth/register') {
      return route.fulfill(ok({ user: { id: 'user-1', onboardingStatus: 'IN_PROGRESS' } }));
    }

    if (method === 'GET' && path === '/onboarding') {
      return route.fulfill(
        ok({
          onboardingStatus: 'IN_PROGRESS',
          preference: null,
          popular: [sampleMedia],
        }),
      );
    }

    if (
      method === 'POST' &&
      [
        '/onboarding/types',
        '/onboarding/selections',
        '/onboarding/ratings',
        '/onboarding/preferences',
      ].includes(path)
    ) {
      return route.fulfill(ok({ ok: true }));
    }

    if (method === 'POST' && path === '/onboarding/complete') {
      return route.fulfill(ok({ items: [recItem] }));
    }

    if (method === 'GET' && path === '/users/me') {
      return route.fulfill(ok({ id: 'user-1', onboardingStatus: 'COMPLETED', email: 'e2e@example.com' }));
    }

    if (method === 'GET' && path.startsWith('/recommendations')) {
      return route.fulfill(ok({ id: 'gen-1', mode: 'FOR_YOU', items: [recItem] }));
    }

    if (method === 'POST' && path === '/recommendations/generate') {
      return route.fulfill(ok({ id: 'gen-2', mode: 'FOR_YOU', items: [recItem] }));
    }

    if (method === 'POST' && path === '/feedback') {
      return route.fulfill(ok({ ok: true }));
    }

    if (method === 'GET' && path.startsWith('/library')) {
      return route.fulfill(ok([sampleMedia]));
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { message: `Unhandled mock: ${method} ${path}` } }),
    });
  });
}

test('homepage communicates the product', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your next obsession is waiting.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Build My Taste Profile' })).toBeVisible();
});

test('register → onboard → recommendations → feedback → library', async ({ page }) => {
  await mockProductApi(page);

  await page.goto('/register');
  // proxy.ts gates /onboarding and /app on session cookies before client JS runs.
  await page.context().addCookies([
    { name: 'rg_access', value: 'e2e-access-token', domain: 'localhost', path: '/' },
    { name: 'rg_refresh', value: 'e2e-refresh-token', domain: 'localhost', path: '/' },
  ]);
  await page.getByPlaceholder('Name', { exact: true }).fill('E2E Tester');
  await page.getByPlaceholder('Username', { exact: true }).fill('e2e_tester');
  await page.getByPlaceholder('Email', { exact: true }).fill('e2e@example.com');
  await page.getByPlaceholder('Password (10+ characters)', { exact: true }).fill('password-long-enough');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole('heading', { name: 'Tell Genie what you love' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('button').filter({ hasText: 'Arrival' }).click();
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
