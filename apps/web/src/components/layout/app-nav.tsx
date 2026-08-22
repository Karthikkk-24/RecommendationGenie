'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../lib/utils';

const baseLinks = [
  { href: '/app', label: 'Home' },
  { href: '/app/discover', label: 'Discover' },
  { href: '/app/recommendations', label: 'For you' },
  { href: '/app/library', label: 'Library' },
  { href: '/app/taste', label: 'Taste' },
  { href: '/app/search', label: 'Search' },
  { href: '/app/history', label: 'History' },
  { href: '/app/activity', label: 'Activity' },
  { href: '/app/analytics', label: 'Analytics' },
  { href: '/app/settings', label: 'Settings' },
];

export function AppNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ role: string }>('/users/me'),
  });

  const links = [
    ...baseLinks,
    ...(me.data?.role === 'ADMIN' ? [{ href: '/app/admin', label: 'Admin' }] : []),
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
      router.push('/');
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[#07070c]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/app" className="font-serif text-xl tracking-tight" onClick={() => setOpen(false)}>
          Recommendation Genie
        </Link>
        <button
          type="button"
          className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] md:hidden"
          aria-expanded={open}
          aria-controls="app-mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        <nav className="hidden items-center gap-5 text-sm text-[var(--muted)] md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[var(--fg)]">
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            className="hover:text-[var(--fg)]"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </nav>
      </div>
      {open ? (
        <nav
          id="app-mobile-nav"
          className="flex flex-col gap-1 border-t border-[var(--line)] px-6 py-3 text-sm text-[var(--muted)] md:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2 py-2 hover:bg-white/5 hover:text-[var(--fg)]"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            className="rounded-lg px-2 py-2 text-left hover:bg-white/5 hover:text-[var(--fg)]"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </nav>
      ) : null}
    </header>
  );
}
