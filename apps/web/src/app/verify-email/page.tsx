'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { api } from '../../lib/utils';

type Status = 'idle' | 'verifying' | 'success' | 'error';

function VerifyEmailForm() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState(
    token ? 'Confirming your email…' : 'This verification link is missing a token.',
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await api('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        if (!cancelled) {
          setStatus('success');
          setMessage('Your email is verified. Genie is ready when you are.');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'This verification link is invalid or expired.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card className="w-full space-y-4">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Email verification</p>
      <h1 className="font-serif text-3xl">
        {status === 'success' ? 'You are verified' : status === 'error' ? 'Verification failed' : 'Verifying…'}
      </h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {status === 'success' ? (
        <Button href="/app" className="w-full">
          Continue to Genie
        </Button>
      ) : null}
      {status === 'error' ? (
        <div className="flex flex-col gap-3">
          <Button href="/login" className="w-full">
            Back to login
          </Button>
          <p className="text-xs text-[var(--muted)]">
            Need a new link? Sign in and request another verification email, or register again if you never finished setup.
          </p>
          <Link href="/register" className="text-sm text-[var(--gold)] hover:underline">
            Create an account
          </Link>
        </div>
      ) : null}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Suspense
        fallback={
          <Card className="w-full">
            <p className="text-sm text-[var(--muted)]">Loading verification…</p>
          </Card>
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
