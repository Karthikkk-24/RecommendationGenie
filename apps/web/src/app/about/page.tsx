import { Card } from '../../components/ui/card';

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-serif text-5xl">How Genie thinks</h1>
      <p className="mt-6 text-[var(--muted)]">
        Tell Genie what you love. Genie learns your taste and finds what you’ll love next — without inventing titles
        out of thin air.
      </p>
      <div className="mt-10 space-y-4">
        {[
          'Candidates are gathered from similarity, genres, hidden gems and exploration.',
          'A versioned scoring model ranks them with explainable components.',
          'AI may rerank that shortlist. It never invents the catalog.',
          'Your feedback updates a bounded taste profile with decay (~98% retention per update), so old habits fade gradually.',
        ].map((line) => (
          <Card key={line}>
            <p>{line}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
