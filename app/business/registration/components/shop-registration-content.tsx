'use client';

import { useRef, useState } from 'react';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { BrandLogo } from '@/components/custom/BrandLogo';
import {
  getStepFieldGroups,
  useMultiStepForm,
} from '../provider/registration-form-provider';
import { BusinessProps } from '../validator/business-registration-form-schema';
import { StepProgress } from './step-progress';
import { RegistrationNav } from './register-nav';
import {
  createRegistrationDeal,
  createRegistrationOfferings,
  registerBusiness,
  uploadOfferingImage,
  uploadRegistrationFile,
} from '../api/register-business';
import { defaultKindForMode } from '@/lib/types/offering';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { logOwnerEvent } from '../actions/ownerEvents';
import type { FieldErrors } from 'react-hook-form';

const BUSINESS_ID_KEY = 'ilokal-registration-business-id';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  // Survives `resetResumeMarkers()`, which runs before the dialog opens and
  // clears the refs below. The dialog needs both: the id to build its
  // destination, the status to know whether to say "live" or "under review".
  const [created, setCreated] = useState<{
    id: string;
    status: string | null;
  } | null>(null);
  const submittingRef = useRef(false);
  // Resume markers: if creation succeeded but a file upload failed, a retry
  // must reuse the created business (no duplicate row) and skip files that
  // already went through. The id survives a reload via localStorage.
  const businessIdRef = useRef<string | null>(null);
  const uploadedRef = useRef<Set<string>>(new Set());

  const { component: stepComponent, title, description } = steps[step - 1];

  const resetResumeMarkers = () => {
    businessIdRef.current = null;
    uploadedRef.current = new Set();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(BUSINESS_ID_KEY);
    }
  };

  const performSubmission = async (data: BusinessProps) => {
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
      setCreated({ id: business.id, status: business.status ?? null });
      if (typeof window !== 'undefined') {
        localStorage.setItem(BUSINESS_ID_KEY, businessId);
      }
    }

    // Resumed submit: the row already existed, so nothing above re-created it
    // and its status was never read back. Record the id anyway — the dialog
    // still needs a destination — and leave the status null so it renders
    // neutral copy. Guessing "under review" is precisely the claim that was
    // wrong.
    const resolvedId = businessId;
    setCreated((prev) =>
      prev?.id === resolvedId ? prev : { id: resolvedId, status: null },
    );

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
    if (requireDocuments && data.business_license) {
      const file = data.business_license;
      uploads.push({
        key: 'business_license',
        run: () => uploadRegistrationFile(bid, 'business_license', file),
      });
    }
    if (requireDocuments && data.tax_certificate) {
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

    // Phase 3 — the menu. AFTER the draft exists, because there is no
    // business id to attach items to until `registerBusiness` returns one;
    // this is why the step holds them in form state rather than writing as
    // the owner types.
    //
    // Guarded by the same ref as the uploads, and so with the same lifecycle:
    // a mid-flight failure retries without rewriting them, while a 404 replay
    // clears the marker along with the stale business id, which is correct —
    // the items belong to the NEW draft. The server is idempotent by name as
    // well, so neither guard is load-bearing alone.
    const offerings = data.offerings ?? [];

    // Photos first, one request each — the offerings write carries the paths,
    // and a single multipart POST with everything is what 413'd in production.
    //
    // Keyed per photo in the same ref as the files, so a retry after a
    // mid-flight failure re-uploads none of them; without that, every retry
    // would orphan another copy in the bucket.
    //
    // A photo that fails does NOT fail the registration: the item is the
    // required thing and the picture is decoration, so the offering is written
    // without it and the owner can add it from the dashboard.
    const imagePaths = new Map<string, string>();
    for (const [index, item] of offerings.entries()) {
      const file = item.uid ? offeringImages.get(item.uid) : undefined;
      if (!file) continue;
      const key = `offering_image_${item.uid}`;
      if (uploadedRef.current.has(key)) continue;
      try {
        const path = await uploadOfferingImage(bid, file, index);
        if (path) imagePaths.set(item.uid, path);
        uploadedRef.current.add(key);
      } catch (error: unknown) {
        console.error('[registration] offering photo upload failed', error);
      }
    }

    if (offerings.length > 0 && !uploadedRef.current.has('offerings')) {
      await createRegistrationOfferings(
        bid,
        offerings.map((item) => ({
          name: item.name,
          price: item.on_request ? null : (item.price ?? null),
          on_request: item.on_request,
          image_url: imagePaths.get(item.uid) ?? null,
        })),
        // From the vertical the owner picked, not the DB default — that
        // default is 'product', so a services business would otherwise mint
        // products for its own service menu.
        defaultKindForMode(offeringMode),
      );
      uploadedRef.current.add('offerings');
    }

    // Phase 4 — the optional deal. `null` means the owner skipped the step,
    // which is a deliberate choice and not a half-filled form, so nothing is
    // written and the submission is unaffected. Same replay guard as above.
    const deal = data.deal;
    if (deal && !uploadedRef.current.has('deal')) {
      // Same rules as the offering photos: uploaded before the row is written
      // so it can carry the path, keyed so a retry does not orphan a copy, and
      // never fatal — a deal without its picture still falls back to the
      // shop's logo and interior photo, which is what every deal card showed
      // before the column existed.
      let dealImagePath: string | null = null;
      const dealImage = deal.uid ? offeringImages.get(deal.uid) : undefined;
      const dealImageKey = `deal_image_${deal.uid}`;
      if (dealImage && !uploadedRef.current.has(dealImageKey)) {
        try {
          dealImagePath = await uploadOfferingImage(bid, dealImage, 0);
          uploadedRef.current.add(dealImageKey);
        } catch (error: unknown) {
          console.error('[registration] deal photo upload failed', error);
        }
      }

      await createRegistrationDeal(bid, {
        code: deal.code,
        description: deal.description,
        discount_type: deal.discount_type,
        discount_value: deal.discount_value,
        // BOGO quantities ride alongside the type; the server builds the
        // stored union from them (percentage/fixed/free ignore these).
        bogo_buy: deal.bogo_buy,
        bogo_get: deal.bogo_get,
        duration_days: deal.duration_days,
        // The owner's explicit choice, passed through untouched — defaulting
        // it anywhere in this chain is how a draft becomes a live discount.
        publish: deal.publish,
        image_url: dealImagePath,
      });
      uploadedRef.current.add('deal');
    }
  };

  /**
   * Full-form validation failed at the moment of Submit.
   *
   * The submit button only gates on the review step's field (the terms
   * checkbox), so a cached form restored straight onto the review step — or a
   * field edited on an earlier step — can still fail `fullSchema` here. RHF's
   * `errors` is nested; map each top-level field to the step that owns it so
   * the alert says WHERE to go back instead of a raw dotted path.
   */
  const handleInvalidSubmit = (errors: FieldErrors<BusinessProps>) => {
    const groups = getStepFieldGroups(requireDocuments);
    const titles = [
      ...new Set(
        Object.keys(errors).map((key) => {
          const idx = groups.findIndex((group) =>
            group.some((path) => path.split('.')[0] === key),
          );
          return idx >= 0 ? (steps[idx]?.title ?? `Step ${idx + 1}`) : key;
        }),
      ),
    ];
    setSubmitError(
      `Some fields still need attention (${titles.join(', ')}). Go back and fix them before submitting.`,
    );
  };

  const handleSubmitForm = async (data: BusinessProps) => {
    if (submittingRef.current) return;

    // The step schemas mark files `.optional()` (multi-step navigation), so an
    // application with missing files could otherwise submit and reach admin
    // review unapprovable. Guard the full set here.
    const missing: string[] = [];
    if (!data.shop_logo) missing.push('shop logo');
    if (!data.shop_banner) missing.push('shop banner');
    if (!data.interior_images || data.interior_images.length < 4)
      missing.push('at least 4 interior photos');
    if (requireDocuments) {
      if (!data.business_license) missing.push('business license');
      if (!data.tax_certificate) missing.push('tax certificate');
    }
    // The step schema already requires one, but the same reasoning as the
    // files applies: step schemas are only ever triggered for the step being
    // left, so a cached form restored at the review step could reach submit
    // with an empty list and produce the empty shop this step exists to
    // prevent.
    if (!data.offerings || data.offerings.length === 0) {
      missing.push('at least one item in your catalogue');
    }
    if (missing.length > 0) {
      setSubmitError(
        `Missing required files: ${missing.join(', ')}. Please go back and re-attach them.`,
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      try {
        await performSubmission(data);
      } catch (error: unknown) {
        // 404 = the cached draft id belongs to another account (user switched
        // logins mid-flow) or the draft is gone. Drop the stale markers and
        // redo the whole submission once under the current account.
        const status = (error as { status?: number })?.status;
        if (status !== 404) throw error;
        resetResumeMarkers();
        await performSubmission(data);
      }

      // Grab the id before the markers reset below wipes the ref (and the
      // localStorage copy) — the funnel row still wants to attribute the
      // submission to the business it created.
      const submittedBusinessId = businessIdRef.current ?? undefined;

      clearFormCache();
      resetResumeMarkers();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ilokal-registration-step');
      }

      // The funnel's final row: the submission succeeded. The deal's
      // presence/absence is the kind of signal the funnel exists to answer.
      void logOwnerEvent(
        'reg_submitted',
        {
          with_deal: !!data.deal,
          require_documents: requireDocuments,
        },
        submittedBusinessId,
      );

      setShowSuccessDialog(true);
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError
          ? error?.response?.data?.message ||
            'Failed to submit application. Please try again.'
          : error instanceof Error && error.message
            ? error.message
            : 'Failed to submit application. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

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
        onSubmit={form.handleSubmit(handleSubmitForm, handleInvalidSubmit)}
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
