'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

type FeedbackRow = {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string;
  mediaItemId: string;
};

type InteractionRow = {
  id: string;
  type: string;
  createdAt: string;
  mediaItem: { id: string; title: string; type: string };
};

export default function ActivityPage() {
  const feedback = useQuery({
    queryKey: ['feedback'],
    queryFn: () => api<FeedbackRow[]>('/feedback'),
  });
  const interactions = useQuery({
    queryKey: ['interactions'],
    queryFn: () => api<InteractionRow[]>('/interactions'),
  });

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl">Activity</h1>
      <p className="text-sm text-[var(--muted)]">Recent structured feedback and raw interactions Genie logged.</p>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Feedback</h2>
        {feedback.isLoading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
        {feedback.isError ? (
          <p className="text-sm text-red-400">
            {feedback.error instanceof Error ? feedback.error.message : 'Could not load feedback.'}
          </p>
        ) : null}
        {(feedback.data ?? []).length === 0 && !feedback.isLoading && !feedback.isError ? (
          <Card>
            <p className="text-sm text-[var(--muted)]">No feedback yet.</p>
          </Card>
        ) : null}
        {(feedback.data ?? []).map((row) => (
          <Card key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">{row.action.replaceAll('_', ' ')}</span>
            <span className="text-[var(--muted)]">{row.reason?.replaceAll('_', ' ').toLowerCase() ?? '—'}</span>
            <span className="text-xs text-[var(--muted)]">{new Date(row.createdAt).toLocaleString()}</span>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Interactions</h2>
        {interactions.isLoading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
        {interactions.isError ? (
          <p className="text-sm text-red-400">
            {interactions.error instanceof Error ? interactions.error.message : 'Could not load interactions.'}
          </p>
        ) : null}
        {(interactions.data ?? []).length === 0 && !interactions.isLoading && !interactions.isError ? (
          <Card>
            <p className="text-sm text-[var(--muted)]">No interactions yet.</p>
          </Card>
        ) : null}
        {(interactions.data ?? []).map((row) => (
          <Card key={row.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">{row.mediaItem.title}</span>
            <span className="text-[var(--muted)]">{row.type}</span>
            <span className="text-xs uppercase text-[var(--muted)]">{row.mediaItem.type}</span>
            <span className="text-xs text-[var(--muted)]">{new Date(row.createdAt).toLocaleString()}</span>
          </Card>
        ))}
      </section>
    </div>
  );
}
