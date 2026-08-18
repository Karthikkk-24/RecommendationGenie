'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/utils';

export default function SettingsPage() {
  const router = useRouter();
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
    </div>
  );
}
