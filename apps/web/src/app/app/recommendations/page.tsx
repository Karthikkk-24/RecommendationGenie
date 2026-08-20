'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MediaCard, type MediaCardData } from '../../../components/media/media-card';
import { FeedbackControl } from '../../../components/recommendations/feedback-control';
import { ScoreBreakdown } from '../../../components/recommendations/score-breakdown';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

type RecResponse = {
  items: Array<{
    id: string;
    explanation?: string;
    scores: {
      final: number;
      content: number;
      taste: number;
      feedback?: number;
      creator?: number;
      novelty: number;
      quality: number;
      exploration?: number;
      ai?: number | null;
    };
    media: MediaCardData;
  }>;
};

export default function RecommendationsPage() {
  const queryClient = useQueryClient();
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
  const isBusy = recs.isLoading || generate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl">For you</h1>
        <Button type="button" onClick={() => generate.mutate()} disabled={generate.isPending}>
          {generate.isPending ? 'Generating…' : items.length ? 'Refresh' : 'Generate recommendations'}
        </Button>
      </div>

      {recs.isError || generate.isError ? (
        <Card>
          <p className="text-sm text-red-400">Could not load recommendations. Try generating again.</p>
        </Card>
      ) : null}

      {isBusy && items.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">Genie is building your first batch…</p>
        </Card>
      ) : null}

      {!isBusy && items.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            No For You recommendations yet. Generate a batch to start the loop — rate what you get and Genie will
            sharpen the next one.
          </p>
          <Button type="button" onClick={() => generate.mutate()} disabled={generate.isPending}>
            Generate For You
          </Button>
        </Card>
      ) : null}

      {items.map((item) => (
        <Card key={item.id} className="grid gap-4 md:grid-cols-[160px_1fr]">
          <MediaCard item={item.media} score={item.scores.final} />
          <div>
            <p className="text-sm text-[var(--muted)]">{item.explanation}</p>
            <ScoreBreakdown scores={item.scores} className="mt-3" />
            <div className="mt-4">
              <FeedbackControl mediaItemId={item.media.id} recommendationItemId={item.id} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
