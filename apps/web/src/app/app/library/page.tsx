'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MediaCard, type MediaCardData } from '../../../components/media/media-card';
import { Button } from '../../../components/ui/button';
import { api } from '../../../lib/utils';

const filters = ['ALL', 'LOVED', 'LIKED', 'SAVED', 'CONSUMED', 'REJECTED'] as const;

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const library = useQuery({
    queryKey: ['library', filter],
    queryFn: () => api<MediaCardData[]>(`/library?filter=${filter}`),
  });
  const unsave = useMutation({
    mutationFn: (mediaItemId: string) => api(`/library/${mediaItemId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['library'] });
    },
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
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {(library.data ?? []).map((item) => (
          <div key={item.id} className="space-y-2">
            <MediaCard item={item} />
            {filter === 'SAVED' ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs"
                disabled={unsave.isPending}
                onClick={() => unsave.mutate(item.id)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      {!library.isLoading && (library.data?.length ?? 0) === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Nothing in this shelf yet.</p>
      ) : null}
    </div>
  );
}
