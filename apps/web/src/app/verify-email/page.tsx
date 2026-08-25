'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api, safeNextPath } from '../../lib/utils';

type Status = 'idle' | 'pending' | 'verifying' | 'success' | 'error';

function VerifyEmailForm() {
  const params = useSearchParams();
  const token = params.get('token');
  const pending = params.get('pending') === '1';
  const emailFromQuery = params.get('email') ?? '';
  const nextPath = safeNextPath(params.get('next'));
  const onboardingHref = nextPath ? `/onboarding?next=${encodeURIComponent(nextPath)}` : '/onboarding';
  const [status, setStatus] = useState<Status>(
    token ? 'verifying' : pending ? 'pending' : 'error',
  );
  const [message, setMessage] = useState(
    token
      ? 'Confirming your email…'
      : pending
        ? 'Check your inbox for a verification link before continuing to onboarding.'
        : 'This verification link is missing a token.',
  );
  const [email, setEmail] = useState(emailFromQuery);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

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

  const resendForm = (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setResendPending(true);
        setResendMessage(null);
        try {
          await api('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email }),
          });
          setResendMessage('If that account needs verification, a new link is on the way.');
        } catch (error) {
          setResendMessage(error instanceof Error ? error.message : 'Could not resend verification.');
        } finally {
          setResendPending(false);
        }
      }}
    >
      <Input
        type="email"
        placeholder="Email for a new link"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Button type="submit" className="w-full" disabled={resendPending}>
        {resendPending ? 'Sending…' : 'Resend verification email'}
      </Button>
    </form>
  );

  return (
    <Card className="w-full space-y-4">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Email verification</p>
      <h1 className="font-serif text-3xl">
        {status === 'success'
          ? 'You are verified'
          : status === 'pending'
            ? 'Check your email'
            : status === 'error'
              ? 'Verification failed'
              : 'Verifying…'}
      </h1>
      <p className="text-sm text-[var(--muted)]">{message}</p>
      {status === 'success' ? (
        <Button href={onboardingHref} className="w-full">
          Continue to onboarding
        </Button>
      ) : null}
      {status === 'pending' ? (
        <div className="flex flex-col gap-3">
          {resendForm}
          {resendMessage ? <p className="text-xs text-[var(--muted)]">{resendMessage}</p> : null}
          <Button href="/login" variant="ghost" className="w-full">
            Back to login
          </Button>
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="flex flex-col gap-3">
          {resendForm}
          {resendMessage ? <p className="text-xs text-[var(--muted)]">{resendMessage}</p> : null}
          <Button href="/login" variant="ghost" className="w-full">
            Back to login
          </Button>
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
