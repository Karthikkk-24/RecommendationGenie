'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/utils';

const actions = [
  { action: 'LOVE', label: 'Love it' },
  { action: 'LIKE', label: 'Like it' },
  { action: 'MAYBE', label: 'Maybe' },
  { action: 'NOT_FOR_ME', label: 'Not for me' },
  { action: 'NEVER_THIS_TYPE', label: 'Never this type' },
  { action: 'ALREADY_CONSUMED', label: 'Already consumed' },
  { action: 'SAVE', label: 'Save' },
] as const;

const reasons = [
  'TOO_SLOW',
  'TOO_PREDICTABLE',
  'WRONG_GENRE',
  'TOO_DARK',
  'TOO_MAINSTREAM',
  'TOO_OBSCURE',
  'NOT_MY_MOOD',
  'OTHER',
] as const;

export function FeedbackControl({
  mediaItemId,
  recommendationItemId,
}: {
  mediaItemId: string;
  recommendationItemId?: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: { action: string; reason?: string }) =>
      api('/feedback', {
        method: 'POST',
        body: JSON.stringify({ mediaItemId, recommendationItemId, ...payload }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => mutation.mutate({ action: item.action })}
            className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--gold)]"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <button
            key={reason}
            type="button"
            onClick={() => mutation.mutate({ action: 'NOT_FOR_ME', reason })}
            className="text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--fg)]"
          >
            {reason.replaceAll('_', ' ').toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
