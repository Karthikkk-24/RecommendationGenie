import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: 'primary' | 'ghost' | 'danger';
  children: ReactNode;
};

export function Button({ href, variant = 'primary', className, children, ...props }: Props) {
  const styles = cn(
    'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition',
    variant === 'primary' && 'bg-[var(--gold)] text-[#1a1208] hover:bg-[var(--gold-2)]',
    variant === 'ghost' && 'border border-[var(--line)] text-[var(--fg)] hover:bg-white/5',
    variant === 'danger' && 'bg-[var(--danger)] text-white',
    className,
  );
  if (href) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }
  return (
    <button className={styles} {...props}>
      {children}
    </button>
  );
}
