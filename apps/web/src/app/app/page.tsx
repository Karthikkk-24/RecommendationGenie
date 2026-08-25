'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MediaCard, type MediaCardData } from '../../components/media/media-card';
import { FeedbackControl } from '../../components/recommendations/feedback-control';
import { RecommendationReason } from '../../components/recommendations/recommendation-bits';
import { ScoreBreakdown } from '../../components/recommendations/score-breakdown';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { api } from '../../lib/utils';

function greetingForHour(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

type RecResponse = {
  items: Array<{
    id: string;
    rank: number;
    explanation?: string;
    reason?: string;
    scores: {
      final: number;
      taste: number;
      content: number;
      feedback?: number;
      creator?: number;
      quality?: number;
      novelty?: number;
      exploration?: number;
      ai?: number | null;
    };
    media: MediaCardData;
  }>;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ name: string | null }>('/users/me'),
  });
  const recs = useQuery({
    queryKey: ['recs'],
    queryFn: () => api<RecResponse>('/recommendations?mode=FOR_YOU'),
  });
  const generate = useMutation({
    mutationFn: () =>
      api<RecResponse>('/recommendations/generate', {
        method: 'POST',
        body: JSON.stringify({ mode: 'FOR_YOU' }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['recs'], data);
    },
  });
  const items = generate.data?.items ?? recs.data?.items ?? [];
  const hero = items[0];
  const greeting = greetingForHour(new Date().getHours());
  const displayName = me.data?.name?.trim();

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
            {displayName ? `${greeting}, ${displayName}` : greeting}
          </p>
          <h1 className="mt-2 font-serif text-4xl">Genie has been thinking.</h1>
        </div>
        <Button type="button" onClick={() => generate.mutate()} disabled={generate.isPending || recs.isFetching}>
          {generate.isPending ? 'Refreshing…' : 'Refresh For You'}
        </Button>
      </div>
      {recs.isError || generate.isError ? (
        <p className="text-sm text-red-400">
          {(generate.error ?? recs.error) instanceof Error
            ? (generate.error ?? recs.error)!.message
            : 'Could not load recommendations. Try refreshing.'}
        </p>
      ) : null}
      {recs.isPending && !hero ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">Loading your For You picks…</p>
        </Card>
      ) : hero ? (
        <Card className="grid gap-6 md:grid-cols-[240px_1fr]">
          <MediaCard item={hero.media} score={hero.scores.final} />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Genie top pick</p>
            <h2 className="mt-2 font-serif text-3xl">{hero.media.title}</h2>
            {hero.reason ? <RecommendationReason text={hero.reason} className="mt-3" /> : null}
            {hero.explanation ? <p className="mt-2 text-sm text-[var(--muted)]">{hero.explanation}</p> : null}
            <ScoreBreakdown scores={hero.scores} className="mt-3" />
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
            <div key={item.id} className="min-w-[180px]">
              <MediaCard item={item.media} score={item.scores.final} explanation={item.explanation} />
              {item.reason ? <RecommendationReason text={item.reason} className="mt-2" /> : null}
              <ScoreBreakdown scores={item.scores} showHeadline={false} className="mt-2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
