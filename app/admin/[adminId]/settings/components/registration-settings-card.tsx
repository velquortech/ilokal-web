'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { RegistrationSettings } from '@/lib/api/appSettings';
import {
  updateRegistrationSettingAction,
  type RegistrationSettingKey,
} from '../../actions/settingsActions';

const TOGGLES: {
  key: RegistrationSettingKey;
  field: keyof RegistrationSettings;
  label: string;
  description: string;
}[] = [
  {
    key: 'require_business_documents',
    field: 'requireBusinessDocuments',
    label: 'Require business documents',
    description:
      'When on, registration includes the Documents step and a business license + tax certificate are required before submitting.',
  },
  {
    key: 'auto_verify_businesses',
    field: 'autoVerifyBusinesses',
    label: 'Auto-verify new businesses',
    description:
      'When on, newly registered businesses go live immediately (status "verified"). When off, they start as "pending" and must be approved from the Business Documents page.',
  },
];

export function RegistrationSettingsCard({
  initialSettings,
}: {
  initialSettings: RegistrationSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (
    key: RegistrationSettingKey,
    field: keyof RegistrationSettings,
    value: boolean,
  ) => {
    const previous = settings[field];
    setSettings((prev) => ({ ...prev, [field]: value }));

    startTransition(async () => {
      const toastId = `setting-${key}`;
      toast.loading('Saving setting...', { id: toastId });
      const result = await updateRegistrationSettingAction(key, value);
      if (result.success) {
        toast.success('Setting saved', { id: toastId });
      } else {
        setSettings((prev) => ({ ...prev, [field]: previous }));
        toast.error(result.error ?? 'Failed to save setting', { id: toastId });
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Business Registration</CardTitle>
        <CardDescription>
          Control the onboarding flow for new businesses. Changes apply
          immediately to new registrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {TOGGLES.map(({ key, field, label, description }) => (
          <div key={key} className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            <Switch
              id={key}
              checked={settings[field]}
              disabled={isPending}
              onCheckedChange={(checked) => handleToggle(key, field, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
