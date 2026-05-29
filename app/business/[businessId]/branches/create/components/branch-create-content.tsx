'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranchForm } from '../provider/branch-form-provider';
import { BRANCH_STEPS } from '../data/steps';
import { BranchStepProgress } from './branch-step-progress';
import { BranchNav } from './branch-nav';
import {
  createBranchAction,
  uploadBranchDocumentAction,
  uploadBranchImageAction,
} from '../../../actions/branchActions';
import { businessBranchesPath } from '@/config/routeConfig';
import { useBusinessShop } from '@/providers/BusinessProvider';
import type { BranchCreateValues } from '../validator/branch-create-schema';

export function BranchCreateContent() {
  const { step, form } = useBranchForm();
  const { business } = useBusinessShop();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);

  const { component, title, description } = BRANCH_STEPS[step - 1];

  const backHref = business?.id
    ? businessBranchesPath(business.id)
    : '/business';

  const handleBack = () => router.push(backHref);

  const handleSubmit = form.handleSubmit(async (data: BranchCreateValues) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Upload images
      let cover_image_url: string | undefined;
      const gallery_image_urls: string[] = [];

      if (data.cover_image instanceof File) {
        const fd = new FormData();
        fd.append('file', data.cover_image);
        const res = await uploadBranchImageAction(fd);
        if (!res.success) {
          const msg = res.error?.message ?? 'Cover image upload failed';
          setSubmitError(msg);
          toast.error(msg);
          return;
        }
        cover_image_url = res.data?.url;
      }

      for (const img of data.gallery_images ?? []) {
        if (!(img instanceof File)) continue;
        const fd = new FormData();
        fd.append('file', img);
        const res = await uploadBranchImageAction(fd);
        if (!res.success) {
          toast.error(res.error?.message ?? 'Gallery upload failed');
          // continue with successfully uploaded ones
          break;
        }
        if (res.data?.url) gallery_image_urls.push(res.data.url);
      }

      // Upload documents
      let business_permit_url: string | undefined;
      let other_document_url: string | undefined;

      if (data.business_permit instanceof File) {
        const fd = new FormData();
        fd.append('file', data.business_permit);
        const uploadResult = await uploadBranchDocumentAction(fd);
        if (!uploadResult.success) {
          const msg =
            uploadResult.error?.message ?? 'Business permit upload failed';
          setSubmitError(msg);
          toast.error(msg);
          return;
        }
        business_permit_url = uploadResult.data?.url;
      }

      if (data.other_document instanceof File) {
        const fd = new FormData();
        fd.append('file', data.other_document);
        const uploadResult = await uploadBranchDocumentAction(fd);
        if (!uploadResult.success) {
          const msg = uploadResult.error?.message ?? 'Document upload failed';
          setSubmitError(msg);
          toast.error(msg);
          return;
        }
        other_document_url = uploadResult.data?.url;
      }

      const result = await createBranchAction({
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        email: data.email,
        description: data.description,
        status: 'pending_review',
        cover_image_url,
        gallery_images: gallery_image_urls,
        business_permit_url,
        other_document_url,
      });

      if (!result.success) {
        const msg =
          result.error?.message ?? 'Failed to submit branch application';
        setSubmitError(msg);
        toast.error(msg);
        return;
      }

      setSubmitted(true);
    } catch {
      const msg = 'An unexpected error occurred';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  });

  if (submitted) {
    return (
      <div className="flex h-full w-full flex-row gap-6">
        <BranchStepProgress />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-lg border p-10 text-center">
          <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
            <CheckCircle2 className="text-primary size-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Application Submitted!</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Your branch application is now <strong>pending review</strong>.
              Our team will verify your documents and activate the branch within
              24–48 hours.
            </p>
          </div>
          <Button onClick={handleBack}>Back to Branches</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-row gap-6">
      <BranchStepProgress />

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden rounded-lg border"
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-10">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          </div>

          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {component}
        </div>

        <BranchNav isSubmitting={isSubmitting} onBack={handleBack} />
      </form>
    </div>
  );
}
