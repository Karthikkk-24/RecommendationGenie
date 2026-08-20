'use client';

import { useQuery } from '@tanstack/react-query';
import { MediaCard, type MediaCardData } from '../../../components/media/media-card';
import { ScoreBreakdown } from '../../../components/recommendations/score-breakdown';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

type HistoryRow = {
  id: string;
  createdAt: string;
  mode: string;
  algorithmVersion: string;
  items: Array<{
    id: string;
    explanation?: string;
    scores: {
      final: number;
      content: number;
      taste: number;
      feedback: number;
      creator: number;
      quality: number;
      novelty: number;
      exploration?: number;
      ai: number | null;
    };
    media: MediaCardData;
  }>;
};

export default function HistoryPage() {
  const history = useQuery({
    queryKey: ['history'],
    queryFn: () => api<HistoryRow[]>('/recommendations/history'),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Recommendation history</h1>
      <p className="text-[var(--muted)]">
        Match percentages are the stored component scores from that generation — never invented after the fact.
      </p>
      {history.data?.map((generation) => (
        <Card key={generation.id}>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
            {generation.mode} · {generation.algorithmVersion} · {new Date(generation.createdAt).toLocaleString()}
          </p>
          <div className="mt-4 flex gap-4 overflow-x-auto">
            {generation.items.map((item) => (
              <div key={item.id} className="min-w-[160px]">
                <MediaCard item={item.media} score={item.scores.final} />
                <ScoreBreakdown scores={item.scores} className="mt-2" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
