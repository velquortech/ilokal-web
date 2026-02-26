import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/config/index';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return badRequestResponse({
        message: 'Email and password are required',
      });
    }

    const supabase = await createClient();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return unauthorizedResponse({
        message: 'Invalid email or password',
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return generalErrorResponse({
        message: 'Failed to load user profile',
      });
    }

    // Set auth cookie (Supabase SSR handles this)
    const response = successResponse({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
      },
      message: 'Logged in successfully',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return generalErrorResponse({
      message: 'An unexpected error occurred during login',
    });
  }
}
