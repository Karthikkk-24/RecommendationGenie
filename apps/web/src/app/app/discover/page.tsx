'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { MediaCard, type MediaCardData } from '../../../components/media/media-card';
import { FeedbackControl } from '../../../components/recommendations/feedback-control';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/utils';

const modes = ['HIDDEN_GEMS', 'DEEP_CUTS', 'SURPRISE_ME'] as const;

type RecItem = {
  id: string;
  explanation?: string;
  media: MediaCardData;
  scores: { final: number; content: number; taste: number; novelty: number; quality: number };
};

export default function DiscoverPage() {
  const [activeMode, setActiveMode] = useState<(typeof modes)[number] | null>(null);
  const generate = useMutation({
    mutationFn: (mode: (typeof modes)[number]) =>
      api<{ items: RecItem[] }>('/recommendations/generate', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      }),
    onMutate: (mode) => {
      setActiveMode(mode);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl">Discover</h1>
      <p className="max-w-2xl text-sm text-[var(--muted)]">
        Explore alternate modes without replacing your For You feed. Each run is stored under its own mode.
      </p>
      <div className="flex flex-wrap gap-3">
        {modes.map((mode) => (
          <Button
            key={mode}
            type="button"
            variant={activeMode === mode ? undefined : 'ghost'}
            disabled={generate.isPending}
            onClick={() => generate.mutate(mode)}
          >
            {mode.replaceAll('_', ' ')}
          </Button>
        ))}
      </div>

      {generate.isPending ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">Generating {activeMode?.replaceAll('_', ' ')}…</p>
        </Card>
      ) : null}

      {generate.isError ? (
        <Card>
          <p className="text-sm text-red-400">
            {generate.error instanceof Error ? generate.error.message : 'Could not generate that mode.'}
          </p>
        </Card>
      ) : null}

      {!generate.isPending && generate.isSuccess && generate.data.items.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">No candidates for this mode yet.</p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {generate.data?.items.map((item) => (
          <Card key={item.id} className="grid gap-4 md:grid-cols-[160px_1fr]">
            <MediaCard item={item.media} score={item.scores.final} />
            <div>
              <p className="text-sm text-[var(--muted)]">{item.explanation}</p>
              <p className="mt-3 text-xs text-[var(--muted)]">
                Content {Math.round(item.scores.content * 100)}% · Taste {Math.round(item.scores.taste * 100)}% ·
                Quality {Math.round(item.scores.quality * 100)}% · Novelty {Math.round(item.scores.novelty * 100)}%
              </p>
              <div className="mt-4">
                <FeedbackControl mediaItemId={item.media.id} recommendationItemId={item.id} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
