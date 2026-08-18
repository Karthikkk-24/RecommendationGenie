'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { MediaGrid, type MediaCardData } from '../../../components/media/media-card';
import { api } from '../../../lib/utils';

const filters = ['ALL', 'LOVED', 'LIKED', 'SAVED', 'CONSUMED', 'REJECTED'] as const;

export default function LibraryPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const library = useQuery({
    queryKey: ['library', filter],
    queryFn: () => api<MediaCardData[]>(`/library?filter=${filter}`),
  });

  return (
    <div>
      <h1 className="font-serif text-4xl">Library</h1>
      <div className="my-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full border px-3 py-1 text-xs ${filter === item ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)] text-[var(--muted)]'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <MediaGrid items={library.data ?? []} />
    </div>
  );
}
