'use client';

import { useRef, useState } from 'react';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { BusinessProps } from '../validator/business-registration-form-schema';
import { STEPS } from '../data/steps';
import { StepProgress } from './step-progress';
import { RegistrationNav } from './register-nav';
import {
  registerBusiness,
  uploadRegistrationFile,
} from '../api/register-business';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';
import { cn } from '@/lib/utils';

const BUSINESS_ID_KEY = 'ilokal-registration-business-id';

export function ShopRegistrationContent() {
  const { step, form, clearFormCache } = useMultiStepForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const submittingRef = useRef(false);
  // Resume markers: if creation succeeded but a file upload failed, a retry
  // must reuse the created business (no duplicate row) and skip files that
  // already went through. The id survives a reload via localStorage.
  const businessIdRef = useRef<string | null>(null);
  const uploadedRef = useRef<Set<string>>(new Set());

  const { component: stepComponent, title, description } = STEPS[step - 1];

  const handleSubmitForm = async (data: BusinessProps) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Phase 1 — create the business row from JSON metadata (small payload).
      let businessId =
        businessIdRef.current ??
        (typeof window !== 'undefined'
          ? localStorage.getItem(BUSINESS_ID_KEY)
          : null);

      if (!businessId) {
        const business = await registerBusiness({
          shop_name: data.shop_name,
          description: data.description,
          business_category: data.business_category,
          category_id:
            data.business_category.type === 'predefined'
              ? (data.business_category.id ?? null)
              : null,
          location: data.location,
        });
        businessId = business.id;
        businessIdRef.current = businessId;
        if (typeof window !== 'undefined') {
          localStorage.setItem(BUSINESS_ID_KEY, businessId);
        }
      }

      // Phase 2 — upload files one request at a time so each stays under
      // Vercel's 4.5 MB body limit (all-in-one multipart 413'd in prod).
      // Sequential on purpose: interior_images appends server-side.
      const bid = businessId;
      const uploads: { key: string; run: () => Promise<unknown> }[] = [];
      if (data.shop_logo) {
        const file = data.shop_logo;
        uploads.push({
          key: 'shop_logo',
          run: () => uploadRegistrationFile(bid, 'shop_logo', file),
        });
      }
      if (data.shop_banner) {
        const file = data.shop_banner;
        uploads.push({
          key: 'shop_banner',
          run: () => uploadRegistrationFile(bid, 'shop_banner', file),
        });
      }
      if (data.business_license) {
        const file = data.business_license;
        uploads.push({
          key: 'business_license',
          run: () => uploadRegistrationFile(bid, 'business_license', file),
        });
      }
      if (data.tax_certificate) {
        const file = data.tax_certificate;
        uploads.push({
          key: 'tax_certificate',
          run: () => uploadRegistrationFile(bid, 'tax_certificate', file),
        });
      }
      (data.interior_images ?? []).forEach((file: File, idx: number) => {
        uploads.push({
          key: `interior_image_${idx}`,
          run: () => uploadRegistrationFile(bid, 'interior_image', file, idx),
        });
      });

      for (const upload of uploads) {
        if (uploadedRef.current.has(upload.key)) continue;
        await upload.run();
        uploadedRef.current.add(upload.key);
      }

      clearFormCache();
      businessIdRef.current = null;
      uploadedRef.current = new Set();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ilokal-registration-step');
        localStorage.removeItem(BUSINESS_ID_KEY);
      }

      setShowSuccessDialog(true);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const message =
          error?.response?.data?.message ||
          'Failed to submit application. Please try again.';
        setSubmitError(message);
      } else {
        setSubmitError('Failed to submit application. Please try again.');
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
        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-5 sm:px-6 lg:px-10">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <span className="text-muted-foreground text-xs">
              Step {step} of {STEPS.length}
            </span>
            <div className="flex gap-1.5">
              {STEPS.map((_, idx) => (
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
