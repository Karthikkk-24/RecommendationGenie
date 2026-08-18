'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

export default function AnalyticsPage() {
  const overview = useQuery({
    queryKey: ['analytics'],
    queryFn: () =>
      api<{
        likeRate: number;
        dislikeRate: number;
        saveRate: number;
        skipRate: number;
        acceptanceRate: number;
        totals: { likes: number; dislikes: number; saves: number; skips: number; impressions: number };
      }>('/analytics/overview'),
  });

  const data = overview.data;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Analytics</h1>
      <p className="text-[var(--muted)]">Rates come from events Genie logs when you interact with recommendations.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Acceptance', data?.acceptanceRate],
          ['Like rate', data?.likeRate],
          ['Save rate', data?.saveRate],
          ['Skip rate', data?.skipRate],
          ['Dislike rate', data?.dislikeRate],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
            <p className="mt-2 font-serif text-4xl">{Math.round(((value as number) ?? 0) * 100)}%</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
