'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MediaCard, type MediaCardData } from '../../../components/media/media-card';
import { RatingControl } from '../../../components/media/rating-control';
import { Button } from '../../../components/ui/button';
import { api } from '../../../lib/utils';

const filters = ['ALL', 'LOVED', 'LIKED', 'SAVED', 'CONSUMED', 'REJECTED'] as const;
const types = ['ALL', 'MOVIE', 'GAME', 'MUSIC'] as const;
const sorts = [
  { value: 'RECENTLY_ADDED', label: 'Recently added' },
  { value: 'HIGHEST_RATED', label: 'Highest rated' },
  { value: 'RECENTLY_CONSUMED', label: 'Recently consumed' },
  { value: 'ALPHABETICAL', label: 'A–Z' },
] as const;

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const [type, setType] = useState<(typeof types)[number]>('ALL');
  const [sort, setSort] = useState<(typeof sorts)[number]['value']>('RECENTLY_ADDED');
  const library = useQuery({
    queryKey: ['library', filter, type, sort],
    queryFn: () => {
      const params = new URLSearchParams({ filter, sort });
      if (type !== 'ALL') {
        params.set('type', type);
      }
      return api<MediaCardData[]>(`/library?${params.toString()}`);
    },
  });
  const ratings = useQuery({
    queryKey: ['interactions-ratings'],
    queryFn: () => api<Array<{ mediaItemId: string; rating: number }>>('/interactions/ratings'),
  });
  const rate = useMutation({
    mutationFn: ({ mediaItemId, rating }: { mediaItemId: string; rating: number }) =>
      api('/interactions', {
        method: 'POST',
        body: JSON.stringify({ mediaItemId, type: 'RATED', rating }),
      }),
    onMutate: async ({ mediaItemId, rating }) => {
      await queryClient.cancelQueries({ queryKey: ['interactions-ratings'] });
      const previous = queryClient.getQueryData<Array<{ mediaItemId: string; rating: number }>>([
        'interactions-ratings',
      ]);
      queryClient.setQueryData<Array<{ mediaItemId: string; rating: number }>>(
        ['interactions-ratings'],
        (current = []) => [
          ...current.filter((row) => row.mediaItemId !== mediaItemId),
          { mediaItemId, rating },
        ],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['interactions-ratings'], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['interactions-ratings'] });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
    },
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
      <div className="my-6 flex flex-wrap items-center gap-2">
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
      <div className="mb-6 flex flex-wrap gap-2">
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
        <label className="ml-auto flex items-center gap-2 text-xs text-[var(--muted)]">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as (typeof sorts)[number]['value'])}
            className="rounded-full border border-[var(--line)] bg-transparent px-3 py-1 text-[var(--fg)]"
          >
            {sorts.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {(library.data ?? []).map((item) => (
          <div key={item.id} className="space-y-2">
            <MediaCard item={item} />
            <RatingControl
              value={ratings.data?.find((row) => row.mediaItemId === item.id)?.rating ?? 0}
              onChange={(value) => rate.mutate({ mediaItemId: item.id, rating: value })}
            />
            {rate.isError && rate.variables?.mediaItemId === item.id ? (
              <p className="text-xs text-red-400">Could not save rating</p>
            ) : null}
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
