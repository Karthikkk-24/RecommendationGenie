'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { MediaGrid, type MediaCardData } from '../../../components/media/media-card';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/utils';

type HistoryRow = { id: string; query: string; mediaType: string | null; createdAt: string };

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const results = useQuery({
    queryKey: ['search', debounced],
    enabled: debounced.length > 1,
    queryFn: () =>
      api<{ movies: MediaCardData[]; games: MediaCardData[]; music: MediaCardData[] }>(
        `/search?q=${encodeURIComponent(debounced)}`,
      ),
  });

  const history = useQuery({
    queryKey: ['search-history'],
    queryFn: () => api<HistoryRow[]>('/search/history'),
  });

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
      <section>
        <h2 className="mb-3 font-serif text-2xl">Movies</h2>
        <MediaGrid items={results.data?.movies ?? []} />
      </section>
      <section>
        <h2 className="mb-3 font-serif text-2xl">Games</h2>
        <MediaGrid items={results.data?.games ?? []} />
      </section>
      <section>
        <h2 className="mb-3 font-serif text-2xl">Music</h2>
        <MediaGrid items={results.data?.music ?? []} />
      </section>
    </div>
  );
}
