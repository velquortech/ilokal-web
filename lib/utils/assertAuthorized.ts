import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import type { Profile } from '@/lib/types/user';

type AssertOpts = {
  roles?: string[];
};

export async function assertAuthorized(
  _request?: NextRequest,
  opts: AssertOpts = {},
): Promise<
  | { authorized: true; user: { id: string; email?: string }; profile: Profile }
  | { authorized: false; error: NextResponse }
> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        authorized: false,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: 'AUTHENTICATION_ERROR',
              message: 'Authentication required',
            },
          },
          { status: 401 },
        ),
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, role, status, email, full_name, phone_number, avatar_url, created_at, updated_at, archived_at',
      )
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        authorized: false,
        error: NextResponse.json(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: 'User profile not found' },
          },
          { status: 404 },
        ),
      };
    }

    if (profile.status !== 'active') {
      return {
        authorized: false,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: 'ACCOUNT_INACTIVE',
              message: 'Account is not active',
            },
          },
          { status: 403 },
        ),
      };
    }

    if (opts.roles && opts.roles.length > 0) {
      if (!opts.roles.includes(profile.role)) {
        return {
          authorized: false,
          error: NextResponse.json(
            {
              success: false,
              error: { code: 'FORBIDDEN', message: 'Insufficient role' },
            },
            { status: 403 },
          ),
        };
      }
    }

    return {
      authorized: true,
      user: { id: user.id, email: (profile.email as string) || undefined },
      profile,
    };
  } catch (err) {
    console.error('[assertAuthorized] Error:', err);
    return {
      authorized: false,
      error: NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Authorization failed' },
        },
        { status: 500 },
      ),
    };
  }
}

export default assertAuthorized;
