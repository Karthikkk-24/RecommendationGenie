'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/utils';

function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return null;
  }
  return next;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const form = useForm<{ email: string; password: string }>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Card className="w-full">
      <h1 className="font-serif text-3xl">Welcome back</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          setPending(true);
          try {
            const session = await api<{
              user: { onboardingStatus: string };
            }>('/auth/login', { method: 'POST', body: JSON.stringify(values) });
            const next = safeInternalPath(searchParams.get('next'));
            if (session.user.onboardingStatus !== 'COMPLETED') {
              router.push('/onboarding');
              return;
            }
            router.push(next ?? '/app');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
          } finally {
            setPending(false);
          }
        })}
      >
        <Input type="email" placeholder="Email" {...form.register('email', { required: true })} />
        <Input type="password" placeholder="Password" {...form.register('password', { required: true })} />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Signing in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        <a href="/forgot-password">Forgot password</a> · <a href="/register">Create an account</a>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Suspense fallback={<Card className="w-full">Loading…</Card>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
