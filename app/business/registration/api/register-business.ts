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
export async function registerBusiness(
  meta: BusinessRegistrationMeta,
): Promise<{ id: string }> {
  return await apiClient.post('/api/web/businesses', meta);
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
