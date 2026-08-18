'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MediaCard, type MediaCardData } from '../../components/media/media-card';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/utils';

const steps = ['Types', 'Loves', 'Ratings', 'Preferences', 'Taste', 'Recommendations', 'Calibrate'];
const genres = ['sci-fi', 'thriller', 'drama', 'comedy', 'romance', 'horror', 'indie', 'synthwave'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<string[]>(['MOVIE', 'GAME', 'MUSIC']);
  const [selected, setSelected] = useState<string[]>([]);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(['sci-fi', 'thriller']);
  const [complexity, setComplexity] = useState(0.4);
  const [pacing, setPacing] = useState(0.2);
  const state = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => api<{ popular: MediaCardData[] }>('/onboarding'),
  });

  const complete = useMutation({
    mutationFn: async () => {
      await api('/onboarding/types', { method: 'POST', body: JSON.stringify({ mediaTypes: types }) });
      await api('/onboarding/selections', { method: 'POST', body: JSON.stringify({ mediaItemIds: selected }) });
      await api('/onboarding/ratings', {
        method: 'POST',
        body: JSON.stringify({ ratings: selected.map((id) => ({ mediaItemId: id, rating: 5 })) }),
      });
      await api('/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify({
          favoriteGenres,
          dislikedGenres: genres.filter((genre) => !favoriteGenres.includes(genre)).slice(0, 2),
          preferredThemes: ['psychological'],
          preferredComplexity: complexity,
          preferredPacing: pacing,
        }),
      });
      await api('/onboarding/complete', { method: 'POST' });
    },
    onSuccess: () => router.push('/app'),
  });

  const popular = state.data?.popular ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
        Step {step + 1} · {steps[step]}
      </p>
      <h1 className="mt-3 font-serif text-4xl">Tell Genie what you love</h1>
      {step === 0 ? (
        <div className="mt-8 flex gap-3">
          {['MOVIE', 'GAME', 'MUSIC'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                setTypes((current) =>
                  current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
                )
              }
              className={`rounded-full border px-4 py-2 ${types.includes(type) ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)]'}`}
            >
              {type}
            </button>
          ))}
        </div>
      ) : null}
      {step >= 1 && step <= 2 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {popular.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setSelected((current) =>
                  current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
                )
              }
              className={selected.includes(item.id) ? 'ring-2 ring-[var(--gold)] rounded-2xl' : ''}
            >
              <MediaCard item={item} />
            </button>
          ))}
        </div>
      ) : null}
      {step === 3 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() =>
                setFavoriteGenres((current) =>
                  current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre],
                )
              }
              className={`rounded-full border px-4 py-2 ${favoriteGenres.includes(genre) ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)]'}`}
            >
              {genre}
            </button>
          ))}
        </div>
      ) : null}
      {step === 4 ? (
        <div className="mt-8 max-w-xl space-y-6 text-sm text-[var(--muted)]">
          <label className="block">
            Complexity
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
          <label className="block">
            Pacing
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
        </div>
      ) : null}
      {step >= 5 ? (
        <p className="mt-8 max-w-xl text-[var(--muted)]">
          Genie will seed complexity, darkness, and genre weights from your picks, then generate the first batch. Later
          feedback updates those weights — Genie never invents titles.
        </p>
      ) : null}
      <div className="mt-10 flex gap-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((value) => value - 1)}>
            Back
          </Button>
        ) : null}
        {step < 6 ? (
          <Button type="button" onClick={() => setStep((value) => value + 1)}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={() => complete.mutate()}>
            Generate my first recommendations
          </Button>
        )}
      </div>
    </main>
  );
}
