'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ name: string; email: string; username: string; preferredLanguage: string }>('/users/me'),
  });
  const save = useMutation({
    mutationFn: (name: string) => api('/users/me', { method: 'PATCH', body: JSON.stringify({ name }) }),
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
        <Input defaultValue={me.data?.name} onBlur={(event) => save.mutate(event.target.value)} />
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
            <Button
              type="button"
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
            >
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
