'use client';

import { useQuery } from '@tanstack/react-query';
import { MediaCard, type MediaCardData } from '../../../components/media/media-card';
import { FeedbackControl } from '../../../components/recommendations/feedback-control';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

export default function RecommendationsPage() {
  const recs = useQuery({
    queryKey: ['recs'],
    queryFn: () =>
      api<{
        items: Array<{
          id: string;
          explanation?: string;
          scores: { final: number; content: number; taste: number; novelty: number; quality: number };
          media: MediaCardData;
        }>;
      }>('/recommendations'),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">For you</h1>
      {recs.data?.items.map((item) => (
        <Card key={item.id} className="grid gap-4 md:grid-cols-[160px_1fr]">
          <MediaCard item={item.media} score={item.scores.final} />
          <div>
            <p className="text-sm text-[var(--muted)]">{item.explanation}</p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Content {Math.round(item.scores.content * 100)}% · Taste {Math.round(item.scores.taste * 100)}% · Quality{' '}
              {Math.round(item.scores.quality * 100)}% · Novelty {Math.round(item.scores.novelty * 100)}%
            </p>
            <div className="mt-4">
              <FeedbackControl mediaItemId={item.media.id} recommendationItemId={item.id} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
