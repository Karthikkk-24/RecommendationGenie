'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { FeedbackControl } from '../../../components/recommendations/feedback-control';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

export default function MediaDetailsPage() {
  const params = useParams<{ id: string }>();
  const media = useQuery({
    queryKey: ['media', params.id],
    queryFn: () =>
      api<{
        id: string;
        title: string;
        description: string | null;
        posterUrl: string | null;
        genres: string[];
        tags: string[];
        creators: string[];
        type: string;
        releaseDate: string | null;
      }>(`/media/${params.id}`),
  });
  const match = useQuery({
    queryKey: ['match', params.id],
    queryFn: () =>
      api<{ scores: { content: number; taste: number; quality: number; novelty: number } }>(
        `/recommendations/match/${params.id}`,
      ),
  });
  const similar = useQuery({
    queryKey: ['similar', params.id],
    queryFn: () => api<Array<{ id: string; title: string }>>(`/media/${params.id}/similar`),
  });
  const interact = useMutation({
    mutationFn: (type: string) =>
      api('/interactions', { method: 'POST', body: JSON.stringify({ mediaItemId: params.id, type }) }),
  });

  const item = media.data;
  if (!item) {
    return <p className="p-10 text-[var(--muted)]">Loading…</p>;
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[280px_1fr]">
      <div
        className="aspect-[2/3] rounded-3xl bg-cover bg-center"
        style={{ backgroundImage: item.posterUrl ? `url(${item.posterUrl})` : undefined }}
      />
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">{item.type}</p>
        <h1 className="mt-2 font-serif text-5xl">{item.title}</h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)]">{item.description}</p>
        <p className="mt-3 text-sm text-[var(--muted)]">{item.genres.join(' · ')}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{item.creators.join(', ')}</p>
        {match.data ? (
          <Card className="mt-6">
            <p>Genie match {Math.round(match.data.scores.taste * 100)}%</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Content {Math.round(match.data.scores.content * 100)}% · Quality {Math.round(match.data.scores.quality * 100)}% ·
              Novelty {Math.round(match.data.scores.novelty * 100)}%
            </p>
          </Card>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {['LOVE', 'LIKE', 'DISLIKE', 'SAVE', 'CONSUMED', 'NOT_INTERESTED'].map((type) => (
            <Button key={type} type="button" variant="ghost" onClick={() => interact.mutate(type)}>
              {type}
            </Button>
          ))}
        </div>
        <div className="mt-6">
          <FeedbackControl mediaItemId={item.id} />
        </div>
        <h2 className="mt-10 font-serif text-2xl">Similar</h2>
        <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          {similar.data?.map((row) => (
            <li key={row.id}>{row.title}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
