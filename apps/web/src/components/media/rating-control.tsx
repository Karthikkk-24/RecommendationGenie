'use client';

export function RatingControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={star <= value ? 'text-[var(--gold)]' : 'text-[var(--muted)]'}
        >
          ★
        </button>
      ))}
    </div>
  );
}
