'use client';

import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/utils';

export default function ForgotPasswordPage() {
  const form = useForm<{ email: string }>();
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <h1 className="font-serif text-3xl">Reset password</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) });
          })}
        >
          <Input type="email" placeholder="Email" {...form.register('email', { required: true })} />
          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>
      </Card>
    </main>
  );
}
