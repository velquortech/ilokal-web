import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getMyBusinesses,
  createBusinessDraft,
} from '@/lib/api/business/business';
import { locationSchema } from '@/app/business/registration/validator/business-registration-form-schema';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

/**
 * The authoritative gate for the registration payload — the client schema is
 * convenience, this is enforcement. `location` reuses the wizard's schema so
 * the two cannot drift apart: a crafted request that slips a junk address
 * past a stale client still fails here, and every field the branch mirror
 * reads (`geometry`, the address parts) is guaranteed to exist.
 */
const createBusinessSchema = z.object({
  shop_name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(500),
  business_category: z.object({
    id: z.guid().optional().nullable(),
    type: z.enum(['predefined', 'custom']),
    name: z.string().trim().min(1),
    description: z.string().optional().nullable(),
  }),
  category_id: z.guid().nullable().optional(),
  location: locationSchema,
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
        {
          message: 'Invalid registration payload',
          // Field-level detail so the client (and a support agent reading the
          // response) can see exactly which field failed and why.
          errors: parsed.error.issues.map(
            (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          ),
        },
        { status: 400 },
      );
    }
    // Owners must pick a predefined business type. An invented "custom" type
    // has no vertical, so the business falls back to the retail offering mode
    // and breaks the type-scoped sorting and category scoping everywhere
    // downstream — the same reason the registration step no longer offers the
    // Custom option. The client schema still ACCEPTS a restored custom draft
    // (so a cached submission can be reviewed), but this guard is the
    // authoritative rejection: even a crafted request cannot create one.
    const category = parsed.data.business_category as
      | { type?: string }
      | undefined;
    if (category?.type === 'custom') {
      return NextResponse.json(
        {
          message:
            'Custom business categories are no longer supported. Pick a business type and category from the list.',
        },
        { status: 400 },
      );
    }
    const newBusiness = await createBusinessDraft({
      ...parsed.data,
      category_id: parsed.data.category_id ?? null,
    });
    return NextResponse.json(newBusiness, { status: 201 });
  } catch (error) {
    console.error('[POST /api/web/businesses]', formatErrorForLog(error));
    return NextResponse.json(
      { message: 'Failed to create business' },
      { status: 400 },
    );
  }
}
