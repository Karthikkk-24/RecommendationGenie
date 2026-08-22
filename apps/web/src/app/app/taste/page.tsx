'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { api } from '../../../lib/utils';

const genres = ['sci-fi', 'thriller', 'drama', 'comedy', 'romance', 'horror', 'indie', 'synthwave'];
const themes = ['psychological', 'found-family', 'heist', 'coming-of-age', 'mystery', 'retro'];

type TasteSnapshot = {
  id: string;
  createdAt: string;
  scalars: Record<string, number>;
};

function toPercent(value: number | undefined): number {
  return Math.round((((value ?? 0) + 1) / 2) * 100);
}

export default function TastePage() {
  const queryClient = useQueryClient();
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [dislikedGenres, setDislikedGenres] = useState<string[]>([]);
  const [preferredThemes, setPreferredThemes] = useState<string[]>([]);
  const [complexity, setComplexity] = useState(0);
  const [pacing, setPacing] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{
        preference?: {
          favoriteGenres?: string[];
          dislikedGenres?: string[];
          preferredThemes?: string[];
          preferredComplexity?: number | null;
          preferredPacing?: number | null;
        } | null;
      }>('/users/me'),
  });

  useEffect(() => {
    if (!me.data?.preference || hydrated) {
      return;
    }
    const pref = me.data.preference;
    setFavoriteGenres(pref.favoriteGenres ?? []);
    setDislikedGenres(pref.dislikedGenres ?? []);
    setPreferredThemes(pref.preferredThemes ?? []);
    setComplexity(pref.preferredComplexity ?? 0);
    setPacing(pref.preferredPacing ?? 0);
    setHydrated(true);
  }, [me.data, hydrated]);

  const savePreferences = useMutation({
    mutationFn: () =>
      api('/taste-profile/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          favoriteGenres,
          dislikedGenres,
          preferredThemes,
          preferredComplexity: complexity,
          preferredPacing: pacing,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['taste'] });
      void queryClient.invalidateQueries({ queryKey: ['taste-history'] });
      void queryClient.invalidateQueries({ queryKey: ['taste-evo'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const taste = useQuery({
    queryKey: ['taste'],
    queryFn: () =>
      api<{
        profile: {
          complexity: number;
          darkness: number;
          novelty: number;
          pacing: number;
          mainstreamVsNiche: number;
        };
        features: Array<{ featureKey: string; weight: number; featureType: string }>;
      }>('/taste-profile'),
  });
  const evolution = useQuery({
    queryKey: ['taste-evo'],
    queryFn: () => api<{ message: string; changes: Array<{ key: string; delta: number }> }>('/taste-profile/evolution'),
  });
  const history = useQuery({
    queryKey: ['taste-history'],
    queryFn: () => api<TasteSnapshot[]>('/taste-profile/history'),
  });

  const profile = taste.data?.profile;
  const genres = (taste.data?.features ?? []).filter((f) => f.featureType === 'GENRE').slice(0, 8);
  const chartRows = [...(history.data ?? [])]
    .reverse()
    .slice(-30)
    .map((snap) => {
      const scalars = snap.scalars ?? {};
      return {
        date: new Date(snap.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        complexity: toPercent(scalars.complexity),
        darkness: toPercent(scalars.darkness),
        novelty: toPercent(scalars.novelty),
        pacing: toPercent(scalars.pacing),
        niche: toPercent(scalars.mainstreamVsNiche),
      };
    });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Taste DNA</h1>
      <p className="text-[var(--muted)]">{evolution.data?.message}</p>
      {(evolution.data?.changes?.length ?? 0) > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          {evolution.data?.changes.map((change) => (
            <span key={change.key} className="rounded-full border border-[var(--line)] px-3 py-1">
              {change.key} {change.delta > 0 ? '+' : ''}
              {change.delta}
            </span>
          ))}
        </div>
      ) : null}
      <Card className="space-y-4">
        <h2 className="font-serif text-2xl">Edit taste preferences</h2>
        <p className="text-sm text-[var(--muted)]">Update genres and sliders — Genie re-seeds your profile and snapshots the change.</p>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Favorite genres</p>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() =>
                  setFavoriteGenres((current) =>
                    current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre],
                  )
                }
                className={`rounded-full border px-3 py-1 text-sm ${favoriteGenres.includes(genre) ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)]'}`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Themes</p>
          <div className="flex flex-wrap gap-2">
            {themes.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() =>
                  setPreferredThemes((current) =>
                    current.includes(theme) ? current.filter((t) => t !== theme) : [...current, theme],
                  )
                }
                className={`rounded-full border px-3 py-1 text-sm ${preferredThemes.includes(theme) ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)]'}`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm">
          Complexity ({complexity.toFixed(1)})
          <input
            type="range"
            min={-1}
            max={1}
            step={0.1}
            value={complexity}
            onChange={(event) => setComplexity(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-sm">
          Pacing ({pacing.toFixed(1)})
          <input
            type="range"
            min={-1}
            max={1}
            step={0.1}
            value={pacing}
            onChange={(event) => setPacing(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <Button
          type="button"
          onClick={() => savePreferences.mutate()}
          disabled={savePreferences.isPending || favoriteGenres.length === 0}
        >
          {savePreferences.isPending ? 'Saving…' : 'Save preferences'}
        </Button>
        {savePreferences.isError ? (
          <p className="text-sm text-red-400">
            {savePreferences.error instanceof Error ? savePreferences.error.message : 'Could not save preferences.'}
          </p>
        ) : null}
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Complexity', profile?.complexity],
          ['Darkness', profile?.darkness],
          ['Novelty', profile?.novelty],
          ['Pacing', profile?.pacing],
          ['Niche', profile?.mainstreamVsNiche],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
            <p className="mt-2 font-serif text-4xl">{toPercent(value as number)}%</p>
          </Card>
        ))}
      </div>
      <Card className="h-96 space-y-3">
        <p className="text-sm text-[var(--muted)]">30-day taste evolution</p>
        {chartRows.length < 2 ? (
          <p className="text-sm text-[var(--muted)]">
            Rate a few titles and Genie will chart how your scalars move over time.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
              <XAxis dataKey="date" stroke="#9a9388" />
              <YAxis domain={[0, 100]} stroke="#9a9388" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="complexity" stroke="#e8c39a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="darkness" stroke="#9aa7ff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="novelty" stroke="#7dd3c7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pacing" stroke="#f0a3c2" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="niche" stroke="#c4b5fd" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={genres.map((g) => ({ name: g.featureKey, weight: Math.round((g.weight + 1) * 50) }))}>
            <XAxis dataKey="name" stroke="#9a9388" />
            <YAxis stroke="#9a9388" />
            <Tooltip />
            <Bar dataKey="weight" fill="#e8c39a" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
