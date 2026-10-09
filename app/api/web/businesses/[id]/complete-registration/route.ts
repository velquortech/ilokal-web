import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, clientIp } from '@/app/api/helpers/rateLimit';
import { createServerSupabaseClient } from '@/supabase/server';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

const RATE_LIMIT = Number(process.env.REGISTRATION_COMPLETE_RATE_LIMIT ?? 10);
const RATE_WINDOW_MS = Number(
  process.env.REGISTRATION_COMPLETE_RATE_WINDOW_MS ?? 60_000,
);

/** POST /api/web/businesses/[id]/complete-registration */
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

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { allowed, retryAfterSec } = rateLimit(
      `registration-complete:${id}:${clientIp(request as unknown as { headers: Headers })}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    );
    if (!allowed) {
      return NextResponse.json(
        { message: 'Too many requests — please try again in a moment' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    const { data: status, error } = await supabase.rpc(
      'complete_business_registration',
      { p_business_id: id },
    );
    if (error) {
      if (error.code === 'P0002') {
        return NextResponse.json(
          { message: 'Business not found' },
          { status: 404 },
        );
      }
      if (error.code === 'P0001') {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error(
      '[POST /api/web/businesses/[id]/complete-registration]',
      formatErrorForLog(error),
    );
    return NextResponse.json(
      { message: 'Failed to complete registration' },
      { status: 500 },
    );
  }
}
