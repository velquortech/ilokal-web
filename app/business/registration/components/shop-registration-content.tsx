'use client';

import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { BrandLogo } from '@/components/custom/BrandLogo';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { useRegistrationSubmission } from '../hooks/useRegistrationSubmission';
import { StepProgress } from './step-progress';
import { RegistrationNav } from './register-nav';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ShopRegistrationContent() {
  const {
    step,
    steps,
    requireDocuments,
    form,
    clearFormCache,
    offeringMode,
    offeringImages,
  } = useMultiStepForm();
  const {
    submit,
    handleInvalid,
    isSubmitting,
    submitError,
    created,
    showSuccessDialog,
    setShowSuccessDialog,
  } = useRegistrationSubmission({
    requireDocuments,
    steps,
    offeringMode,
    offeringImages,
    clearDraft: clearFormCache,
  });

  const { component: stepComponent, title, description } = steps[step - 1];

  return (
    <>
      <StepProgress />
      {/*
        No `overflow-hidden` / `overflow-y-auto` here any more — the page is
        the only scroll container (see the layout comment). `min-w-0` so a wide
        child (the gallery grid, a long shop name) shrinks instead of pushing
        the flex row wider than the viewport.
      */}
      <form
        className="flex min-w-0 flex-1 flex-col pt-5"
        onSubmit={form.handleSubmit(submit, handleInvalid)}
      >
        <div className="flex flex-1 flex-col px-4 pb-5 sm:px-6 lg:px-10">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <span className="text-muted-foreground text-xs">
              Step {step} of {steps.length}
            </span>
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-1.5 w-6 rounded-full transition-colors',
                    idx + 1 <= step ? 'bg-primary' : 'bg-muted',
                  )}
                />
              ))}
            </div>
          </div>

          <header className="inline-flex items-center justify-between pb-5">
            {/* Brand lockup leads the wizard — the owner may have arrived
                straight from the marketing site, and the mark is the anchor
                that says this form is iLokal's. The wordmark hides below sm
                so the mark + step title never crowd on a phone. */}
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo
                markSize={26}
                className="shrink-0"
                wordmarkClassName="hidden text-lg sm:inline-flex"
              />
              <div className="min-w-0">
                <p className="truncate text-xl font-semibold">{title}</p>
                <p className="text-muted-foreground truncate text-sm">
                  {description}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </header>

          {submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Submission Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-1">{stepComponent}</div>
        </div>
        <RegistrationNav
          isSubmitting={isSubmitting}
          showSuccessDialog={showSuccessDialog}
          onSuccessDialogChange={setShowSuccessDialog}
          createdBusiness={created}
        />
      </form>
    </>
  );
}
