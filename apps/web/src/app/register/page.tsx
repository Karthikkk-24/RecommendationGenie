'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@recommendation-genie/types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <h1 className="font-serif text-3xl">Build your taste profile</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            setPending(true);
            try {
              await api('/auth/register', { method: 'POST', body: JSON.stringify(values) });
              router.push('/onboarding');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Registration failed');
            } finally {
              setPending(false);
            }
          })}
        >
          <Input placeholder="Name" {...form.register('name')} />
          {form.formState.errors.name ? (
            <p className="text-xs text-red-400">{form.formState.errors.name.message}</p>
          ) : null}
          <Input placeholder="Username" {...form.register('username')} />
          {form.formState.errors.username ? (
            <p className="text-xs text-red-400">{form.formState.errors.username.message}</p>
          ) : null}
          <Input type="email" placeholder="Email" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
          ) : null}
          <Input type="password" placeholder="Password (10+ characters)" {...form.register('password')} />
          {form.formState.errors.password ? (
            <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Creating…' : 'Create account'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
