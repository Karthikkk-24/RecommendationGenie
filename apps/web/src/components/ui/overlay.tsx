import type { ReactNode } from 'react';

export function Dialog({ open, title, children }: { open: boolean; title: string; children: ReactNode }) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6">
      <div className="glass max-w-lg rounded-3xl p-6">
        <h2 className="font-serif text-2xl">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Modal(props: { open: boolean; title: string; children: ReactNode }) {
  return <Dialog {...props} />;
}

export function Tabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-full px-3 py-1 text-sm ${value === tab ? 'bg-[var(--gold)] text-black' : 'border border-[var(--line)]'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className ?? 'h-24'}`} />;
}

export function Toast({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <div className="fixed bottom-6 right-6 rounded-full bg-[var(--gold)] px-4 py-2 text-sm text-black">{message}</div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span title={label} className="cursor-help">
      {children}
    </span>
  );
}

export function Dropdown({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-[var(--line)] bg-black/40 px-3 py-2 text-sm"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}
