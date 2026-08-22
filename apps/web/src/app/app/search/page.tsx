'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { MediaGrid, type MediaCardData } from '../../../components/media/media-card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/utils';

type HistoryRow = { id: string; query: string; mediaType: string | null; createdAt: string };

type SearchResponse = {
  movies: MediaCardData[];
  games: MediaCardData[];
  music: MediaCardData[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

const types = ['ALL', 'MOVIE', 'GAME', 'MUSIC'] as const;

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [type, setType] = useState<(typeof types)[number]>('ALL');
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<SearchResponse | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPage(1);
    setAccumulated(null);
  }, [debounced, type]);

  const results = useQuery({
    queryKey: ['search', debounced, type, page],
    enabled: debounced.length > 1,
    queryFn: () => {
      const params = new URLSearchParams({
        q: debounced,
        page: String(page),
        pageSize: '20',
      });
      if (type !== 'ALL') {
        params.set('type', type);
      }
      return api<SearchResponse>(`/search?${params.toString()}`);
    },
  });

  useEffect(() => {
    if (!results.data) {
      return;
    }
    if (page === 1) {
      setAccumulated(results.data);
      return;
    }
    setAccumulated((current) =>
      current
        ? {
            ...results.data,
            movies: [...current.movies, ...results.data.movies],
            games: [...current.games, ...results.data.games],
            music: [...current.music, ...results.data.music],
          }
        : results.data,
    );
  }, [results.data, page]);

  const history = useQuery({
    queryKey: ['search-history'],
    queryFn: () => api<HistoryRow[]>('/search/history'),
  });

  const data = accumulated;
  const showGrouped = type === 'ALL';
  const flatItems =
    type === 'MOVIE'
      ? (data?.movies ?? [])
      : type === 'GAME'
        ? (data?.games ?? [])
        : type === 'MUSIC'
          ? (data?.music ?? [])
          : [];

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl">Search</h1>
      <Input
        placeholder="Search movies, games, music"
        value={q}
        onChange={(event) => {
          const value = event.target.value;
          setQ(value);
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          debounceRef.current = setTimeout(() => setDebounced(value), 350);
        }}
      />
      <div className="flex flex-wrap gap-2">
        {types.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setType(item)}
            className={`rounded-full border px-3 py-1 text-xs ${type === item ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)] text-[var(--muted)]'}`}
          >
            {item === 'ALL' ? 'All types' : item.replaceAll('_', ' ')}
          </button>
        ))}
      </div>
      {(history.data?.length ?? 0) > 0 && debounced.length <= 1 ? (
        <section>
          <h2 className="mb-3 font-serif text-2xl">Recent searches</h2>
          <div className="flex flex-wrap gap-2">
            {history.data?.map((row) => (
              <button
                key={row.id}
                type="button"
                className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--gold)]"
                onClick={() => {
                  setQ(row.query);
                  setDebounced(row.query);
                }}
              >
                {row.query}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {showGrouped ? (
        <>
          <section>
            <h2 className="mb-3 font-serif text-2xl">Movies</h2>
            <MediaGrid items={data?.movies ?? []} showSave />
          </section>
          <section>
            <h2 className="mb-3 font-serif text-2xl">Games</h2>
            <MediaGrid items={data?.games ?? []} showSave />
          </section>
          <section>
            <h2 className="mb-3 font-serif text-2xl">Music</h2>
            <MediaGrid items={data?.music ?? []} showSave />
          </section>
        </>
      ) : (
        <section>
          <h2 className="mb-3 font-serif text-2xl">{type.replaceAll('_', ' ')}</h2>
          <MediaGrid items={flatItems} showSave />
        </section>
      )}
      {debounced.length > 1 && data?.hasMore ? (
        <Button type="button" variant="ghost" disabled={results.isFetching} onClick={() => setPage((value) => value + 1)}>
          {results.isFetching ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}
