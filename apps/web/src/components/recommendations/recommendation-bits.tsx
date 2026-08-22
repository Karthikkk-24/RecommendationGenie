export { MediaCard as RecommendationCard } from '../media/media-card';
export { MatchScore, ScoreBreakdown, type ScoreParts } from './score-breakdown';

export function RecommendationReason({ text, className }: { text: string; className?: string }) {
  return <p className={className ? `${className} text-sm text-[var(--muted)]` : 'text-sm text-[var(--muted)]'}>{text}</p>;
}
