'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<{ email: string; password: string }>();

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <h1 className="font-serif text-3xl">Welcome back</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await api('/auth/login', { method: 'POST', body: JSON.stringify(values) });
            router.push('/app');
          })}
        >
          <Input type="email" placeholder="Email" {...form.register('email', { required: true })} />
          <Input type="password" placeholder="Password" {...form.register('password', { required: true })} />
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--muted)]">
          <a href="/forgot-password">Forgot password</a> · <a href="/register">Create an account</a>
        </p>
      </Card>
    </main>
  );
}
