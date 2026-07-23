import { getRegistrationSettings } from '@/lib/api/appSettings';
import { RegistrationSettingsCard } from './components/registration-settings-card';

export const dynamic = 'force-dynamic';

/**
 * Platform settings. Admin-managed feature flags — currently the two
 * business-registration gates (see .claude/REGISTRATION_GATING.md).
 */
export default async function AdminSettingsPage() {
  const settings = await getRegistrationSettings();

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Feature flags that control how businesses join the platform.
        </p>
      </div>
      <RegistrationSettingsCard initialSettings={settings} />
    </div>
  );
}
