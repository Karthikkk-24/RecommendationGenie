import { AppNav } from '../../components/layout/app-nav';
import { OnboardingGate } from '../../components/layout/onboarding-gate';
import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <AppNav />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <OnboardingGate>{children}</OnboardingGate>
      </div>
    </div>
  );
}
