'use client';

import { useQuery } from '@tanstack/react-query';
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
import { api } from '../../../lib/utils';

type TasteSnapshot = {
  id: string;
  createdAt: string;
  scalars: Record<string, number>;
};

function toPercent(value: number | undefined): number {
  return Math.round((((value ?? 0) + 1) / 2) * 100);
}

export default function TastePage() {
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
