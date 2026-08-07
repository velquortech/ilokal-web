import apiClient from '@/services/api/apiClient';
import type { RegistrationFileKind } from '@/lib/api/business/business';

export interface BusinessRegistrationMeta {
  shop_name: string;
  description: string;
  business_category: Record<string, unknown>;
  category_id?: string | null;
  location: Record<string, unknown>;
}

/**
 * Phase 1 — create the business row from JSON metadata only. Files follow in
 * separate per-file requests (one multipart POST with everything exceeded
 * Vercel's 4.5 MB body limit → 413 in production).
 */
export interface CreatedBusiness {
  id: string;
  /**
   * The PERSISTED status, not the one the client asked for. The insert returns
   * through PostgREST's `RETURNING`, which runs after the
   * `set_business_initial_status` BEFORE INSERT trigger — so with
   * `auto_verify_businesses` on this comes back `'verified'` already. The
   * success dialog forks on it; echoing a requested value would reproduce the
   * "under review" lie one layer down.
   */
  status?: string | null;
}

export async function registerBusiness(
  meta: BusinessRegistrationMeta,
): Promise<CreatedBusiness> {
  return await apiClient.post('/api/web/businesses', meta);
}

/**
 * Phase 3 — the menu entered in the wizard.
 *
 * Its own request, like the files, because one all-in-one POST is what 413'd
 * in production. Safe to call twice: the server skips any name the business
 * already has, so a retried submission cannot double the owner's menu.
 */
export async function createRegistrationOfferings(
  businessId: string,
  offerings: { name: string; price: number | null; on_request: boolean }[],
  kind: 'product' | 'service',
) {
  return await apiClient.post(`/api/web/businesses/${businessId}/offerings`, {
    offerings,
    kind,
  });
}

/**
 * Phase 4 — the optional launch deal.
 *
 * Safe to call twice: the server skips a code the business already has.
 */
export async function createRegistrationDeal(
  businessId: string,
  deal: {
    code: string;
    description?: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    duration_days: number;
    publish: boolean;
  },
) {
  return await apiClient.post(`/api/web/businesses/${businessId}/deal`, deal);
}

/** Phase 2 — upload a single registration file (each ≤ 2 MB, own request). */
export async function uploadRegistrationFile(
  businessId: string,
  kind: RegistrationFileKind,
  file: File,
  index?: number,
) {
  const formData = new FormData();
  formData.append('kind', kind);
  formData.append('file', file);
  if (index !== undefined) formData.append('index', String(index));

  return await apiClient.post(
    `/api/web/businesses/${businessId}/files`,
    formData,
    {
      headers: {
        'Content-Type': undefined,
      },
    },
  );
}
