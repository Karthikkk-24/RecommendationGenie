export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = (await response.json()) as { success: boolean; data?: T; error?: { message: string } };
  if (!response.ok || json.success === false) {
    throw new Error(json.error?.message ?? 'Request failed');
  }
  return (json.data ?? json) as T;
}
