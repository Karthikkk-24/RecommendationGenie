'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { MediaCard, type MediaCardData } from '../../../components/media/media-card';
import { FeedbackControl } from '../../../components/recommendations/feedback-control';
import {
  GenerateFilters,
  toGeneratePayload,
  type GenerateFilterState,
} from '../../../components/recommendations/generate-filters';
import { RecommendationReason } from '../../../components/recommendations/recommendation-bits';
import { ScoreBreakdown } from '../../../components/recommendations/score-breakdown';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/utils';

const modes = ['HIDDEN_GEMS', 'DEEP_CUTS', 'SURPRISE_ME', 'MOOD', 'SIMILAR_TO', 'SHORTLIST'] as const;
const moods = ['CHILL', 'ADRENALINE', 'EMOTIONAL', 'DARK', 'FUNNY', 'MIND_BENDING', 'RELAXING', 'INTENSE'] as const;

type RecItem = {
  id: string;
  explanation?: string;
  reason?: string;
  media: MediaCardData;
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
};

type RecResponse = { items: RecItem[] };

function flattenSearchResults(data?: { movies: MediaCardData[]; games: MediaCardData[]; music: MediaCardData[] }) {
  if (!data) {
    return [];
  }
  return [...data.movies, ...data.games, ...data.music];
}

export default function DiscoverPage() {
  const queryClient = useQueryClient();
  const [activeMode, setActiveMode] = useState<(typeof modes)[number]>('HIDDEN_GEMS');
  const [mood, setMood] = useState<(typeof moods)[number]>('CHILL');
  const [similarQuery, setSimilarQuery] = useState('');
  const [debouncedSimilarQuery, setDebouncedSimilarQuery] = useState('');
  const [similarToId, setSimilarToId] = useState('');
  const [similarToTitle, setSimilarToTitle] = useState('');
  const [filters, setFilters] = useState<GenerateFilterState>({ count: 10 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const modeRecs = useQuery({
    queryKey: ['recs', activeMode],
    queryFn: () => api<RecResponse>(`/recommendations?mode=${activeMode}`),
  });

  const similarSearch = useQuery({
    queryKey: ['discover-similar-search', debouncedSimilarQuery],
    enabled: debouncedSimilarQuery.length > 1,
    queryFn: () =>
      api<{ movies: MediaCardData[]; games: MediaCardData[]; music: MediaCardData[] }>(
        `/search?q=${encodeURIComponent(debouncedSimilarQuery)}`,
      ),
  });

  const generate = useMutation({
    mutationFn: (mode: (typeof modes)[number]) =>
      api<RecResponse>('/recommendations/generate', {
        method: 'POST',
        body: JSON.stringify(
          toGeneratePayload(
            {
              mode,
              ...(mode === 'MOOD' ? { mood } : {}),
              ...(mode === 'SIMILAR_TO' ? { similarToId: similarToId || undefined } : {}),
            },
            filters,
          ),
        ),
      }),
    onSuccess: (data, mode) => {
      queryClient.setQueryData(['recs', mode], data);
    },
  });

  const similarResults = flattenSearchResults(similarSearch.data);
  const items = generate.data?.items ?? modeRecs.data?.items ?? [];
  const isShortlistEmpty = activeMode === 'SHORTLIST' && !generate.isPending && items.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Discover</h1>
      <p className="max-w-2xl text-sm text-[var(--muted)]">
        Explore alternate modes without replacing your For You feed. Each run is stored under its own mode.
      </p>
      <div className="flex flex-wrap gap-3">
        {modes.map((mode) => (
          <Button
            key={mode}
            type="button"
            variant={activeMode === mode ? undefined : 'ghost'}
            disabled={generate.isPending || (mode === 'SIMILAR_TO' && !similarToId)}
            onClick={() => {
              setActiveMode(mode);
              if (mode !== 'SIMILAR_TO' || similarToId) {
                generate.mutate(mode);
              }
            }}
          >
            {mode.replaceAll('_', ' ')}
          </Button>
        ))}
      </div>

      <GenerateFilters filters={filters} onChange={setFilters} />

      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1 text-sm">
          <span className="text-[var(--muted)]">Mood (for MOOD mode)</span>
          <select
            className="block rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
            value={mood}
            onChange={(event) => setMood(event.target.value as (typeof moods)[number])}
          >
            {moods.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-[280px] flex-1 space-y-2">
          <label className="block text-sm text-[var(--muted)]">Similar to (for SIMILAR_TO mode)</label>
          <Input
            value={similarQuery}
            onChange={(event) => {
              const value = event.target.value;
              setSimilarQuery(value);
              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
              }
              debounceRef.current = setTimeout(() => setDebouncedSimilarQuery(value), 350);
            }}
            placeholder="Search for a movie, game, or album"
          />
          {similarToTitle ? (
            <p className="text-xs text-[var(--gold)]">
              Selected: {similarToTitle}
              <button
                type="button"
                className="ml-2 text-[var(--muted)] underline"
                onClick={() => {
                  setSimilarToId('');
                  setSimilarToTitle('');
                }}
              >
                Clear
              </button>
            </p>
          ) : null}
          {debouncedSimilarQuery.length > 1 ? (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-[var(--line)] p-2">
              {similarSearch.isLoading ? (
                <p className="text-xs text-[var(--muted)]">Searching…</p>
              ) : similarResults.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No matches yet.</p>
              ) : (
                similarResults.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--line)] ${
                      similarToId === item.id ? 'bg-[var(--line)] ring-1 ring-[var(--gold)]' : ''
                    }`}
                    onClick={() => {
                      setSimilarToId(item.id);
                      setSimilarToTitle(item.title);
                    }}
                  >
                    <span>{item.title}</span>
                    <span className="text-xs uppercase text-[var(--muted)]">{item.type}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {generate.isPending ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">Generating {activeMode.replaceAll('_', ' ')}…</p>
        </Card>
      ) : null}

      {generate.isError ? (
        <Card>
          <p className="text-sm text-red-400">
            {generate.error instanceof Error ? generate.error.message : 'Could not generate that mode.'}
          </p>
        </Card>
      ) : null}

      {isShortlistEmpty ? (
        <Card className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Your shortlist is empty. Save titles from recommendations or media pages to build a SHORTLIST batch.
          </p>
          <Button href="/app/library">Open library</Button>
        </Card>
      ) : null}

      {!generate.isPending && !isShortlistEmpty && generate.isSuccess && items.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">No candidates for this mode yet.</p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="grid gap-4 md:grid-cols-[160px_1fr]">
            <MediaCard item={item.media} score={item.scores.final} showSave />
            <div>
              {item.reason ? <RecommendationReason text={item.reason} /> : null}
              {item.explanation ? <p className="text-sm text-[var(--muted)]">{item.explanation}</p> : null}
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
