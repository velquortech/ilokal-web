'use server';

/**
 * Business Document Review — Admin Server Actions
 *
 * Approve / disapprove a business's submitted verification documents. Each
 * decision (a) flips the business `status` and (b) emits a notification to the
 * business owner (with the admin's remarks). All notification writes go through
 * the `create_notification` RPC via the notification service.
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { createServerAdminClient } from '@/supabase/server';
import {
  verifyBusiness,
  rejectBusiness,
} from '@/lib/api/business/businessService';
import { emitNotification } from '@/lib/api/notifications/notificationsService';
import { documentDecisionSchema } from '@/lib/validation/notification';
import type { ApiResponse } from '@/lib/types';
import type {
  BusinessActionResponse,
  AdminBusiness,
} from '@/lib/types/business';
import type { NotificationType, EmitNotificationInput } from '@/lib/types';

const businessIdSchema = z.string().uuid();

const DOCS_BUCKET = 'verification-docs';
const SIGNED_URL_TTL = 60 * 30; // 30 minutes

export interface BusinessDocumentLink {
  key: 'business_license' | 'tax_certificate' | 'additional_docs';
  label: string;
  url: string | null;
}

const DOC_LABELS: Record<BusinessDocumentLink['key'], string> = {
  business_license: 'Business License',
  tax_certificate: 'Tax Certificate',
  additional_docs: 'Additional Documents',
};

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Resolve a business's submitted documents to viewable URLs. Seeds store full
 * URLs; real uploads store raw storage paths in the private `verification-docs`
 * bucket, which we sign on demand. Admin-gated; uses the service-role client to
 * read the paths + sign (no public bucket exposure).
 */
export async function getBusinessDocumentsAction(
  businessId: string,
): Promise<ApiResponse<BusinessDocumentLink[]>> {
  const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
  if (!authorized)
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: authError || 'Unauthorized' },
    };

  const idParse = businessIdSchema.safeParse(businessId);
  if (!idParse.success)
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid business id' },
    };

  const supabase = await createServerAdminClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('verification_documents')
    .eq('id', idParse.data)
    .single();

  if (error || !data)
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Business not found' },
    };

  const docs = (data.verification_documents ?? {}) as Record<string, unknown>;
  const keys: BusinessDocumentLink['key'][] = [
    'business_license',
    'tax_certificate',
    'additional_docs',
  ];

  const links = await Promise.all(
    keys.map(async (key): Promise<BusinessDocumentLink> => {
      const raw = docs[key];
      if (typeof raw !== 'string' || raw.length === 0)
        return { key, label: DOC_LABELS[key], url: null };
      if (isAbsoluteUrl(raw)) return { key, label: DOC_LABELS[key], url: raw };

      const { data: signed } = await supabase.storage
        .from(DOCS_BUCKET)
        .createSignedUrl(raw, SIGNED_URL_TTL);
      return { key, label: DOC_LABELS[key], url: signed?.signedUrl ?? null };
    }),
  );

  return { success: true, data: links };
}

function fail(message: string): BusinessActionResponse<AdminBusiness> {
  return { success: false, error: message };
}

/**
 * Review a business's documents. `decision` is `approve` (remarks optional) or
 * `reject` (remarks required — enforced by `documentDecisionSchema`).
 */
export async function reviewBusinessDocumentsAction(
  businessId: string,
  decision: { decision: 'approve' | 'reject'; remarks?: string },
): Promise<BusinessActionResponse<AdminBusiness>> {
  const { authorized, error: authError } = await verifyCurrentUserIsAdmin();
  if (!authorized) return fail(authError || 'Unauthorized');

  const idParse = businessIdSchema.safeParse(businessId);
  if (!idParse.success) return fail('Invalid business id');

  const parsed = documentDecisionSchema.safeParse(decision);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid review decision');
  }

  const admin = await getCurrentUser();
  const { decision: verdict, remarks } = parsed.data;

  // 1. Flip the business status (service threads remarks through for audit).
  const result =
    verdict === 'approve'
      ? await verifyBusiness(idParse.data, remarks)
      : await rejectBusiness(idParse.data, remarks);

  if (!result.success || !result.data) {
    return fail(result.error || 'Failed to update business');
  }

  const business = result.data;

  // The `businesses` row exposes `shop_name` at runtime; the domain type lags as
  // `name`. Read defensively so the copy is correct regardless.
  const shopName =
    (business as { shop_name?: string }).shop_name ??
    business.name ??
    'your business';

  // 2. Notify the owner. A notification failure must not roll back the decision,
  // so we surface it softly (the status change already succeeded).
  const type: NotificationType =
    verdict === 'approve'
      ? 'business_document_approved'
      : 'business_document_rejected';

  const payload: EmitNotificationInput = {
    user_id: business.owner_id,
    type,
    title:
      verdict === 'approve' ? 'Documents approved' : 'Documents need attention',
    body:
      verdict === 'approve'
        ? `Your business "${shopName}" has been verified.`
        : `Your submitted documents for "${shopName}" were not approved.`,
    business_id: business.id,
    actor_id: admin?.id ?? null,
    metadata: remarks ? { remarks } : {},
  };

  const notify = await emitNotification(payload);
  if (!notify.success) {
    console.error(
      '[reviewBusinessDocumentsAction] notify failed',
      notify.error,
    );
  }

  revalidatePath('/admin', 'layout');

  return {
    success: true,
    data: business,
    message: result.message,
  };
}

/** Convenience wrapper — approve with optional remarks. */
export async function approveBusinessDocumentsAction(
  businessId: string,
  remarks?: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  return reviewBusinessDocumentsAction(businessId, {
    decision: 'approve',
    remarks,
  });
}

/** Convenience wrapper — reject; remarks required. */
export async function rejectBusinessDocumentsAction(
  businessId: string,
  remarks: string,
): Promise<BusinessActionResponse<AdminBusiness>> {
  return reviewBusinessDocumentsAction(businessId, {
    decision: 'reject',
    remarks,
  });
}
