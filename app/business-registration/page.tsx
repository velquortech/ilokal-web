'use client';

import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { useMultiStepForm } from './provider/registration-form-provider';
import { FormData } from './validator/business-registration-form-schema';
import { STEPS } from './data/steps';
import { StepProgress } from './components/step-progress';
import { RegistrationNav } from './components/register-nav';

export default function ShopRegistration() {
  const { step, form } = useMultiStepForm();

  const { component: stepComponent, title, description } = STEPS[step - 1];

  const handleSubmitForm = (data: FormData) => {
    console.info(data);
  };

  return (
    <>
      <StepProgress />
      <form
        className="flex flex-1 flex-col overflow-hidden pt-5"
        onSubmit={form.handleSubmit(handleSubmitForm)}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-10 pb-5">
          <header className="inline-flex items-center justify-between pb-5">
            <div>
              <p className="text-xl font-semibold">{title}</p>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            <ThemeToggle />
          </header>

          <div className="flex flex-1">{stepComponent}</div>
        </div>
        <RegistrationNav />
      </form>
    </>
  );
}
