'use client';

import { supportedMediaTypeValues, type MediaType } from '@recommendation-genie/types';

export type GenerateFilterState = {
  timeAvailableMinutes?: number;
  language?: string;
  mediaType?: MediaType;
  count?: number;
};

const timePresets = [
  { value: undefined, label: 'Any duration' },
  { value: 30, label: '≤ 30 min' },
  { value: 60, label: '≤ 1 hr' },
  { value: 90, label: '≤ 90 min' },
  { value: 120, label: '≤ 2 hr' },
  { value: 180, label: '≤ 3 hr' },
] as const;

const languageOptions = [
  { value: '', label: 'Any language' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
] as const;

export function toGeneratePayload(
  base: Record<string, unknown>,
  filters: GenerateFilterState,
): Record<string, unknown> {
  return {
    ...base,
    ...(filters.timeAvailableMinutes ? { timeAvailableMinutes: filters.timeAvailableMinutes } : {}),
    ...(filters.language ? { language: filters.language } : {}),
    ...(filters.mediaType ? { mediaType: filters.mediaType } : {}),
    ...(filters.count ? { count: filters.count } : {}),
  };
}

export function GenerateFilters({
  filters,
  onChange,
}: {
  filters: GenerateFilterState;
  onChange: (next: GenerateFilterState) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 text-sm">
      <label className="space-y-1">
        <span className="text-xs text-[var(--muted)]">Time available</span>
        <select
          className="block rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
          value={filters.timeAvailableMinutes ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            onChange({
              ...filters,
              timeAvailableMinutes: value ? Number(value) : undefined,
            });
          }}
        >
          {timePresets.map((item) => (
            <option key={item.label} value={item.value ?? ''}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs text-[var(--muted)]">Language</span>
        <select
          className="block rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
          value={filters.language ?? ''}
          onChange={(event) =>
            onChange({
              ...filters,
              language: event.target.value || undefined,
            })
          }
        >
          {languageOptions.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs text-[var(--muted)]">Media type</span>
        <select
          className="block rounded-lg border border-[var(--line)] bg-transparent px-3 py-2"
          value={filters.mediaType ?? ''}
          onChange={(event) =>
            onChange({
              ...filters,
              mediaType: event.target.value ? (event.target.value as MediaType) : undefined,
            })
          }
        >
          <option value="">Any type</option>
          {supportedMediaTypeValues.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs text-[var(--muted)]">Count ({filters.count ?? 10})</span>
        <input
          type="range"
          min={1}
          max={20}
          value={filters.count ?? 10}
          onChange={(event) =>
            onChange({
              ...filters,
              count: Number(event.target.value),
            })
          }
          className="block w-32"
        />
      </label>
    </div>
  );
}
