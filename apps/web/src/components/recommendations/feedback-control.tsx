'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
  'DONT_LIKE_CREATOR',
  'NOT_INTERESTED_IN_PREMISE',
  'TOO_DIFFICULT',
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
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const mutation = useMutation({
    mutationFn: (payload: { action: string; reason?: string; otherText?: string }) =>
      api('/feedback', {
        method: 'POST',
        body: JSON.stringify({ mediaItemId, recommendationItemId, ...payload }),
      }),
    onSuccess: () => {
      setOtherOpen(false);
      setOtherText('');
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
            onClick={() => {
              if (reason === 'OTHER') {
                setOtherOpen(true);
                return;
              }
              mutation.mutate({ action: 'NOT_FOR_ME', reason });
            }}
            className="text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--fg)]"
          >
            {reason.replaceAll('_', ' ').toLowerCase()}
          </button>
        ))}
      </div>
      {otherOpen ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            value={otherText}
            onChange={(event) => setOtherText(event.target.value)}
            placeholder="Tell Genie why…"
            className="min-w-[200px] flex-1 rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--gold)]"
          />
          <button
            type="button"
            disabled={mutation.isPending || otherText.trim().length < 2}
            onClick={() =>
              mutation.mutate({
                action: 'NOT_FOR_ME',
                reason: 'OTHER',
                otherText: otherText.trim(),
              })
            }
            className="rounded-full border border-[var(--gold)] px-3 py-1 text-xs text-[var(--gold)] disabled:opacity-40"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => {
              setOtherOpen(false);
              setOtherText('');
            }}
            className="text-xs text-[var(--muted)]"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
