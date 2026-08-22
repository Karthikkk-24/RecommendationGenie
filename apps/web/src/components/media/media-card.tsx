'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { useState } from 'react';
import { api } from '../../lib/utils';
import { Badge } from '../ui/card';

export type MediaCardData = {
  id: string;
  type: string;
  title: string;
  posterUrl: string | null;
  genres: string[];
  qualityScore?: number;
};

export function MediaCard({
  item,
  score,
  explanation,
  showSave,
  disableNavigation,
}: {
  item: MediaCardData;
  score?: number;
  explanation?: string;
  showSave?: boolean;
  disableNavigation?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const trackClick = () => {
    void api('/interactions', {
      method: 'POST',
      body: JSON.stringify({ mediaItemId: item.id, type: 'CLICK' }),
    }).catch(() => undefined);
  };

  const handleSave = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (saved || saving) {
      return;
    }
    setSaving(true);
    try {
      await api('/library', {
        method: 'POST',
        body: JSON.stringify({ mediaItemId: item.id }),
      });
      setSaved(true);
    } catch {
      try {
        await api('/interactions', {
          method: 'POST',
          body: JSON.stringify({ mediaItemId: item.id, type: 'SAVE' }),
        });
        setSaved(true);
      } catch {
        setSaving(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-black/40">
        <div
          className="aspect-[2/3] bg-cover bg-center transition duration-500 group-hover:scale-105"
          style={{
            backgroundImage: item.posterUrl
              ? `url(${item.posterUrl})`
              : 'linear-gradient(180deg, #2a2433, #0c0c12)',
          }}
        />
      </div>
      {showSave ? (
        <button
          type="button"
          className="absolute right-2 top-2 rounded-full border border-[var(--line)] bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--gold)] hover:border-[var(--gold)]"
          disabled={saved || saving}
          onClick={(event) => void handleSave(event)}
        >
          {saved ? 'Saved' : saving ? '…' : 'Save'}
        </button>
      ) : null}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Badge>{item.type}</Badge>
          {score !== undefined ? (
            <span className="text-xs text-[var(--gold)]">{Math.round(score * 100)}% match</span>
          ) : null}
        </div>
        <h3 className="text-sm font-medium leading-tight">{item.title}</h3>
        <p className="line-clamp-1 text-xs text-[var(--muted)]">{item.genres.join(' · ')}</p>
        {explanation ? <p className="line-clamp-2 text-xs text-[var(--muted)]">{explanation}</p> : null}
      </div>
    </>
  );

  if (disableNavigation) {
    return <div className="group relative block min-w-[180px] max-w-[220px]">{body}</div>;
  }

  return (
    <Link
      href={`/media/${item.id}`}
      className="group relative block min-w-[180px] max-w-[220px]"
      onClick={() => {
        trackClick();
      }}
    >
      {body}
    </Link>
  );
}

export function MediaGrid({ items, showSave }: { items: MediaCardData[]; showSave?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} showSave={showSave} />
      ))}
    </div>
  );
}
