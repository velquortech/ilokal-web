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
import {
  updateRegistrationSettingAction,
  type PlatformSettingKey,
} from '../../actions/settingsActions';

const TOGGLES: {
  key: PlatformSettingKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'enable_events',
    label: 'Events',
    description:
      'When on, shops can propose events, this queue accepts them, and approved events appear on Explore. While off every events route 404s and no nav entry advertises it.',
  },
  {
    key: 'enable_onboarding_tour',
    label: 'Onboarding tour',
    description:
      'The guided tour a shop owner is offered when they first reach their dashboard, plus the "Replay tour" entry in their menu. Unlike the feature above this is ON until switched off — it is a presentational overlay, not a dark-shipped feature. Turn it off if the spotlight misbehaves.',
  },
];

/**
 * The dark-shipped feature.
 *
 * These switches control what people can REACH, not what the database allows —
 * each feature enforces its own flag server-side as well, so flipping a switch
 * here can never be the only thing standing between a caller and the data.
 */
export function FeatureFlagsCard({
  initial,
}: {
  initial: Record<PlatformSettingKey, boolean>;
}) {
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (key: PlatformSettingKey, value: boolean) => {
    const previous = values[key];
    // Optimistic, then rolled back on failure — a switch that lags behind the
    // click reads as broken.
    setValues((prev) => ({ ...prev, [key]: value }));

    startTransition(async () => {
      const toastId = `setting-${key}`;
      toast.loading('Saving setting…', { id: toastId });

      const result = await updateRegistrationSettingAction(key, value);

      if (result.success) {
        toast.success('Setting saved', { id: toastId });
      } else {
        setValues((prev) => ({ ...prev, [key]: previous }));
        toast.error(result.error ?? 'Failed to save setting', { id: toastId });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features</CardTitle>
        <CardDescription>
          Switches for features that ship dark. Turning one off hides it
          everywhere and makes its routes 404.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {TOGGLES.map(({ key, label, description }) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor={`flag-${key}`}>{label}</Label>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            <Switch
              id={`flag-${key}`}
              checked={values[key]}
              disabled={isPending}
              onCheckedChange={(next) => handleToggle(key, next)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
