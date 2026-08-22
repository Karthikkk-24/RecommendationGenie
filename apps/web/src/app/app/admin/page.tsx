'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

type Me = { role: string };
type Health = { users: number; generations: number; failedAi: number; mockMode: boolean };
type AiFailure = {
  id: string;
  requestType: string;
  errorMessage: string | null;
  createdAt: string;
};
type AlgorithmVersion = {
  id: string;
  algorithmVersion: string;
  active: boolean;
  createdAt: string;
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<Me>('/users/me'),
  });
  const health = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => api<Health>('/admin/health'),
    enabled: me.data?.role === 'ADMIN',
  });
  const failures = useQuery({
    queryKey: ['admin-ai-failures'],
    queryFn: () => api<AiFailure[]>('/admin/ai-failures'),
    enabled: me.data?.role === 'ADMIN',
  });
  const versions = useQuery({
    queryKey: ['admin-versions'],
    queryFn: () => api<AlgorithmVersion[]>('/admin/algorithm-versions'),
    enabled: me.data?.role === 'ADMIN',
  });

  const activate = useMutation({
    mutationFn: (id: string) =>
      api(`/admin/algorithm-versions/${id}/activate`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-versions'] });
    },
  });

  if (me.isLoading) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (me.data?.role !== 'ADMIN') {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-4xl">Admin</h1>
        <p className="text-sm text-[var(--muted)]">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl">Admin</h1>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Users', health.data?.users],
          ['Generations', health.data?.generations],
          ['AI failures', health.data?.failedAi],
          ['AI mock mode', health.data?.mockMode ? 'On' : 'Off'],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
            <p className="mt-2 font-serif text-4xl">{value ?? '—'}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Algorithm versions</h2>
        <div className="space-y-2">
          {(versions.data ?? []).map((row) => (
            <Card key={row.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{row.algorithmVersion}</p>
                <p className="text-xs text-[var(--muted)]">{new Date(row.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${row.active ? 'text-[var(--gold)]' : 'text-[var(--muted)]'}`}>
                  {row.active ? 'Active' : 'Inactive'}
                </span>
                {!row.active ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => activate.mutate(row.id)}
                    disabled={activate.isPending}
                  >
                    Activate
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
          {!versions.isLoading && (versions.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--muted)]">No versions seeded yet.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Recent AI failures</h2>
        <div className="space-y-2">
          {(failures.data ?? []).map((row) => (
            <Card key={row.id}>
              <p className="text-sm font-medium">{row.requestType}</p>
              <p className="mt-1 text-xs text-red-400">{row.errorMessage ?? 'Unknown error'}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{new Date(row.createdAt).toLocaleString()}</p>
            </Card>
          ))}
          {!failures.isLoading && (failures.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--muted)]">No recent AI failures.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
