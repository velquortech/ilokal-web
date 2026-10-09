'use client';

import { useRef, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { defaultKindForMode, type OfferingMode } from '@/lib/types/offering';
import { formatErrorForLog } from '@/lib/utils/describeDbError';
import {
  createRegistrationDeal,
  createRegistrationOfferings,
  completeRegistration,
  registerBusiness,
  uploadOfferingImage,
  uploadRegistrationFile,
} from '../api/register-business';
import { logOwnerEvent } from '../actions/ownerEvents';
import { getStepFieldGroups } from '../provider/registration-form-provider';
import type { BusinessProps } from '../validator/business-registration-form-schema';
import type { OfferingImages } from './useOfferingImages';

export interface CreatedRegistration {
  id: string;
  /**
   * The PERSISTED status returned by registration completion; null until the
   * final database check succeeds.
   */
  status: string | null;
}

interface Options {
  requireDocuments: boolean;
  /** Step titles, in order — used to say WHERE an invalid field lives. */
  steps: { title: string }[];
  /** Decides the `kind` of the offerings written (product vs service). */
  offeringMode: OfferingMode;
  offeringImages: Pick<OfferingImages, 'get'>;
  /** Forget the draft once it has been submitted. */
  clearDraft: () => void;
}

const GENERIC_FAILURE = 'Failed to submit application. Please try again.';

/**
 * The wizard's Submit: five sequential phases, resumable after a failure.
 *
 * 1. Create the business row (JSON only).
 * 2. Upload its files, one request each — a single multipart POST with
 *    everything exceeded Vercel's 4.5 MB body limit and 413'd in production.
 * 3. Write the offerings (photos first, so the rows can carry their paths).
 * 4. Write the optional launch deal.
 * 5. Ask the database to validate and complete the registration.
 *
 * **Resume.** The database is the record of an unfinished registration
 * (`registration_completed_at` is NULL), not this browser: phase 1 returns the
 * owner's existing draft instead of creating a second one, so a resume works
 * after a reload, on another device, or with cookies cleared. Within one
 * session every finished write is recorded in `doneRef` so a retry skips it;
 * after a reload everything is re-sent — safe because each write is idempotent
 * server-side (files overwrite their slot, offerings skip known names, the
 * deal skips a known code, completion returns the status it already reached).
 */
export function useRegistrationSubmission({
  requireDocuments,
  steps,
  offeringMode,
  offeringImages,
  clearDraft,
}: Options) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  // State, not a ref: it outlives `resetResumeMarkers()`, which runs before
  // the success dialog opens and needs the id for its destination.
  const [created, setCreated] = useState<CreatedRegistration | null>(null);

  const submittingRef = useRef(false);
  const businessIdRef = useRef<string | null>(null);
  const doneRef = useRef<Set<string>>(new Set());
  // Uploaded photo paths by key. A set of "done" keys alone is not enough:
  // when the offerings write fails AFTER its photos uploaded, the retry must
  // still attach those paths, not write the rows bare.
  const photoPathsRef = useRef<Map<string, string>>(new Map());

  const resetResumeMarkers = () => {
    businessIdRef.current = null;
    doneRef.current = new Set();
    photoPathsRef.current = new Map();
  };

  /** Runs `write` once per key per session; a retry skips what finished. */
  const once = async (key: string, write: () => Promise<unknown>) => {
    if (doneRef.current.has(key)) return;
    await write();
    doneRef.current.add(key);
  };

  /**
   * A photo is decoration on a required row: a failed upload is logged and
   * the row is written without it (the owner can add it from the dashboard).
   * Remembered by key, so a retry reuses the path instead of uploading (and
   * orphaning) a second copy.
   */
  const uploadPhoto = async (
    businessId: string,
    key: string,
    file: File | undefined,
    index: number,
  ): Promise<string | null> => {
    const known = photoPathsRef.current.get(key);
    if (known || !file) return known ?? null;
    try {
      const path = await uploadOfferingImage(businessId, file, index);
      if (path) photoPathsRef.current.set(key, path);
      return path;
    } catch (error: unknown) {
      console.error(
        `[registration] ${key} upload failed`,
        formatErrorForLog(error),
      );
      return null;
    }
  };

  const performSubmission = async (data: BusinessProps) => {
    // Phase 1 — create the draft (or get the existing one back), unless this
    // session already did.
    let businessId = businessIdRef.current;
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
      setCreated({ id: business.id, status: null });
    }
    businessIdRef.current = businessId;
    const bid = businessId;
    setCreated((prev) => (prev?.id === bid ? prev : { id: bid, status: null }));

    // Phase 2 — files, sequentially (interior photos are written by slot).
    if (data.shop_logo) {
      const file = data.shop_logo;
      await once('shop_logo', () =>
        uploadRegistrationFile(bid, 'shop_logo', file),
      );
    }
    if (data.shop_banner) {
      const file = data.shop_banner;
      await once('shop_banner', () =>
        uploadRegistrationFile(bid, 'shop_banner', file),
      );
    }
    if (requireDocuments) {
      for (const kind of ['business_license', 'tax_certificate'] as const) {
        const file = data[kind];
        if (file)
          await once(kind, () => uploadRegistrationFile(bid, kind, file));
      }
    }
    for (const [index, file] of (data.interior_images ?? []).entries()) {
      await once(`interior_image_${index}`, () =>
        uploadRegistrationFile(bid, 'interior_image', file, index),
      );
    }

    // Phase 3 — the offerings, photos first so each row carries its path.
    const offerings = data.offerings ?? [];
    if (offerings.length > 0) {
      await once('offerings', async () => {
        const rows = [];
        for (const [index, item] of offerings.entries()) {
          const imageUrl = await uploadPhoto(
            bid,
            `offering_image_${item.uid}`,
            offeringImages.get(item.uid),
            index,
          );
          rows.push({
            name: item.name,
            price: item.on_request ? null : (item.price ?? null),
            on_request: item.on_request,
            image_url: imageUrl,
          });
        }
        // `kind` from the vertical the owner picked, not the DB default —
        // that default is 'product', so a services business would otherwise
        // mint products for its own service menu.
        await createRegistrationOfferings(
          bid,
          rows,
          defaultKindForMode(offeringMode),
        );
      });
    }

    // Phase 4 — the optional deal. `null` means the owner skipped the step.
    const deal = data.deal;
    if (deal) {
      await once('deal', async () => {
        const imagePath = await uploadPhoto(
          bid,
          `deal_image_${deal.uid}`,
          offeringImages.get(deal.uid),
          0,
        );
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
          // The owner's explicit choice, passed through untouched —
          // defaulting it anywhere in this chain is how a draft becomes a
          // live discount.
          publish: deal.publish,
          image_url: imagePath,
        });
      });
    }

    // Final phase — let the database re-check the assembled registration and
    // persist its final status. Keep this inside the resumable write sequence:
    // if completion fails, the draft survives and Submit stays
    // unsuccessful; a retry repeats this idempotent RPC after earlier writes.
    await once('completion', async () => {
      const { status } = await completeRegistration(bid);
      setCreated({ id: bid, status });
    });
  };

  const submit = async (data: BusinessProps) => {
    if (submittingRef.current) return;

    // Everything else required is in `fullSchema`, so `handleSubmit` has
    // already rejected a form missing it. Documents are the exception:
    // whether they are required is an admin flag the schema cannot see.
    if (requireDocuments && (!data.business_license || !data.tax_certificate)) {
      setSubmitError(
        'Missing required documents: please go back and attach your business license and tax certificate.',
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await performSubmission(data);

      // Read before the reset below clears it — the funnel row attributes
      // the submission to the business it created.
      const submittedBusinessId = businessIdRef.current ?? undefined;
      clearDraft();
      resetResumeMarkers();

      void logOwnerEvent(
        'reg_submitted',
        { with_deal: !!data.deal, require_documents: requireDocuments },
        submittedBusinessId,
      );
      setShowSuccessDialog(true);
    } catch (error: unknown) {
      // apiClient rejects with an Error carrying the server's own message
      // (lib/services/utils/apiClient.ts), so that is what the owner reads.
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : GENERIC_FAILURE,
      );
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  /**
   * Full-form validation failed at the moment of Submit.
   *
   * The submit button only gates on the review step's field (the terms
   * checkbox), so a draft restored straight onto Review can still fail
   * `fullSchema`. Map each top-level field to the step that owns it so the
   * alert says WHERE to go back instead of a raw dotted path.
   */
  const handleInvalid = (errors: FieldErrors<BusinessProps>) => {
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

  return {
    submit,
    handleInvalid,
    isSubmitting,
    submitError,
    created,
    showSuccessDialog,
    setShowSuccessDialog,
  };
}
