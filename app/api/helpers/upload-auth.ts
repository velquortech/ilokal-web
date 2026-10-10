import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

/**
 * Authorization for the `/api/web/upload/*` routes, in the two steps they need.
 *
 * They used to open with `verifyBusinessOwner()` and no id — "the caller's
 * shop" — and only check a `businessId` from the form if one was sent,
 * otherwise uploading to that guessed shop. For an owner of two shops the guess
 * was arbitrary (`.limit(1)`, no ORDER BY), so a logo could land on the other
 * shop. Now the session is checked first, and the shop the upload is FOR is
 * required and verified.
 */

/**
 * The signed-in user, checked BEFORE the request body is read: the upload rate
 * limit is keyed on it, and buffering a multi-megabyte body for an anonymous
 * caller is exactly the cost that limit exists to prevent.
 */
export async function requireUploadUser(
  route: string,
): Promise<{ userId: string } | NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return { userId: user.id };
  } catch (error) {
    console.error(`[${route}] session lookup failed`, formatErrorForLog(error));
  }
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 },
  );
}

/**
 * Proves the caller owns `businessId` — the shop the upload is for, taken from
 * the form. A missing id is a 400, never a fallback to some other shop.
 */
export async function requireUploadShop(
  route: string,
  businessId: FormDataEntryValue | null,
): Promise<{ businessId: string } | NextResponse> {
  if (typeof businessId !== 'string' || !businessId) {
    return NextResponse.json(
      { success: false, error: 'Business ID is required' },
      { status: 400 },
    );
  }

  let verify: Awaited<ReturnType<typeof verifyBusinessOwner>>;
  try {
    verify = await verifyBusinessOwner(businessId);
  } catch (error) {
    console.error(
      `[${route}] verifyBusinessOwner threw`,
      formatErrorForLog(error),
    );
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 },
    );
  }

  if (!verify.authorized || !verify.business?.id) {
    const error =
      verify.error && typeof verify.error === 'object' && 'code' in verify.error
        ? (verify.error as { code: string; message: string })
        : { code: 'FORBIDDEN', message: 'Unauthorized' };
    const status =
      error.code === 'AUTHENTICATION_ERROR'
        ? 401
        : error.code === 'VALIDATION_ERROR'
          ? 400
          : 403;
    return NextResponse.json(
      { success: false, error: error.message || 'Unauthorized' },
      { status },
    );
  }

  // The VERIFIED id: equal to the input once authorized, but writes use what
  // was checked, not what was sent.
  return { businessId: verify.business.id };
}
