import { MultiStepFormProvider } from './provider/registration-form-provider';

export default function RegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
