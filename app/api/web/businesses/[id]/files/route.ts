import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  uploadBusinessRegistrationFile,
  type RegistrationFileKind,
} from '@/lib/api/business/business';

// One file per request so each stays well under Vercel's 4.5 MB function body
// limit (the previous all-in-one multipart registration POST 413'd in prod).
// 4 MB server-side hard cap — the client validates 2 MB per file; this only
// guards against direct API abuse.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const kindSchema = z.enum([
  'shop_logo',
  'shop_banner',
  'interior_image',
  'business_license',
  'tax_certificate',
]);

// POST: /api/web/businesses/[id]/files — multipart with `kind`, `file`, and
// (for interior_image) an optional `index` used only for filename uniqueness.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!z.guid().safeParse(id).success) {
      return NextResponse.json(
        { message: 'Invalid business id' },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const kindResult = kindSchema.safeParse(formData.get('kind'));
    const file = formData.get('file');
    if (!kindResult.success || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: 'Expected a `kind` field and a non-empty `file`' },
        { status: 400 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { message: 'File must be 4MB or less' },
        { status: 413 },
      );
    }

    const index = Number(formData.get('index') ?? 0) || 0;
    const business = await uploadBusinessRegistrationFile(
      id,
      kindResult.data as RegistrationFileKind,
      file,
      index,
    );
    return NextResponse.json(business, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Business not found') {
      return NextResponse.json(
        { message: 'Business not found' },
        { status: 404 },
      );
    }
    console.error('[POST /api/web/businesses/[id]/files]', error);
    return NextResponse.json(
      { message: 'Failed to upload file' },
      { status: 400 },
    );
  }
}
