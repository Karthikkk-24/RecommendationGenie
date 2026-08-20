'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/utils';

type Me = {
  name: string | null;
  email: string;
  username: string;
  preferredLanguage: string | null;
  country: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [country, setCountry] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<Me>('/users/me'),
  });

  useEffect(() => {
    if (!me.data || hydrated) {
      return;
    }
    setName(me.data.name ?? '');
    setPreferredLanguage(me.data.preferredLanguage ?? '');
    setCountry(me.data.country ?? '');
    setHydrated(true);
  }, [me.data, hydrated]);

  const save = useMutation({
    mutationFn: (payload: { name?: string; preferredLanguage?: string; country?: string }) =>
      api('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      router.push('/');
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => api('/users/me', { method: 'DELETE' }),
    onSuccess: () => {
      router.push('/');
    },
  });

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif text-4xl">Settings</h1>
      <Card className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{me.data?.email}</p>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Name</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              if (name.trim() && name !== (me.data?.name ?? '')) {
                save.mutate({ name: name.trim() });
              }
            }}
            disabled={!hydrated}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Language</span>
          <Input
            value={preferredLanguage}
            placeholder="en"
            maxLength={8}
            onChange={(event) => setPreferredLanguage(event.target.value)}
            onBlur={() => {
              if (preferredLanguage !== (me.data?.preferredLanguage ?? '')) {
                save.mutate({ preferredLanguage: preferredLanguage || undefined });
              }
            }}
            disabled={!hydrated}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Country</span>
          <Input
            value={country}
            placeholder="US"
            maxLength={8}
            onChange={(event) => setCountry(event.target.value)}
            onBlur={() => {
              if (country !== (me.data?.country ?? '')) {
                save.mutate({ country: country || undefined });
              }
            }}
            disabled={!hydrated}
          />
        </label>
        {save.isError ? (
          <p className="text-sm text-red-400">
            {save.error instanceof Error ? save.error.message : 'Could not save settings.'}
          </p>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => logout.mutate()}>
          Log out
        </Button>
      </Card>

      <Card className="space-y-4 border-[var(--danger,#a33)]/40">
        <h2 className="font-serif text-xl">Danger zone</h2>
        <p className="text-sm text-[var(--muted)]">
          Deleting your account permanently removes your profile, taste data, library, and recommendation history.
        </p>
        {!confirmDelete ? (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
            Delete account
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? 'Deleting…' : 'Yes, delete forever'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        )}
        {deleteAccount.isError ? (
          <p className="text-sm text-red-400">Could not delete account. Try again.</p>
        ) : null}
      </Card>
    </div>
  );
}
