export { MediaCard as RecommendationCard } from '../media/media-card';

export function MatchScore({ value }: { value: number }) {
  return <span className="text-[var(--gold)]">{Math.round(value * 100)}% match</span>;
}

export function RecommendationReason({ text }: { text: string }) {
  return <p className="text-sm text-[var(--muted)]">{text}</p>;
}
