'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppNav } from '../../../components/layout/app-nav';
import { RatingControl } from '../../../components/media/rating-control';
import { FeedbackControl } from '../../../components/recommendations/feedback-control';
import { ScoreBreakdown } from '../../../components/recommendations/score-breakdown';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

export default function MediaDetailsPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const viewedRef = useRef(false);
  const [rating, setRating] = useState(0);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const session = useQuery({
    queryKey: ['me'],
    retry: false,
    queryFn: () => api<{ id: string }>('/users/me'),
  });
  const isAuthed = session.isSuccess;

  const media = useQuery({
    queryKey: ['media', params.id],
    enabled: Boolean(params.id),
    retry: false,
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

  const interactions = useQuery({
    queryKey: ['interactions-ratings'],
    enabled: isAuthed,
    queryFn: () => api<Array<{ mediaItemId: string; rating: number }>>('/interactions/ratings'),
  });

  useEffect(() => {
    const existing = interactions.data?.find((row) => row.mediaItemId === params.id);
    if (existing?.rating) {
      setRating(existing.rating);
    }
  }, [interactions.data, params.id]);

  useEffect(() => {
    if (!isAuthed || !params.id || viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    void api('/interactions', {
      method: 'POST',
      body: JSON.stringify({ mediaItemId: params.id, type: 'VIEW' }),
    }).catch(() => undefined);
  }, [isAuthed, params.id]);

  const match = useQuery({
    queryKey: ['match', params.id],
    enabled: Boolean(params.id) && media.isSuccess && isAuthed,
    retry: false,
    queryFn: () =>
      api<{
        scores: {
          final: number;
          content: number;
          taste: number;
          feedback: number;
          creator: number;
          quality: number;
          novelty: number;
          exploration: number;
        };
      }>(`/recommendations/match/${params.id}`),
  });

  const similar = useQuery({
    queryKey: ['similar', params.id],
    enabled: Boolean(params.id) && media.isSuccess,
    retry: false,
    queryFn: () => api<Array<{ id: string; title: string }>>(`/media/${params.id}/similar`),
  });

  const rate = useMutation({
    mutationFn: (value: number) =>
      api('/interactions', {
        method: 'POST',
        body: JSON.stringify({ mediaItemId: params.id, type: 'RATED', rating: value }),
      }),
    onSuccess: (_data, value) => {
      setRating(value);
      setSavedMessage('Rating saved');
      void queryClient.invalidateQueries({ queryKey: ['interactions-ratings'] });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });

  if (media.isPending) {
    return <p className="p-10 text-[var(--muted)]">Loading…</p>;
  }

  if (media.isError || !media.data) {
    return (
      <main className="mx-auto max-w-lg space-y-4 px-6 py-16">
        <h1 className="font-serif text-3xl">Title not found</h1>
        <p className="text-sm text-[var(--muted)]">
          {media.error instanceof Error ? media.error.message : 'This media item could not be loaded.'}
        </p>
        <Button href={isAuthed ? '/app/search' : '/login'}>
          {isAuthed ? 'Back to search' : 'Log in'}
        </Button>
      </main>
    );
  }

  const item = media.data;
  const loginHref = `/login?next=${encodeURIComponent(`/media/${item.id}`)}`;

  return (
    <div>
      {isAuthed ? (
        <AppNav />
      ) : (
        <header className="border-b border-[var(--line)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-serif text-xl">
              Recommendation Genie
            </Link>
            <Button href={loginHref}>Log in</Button>
          </div>
        </header>
      )}

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

          {isAuthed && match.data ? (
            <Card className="mt-6">
              <ScoreBreakdown scores={match.data.scores} />
            </Card>
          ) : null}

          {isAuthed && match.isError ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Match score unavailable right now.</p>
          ) : null}

          {!isAuthed ? (
            <Card className="mt-6 space-y-3">
              <p className="text-sm text-[var(--muted)]">
                Sign in to see your Genie match percentage and like, save, or rate this title.
              </p>
              <Button href={loginHref}>Log in to interact</Button>
            </Card>
          ) : (
            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Your rating</p>
                <RatingControl
                  value={rating}
                  onChange={(value) => {
                    setRating(value);
                    rate.mutate(value);
                  }}
                />
                {rate.isPending ? <p className="mt-1 text-xs text-[var(--muted)]">Saving…</p> : null}
                {savedMessage && !rate.isPending ? (
                  <p className="mt-1 text-xs text-[var(--gold)]">{savedMessage}</p>
                ) : null}
              </div>
              <FeedbackControl mediaItemId={item.id} />
            </div>
          )}

          <h2 className="mt-10 font-serif text-2xl">Similar</h2>
          {similar.isPending ? <p className="mt-3 text-sm text-[var(--muted)]">Loading similar titles…</p> : null}
          {similar.isError ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Similar titles are unavailable right now.</p>
          ) : null}
          <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
            {similar.data?.map((row) => (
              <li key={row.id}>
                <Link href={`/media/${row.id}`} className="hover:text-[var(--fg)] hover:underline">
                  {row.title}
                </Link>
              </li>
            ))}
          </ul>
          {similar.isSuccess && (similar.data?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No similar titles yet.</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
