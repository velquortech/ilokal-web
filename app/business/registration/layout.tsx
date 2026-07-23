import { getMyBusinesses } from '@/lib/api/business/business';
import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { getRegistrationSettings } from '@/lib/api/appSettings';
import { MultiStepFormProvider } from './provider/registration-form-provider';
import type { RawBusinessType } from './api/fetchCategories';
import { redirect } from 'next/navigation';

export default async function RegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await getMyBusinesses();

  if (business) {
    redirect('/business');
  }

  const [{ data }, { requireBusinessDocuments }] = await Promise.all([
    businessService.getBusinessTypes(),
    getRegistrationSettings(),
  ]);
  const rawBusinessTypes = (data ?? []) as unknown as RawBusinessType[];

  return (
    <MultiStepFormProvider
      rawBusinessTypes={rawBusinessTypes}
      requireDocuments={requireBusinessDocuments}
    >
      <div className="font-giest flex h-screen flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-row overflow-hidden p-3">
          {children}
        </main>
      </div>
    </MultiStepFormProvider>
  );
}
