import type { Page, Route } from '@playwright/test';

export const sampleMedia = {
  id: 'media-arrival',
  type: 'MOVIE',
  title: 'Arrival',
  posterUrl: null,
  genres: ['sci-fi'],
  qualityScore: 0.9,
};

export const recItem = {
  id: 'rec-item-1',
  explanation: 'Matches your love of thoughtful sci-fi.',
  reason: 'Strong sci-fi taste alignment',
  scores: {
    final: 0.86,
    content: 0.8,
    taste: 0.9,
    novelty: 0.4,
    quality: 0.9,
  },
  media: sampleMedia,
};

export function ok(data: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  };
}

export async function mockProductApi(page: Page, options?: { role?: string; onboardingStatus?: string }) {
  const role = options?.role ?? 'USER';
  const onboardingStatus = options?.onboardingStatus ?? 'COMPLETED';

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '') || '/';
    const method = request.method().toUpperCase();

    if (method === 'POST' && path === '/auth/register') {
      return route.fulfill(ok({ user: { id: 'user-1', onboardingStatus: 'IN_PROGRESS' } }));
    }
    if (method === 'POST' && path === '/auth/login') {
      return route.fulfill(ok({ user: { id: 'user-1', onboardingStatus, email: 'e2e@example.com' } }));
    }
    if (method === 'POST' && path === '/auth/logout') {
      return route.fulfill(ok({ ok: true }));
    }
    if (method === 'POST' && path === '/auth/forgot-password') {
      return route.fulfill(ok({ ok: true }));
    }
    if (method === 'POST' && path === '/auth/reset-password') {
      return route.fulfill(ok({ ok: true }));
    }
    if (method === 'POST' && path === '/auth/verify-email') {
      return route.fulfill(ok({ ok: true }));
    }
    if (method === 'POST' && path === '/auth/resend-verification') {
      return route.fulfill(ok({ ok: true }));
    }

    if (method === 'GET' && path === '/onboarding') {
      return route.fulfill(
        ok({
          onboardingStatus,
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
        '/onboarding/calibrate',
      ].includes(path)
    ) {
      return route.fulfill(ok({ ok: true }));
    }

    if (method === 'POST' && path === '/onboarding/complete') {
      return route.fulfill(ok({ items: [recItem] }));
    }

    if (method === 'GET' && path === '/users/me') {
      return route.fulfill(
        ok({
          id: 'user-1',
          onboardingStatus,
          email: 'e2e@example.com',
          name: 'E2E Tester',
          role,
        }),
      );
    }

    if (method === 'GET' && path.startsWith('/recommendations')) {
      const mode = url.searchParams.get('mode') ?? 'FOR_YOU';
      return route.fulfill(ok({ id: 'gen-1', mode, items: [recItem] }));
    }

    if (method === 'POST' && path === '/recommendations/generate') {
      return route.fulfill(ok({ id: 'gen-2', mode: 'HIDDEN_GEMS', items: [recItem] }));
    }

    if (method === 'POST' && path === '/feedback') {
      return route.fulfill(ok({ ok: true }));
    }

    if (method === 'GET' && path === '/feedback') {
      return route.fulfill(ok([]));
    }

    if (method === 'GET' && path === '/interactions') {
      return route.fulfill(ok([]));
    }

    if (method === 'GET' && path.startsWith('/library')) {
      return route.fulfill(ok([sampleMedia]));
    }

    if (method === 'GET' && path === '/taste-profile') {
      return route.fulfill(
        ok({
          profile: { complexity: 0.2, darkness: 0.1, novelty: 0.5, pacing: 0.3, mainstreamVsNiche: 0.4 },
          features: [{ featureKey: 'sci-fi', weight: 0.8, featureType: 'GENRE' }],
        }),
      );
    }

    if (method === 'GET' && path === '/analytics/overview') {
      return route.fulfill(
        ok({
          likeRate: 0.5,
          dislikeRate: 0.1,
          saveRate: 0.2,
          skipRate: 0.1,
          acceptanceRate: 0.6,
          totals: { likes: 5, dislikes: 1, saves: 2, skips: 1, impressions: 10 },
        }),
      );
    }

    if (method === 'GET' && path === '/admin/health') {
      return route.fulfill(ok({ users: 1, generations: 2, failedAi: 0, mockMode: false }));
    }

    if (method === 'GET' && path === '/admin/algorithm-versions') {
      return route.fulfill(ok([{ id: 'cfg-1', algorithmVersion: 'v1', active: true, weights: {} }]));
    }

    if (method === 'GET' && path.startsWith('/media/')) {
      return route.fulfill(
        ok({
          id: sampleMedia.id,
          title: sampleMedia.title,
          description: 'First contact linguistics.',
          posterUrl: null,
          genres: sampleMedia.genres,
          tags: [],
          creators: ['Denis Villeneuve'],
          type: 'MOVIE',
          releaseDate: null,
        }),
      );
    }

    if (method === 'GET' && path.startsWith('/search')) {
      return route.fulfill(ok({ movies: [sampleMedia], games: [], music: [], tvShows: [], page: 1, hasMore: false }));
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { message: `Unhandled mock: ${method} ${path}` } }),
    });
  });
}

export async function seedAuthCookies(page: Page) {
  await page.context().addCookies([
    { name: 'rg_access', value: 'e2e-access-token', domain: 'localhost', path: '/' },
    { name: 'rg_refresh', value: 'e2e-refresh-token', domain: 'localhost', path: '/' },
  ]);
}
