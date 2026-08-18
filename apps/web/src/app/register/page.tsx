'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { api } from '../../lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<{ name: string; username: string; email: string; password: string }>();

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <h1 className="font-serif text-3xl">Build your taste profile</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await api('/auth/register', { method: 'POST', body: JSON.stringify(values) });
            router.push('/onboarding');
          })}
        >
          <Input placeholder="Name" {...form.register('name', { required: true })} />
          <Input placeholder="Username" {...form.register('username', { required: true })} />
          <Input type="email" placeholder="Email" {...form.register('email', { required: true })} />
          <Input type="password" placeholder="Password (10+ characters)" {...form.register('password', { required: true, minLength: 10 })} />
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
      </Card>
    </main>
  );
}
