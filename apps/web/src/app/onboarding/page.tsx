'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MediaCard, type MediaCardData } from '../../components/media/media-card';
import { RatingControl } from '../../components/media/rating-control';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { api, ApiError, isEmailVerified } from '../../lib/utils';

const steps = ['Types', 'Loves', 'Ratings', 'Preferences', 'Taste', 'Recommendations', 'Calibrate'] as const;
const genres = ['sci-fi', 'thriller', 'drama', 'comedy', 'romance', 'horror', 'indie', 'synthwave'];
const themes = ['psychological', 'found-family', 'heist', 'coming-of-age', 'mystery', 'retro'];

type OnboardingState = {
  onboardingStatus?: string;
  preference?: {
    enabledMediaTypes?: string[];
    favoriteGenres?: string[];
    dislikedGenres?: string[];
    preferredThemes?: string[];
    preferredPacing?: number | null;
    preferredComplexity?: number | null;
  } | null;
  popular: MediaCardData[];
};

type RecPreview = {
  items: Array<{
    id: string;
    explanation?: string;
    scores: { final: number };
    media: MediaCardData;
  }>;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<string[]>(['MOVIE', 'GAME', 'MUSIC']);
  const [selected, setSelected] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(['sci-fi', 'thriller']);
  const [dislikedGenres, setDislikedGenres] = useState<string[]>([]);
  const [preferredThemes, setPreferredThemes] = useState<string[]>(['psychological']);
  const [complexity, setComplexity] = useState(0.4);
  const [pacing, setPacing] = useState(0.2);
  const [preferredTone, setPreferredTone] = useState<'light' | 'neutral' | 'dark'>('neutral');
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RecPreview | null>(null);
  const [calibrateFeedback, setCalibrateFeedback] = useState<string | null>(null);

  const state = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => api<OnboardingState>('/onboarding'),
    retry: (count, error) => !(error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') && count < 2,
  });

  useEffect(() => {
    if (state.error instanceof ApiError && state.error.code === 'EMAIL_NOT_VERIFIED') {
      router.replace('/verify-email?pending=1');
    }
  }, [state.error, router]);

  useEffect(() => {
    if (!state.data || hydrated) {
      return;
    }
    if (state.data.onboardingStatus === 'COMPLETED') {
      router.replace('/app');
      return;
    }
    const pref = state.data.preference;
    if (pref?.enabledMediaTypes?.length) {
      setTypes(pref.enabledMediaTypes);
      setStep(1);
    }
    if (pref?.favoriteGenres?.length) {
      setFavoriteGenres(pref.favoriteGenres);
    }
    if (pref?.dislikedGenres?.length) {
      setDislikedGenres(pref.dislikedGenres);
    }
    if (pref?.preferredThemes?.length) {
      setPreferredThemes(pref.preferredThemes);
    }
    if (typeof pref?.preferredComplexity === 'number') {
      setComplexity(pref.preferredComplexity);
    }
    if (typeof pref?.preferredPacing === 'number') {
      setPacing(pref.preferredPacing);
    }
    setHydrated(true);
  }, [state.data, hydrated, router]);

  const popular = state.data?.popular ?? [];

  const advance = useMutation({
    mutationFn: async (fromStep: number) => {
      setError(null);
      if (fromStep === 0) {
        if (types.length === 0) {
          throw new Error('Pick at least one media type.');
        }
        await api('/onboarding/types', { method: 'POST', body: JSON.stringify({ mediaTypes: types }) });
        return;
      }
      if (fromStep === 1) {
        if (selected.length > 0) {
          await api('/onboarding/selections', {
            method: 'POST',
            body: JSON.stringify({ mediaItemIds: selected }),
          });
        }
        return;
      }
      if (fromStep === 2) {
        if (selected.length === 0) {
          return;
        }
        const payload = selected.map((id) => ({
          mediaItemId: id,
          rating: ratings[id] ?? 5,
        }));
        await api('/onboarding/ratings', { method: 'POST', body: JSON.stringify({ ratings: payload }) });
        return;
      }
      if (fromStep === 3) {
        if (favoriteGenres.length === 0) {
          throw new Error('Pick at least one favorite genre.');
        }
        await api('/onboarding/preferences', {
          method: 'POST',
          body: JSON.stringify({
            favoriteGenres,
            dislikedGenres,
            preferredThemes,
            preferredComplexity: complexity,
            preferredPacing: pacing,
            preferredTone: preferredTone === 'neutral' ? undefined : preferredTone,
          }),
        });
        return;
      }
      if (fromStep === 4) {
        // Taste sliders already included in preferences; re-post so pacing/complexity stick.
        await api('/onboarding/preferences', {
          method: 'POST',
          body: JSON.stringify({
            favoriteGenres,
            dislikedGenres,
            preferredThemes,
            preferredComplexity: complexity,
            preferredPacing: pacing,
            preferredTone: preferredTone === 'neutral' ? undefined : preferredTone,
          }),
        });
        return;
      }
      if (fromStep === 5) {
        const batch = await api<RecPreview>('/onboarding/complete', { method: 'POST' });
        setPreview(batch);
      }
    },
    onSuccess: (_data, fromStep) => {
      if (fromStep < 5) {
        if (fromStep === 1 && selected.length === 0) {
          setStep(3);
          return;
        }
        setStep((value) => value + 1);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        router.replace('/verify-email?pending=1');
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
    },
  });

  const finish = async () => {
    if (calibrateFeedback) {
      const feedbackMap = {
        'Too safe': 'TOO_SAFE',
        'Just right': 'JUST_RIGHT',
        'Too weird': 'TOO_WEIRD',
      } as const;
      try {
        await api('/onboarding/calibrate', {
          method: 'POST',
          body: JSON.stringify({ feedback: feedbackMap[calibrateFeedback as keyof typeof feedbackMap] }),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save calibration');
        return;
      }
    }
    router.push('/app/recommendations');
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {state.isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading onboarding…</p>
      ) : state.isError && !(state.error instanceof ApiError && state.error.code === 'EMAIL_NOT_VERIFIED') ? (
        <Card>
          <p className="text-sm text-red-400">
            {state.error instanceof Error ? state.error.message : 'Could not load onboarding.'}
          </p>
        </Card>
      ) : (
        <>
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
        Step {step + 1} · {steps[step]}
      </p>
      <h1 className="mt-3 font-serif text-4xl">Tell Genie what you love</h1>

      {step === 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
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

      {step === 1 ? (
        <div className="mt-8">
          {popular.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--muted)]">
                No popular titles are available yet. You can skip this step and continue with genre preferences —
                Genie will fill your catalog as you search.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {popular.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setSelected((current) =>
                      current.includes(item.id)
                        ? current.filter((id) => id !== item.id)
                        : [...current, item.id],
                    )
                  }
                  className={selected.includes(item.id) ? 'rounded-2xl ring-2 ring-[var(--gold)]' : ''}
                >
                  <MediaCard item={item} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-8 space-y-4">
          {selected.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Go back and pick a few loves to rate.</p>
          ) : (
            selected.map((id) => {
              const item = popular.find((row) => row.id === id);
              return (
                <Card key={id} className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{item?.title ?? id}</p>
                    <p className="text-xs text-[var(--muted)]">{item?.type}</p>
                  </div>
                  <RatingControl
                    value={ratings[id] ?? 5}
                    onChange={(value) => setRatings((current) => ({ ...current, [id]: value }))}
                  />
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-8 space-y-8">
          <div>
            <p className="mb-3 text-sm text-[var(--muted)]">Favorite genres</p>
            <div className="flex flex-wrap gap-3">
              {genres.map((genre) => (
                <button
                  key={`fav-${genre}`}
                  type="button"
                  onClick={() => {
                    setFavoriteGenres((current) =>
                      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre],
                    );
                    setDislikedGenres((current) => current.filter((item) => item !== genre));
                  }}
                  className={`rounded-full border px-4 py-2 ${favoriteGenres.includes(genre) ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)]'}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm text-[var(--muted)]">Disliked genres</p>
            <div className="flex flex-wrap gap-3">
              {genres.map((genre) => (
                <button
                  key={`dis-${genre}`}
                  type="button"
                  onClick={() => {
                    setDislikedGenres((current) =>
                      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre],
                    );
                    setFavoriteGenres((current) => current.filter((item) => item !== genre));
                  }}
                  className={`rounded-full border px-4 py-2 ${dislikedGenres.includes(genre) ? 'border-red-400 text-red-400' : 'border-[var(--line)]'}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm text-[var(--muted)]">Themes</p>
            <div className="flex flex-wrap gap-3">
              {themes.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() =>
                    setPreferredThemes((current) =>
                      current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme],
                    )
                  }
                  className={`rounded-full border px-4 py-2 ${preferredThemes.includes(theme) ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)]'}`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm text-[var(--muted)]">Preferred tone</p>
            <div className="flex flex-wrap gap-3">
              {(['light', 'neutral', 'dark'] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setPreferredTone(tone)}
                  className={`rounded-full border px-4 py-2 capitalize ${preferredTone === tone ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--line)]'}`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-8 max-w-xl space-y-6 text-sm text-[var(--muted)]">
          <label className="block">
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
          <label className="block">
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
        </div>
      ) : null}

      {step === 5 ? (
        <div className="mt-8 max-w-2xl space-y-4">
          <p className="text-[var(--muted)]">
            Next, Genie seeds your taste profile and generates a first batch. Continue to create that preview.
          </p>
          {preview ? (
            <div className="space-y-3">
              {preview.items.slice(0, 5).map((item) => (
                <Card key={item.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.media.title}</p>
                    <p className="text-xs text-[var(--muted)]">{item.explanation}</p>
                  </div>
                  <span className="text-sm text-[var(--gold)]">{Math.round(item.scores.final * 100)}%</span>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 6 ? (
        <div className="mt-8 max-w-2xl space-y-4">
          <p className="text-[var(--muted)]">
            Quick calibrate: tell Genie if this first batch feels right. You can refine forever from For You.
          </p>
          <div className="flex flex-wrap gap-3">
            {['Too safe', 'Just right', 'Too weird'].map((label) => (
              <Button
                key={label}
                type="button"
                variant={calibrateFeedback === label ? undefined : 'ghost'}
                onClick={() => setCalibrateFeedback(label)}
              >
                {label}
              </Button>
            ))}
          </div>
          {calibrateFeedback ? (
            <p className="text-sm text-[var(--muted)]">
              Noted as “{calibrateFeedback}”. Feedback on individual titles will keep tuning Genie.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-6 text-sm text-red-400">{error}</p> : null}

      <div className="mt-10 flex gap-3">
        {step > 0 && step < 6 ? (
          <Button type="button" variant="ghost" onClick={() => setStep((value) => value - 1)}>
            Back
          </Button>
        ) : null}
        {step < 5 ? (
          <Button type="button" onClick={() => advance.mutate(step)} disabled={advance.isPending}>
            {advance.isPending
              ? 'Saving…'
              : step === 1 && popular.length === 0
                ? 'Skip for now'
                : 'Continue'}
          </Button>
        ) : null}
        {step === 5 ? (
          <Button type="button" onClick={() => advance.mutate(5)} disabled={advance.isPending || Boolean(preview)}>
            {advance.isPending ? 'Generating…' : preview ? 'Preview ready' : 'Generate preview'}
          </Button>
        ) : null}
        {step === 5 && preview ? (
          <Button type="button" onClick={() => setStep(6)}>
            Continue to calibrate
          </Button>
        ) : null}
        {step === 6 ? (
          <Button type="button" onClick={finish}>
            Open For You
          </Button>
        ) : null}
      </div>
        </>
      )}
    </main>
  );
}
