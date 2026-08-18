import { AppNav } from '../../components/layout/app-nav';
import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <AppNav />
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  );
}
