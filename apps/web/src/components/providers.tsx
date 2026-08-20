'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { SESSION_EXPIRED_EVENT } from '../lib/utils';

async function warmSession(): Promise<void> {
  try {
    await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Best-effort: api() still refreshes on 401.
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(() => new QueryClient());

  useEffect(() => {
    void warmSession();
  }, []);

  useEffect(() => {
    const onExpired = () => {
      const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      router.replace(`/login?next=${next}`);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [router]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
