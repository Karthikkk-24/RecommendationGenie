'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MediaCard, type MediaCardData } from '../../../components/media/media-card';
import { RecommendationReason } from '../../../components/recommendations/recommendation-bits';
import { ScoreBreakdown } from '../../../components/recommendations/score-breakdown';
import { Button } from '../../../components/ui/button';
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
    reason?: string;
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

type HistoryResponse = {
  items: HistoryRow[];
  nextCursor: string | null;
};

export default function HistoryPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [generations, setGenerations] = useState<HistoryRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const history = useQuery({
    queryKey: ['history', cursor ?? 'initial'],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '10' });
      if (cursor) {
        params.set('cursor', cursor);
      }
      return api<HistoryResponse>(`/recommendations/history?${params.toString()}`);
    },
  });

  useEffect(() => {
    if (!history.data) {
      return;
    }
    if (cursor) {
      setGenerations((current) => [...current, ...history.data.items]);
    } else {
      setGenerations(history.data.items);
    }
    setNextCursor(history.data.nextCursor);
  }, [history.data, cursor]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Recommendation history</h1>
      <p className="text-[var(--muted)]">
        Match percentages are the stored component scores from that generation — never invented after the fact.
      </p>
      {history.isPending && generations.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Loading history…</p>
      ) : null}
      {history.isError ? (
        <p className="text-sm text-red-400">
          {history.error instanceof Error ? history.error.message : 'Could not load recommendation history.'}
        </p>
      ) : null}
      {!history.isPending && !history.isError && generations.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No recommendation batches yet. Generate a For You list to start.</p>
      ) : null}
      {generations.map((generation) => (
        <Card key={generation.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
              {generation.mode} · {generation.algorithmVersion} · {new Date(generation.createdAt).toLocaleString()}
            </p>
            <Link href={`/app/recommendations/${generation.id}`} className="text-xs text-[var(--gold)] hover:underline">
              View batch
            </Link>
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto">
            {generation.items.map((item) => (
              <div key={item.id} className="min-w-[160px]">
                <MediaCard item={item.media} score={item.scores.final} />
                {item.reason ? <RecommendationReason text={item.reason} className="mt-2" /> : null}
                <ScoreBreakdown scores={item.scores} className="mt-2" />
              </div>
            ))}
          </div>
        </Card>
      ))}
      {nextCursor ? (
        <Button
          type="button"
          variant="ghost"
          disabled={history.isFetching}
          onClick={() => setCursor(nextCursor)}
        >
          {history.isFetching ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}
