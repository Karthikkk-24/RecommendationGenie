'use client';

import { Input } from '../ui/input';

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search the catalog" />;
}
