import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

type SampleCard = {
  id: string;
  title: string;
  type: string;
  line: string;
};

const typeLabels: Record<string, string> = {
  MOVIE: 'Movie',
  GAME: 'Game',
  MUSIC: 'Music',
};

const fallbackSamples: SampleCard[] = [
  {
    id: '',
    title: 'Arrival',
    type: 'Movie',
    line: 'Atmospheric sci-fi with linguistic mystery',
  },
  {
    id: '',
    title: 'Outer Wilds',
    type: 'Game',
    line: 'Curiosity-driven cosmic archaeology',
  },
  {
    id: '',
    title: 'Dangerous Days',
    type: 'Music',
    line: 'Neon highways for a cyberpunk night',
  },
];

async function loadSamples(): Promise<SampleCard[]> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  try {
    const response = await fetch(`${apiUrl}/media/popular`, { next: { revalidate: 900 } });
    if (!response.ok) {
      return fallbackSamples;
    }
    const payload = (await response.json()) as {
      success?: boolean;
      data?: Array<{
        id: string;
        title: string;
        type: string;
        description: string | null;
        genres: string[];
      }>;
    };
    const items = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
    if (items.length === 0) {
      return fallbackSamples;
    }

    const picked: SampleCard[] = [];
    for (const mediaType of ['MOVIE', 'GAME', 'MUSIC'] as const) {
      const match = items.find((item) => item.type === mediaType);
      if (match) {
        picked.push({
          id: match.id,
          title: match.title,
          type: typeLabels[match.type] ?? match.type,
          line: (match.description ?? match.genres.slice(0, 2).join(' · ')) || 'Popular on Genie',
        });
      }
    }

    if (picked.length === 0) {
      return items.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        type: typeLabels[item.type] ?? item.type,
        line: item.description ?? 'Popular on Genie',
      }));
    }

    while (picked.length < 3 && items[picked.length]) {
      const item = items[picked.length];
      if (item && !picked.some((row) => row.id === item.id)) {
        picked.push({
          id: item.id,
          title: item.title,
          type: typeLabels[item.type] ?? item.type,
          line: item.description ?? 'Popular on Genie',
        });
      } else {
        break;
      }
    }

    return picked;
  } catch {
    return fallbackSamples;
  }
}

export default async function HomePage() {
  const samples = await loadSamples();

  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <p className="mb-6 text-xs uppercase tracking-[0.35em] text-[var(--gold)]">Recommendation Genie</p>
      <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] md:text-7xl">Your next obsession is waiting.</h1>
      <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
        Recommendation Genie learns what you love and finds movies, games and music that actually fit your taste.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Button href="/register">Build My Taste Profile</Button>
        <Button href="/about" variant="ghost">
          Explore
        </Button>
      </div>
      <section className="mt-24 grid gap-6 md:grid-cols-3">
        {[
          ['Taste learning', 'Every like, skip and “too slow” quietly rewires your profile.'],
          ['Feedback loop', 'Genie does not guess from a prompt. It scores, then listens.'],
          ['Cross-media', 'A cyberpunk game can unlock neon synth and neo-noir cinema.'],
        ].map(([title, body]) => (
          <Card key={title}>
            <h2 className="font-serif text-2xl">{title}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{body}</p>
          </Card>
        ))}
      </section>
      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {samples.map((sample) => {
          const card = (
            <Card>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">{sample.type}</p>
              <h3 className="mt-2 font-serif text-2xl">{sample.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{sample.line}</p>
            </Card>
          );

          if (!sample.id) {
            return (
              <div key={sample.title} className="block">
                {card}
              </div>
            );
          }

          return (
            <Link key={sample.id} href={`/media/${sample.id}`} className="block transition hover:opacity-90">
              {card}
            </Link>
          );
        })}
      </section>
    </main>
  );
}
