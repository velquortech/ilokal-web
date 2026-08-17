import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createBusinessRegistrationOfferings } from '@/lib/api/business/business';
import { MAX_REGISTRATION_OFFERINGS } from '@/lib/validation/products';
import { rateLimit, clientIp } from '@/app/api/helpers/rateLimit';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

/**
 * POST /api/web/businesses/[id]/offerings — the menu entered in the wizard.
 *
 * A third registration request, for the same reason the files are their own:
 * one all-in-one POST is what 413'd in production. This one is small (JSON,
 * no bytes), so the whole menu goes in a single call.
 *
 * This is a publicly invocable endpoint, so it proves everything itself rather
 * than trusting the wizard that normally calls it: id shape, then a flood
 * guard, then ownership (inside the query layer, against the caller's own
 * user). It also amplifies — one request, up to twenty inserts.
 */
const RATE_LIMIT = Number(process.env.REGISTRATION_OFFERING_RATE_LIMIT ?? 20);
const RATE_WINDOW_MS = Number(
  process.env.REGISTRATION_OFFERING_RATE_WINDOW_MS ?? 60_000,
);

const offeringSchema = z.object({
  name: z.string().trim().min(1).max(255),
  price: z.number().min(0).nullable(),
  on_request: z.boolean(),
  /**
   * A bucket-relative path from the `offering_image` upload. Shape-checked
   * here and OWNERSHIP-checked in the query layer, which is the only place
   * that knows the verified business id.
   */
  image_url: z.string().max(512).nullable().optional(),
});

const bodySchema = z.object({
  offerings: z.array(offeringSchema).min(1).max(MAX_REGISTRATION_OFFERINGS),
  /**
   * What the business's `offering_mode` implies for a new row. Validated
   * against the closed set rather than taken as a free string — it lands in
   * `products.kind`, which has a CHECK, and a driver error is not a client
   * message.
   */
  kind: z.enum(['product', 'service']),
});

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

    // Keyed on the target business rather than the IP: registration is one
    // shop per owner, and an IP key would throttle a shared connection (a
    // co-working space, a mall's wifi) where several owners register at once.
    // The IP is folded in so one attacker cannot rotate business ids for free.
    const { allowed, retryAfterSec } = rateLimit(
      `registration-offerings:${id}:${clientIp(request as unknown as { headers: Headers })}`,
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
        { message: 'Expected between 1 and 20 offerings, each with a name' },
        { status: 400 },
      );
    }

    const result = await createBusinessRegistrationOfferings(
      id,
      parsed.data.offerings,
      parsed.data.kind,
    );
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
    // Never the driver's text — it names tables, columns and constraints.
    console.error(
      '[POST /api/web/businesses/[id]/offerings]',
      formatErrorForLog(error),
    );
    return NextResponse.json(
      { message: 'Failed to save your items' },
      { status: 400 },
    );
  }
}
