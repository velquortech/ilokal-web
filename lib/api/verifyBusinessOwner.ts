import { createServerSupabaseClient } from '@/supabase/server';
import { NextResponse } from 'next/server';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

type AuthContext = {
  user: { id: string };
  profile: { role: string };
};

/**
 * Verify the current session (or provided auth context) is a business owner for
 * the given `businessId` — that shop, and no other.
 *
 * `businessId` is required. It used to be optional, with a missing or falsy id
 * meaning "find the caller's shop" via `.eq('owner_id', …).limit(1)` and no
 * ORDER BY: for an owner with two shops that authorized an arbitrary one, and
 * every caller that forgot the id (or passed '') acted on the wrong shop —
 * coupons, branches and products filed under the other shop's name. A missing
 * id is now a VALIDATION_ERROR, so the only way to be authorized is to name
 * the shop; callers take it from the route segment.
 *
 * Returns { authorized: true, user, business } on success or an error payload
 * suitable for returning from a route handler on failure.
 */
export async function verifyBusinessOwner(
  businessId: string,
  auth?: AuthContext,
): Promise<{
  authorized: boolean;
  error?:
    | { code: string; message: string }
    | ReturnType<typeof NextResponse.json>;
  user?: { id: string };
  business?: { id: string };
}> {
  try {
    // Validate UUID format for businessId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Also the gate for a missing id: '' and undefined fail it, so neither can
    // reach a query that is not scoped to one shop.
    if (typeof businessId !== 'string' || !uuidRegex.test(businessId)) {
      return {
        authorized: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid business ID format',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .is('archived_at', null)
      .single();

    if (error || !business) {
      return {
        authorized: false,
        error: { code: 'NOT_FOUND', message: 'Business not found' },
      };
    }

    // If auth wasn't provided, get current session user
    if (!auth) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return {
          authorized: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'You must be logged in',
          },
        };
      }

      // Only allow owner to access (admin bypass not available without profile)
      if (business.owner_id !== user.id) {
        return {
          authorized: false,
          error: { code: 'FORBIDDEN', message: 'You do not have permission' },
        };
      }

      return {
        authorized: true,
        user: { id: user.id },
        business: { id: business.id },
      };
    }

    // auth provided: allow if admin or owner
    if (auth.profile.role === 'admin' || business.owner_id === auth.user.id) {
      return {
        authorized: true,
        user: { id: auth.user.id },
        business: { id: business.id },
      };
    }

    return {
      authorized: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this business',
      },
    };
  } catch (error) {
    console.error('[verifyBusinessOwner] Error:', formatErrorForLog(error));
    return {
      authorized: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authorization failed' },
    };
  }
}

export default verifyBusinessOwner;
