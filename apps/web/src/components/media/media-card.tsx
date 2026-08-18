'use client';

import Link from 'next/link';
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
}: {
  item: MediaCardData;
  score?: number;
  explanation?: string;
}) {
  return (
    <Link href={`/media/${item.id}`} className="group block min-w-[180px] max-w-[220px]">
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
    </Link>
  );
}

export function MediaGrid({ items }: { items: MediaCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} />
      ))}
    </div>
  );
}
