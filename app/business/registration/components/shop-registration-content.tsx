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
import { AlertCircle, ImageOff } from 'lucide-react';
import { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { logOwnerEvent } from '../actions/ownerEvents';
import type { FieldErrors } from 'react-hook-form';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

const BUSINESS_ID_KEY = 'ilokal-registration-business-id';
/**
 * Which uploads already landed, so a retry AFTER A RELOAD does not redo them.
 *
 * The business id has always survived a reload; the upload set had not, because
 * it lived only in a React ref. So a retry on a fresh page re-uploaded the logo
 * and banner (orphaning a copy of each in the bucket) and re-appended the
 * interior photos, which the server appends rather than replaces — duplicated
 * gallery images. Keyed separately from the id so the two are cleared together
 * by `resetResumeMarkers` and neither can outlive the other.
 */
const UPLOADED_KEYS_KEY = 'ilokal-registration-uploaded';

/** Read the persisted upload set. A corrupt value is treated as empty. */
function readUploadedKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(UPLOADED_KEYS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    // Never let a bad cache entry break a submission — re-uploading is
    // recoverable, a thrown parse error at submit time is not.
    return new Set();
  }
}

function writeUploadedKeys(keys: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UPLOADED_KEYS_KEY, JSON.stringify([...keys]));
  } catch {
    // Quota or a privacy mode that refuses writes. Losing the marker only
    // costs a duplicate upload on retry; it must not fail the registration.
  }
}

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
  /**
   * Registration SUCCEEDED but some display files did not store.
   *
   * Deliberately separate from `submitError`: it is not a failure and must not
   * read as one. Telling an owner "failed" when their shop is live is the exact
   * defect this branch exists to end.
   */
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
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
  // Seeded from localStorage so a retry on a FRESH PAGE still skips what
  // already landed.
  const uploadedRef = useRef<Set<string>>(readUploadedKeys());

  /** Mark one upload done, in the ref and in the store that survives a reload. */
  const markUploaded = (key: string) => {
    uploadedRef.current.add(key);
    writeUploadedKeys(uploadedRef.current);
  };

  const { component: stepComponent, title, description } = steps[step - 1];

  const resetResumeMarkers = () => {
    businessIdRef.current = null;
    uploadedRef.current = new Set();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(BUSINESS_ID_KEY);
      // Must go with the id: an upload set kept against a DIFFERENT business
      // would make the next submission skip files it never uploaded.
      localStorage.removeItem(UPLOADED_KEYS_KEY);
    }
  };

  /**
   * A display file that did not make it, named the way the owner would name it.
   * Collected rather than thrown — see `performSubmission`.
   */
  type UploadFailure = { key: string; label: string };

  /**
   * Create the shop, then fill it in.
   *
   * 🔴 ORDER IS LOAD-BEARING, and it was wrong until 2026-08-22. The row used
   * to be created first and then every file `await`ed in a bare loop with no
   * per-upload catch — so ONE interior-image failure threw, aborted before the
   * catalogue was ever written, and left the owner reading "Failed to submit
   * application" while their shop was already `verified` and public with no
   * products and no photos. Confirmed in production: an owner completed all six
   * steps (`reg_step_completed` ×6), never reached `reg_submitted`, and their
   * empty shop is live. Two owners hold duplicate rows from re-registering
   * after being told it failed.
   *
   * Two changes close that:
   *
   *   1. **The catalogue is written BEFORE any display file.** Products are what
   *      make a shop page worth opening; photos are decoration. If anything
   *      fails now, the shop still has something to show.
   *   2. **Display-file uploads are individually NON-FATAL.** The precedent was
   *      already in this function for offering photos — "the item is the
   *      required thing and the picture is decoration". The owner attached the
   *      files; failing to STORE one is our problem to report, not a reason to
   *      throw away a completed registration.
   *
   * What stays fatal: the row itself, the offerings write and the deal write.
   * Those are the registration; without them there is nothing to report.
   *
   * Returns the display files that failed so the caller can tell the owner
   * exactly what to re-add, instead of a blanket failure.
   */
  const performSubmission = async (
    data: BusinessProps,
  ): Promise<UploadFailure[]> => {
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

    const bid = businessId;

    // ---------------------------------------------------------------------
    // Phase 2 — THE CATALOGUE. First, because it is the shop.
    //
    // It could not run before the row existed (there was no business id to
    // attach items to), which is why the step holds them in form state rather
    // than writing as the owner types — but it does not need a single photo to
    // have landed, and it used to sit behind all of them.
    //
    // Guarded by the same ref as the uploads, so a mid-flight failure retries
    // without rewriting them; the server is idempotent by name as well, so
    // neither guard is load-bearing alone.
    // ---------------------------------------------------------------------
    const offerings = data.offerings ?? [];

    // Offering photos, one request each — the offerings write carries the
    // paths, and a single multipart POST with everything is what 413'd in
    // production. Keyed per photo so a retry re-uploads none of them.
    //
    // Already non-fatal before this change, and the model for the rest.
    const imagePaths = new Map<string, string>();
    for (const [index, item] of offerings.entries()) {
      const file = item.uid ? offeringImages.get(item.uid) : undefined;
      if (!file) continue;
      const key = `offering_image_${item.uid}`;
      if (uploadedRef.current.has(key)) continue;
      try {
        const path = await uploadOfferingImage(bid, file, index);
        if (path) imagePaths.set(item.uid, path);
        markUploaded(key);
      } catch (error: unknown) {
        console.error(
          '[registration] offering photo upload failed',
          formatErrorForLog(error),
        );
      }
    }

    // FATAL: a shop with no catalogue is the empty page this step exists to
    // prevent.
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
      markUploaded('offerings');
    }

    // Phase 3 — the optional deal. `null` means the owner skipped the step,
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
          markUploaded(dealImageKey);
        } catch (error: unknown) {
          console.error(
            '[registration] deal photo upload failed',
            formatErrorForLog(error),
          );
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
      markUploaded('deal');
    }

    // ---------------------------------------------------------------------
    // Phase 4 — display files, one request at a time so each stays under
    // Vercel's 4.5 MB body limit (all-in-one multipart 413'd in prod).
    // Sequential on purpose: interior_images appends server-side.
    //
    // Every one is NON-FATAL and reported. Interiors go LAST because there are
    // at least four of them, which made them by far the likeliest to fail.
    // ---------------------------------------------------------------------
    const uploads: {
      key: string;
      label: string;
      run: () => Promise<unknown>;
    }[] = [];
    if (data.shop_logo) {
      const file = data.shop_logo;
      uploads.push({
        key: 'shop_logo',
        label: 'your shop logo',
        run: () => uploadRegistrationFile(bid, 'shop_logo', file),
      });
    }
    if (data.shop_banner) {
      const file = data.shop_banner;
      uploads.push({
        key: 'shop_banner',
        label: 'your banner image',
        run: () => uploadRegistrationFile(bid, 'shop_banner', file),
      });
    }
    if (requireDocuments && data.business_license) {
      const file = data.business_license;
      uploads.push({
        key: 'business_license',
        label: 'your business license',
        run: () => uploadRegistrationFile(bid, 'business_license', file),
      });
    }
    if (requireDocuments && data.tax_certificate) {
      const file = data.tax_certificate;
      uploads.push({
        key: 'tax_certificate',
        label: 'your tax certificate',
        run: () => uploadRegistrationFile(bid, 'tax_certificate', file),
      });
    }
    (data.interior_images ?? []).forEach((file: File, idx: number) => {
      uploads.push({
        key: `interior_image_${idx}`,
        label: `shop photo ${idx + 1}`,
        run: () => uploadRegistrationFile(bid, 'interior_image', file, idx),
      });
    });

    const failures: UploadFailure[] = [];
    for (const upload of uploads) {
      if (uploadedRef.current.has(upload.key)) continue;
      try {
        await upload.run();
        markUploaded(upload.key);
      } catch (error: unknown) {
        // NOT rethrown. This is the whole fix: one failed photo used to discard
        // a completed registration and leave a live, empty shop behind.
        console.error(
          `[registration] ${upload.key} upload failed`,
          formatErrorForLog(error),
        );
        failures.push({ key: upload.key, label: upload.label });
      }
    }

    return failures;
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
    setUploadWarning(null);

    try {
      let failures: Awaited<ReturnType<typeof performSubmission>> = [];
      try {
        failures = await performSubmission(data);
      } catch (error: unknown) {
        // 404 = the cached draft id belongs to another account (user switched
        // logins mid-flow) or the draft is gone. Drop the stale markers and
        // redo the whole submission once under the current account.
        const status = (error as { status?: number })?.status;
        if (status !== 404) throw error;
        resetResumeMarkers();
        failures = await performSubmission(data);
      }

      if (failures.length > 0) {
        // The registration is DONE — the shop exists and its catalogue is
        // written. Name the files so the owner knows exactly what to re-add
        // from the dashboard, rather than wondering what "some files" means.
        const names = failures.map((failure) => failure.label);
        const list =
          names.length === 1
            ? names[0]
            : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
        setUploadWarning(
          `Your shop is registered, but we couldn't upload ${list}. You can add ${names.length === 1 ? 'it' : 'them'} from your dashboard at any time.`,
        );
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
          // Which display files failed, if any. This is the signal that was
          // completely invisible while an upload failure aborted the whole
          // submission: `reg_submitted` simply never fired, so a partial
          // registration looked identical to an abandoned one.
          upload_failures: failures.map((failure) => failure.key),
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

          {uploadWarning && (
            <Alert className="mb-6">
              <ImageOff className="h-4 w-4" />
              <AlertTitle>
                Registered — some images didn&apos;t upload
              </AlertTitle>
              <AlertDescription>{uploadWarning}</AlertDescription>
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
