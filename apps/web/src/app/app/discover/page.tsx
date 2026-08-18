'use client';

import { useMutation } from '@tanstack/react-query';
import { MediaCard } from '../../../components/media/media-card';
import { Button } from '../../../components/ui/button';
import { api } from '../../../lib/utils';

const modes = ['FOR_YOU', 'HIDDEN_GEMS', 'DEEP_CUTS', 'SURPRISE_ME'] as const;

export default function DiscoverPage() {
  const generate = useMutation({
    mutationFn: (mode: string) =>
      api<{ items: Array<{ id: string; media: Parameters<typeof MediaCard>[0]['item']; scores: { final: number } }> }>(
        '/recommendations/generate',
        { method: 'POST', body: JSON.stringify({ mode }) },
      ),
  });

  return (
    <div>
      <h1 className="font-serif text-4xl">Discover</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        {modes.map((mode) => (
          <Button key={mode} type="button" variant="ghost" onClick={() => generate.mutate(mode)}>
            {mode.replaceAll('_', ' ')}
          </Button>
        ))}
      </div>
      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {generate.data?.items.map((item) => (
          <MediaCard key={item.id} item={item.media} score={item.scores.final} />
        ))}
      </div>
    </div>
  );
}
