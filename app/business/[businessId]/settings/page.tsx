import { notFound, redirect } from 'next/navigation';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { getBusinessSettings } from '@/lib/api/settings/settingsQuery';
import { getNotificationPreferences } from '@/lib/api/settings/settingsQuery';
import { createServerSupabaseClient } from '@/supabase/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecurityTab } from './components/SecurityTab';
import { NotificationsTab } from './components/NotificationsTab';
import { BusinessPreferencesTab } from './components/BusinessPreferencesTab';
import { DangerZoneTab } from './components/DangerZoneTab';
import type { MFAFactor } from '@/lib/types';

type Params = Promise<{ businessId: string }>;

export default async function SettingsPage({ params }: { params: Params }) {
  const { businessId } = await params;

  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized) {
    const err = verify.error;
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'AUTHENTICATION_ERROR'
    ) {
      redirect('/login');
    }
    notFound();
  }

  const userId = verify.user!.id;

  const supabase = await createServerSupabaseClient();
  const [businessSettings, notificationPreferences, mfaResult] =
    await Promise.all([
      getBusinessSettings(businessId),
      getNotificationPreferences(userId),
      supabase.auth.mfa.listFactors(),
    ]);

  const factors: MFAFactor[] = (mfaResult.data?.totp ?? []).map((f) => ({
    id: f.id,
    friendly_name: f.friendly_name ?? null,
    factor_type: 'totp' as const,
    status: f.status as 'verified' | 'unverified',
    created_at: f.created_at,
    updated_at: f.updated_at,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account security, notifications, and business preferences.
        </p>
      </div>

      <Tabs defaultValue="security" className="flex flex-col gap-0">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="security"
            className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 pt-2 pb-3 font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 pt-2 pb-3 font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="business"
            className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-4 pt-2 pb-3 font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Business Preferences
          </TabsTrigger>
          <TabsTrigger
            value="danger"
            className="text-destructive data-[state=active]:border-destructive rounded-none border-b-2 border-transparent px-4 pt-2 pb-3 font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <div className="pt-6">
          <TabsContent value="security" className="mt-0">
            <SecurityTab initialFactors={factors} />
          </TabsContent>
          <TabsContent value="notifications" className="mt-0">
            <NotificationsTab initialPreferences={notificationPreferences} />
          </TabsContent>
          <TabsContent value="business" className="mt-0">
            <BusinessPreferencesTab initialSettings={businessSettings} />
          </TabsContent>
          <TabsContent value="danger" className="mt-0">
            <DangerZoneTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
