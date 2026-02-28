import { NextRequest } from 'next/server';
import { createClient } from '@/config/index';
import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return successResponse({
        user: null,
      });
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return successResponse({
        user: null,
      });
    }

    return successResponse({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
      },
    });
  } catch (error) {
    console.error('Verify session error:', error);
    return generalErrorResponse({
      message: 'Failed to verify session',
    });
  }
}
