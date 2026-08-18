'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { MediaCard, type MediaCardData } from '../../components/media/media-card';
import { FeedbackControl } from '../../components/recommendations/feedback-control';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { api } from '../../lib/utils';

type RecResponse = {
  items: Array<{
    id: string;
    rank: number;
    explanation?: string;
    scores: { final: number; taste: number; content: number };
    media: MediaCardData;
  }>;
};

export default function DashboardPage() {
  const recs = useQuery({
    queryKey: ['recs'],
    queryFn: () => api<RecResponse>('/recommendations'),
  });
  const generate = useMutation({
    mutationFn: () => api<RecResponse>('/recommendations/generate', { method: 'POST', body: JSON.stringify({ mode: 'FOR_YOU' }) }),
  });
  const items = generate.data?.items ?? recs.data?.items ?? [];
  const hero = items[0];

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Good evening</p>
          <h1 className="mt-2 font-serif text-4xl">Genie has been thinking.</h1>
        </div>
        <Button type="button" onClick={() => generate.mutate()}>
          Refresh For You
        </Button>
      </div>
      {hero ? (
        <Card className="grid gap-6 md:grid-cols-[240px_1fr]">
          <MediaCard item={hero.media} score={hero.scores.final} />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Genie top pick</p>
            <h2 className="mt-2 font-serif text-3xl">{hero.media.title}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{hero.explanation}</p>
            <div className="mt-4">
              <FeedbackControl mediaItemId={hero.media.id} recommendationItemId={hero.id} />
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <p>Finish onboarding or generate a batch to see recommendations.</p>
        </Card>
      )}
      <section>
        <h2 className="mb-4 font-serif text-2xl">Because you loved these textures</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {items.slice(1, 8).map((item) => (
            <MediaCard key={item.id} item={item.media} score={item.scores.final} explanation={item.explanation} />
          ))}
        </div>
      </section>
    </div>
  );
}
