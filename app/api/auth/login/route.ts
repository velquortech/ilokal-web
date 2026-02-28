import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/config/server';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';

export async function POST(_req: NextRequest) {
  try {
    const { email, password } = await _req.json();

    // Validate input
    if (!email || !password) {
      return badRequestResponse({
        message: 'Email and password are required',
      });
    }

    // Use service role client (bypasses RLS) for auth operations
    const supabase = await createServerSupabaseClient();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      console.error('[login] Auth error:', authError);
      return unauthorizedResponse({
        message: 'Invalid email or password',
      });
    }

    // Fetch profile data from 'profiles' table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('[login] Profile fetch error:', profileError);
      return generalErrorResponse({
        message: 'Failed to load user profile',
      });
    }

    const response = successResponse({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        role: profile.role,
        avatar_url: profile.avatar_url,
      },
      message: 'Logged in successfully',
    });

    return response;
  } catch (error) {
    console.error('[login] Unexpected error:', error);
    return generalErrorResponse({
      message: 'An unexpected error occurred during login',
    });
  }
}
