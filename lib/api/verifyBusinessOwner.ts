import { createServerSupabaseClient } from '@/supabase/server';
import { NextResponse } from 'next/server';

type AuthContext = {
  user: { id: string };
  profile: { role: string };
};

/**
 * Verify the current session (or provided auth context) is a business owner for the
 * given `businessId`. If `businessId` is omitted the function falls back to
 * locating the business owned by the current session user (legacy behavior).
 *
 * Returns { authorized: true, user, business } on success or an error payload
 * suitable for returning from a route handler on failure.
 */
export async function verifyBusinessOwner(
  businessId?: string,
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
    const supabase = await createServerSupabaseClient();

    // If no businessId provided, keep legacy behavior: find business by current session user
    if (!businessId) {
      // If auth context isn't provided, fetch session user
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

        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .is('archived_at', null)
          .limit(1)
          .maybeSingle();

        if (!business) {
          return {
            authorized: false,
            error: { code: 'NOT_FOUND', message: 'Business not found' },
          };
        }

        return {
          authorized: true,
          user: { id: user.id },
          business: { id: business.id },
        };
      }

      // auth provided, find business owned by auth.user
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', auth.user.id)
        .is('archived_at', null)
        .limit(1)
        .maybeSingle();

      if (!business) {
        return {
          authorized: false,
          error: { code: 'NOT_FOUND', message: 'Business not found' },
        };
      }

      return {
        authorized: true,
        user: { id: auth.user.id },
        business: { id: business.id },
      };
    }

    // Validate UUID format for businessId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessId)) {
      return {
        authorized: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid business ID format',
        },
      };
    }

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
    console.error('[verifyBusinessOwner] Error:', error);
    return {
      authorized: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authorization failed' },
    };
  }
}

export default verifyBusinessOwner;
