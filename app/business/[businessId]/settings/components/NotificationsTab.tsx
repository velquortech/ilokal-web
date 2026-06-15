'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { NotificationPreferences } from '@/lib/types';
import { updateNotificationPreferencesAction } from '../../actions/settingsActions';
import { useBusinessShop } from '@/providers/BusinessProvider';

interface NotificationsTabProps {
  initialPreferences: NotificationPreferences | null;
}

const DIGEST_OPTIONS: {
  value: NotificationPreferences['digest'];
  label: string;
  description: string;
}[] = [
  { value: 'daily', label: 'Daily', description: 'One summary email per day' },
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'One summary email per week',
  },
  { value: 'none', label: 'None', description: 'No digest emails' },
];

export function NotificationsTab({
  initialPreferences,
}: NotificationsTabProps) {
  const { business } = useBusinessShop();
  const [prefs, setPrefs] = useState<
    Pick<NotificationPreferences, 'email' | 'push' | 'digest'>
  >({
    email: initialPreferences?.email ?? true,
    push: initialPreferences?.push ?? false,
    digest: initialPreferences?.digest ?? 'daily',
  });
  const [saveError, setSaveError] = useState('');
  const [isPending, startTransition] = useTransition();

  function save(next: Partial<typeof prefs>) {
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    setSaveError('');
    startTransition(async () => {
      if (!business?.id) return;
      const result = await updateNotificationPreferencesAction(
        business.id,
        updated,
      );
      if (!result.success)
        setSaveError(result.error?.message ?? 'Failed to save preferences');
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to be notified about activity on your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-toggle" className="text-sm font-medium">
                Email Notifications
              </Label>
              <p className="text-muted-foreground text-xs">
                Receive emails for new followers, redemptions, and reviews
              </p>
            </div>
            <Switch
              id="email-toggle"
              checked={prefs.email}
              onCheckedChange={(checked) => save({ email: checked })}
              disabled={isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-toggle" className="text-sm font-medium">
                Push Notifications
              </Label>
              <p className="text-muted-foreground text-xs">
                In-app alerts when customers interact with your business
              </p>
            </div>
            <Switch
              id="push-toggle"
              checked={prefs.push}
              onCheckedChange={(checked) => save({ push: checked })}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Digest Frequency</CardTitle>
          <CardDescription>
            How often you receive a summary of your business activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={prefs.digest}
            onValueChange={(v) =>
              save({ digest: v as NotificationPreferences['digest'] })
            }
            disabled={isPending}
            className="flex flex-col gap-3"
          >
            {DIGEST_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-start gap-3">
                <RadioGroupItem
                  value={opt.value}
                  id={`digest-${opt.value}`}
                  className="mt-0.5"
                />
                <div>
                  <Label
                    htmlFor={`digest-${opt.value}`}
                    className="cursor-pointer text-sm font-medium"
                  >
                    {opt.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {opt.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
