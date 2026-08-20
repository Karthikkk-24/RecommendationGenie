'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@recommendation-genie/types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/utils';

export default function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <h1 className="font-serif text-3xl">Reset password</h1>
        {success ? (
          <p className="mt-6 text-sm text-[var(--muted)]">
            If an account exists for that email, a reset link is on the way. Check your inbox.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setError(null);
              setPending(true);
              try {
                await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) });
                setSuccess(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not send reset link');
              } finally {
                setPending(false);
              }
            })}
          >
            <Input type="email" placeholder="Email" {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
            ) : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
