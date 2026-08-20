'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

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
  const [client] = useState(() => new QueryClient());

  useEffect(() => {
    void warmSession();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
