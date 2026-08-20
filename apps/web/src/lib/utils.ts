export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message: string; code?: string } };

export const SESSION_EXPIRED_EVENT = 'rg:session-expired';

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function shouldAttemptRefresh(path: string, status: number): boolean {
  if (status !== 401) {
    return false;
  }
  return !path.startsWith('/auth/login') && !path.startsWith('/auth/register') && path !== '/auth/refresh';
}

function notifySessionExpired(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const request = async (): Promise<Response> =>
    fetch(`/api${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

  let response = await request();

  if (shouldAttemptRefresh(path, response.status)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await request();
    } else {
      notifySessionExpired();
      throw new Error('Session expired');
    }
  }

  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || json.success === false) {
    throw new Error(json.error?.message ?? 'Request failed');
  }
  return (json.data ?? json) as T;
}
