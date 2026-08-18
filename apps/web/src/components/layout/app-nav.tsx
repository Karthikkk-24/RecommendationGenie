'use client';

import Link from 'next/link';

const links = [
  { href: '/app', label: 'Home' },
  { href: '/app/discover', label: 'Discover' },
  { href: '/app/recommendations', label: 'For you' },
  { href: '/app/library', label: 'Library' },
  { href: '/app/taste', label: 'Taste' },
  { href: '/app/search', label: 'Search' },
  { href: '/app/history', label: 'History' },
  { href: '/app/analytics', label: 'Analytics' },
  { href: '/app/settings', label: 'Settings' },
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[#07070c]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/app" className="font-serif text-xl tracking-tight">
          Recommendation Genie
        </Link>
        <nav className="hidden gap-5 text-sm text-[var(--muted)] md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[var(--fg)]">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
