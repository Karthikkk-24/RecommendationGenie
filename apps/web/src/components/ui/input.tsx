import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-[var(--line)] bg-black/30 px-4 py-3 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--gold)]',
        className,
      )}
      {...props}
    />
  );
}
