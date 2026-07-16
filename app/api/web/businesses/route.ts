import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getMyBusinesses,
  createBusinessDraft,
} from '@/lib/api/business/business';

const createBusinessSchema = z.object({
  shop_name: z.string().min(1),
  description: z.string().min(1),
  business_category: z.record(z.string(), z.unknown()),
  category_id: z.guid().nullable().optional(),
  location: z.record(z.string(), z.unknown()),
});

// GET: /api/businesses
export async function GET() {
  try {
    const businesses = await getMyBusinesses();
    return NextResponse.json(businesses);
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}

// POST: /api/businesses — JSON metadata only. Files are uploaded afterwards,
// one request each, via POST /api/web/businesses/[id]/files (a single
// multipart POST with all files exceeded Vercel's 4.5 MB body limit → 413).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createBusinessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid registration payload' },
        { status: 400 },
      );
    }
    const newBusiness = await createBusinessDraft({
      ...parsed.data,
      category_id: parsed.data.category_id ?? null,
    });
    return NextResponse.json(newBusiness, { status: 201 });
  } catch (error) {
    console.error('[POST /api/web/businesses]', error);
    return NextResponse.json(
      { message: 'Failed to create business' },
      { status: 400 },
    );
  }
}
