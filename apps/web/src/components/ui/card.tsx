import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('glass rounded-3xl p-5', className)}>{children}</div>;
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
      {children}
    </span>
  );
}
