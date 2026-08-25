'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { MediaCard, type MediaCardData } from '../../../../components/media/media-card';
import { FeedbackControl } from '../../../../components/recommendations/feedback-control';
import { RecommendationReason } from '../../../../components/recommendations/recommendation-bits';
import { ScoreBreakdown } from '../../../../components/recommendations/score-breakdown';
import { Card } from '../../../../components/ui/card';
import { api } from '../../../../lib/utils';
import { explanationRefetchInterval } from '../../../../lib/explanation-refresh';

type GenerationDetail = {
  id: string;
  mode: string;
  algorithmVersion: string;
  createdAt: string;
  items: Array<{
    id: string;
    rank: number;
    explanation?: string;
    reason?: string;
    media: MediaCardData;
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
  }>;
};

export default function RecommendationDetailPage() {
  const params = useParams<{ id: string }>();
  const generation = useQuery({
    queryKey: ['recommendation', params.id],
    enabled: Boolean(params.id),
    queryFn: () => api<GenerationDetail>(`/recommendations/${params.id}`),
    refetchInterval: (query) => explanationRefetchInterval(query.state.data?.items),
  });

  if (generation.isPending) {
    return <p className="text-[var(--muted)]">Loading batch…</p>;
  }

  if (generation.isError || !generation.data) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">Could not load this recommendation batch.</p>
        <Link href="/app/history" className="text-sm text-[var(--gold)] hover:underline">
          Back to history
        </Link>
      </div>
    );
  }

  const data = generation.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/history" className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
          ← History
        </Link>
        <h1 className="mt-2 font-serif text-4xl">{data.mode.replaceAll('_', ' ')}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
          {data.algorithmVersion} · {new Date(data.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="space-y-4">
        {data.items.map((item) => (
          <Card key={item.id} className="grid gap-4 md:grid-cols-[160px_1fr]">
            <MediaCard item={item.media} score={item.scores.final} />
            <div>
              <p className="text-xs text-[var(--muted)]">Rank #{item.rank}</p>
              {item.reason ? <RecommendationReason text={item.reason} className="mt-2" /> : null}
              {item.explanation ? <p className="mt-2 text-sm text-[var(--muted)]">{item.explanation}</p> : null}
              <ScoreBreakdown scores={item.scores} className="mt-3" />
              <div className="mt-4">
                <FeedbackControl mediaItemId={item.media.id} recommendationItemId={item.id} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
