import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createBusinessRegistrationDeal } from '@/lib/api/business/business';
import { rateLimit, clientIp } from '@/app/api/helpers/rateLimit';
import { MAX_DEAL_DURATION_DAYS } from '@/app/business/registration/validator/business-registration-form-schema';

/**
 * POST /api/web/businesses/[id]/deal — the optional launch deal.
 *
 * Same guards as the offerings route: id shape, flood guard, then ownership
 * inside the query layer against the caller's own user.
 */
const RATE_LIMIT = Number(process.env.REGISTRATION_DEAL_RATE_LIMIT ?? 10);
const RATE_WINDOW_MS = Number(
  process.env.REGISTRATION_DEAL_RATE_WINDOW_MS ?? 60_000,
);

const bodySchema = z
  .object({
    code: z.string().trim().min(1).max(50),
    description: z.string().trim().max(500).optional(),
    discount_type: z.enum(['percentage', 'fixed_amount']),
    discount_value: z.number().positive(),
    duration_days: z.number().int().positive().max(MAX_DEAL_DURATION_DAYS),
    /**
     * Whether the coupon goes live. Explicit in the payload rather than
     * inferred: this is the field that decides whether a stranger can redeem
     * a discount, so it must be something the client states and the server
     * validates, never a default either side can drift on.
     */
    publish: z.boolean(),
    /** Shape-checked here; ownership is proved in the query layer. */
    image_url: z.string().max(512).nullable().optional(),
  })
  .refine(
    (data) => data.discount_type !== 'percentage' || data.discount_value <= 100,
    'A percentage discount cannot be more than 100%',
  );

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

    const { allowed, retryAfterSec } = rateLimit(
      `registration-deal:${id}:${clientIp(request as unknown as { headers: Headers })}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    );
    if (!allowed) {
      return NextResponse.json(
        { message: 'Too many requests — please try again in a moment' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Check the code and the discount amount' },
        { status: 400 },
      );
    }

    const result = await createBusinessRegistrationDeal(id, parsed.data);
    return NextResponse.json(result, { status: 200 });
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
    console.error('[POST /api/web/businesses/[id]/deal]', error);
    return NextResponse.json(
      { message: 'Failed to save your deal' },
      { status: 400 },
    );
  }
}
