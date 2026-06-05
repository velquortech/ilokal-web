'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type {
  BusinessSettings,
  OperatingHours,
  SocialLinks,
} from '@/lib/types';
import { upsertBusinessSettingsAction } from '../../actions/settingsActions';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { OperatingHoursForm, DEFAULT_HOURS } from './OperatingHoursForm';
import { SocialLinksForm } from './SocialLinksForm';

interface BusinessPreferencesTabProps {
  initialSettings: BusinessSettings | null;
}

export function BusinessPreferencesTab({
  initialSettings,
}: BusinessPreferencesTabProps) {
  const { business } = useBusinessShop();

  const [operatingHours, setOperatingHours] = useState<OperatingHours>(
    (initialSettings?.operating_hours as OperatingHours) ?? DEFAULT_HOURS,
  );
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(
    (initialSettings?.social_links as SocialLinks) ?? {},
  );
  const [contactWebsite, setContactWebsite] = useState(
    initialSettings?.contact_website ?? '',
  );
  const [contactPhone, setContactPhone] = useState(
    initialSettings?.contact_phone_public ?? '',
  );
  const [allowReviews, setAllowReviews] = useState(
    initialSettings?.allow_reviews ?? true,
  );
  const [expiryDays, setExpiryDays] = useState(
    initialSettings?.coupon_default_expiry_days ?? 30,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    if (!business?.id) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    const result = await upsertBusinessSettingsAction(business.id, {
      operating_hours: operatingHours,
      social_links: socialLinks,
      contact_website: contactWebsite || null,
      contact_phone_public: contactPhone || null,
      allow_reviews: allowReviews,
      coupon_default_expiry_days: expiryDays,
    });
    setSaving(false);
    if (result.success) {
      setSaveSuccess(true);
    } else {
      setSaveError(result.error?.message ?? 'Failed to save settings');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operating Hours</CardTitle>
          <CardDescription>
            Set your regular weekly schedule. Customers can see this on your
            public page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OperatingHoursForm
            value={operatingHours}
            onChange={setOperatingHours}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public Contact Info</CardTitle>
          <CardDescription>
            Displayed to customers on your business page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-website">Website</Label>
            <Input
              id="contact-website"
              type="url"
              placeholder="https://yourbusiness.com"
              value={contactWebsite}
              onChange={(e) => setContactWebsite(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-phone">Public Phone Number</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder="+63 912 345 6789"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social Links</CardTitle>
          <CardDescription>
            Link your social media profiles so customers can follow you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SocialLinksForm value={socialLinks} onChange={setSocialLinks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Defaults</CardTitle>
          <CardDescription>
            Default settings applied when creating new content.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                Allow Customer Reviews
              </Label>
              <p className="text-muted-foreground text-xs">
                Customers can rate and review your products
              </p>
            </div>
            <Switch checked={allowReviews} onCheckedChange={setAllowReviews} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiry-days" className="text-sm font-medium">
              Default Coupon Expiry (days)
            </Label>
            <Input
              id="expiry-days"
              type="number"
              min={1}
              max={365}
              value={expiryDays}
              onChange={(e) =>
                setExpiryDays(
                  Math.min(365, Math.max(1, Number(e.target.value))),
                )
              }
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
      {saveSuccess && (
        <Alert>
          <AlertDescription>Business preferences saved.</AlertDescription>
        </Alert>
      )}

      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
