'use client';

import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/utils';

function ResetForm() {
  const params = useSearchParams();
  const form = useForm<{ password: string }>();
  return (
    <Card className="w-full">
      <h1 className="font-serif text-3xl">Choose a new password</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          await api('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token: params.get('token'), password: values.password }),
          });
        })}
      >
        <Input type="password" placeholder="New password" {...form.register('password', { required: true, minLength: 10 })} />
        <Button type="submit" className="w-full">
          Update password
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Suspense>
        <ResetForm />
      </Suspense>
    </main>
  );
}
