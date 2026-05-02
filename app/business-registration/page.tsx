'use client';

import { useRef, useState } from 'react';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { useMultiStepForm } from './provider/registration-form-provider';
import { BusinessProps } from './validator/business-registration-form-schema';
import { STEPS } from './data/steps';
import { StepProgress } from './components/step-progress';
import { RegistrationNav } from './components/register-nav';
import { registerBusiness } from './api/register-business';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';

export default function ShopRegistration() {
  const { step, form, clearFormCache } = useMultiStepForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const submittingRef = useRef(false);

  const { component: stepComponent, title, description } = STEPS[step - 1];

  const handleSubmitForm = async (data: BusinessProps) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();

      if (data.shop_logo) {
        formData.append('shop_logo', data.shop_logo);
      }
      if (data.shop_banner) {
        formData.append('shop_banner', data.shop_banner);
      }
      if (data.business_license) {
        formData.append('business_license', data.business_license);
      }
      if (data.tax_certificate) {
        formData.append('tax_certificate', data.tax_certificate);
      }

      if (data.interior_images && data.interior_images.length > 0) {
        data.interior_images.forEach((file: File) => {
          formData.append('interior_images', file);
        });
      }

      formData.append(
        'business_category',
        JSON.stringify(data.business_category),
      );
      formData.append('location', JSON.stringify(data.location));
      formData.append('shop_name', data.shop_name);
      formData.append('description', data.description);

      await registerBusiness(formData);

      // Clear cache after successful submission
      clearFormCache();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ilokal-registration-step');
      }

      setShowSuccessDialog(true);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const message =
          error?.response?.data?.message ||
          'Failed to submit application. Please try again.';
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
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
        />
      </form>
    </>
  );
}
