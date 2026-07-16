import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createBusinessPOST } from '../route';
import { POST as uploadFilePOST } from '../[id]/files/route';
import * as businessApi from '@/lib/api/business/business';

vi.mock('@/lib/api/business/business');
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const BUSINESS_ID = '11111111-2222-3333-4444-555555555555';

const validMeta = {
  shop_name: 'Test Cafe',
  description: 'A cozy test cafe',
  business_category: { type: 'predefined', name: 'Café' },
  category_id: null,
  location: {
    province: 'Iloilo',
    city: 'Iloilo City',
    barangay: 'Molo',
    street_address: 'Iznart St.',
    zip_code: '5000',
    geometry: 'lat:10.6973,lng:122.5649',
  },
};

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/web/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function fileRequest(
  fields: { kind?: string; file?: File | string; index?: string },
  id: string = BUSINESS_ID,
) {
  const formData = new FormData();
  if (fields.kind !== undefined) formData.append('kind', fields.kind);
  if (fields.file !== undefined) formData.append('file', fields.file);
  if (fields.index !== undefined) formData.append('index', fields.index);
  const request = new Request(
    `http://localhost:3000/api/web/businesses/${id}/files`,
    { method: 'POST', body: formData },
  );
  return { request, params: Promise.resolve({ id }) };
}

describe('POST /api/web/businesses (JSON metadata)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(businessApi.createBusinessDraft).mockResolvedValue({
      id: BUSINESS_ID,
      shop_name: validMeta.shop_name,
    });
  });

  it('creates a draft from valid JSON metadata and returns 201', async () => {
    const res = await createBusinessPOST(jsonRequest(validMeta));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(BUSINESS_ID);
    expect(businessApi.createBusinessDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        shop_name: 'Test Cafe',
        category_id: null,
      }),
    );
  });

  it('rejects an invalid payload with 400 and no draft call', async () => {
    const res = await createBusinessPOST(jsonRequest({ shop_name: '' }));
    expect(res.status).toBe(400);
    expect(businessApi.createBusinessDraft).not.toHaveBeenCalled();
  });

  it('returns a generic 400 when creation fails (no raw error leak)', async () => {
    vi.mocked(businessApi.createBusinessDraft).mockRejectedValue(
      new Error('duplicate key value violates unique constraint'),
    );
    const res = await createBusinessPOST(jsonRequest(validMeta));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('duplicate key');
  });
});

describe('POST /api/web/businesses/[id]/files (per-file upload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(businessApi.uploadBusinessRegistrationFile).mockResolvedValue({
      id: BUSINESS_ID,
      logo_url: `${BUSINESS_ID}/logo-123.webp`,
    });
  });

  it('uploads a valid file and returns 200', async () => {
    const file = new File(['fake-image-bytes'], 'logo.png', {
      type: 'image/png',
    });
    const { request, params } = fileRequest({ kind: 'shop_logo', file });
    const res = await uploadFilePOST(request, { params });
    expect(res.status).toBe(200);
    expect(businessApi.uploadBusinessRegistrationFile).toHaveBeenCalledWith(
      BUSINESS_ID,
      'shop_logo',
      expect.any(File),
      0,
    );
  });

  it('passes the interior image index through', async () => {
    const file = new File(['fake'], 'interior.png', { type: 'image/png' });
    const { request, params } = fileRequest({
      kind: 'interior_image',
      file,
      index: '3',
    });
    await uploadFilePOST(request, { params });
    expect(businessApi.uploadBusinessRegistrationFile).toHaveBeenCalledWith(
      BUSINESS_ID,
      'interior_image',
      expect.any(File),
      3,
    );
  });

  it('rejects a non-uuid business id with 400', async () => {
    const file = new File(['fake'], 'logo.png', { type: 'image/png' });
    const { request, params } = fileRequest(
      { kind: 'shop_logo', file },
      'not-a-uuid',
    );
    const res = await uploadFilePOST(request, { params });
    expect(res.status).toBe(400);
    expect(businessApi.uploadBusinessRegistrationFile).not.toHaveBeenCalled();
  });

  it('rejects an unknown kind with 400', async () => {
    const file = new File(['fake'], 'logo.png', { type: 'image/png' });
    const { request, params } = fileRequest({ kind: 'malware', file });
    const res = await uploadFilePOST(request, { params });
    expect(res.status).toBe(400);
    expect(businessApi.uploadBusinessRegistrationFile).not.toHaveBeenCalled();
  });

  it('rejects a missing file with 400', async () => {
    const { request, params } = fileRequest({ kind: 'shop_logo' });
    const res = await uploadFilePOST(request, { params });
    expect(res.status).toBe(400);
    expect(businessApi.uploadBusinessRegistrationFile).not.toHaveBeenCalled();
  });

  it('rejects a file over 4MB with 413', async () => {
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    });
    const { request, params } = fileRequest({ kind: 'shop_logo', file: big });
    const res = await uploadFilePOST(request, { params });
    expect(res.status).toBe(413);
    expect(businessApi.uploadBusinessRegistrationFile).not.toHaveBeenCalled();
  });

  it('maps Unauthorized to 401', async () => {
    vi.mocked(businessApi.uploadBusinessRegistrationFile).mockRejectedValue(
      new Error('Unauthorized'),
    );
    const file = new File(['fake'], 'logo.png', { type: 'image/png' });
    const { request, params } = fileRequest({ kind: 'shop_logo', file });
    const res = await uploadFilePOST(request, { params });
    expect(res.status).toBe(401);
  });

  it('maps Business not found to 404 (wrong owner or archived)', async () => {
    vi.mocked(businessApi.uploadBusinessRegistrationFile).mockRejectedValue(
      new Error('Business not found'),
    );
    const file = new File(['fake'], 'logo.png', { type: 'image/png' });
    const { request, params } = fileRequest({ kind: 'shop_logo', file });
    const res = await uploadFilePOST(request, { params });
    expect(res.status).toBe(404);
  });
});
