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
    // onlyActive: hide disabled rows (e.g. Tourism & Leisure, on hold) from
    // the registration picker — admin reads still see them.
    businessService.getBusinessTypes({ onlyActive: true }),
    getRegistrationSettings(),
  ]);
  const rawBusinessTypes = (data ?? []) as unknown as RawBusinessType[];

  return (
    <MultiStepFormProvider
      rawBusinessTypes={rawBusinessTypes}
      requireDocuments={requireBusinessDocuments}
    >
      {/*
        Single scroll container: the page scrolls, nothing nests a second
        scroller. The previous shell was `h-screen overflow-hidden` with an
        inner `overflow-y-auto`, which relied on an unbroken definite-height
        chain (h-screen → flex-1 main → h-full sidebar). When any link in that
        chain resolves to `auto` the sidebar collapses to its content height
        and the short last step leaves a large empty band below the form.
        `min-h-dvh` needs no such chain, and dvh (not vh) keeps it correct
        under a mobile browser's collapsing toolbar.
      */}
      <div className="font-giest flex min-h-dvh flex-col">
        <main className="flex flex-1 flex-row items-stretch gap-3 p-3">
          {children}
        </main>
      </div>
    </MultiStepFormProvider>
  );
}
