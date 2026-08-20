import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const samples = [
  {
    id: 'media_arrival',
    title: 'Arrival',
    type: 'Movie',
    line: 'Atmospheric sci-fi with linguistic mystery',
  },
  {
    id: 'media_outer_wilds',
    title: 'Outer Wilds',
    type: 'Game',
    line: 'Curiosity-driven cosmic archaeology',
  },
  {
    id: 'media_perturbator',
    title: 'Dangerous Days',
    type: 'Music',
    line: 'Neon highways for a cyberpunk night',
  },
];

export default function HomePage() {
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
        {samples.map((sample) => (
          <Link key={sample.id} href={`/media/${sample.id}`} className="block transition hover:opacity-90">
            <Card>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">{sample.type}</p>
              <h3 className="mt-2 font-serif text-2xl">{sample.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{sample.line}</p>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
