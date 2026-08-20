export type ScoreParts = {
  final?: number | null;
  content?: number | null;
  taste?: number | null;
  feedback?: number | null;
  creator?: number | null;
  quality?: number | null;
  novelty?: number | null;
  exploration?: number | null;
  ai?: number | null;
};

function pct(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return `${Math.round(value * 100)}%`;
}

/** Honest stored/computed component scores — never invent values in the UI. */
export function ScoreBreakdown({
  scores,
  showHeadline = true,
  className = '',
}: {
  scores: ScoreParts;
  showHeadline?: boolean;
  className?: string;
}) {
  const finalPct = pct(scores.final);
  const parts = [
    ['Content', scores.content],
    ['Taste', scores.taste],
    ['Feedback', scores.feedback],
    ['Creator', scores.creator],
    ['Quality', scores.quality],
    ['Novelty', scores.novelty],
    ['Exploration', scores.exploration],
    ['AI', scores.ai],
  ]
    .map(([label, value]) => {
      const text = pct(value as number | null | undefined);
      return text ? `${label} ${text}` : null;
    })
    .filter((row): row is string => Boolean(row));

  return (
    <div className={className}>
      {showHeadline && finalPct ? (
        <p className="text-sm text-[var(--gold)]">Genie match {finalPct}</p>
      ) : null}
      {parts.length > 0 ? <p className="mt-1 text-xs text-[var(--muted)]">{parts.join(' · ')}</p> : null}
    </div>
  );
}

export function MatchScore({ value }: { value: number }) {
  return <span className="text-[var(--gold)]">{Math.round(value * 100)}% match</span>;
}
