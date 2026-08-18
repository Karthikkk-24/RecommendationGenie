'use client';

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

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

  const profile = taste.data?.profile;
  const genres = (taste.data?.features ?? []).filter((f) => f.featureType === 'GENRE').slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Taste DNA</h1>
      <p className="text-[var(--muted)]">{evolution.data?.message}</p>
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
            <p className="mt-2 font-serif text-4xl">{Math.round((((value as number) ?? 0) + 1) * 50)}%</p>
          </Card>
        ))}
      </div>
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
