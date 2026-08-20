export { MediaCard as RecommendationCard } from '../media/media-card';
export { MatchScore, ScoreBreakdown, type ScoreParts } from './score-breakdown';

export function RecommendationReason({ text }: { text: string }) {
  return <p className="text-sm text-[var(--muted)]">{text}</p>;
}
