import { NextRequest } from 'next/server';
import { createClient } from '@/config/index';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  conflictRequestResponse,
} from '../../helpers/response';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role } = await req.json();

    // Validate input
    if (!email || !password || !name || !role) {
      return badRequestResponse({
        message: 'Email, password, name, and role are required',
      });
    }

    // Validate role
    if (!['business_owner', 'user'].includes(role)) {
      return badRequestResponse({
        message: 'Invalid role. Must be "business_owner" or "user"',
      });
    }

    const supabase = await createClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return conflictRequestResponse({
        message: 'Email already registered',
      });
    }

    // Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return generalErrorResponse({
        message: authError.message,
      });
    }

    if (!authData.user) {
      return generalErrorResponse({
        message: 'Failed to create user',
      });
    }

    // Create profile in database
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name: name,
      role,
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (profileError) {
      return generalErrorResponse({
        message: profileError.message,
      });
    }

    return successResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        name,
      },
      message: 'Account created successfully. Please verify your email.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return generalErrorResponse({
      message: 'An unexpected error occurred during signup',
    });
  }
}
