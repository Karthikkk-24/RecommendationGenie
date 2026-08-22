'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@recommendation-genie/types';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/utils';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <Card className="w-full space-y-4">
        <h1 className="font-serif text-3xl">Invalid reset link</h1>
        <p className="text-sm text-[var(--muted)]">
          This password reset link is missing or expired. Request a new one from the forgot-password page.
        </p>
        <Button type="button" className="w-full" onClick={() => router.push('/forgot-password')}>
          Request reset link
        </Button>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full space-y-4">
        <h1 className="font-serif text-3xl">Password updated</h1>
        <p className="text-sm text-[var(--muted)]">You can sign in with your new password.</p>
        <Button type="button" className="w-full" onClick={() => router.push('/login')}>
          Go to login
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <h1 className="font-serif text-3xl">Choose a new password</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          setPending(true);
          try {
            await api('/auth/reset-password', {
              method: 'POST',
              body: JSON.stringify({ token, password: values.password }),
            });
            setSuccess(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset password');
          } finally {
            setPending(false);
          }
        })}
      >
        <Input type="password" placeholder="New password" {...form.register('password')} />
        {form.formState.errors.password ? (
          <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Suspense fallback={<Card className="w-full">Loading…</Card>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
