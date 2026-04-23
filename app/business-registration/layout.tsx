import { getMyBusinesses } from '@/lib/api/business/business';
import { MultiStepFormProvider } from './provider/registration-form-provider';
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

  return (
    <MultiStepFormProvider>
      <div className="font-giest flex h-screen flex-col overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-row overflow-hidden p-3">
          {children}
        </main>
      </div>
    </MultiStepFormProvider>
  );
}
