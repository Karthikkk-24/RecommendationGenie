'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { api, needsEmailVerification } from '../../lib/utils';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{
        onboardingStatus: string;
        emailVerifiedAt: string | null;
        email: string;
        emailVerificationRequired: boolean;
      }>('/users/me'),
  });

  useEffect(() => {
    if (me.isError || (!me.isLoading && !me.data)) {
      const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      router.replace(`/login?next=${next}`);
      return;
    }
    if (!me.data) {
      return;
    }
    if (needsEmailVerification(me.data)) {
      router.replace(`/verify-email?pending=1&email=${encodeURIComponent(me.data.email)}`);
      return;
    }
    if (me.data.onboardingStatus !== 'COMPLETED' && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding');
    }
  }, [me.data, me.isError, me.isLoading, pathname, router]);

  if (me.isLoading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (me.isError || !me.data) {
    return <p className="text-sm text-[var(--muted)]">Redirecting to login…</p>;
  }

  if (needsEmailVerification(me.data)) {
    return <p className="text-sm text-[var(--muted)]">Redirecting to email verification…</p>;
  }

  if (me.data.onboardingStatus !== 'COMPLETED') {
    return <p className="text-sm text-[var(--muted)]">Redirecting to onboarding…</p>;
  }

  return children;
}
