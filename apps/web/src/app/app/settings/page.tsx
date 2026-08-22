'use client';

import { supportedMediaTypeValues, type MediaType } from '@recommendation-genie/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { api } from '../../../lib/utils';

type Me = {
  name: string | null;
  email: string;
  username: string;
  preferredLanguage: string | null;
  country: string | null;
  imageUrl: string | null;
  profile: { bio: string | null } | null;
  preference: { enabledMediaTypes: MediaType[] } | null;
  notificationPreference: NotificationPreferences | null;
};

type NotificationPreferences = {
  emailRecommendations: boolean;
  emailDigest: boolean;
  productUpdates: boolean;
};

const mediaTypeLabels: Record<MediaType, string> = {
  MOVIE: 'Movies',
  GAME: 'Games',
  MUSIC: 'Music',
  TV_SHOW: 'TV Shows',
  BOOK: 'Books',
  ANIME: 'Anime',
  PODCAST: 'Podcasts',
};

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mediaTypes, setMediaTypes] = useState<MediaType[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailRecommendations: true,
    emailDigest: true,
    productUpdates: true,
  });
  const [hydrated, setHydrated] = useState(false);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<Me>('/users/me'),
  });

  useEffect(() => {
    if (!me.data || hydrated) {
      return;
    }
    setName(me.data.name ?? '');
    setPreferredLanguage(me.data.preferredLanguage ?? '');
    setCountry(me.data.country ?? '');
    setBio(me.data.profile?.bio ?? '');
    setImageUrl(me.data.imageUrl ?? '');
    setMediaTypes(me.data.preference?.enabledMediaTypes ?? []);
    if (me.data.notificationPreference) {
      setNotifications(me.data.notificationPreference);
    }
    setHydrated(true);
  }, [me.data, hydrated]);

  const invalidateMe = () => {
    void queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const save = useMutation({
    mutationFn: (payload: { name?: string; preferredLanguage?: string; country?: string; imageUrl?: string }) =>
      api('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: invalidateMe,
  });

  const saveBio = useMutation({
    mutationFn: (payload: { bio?: string }) =>
      api('/profiles/me', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: invalidateMe,
  });

  const saveMediaTypes = useMutation({
    mutationFn: (payload: { mediaTypes: MediaType[] }) =>
      api('/users/me/media-types', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: invalidateMe,
  });

  const saveNotifications = useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) =>
      api('/users/me/notification-preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: invalidateMe,
  });

  const changePassword = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
    },
  });

  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      router.push('/');
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => api('/users/me', { method: 'DELETE' }),
    onSuccess: () => {
      router.push('/');
    },
  });

  const toggleMediaType = (type: MediaType) => {
    const next = mediaTypes.includes(type) ? mediaTypes.filter((t) => t !== type) : [...mediaTypes, type];
    setMediaTypes(next);
    saveMediaTypes.mutate({ mediaTypes: next });
  };

  const toggleNotification = (key: keyof NotificationPreferences) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    saveNotifications.mutate({ [key]: next[key] });
  };

  const settingsError =
    save.error ?? saveBio.error ?? saveMediaTypes.error ?? saveNotifications.error ?? changePassword.error;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif text-4xl">Settings</h1>

      <Card className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{me.data?.email}</p>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Name</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              if (name.trim() && name !== (me.data?.name ?? '')) {
                save.mutate({ name: name.trim() });
              }
            }}
            disabled={!hydrated}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Bio</span>
          <Input
            value={bio}
            placeholder="Tell Genie a little about your taste"
            maxLength={500}
            onChange={(event) => setBio(event.target.value)}
            onBlur={() => {
              if (bio !== (me.data?.profile?.bio ?? '')) {
                saveBio.mutate({ bio: bio || undefined });
              }
            }}
            disabled={!hydrated}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Avatar URL</span>
          <Input
            value={imageUrl}
            placeholder="https://…"
            onChange={(event) => setImageUrl(event.target.value)}
            onBlur={() => {
              if (imageUrl !== (me.data?.imageUrl ?? '')) {
                save.mutate({ imageUrl: imageUrl || undefined });
              }
            }}
            disabled={!hydrated}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Language</span>
          <Input
            value={preferredLanguage}
            placeholder="en"
            maxLength={8}
            onChange={(event) => setPreferredLanguage(event.target.value)}
            onBlur={() => {
              if (preferredLanguage !== (me.data?.preferredLanguage ?? '')) {
                save.mutate({ preferredLanguage: preferredLanguage || undefined });
              }
            }}
            disabled={!hydrated}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Country</span>
          <Input
            value={country}
            placeholder="US"
            maxLength={8}
            onChange={(event) => setCountry(event.target.value)}
            onBlur={() => {
              if (country !== (me.data?.country ?? '')) {
                save.mutate({ country: country || undefined });
              }
            }}
            disabled={!hydrated}
          />
        </label>
        {settingsError ? (
          <p className="text-sm text-red-400">
            {settingsError instanceof Error ? settingsError.message : 'Could not save settings.'}
          </p>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => logout.mutate()}>
          Log out
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-serif text-xl">Media types</h2>
        <p className="text-sm text-[var(--muted)]">Choose which kinds of recommendations Genie should include.</p>
        <div className="flex flex-wrap gap-2">
          {supportedMediaTypeValues.map((type) => {
            const active = mediaTypes.includes(type);
            return (
              <Button
                key={type}
                type="button"
                variant={active ? 'default' : 'ghost'}
                onClick={() => toggleMediaType(type)}
                disabled={!hydrated || saveMediaTypes.isPending}
              >
                {mediaTypeLabels[type]}
              </Button>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-serif text-xl">Email notifications</h2>
        {(
          [
            ['emailRecommendations', 'New recommendations'],
            ['emailDigest', 'Weekly digest'],
            ['productUpdates', 'Product updates'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-4 text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={notifications[key]}
              onChange={() => toggleNotification(key)}
              disabled={!hydrated || saveNotifications.isPending}
            />
          </label>
        ))}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-serif text-xl">Change password</h2>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Current password</span>
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={!hydrated}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">New password</span>
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={!hydrated}
          />
        </label>
        <Button
          type="button"
          onClick={() =>
            changePassword.mutate({ currentPassword, newPassword })
          }
          disabled={!hydrated || !currentPassword || newPassword.length < 10 || changePassword.isPending}
        >
          {changePassword.isPending ? 'Updating…' : 'Update password'}
        </Button>
        {changePassword.isSuccess ? (
          <p className="text-sm text-[var(--gold)]">Password updated.</p>
        ) : null}
      </Card>

      <Card className="space-y-4 border-[var(--danger,#a33)]/40">
        <h2 className="font-serif text-xl">Danger zone</h2>
        <p className="text-sm text-[var(--muted)]">
          Deleting your account permanently removes your profile, taste data, library, and recommendation history.
        </p>
        {!confirmDelete ? (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
            Delete account
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? 'Deleting…' : 'Yes, delete forever'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        )}
        {deleteAccount.isError ? (
          <p className="text-sm text-red-400">Could not delete account. Try again.</p>
        ) : null}
      </Card>
    </div>
  );
}
