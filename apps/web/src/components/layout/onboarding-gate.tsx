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
  }, [me.data, pathname, router]);

  if (me.isLoading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (me.data && needsEmailVerification(me.data)) {
    return <p className="text-sm text-[var(--muted)]">Redirecting to email verification…</p>;
  }

  if (me.data && me.data.onboardingStatus !== 'COMPLETED') {
    return <p className="text-sm text-[var(--muted)]">Redirecting to onboarding…</p>;
  }

  return children;
}
