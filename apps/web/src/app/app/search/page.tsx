'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { MediaGrid, type MediaCardData } from '../../../components/media/media-card';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/utils';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  const results = useQuery({
    queryKey: ['search', debounced],
    enabled: debounced.length > 1,
    queryFn: () =>
      api<{ movies: MediaCardData[]; games: MediaCardData[]; music: MediaCardData[] }>(
        `/search?q=${encodeURIComponent(debounced)}`,
      ),
  });

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl">Search</h1>
      <Input
        placeholder="Search movies, games, music"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          window.clearTimeout((window as unknown as { t?: number }).t);
          (window as unknown as { t?: number }).t = window.setTimeout(
            () => setDebounced(event.target.value),
            350,
          );
        }}
      />
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
