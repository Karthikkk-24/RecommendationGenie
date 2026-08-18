export function PreferenceBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
      {label} {Math.round((value + 1) * 50)}%
    </span>
  );
}
