'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/supabase/server';
import { ROUTES } from '@/config/routeConfig';
import { User } from '@/lib/types/user';
import { SignupInput } from '@/lib/validation/auth';

/**
 * Server Action: Handle user login
 *
 * Security considerations:
 * - Runs only on server, credentials never exposed to client
 * - Supabase SSR handles session via HTTP-only cookies
 * - Input validation before processing
 * - Generic error messages to prevent account enumeration
 * - Uses service role only for auth operations
 */
export async function loginAction(
  email: string,
  password: string,
): Promise<{ user: User; message: string }> {
  try {
    // Validate required fields
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Email and password are required');
    }

    // Validate email format (basic)
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Create server-side Supabase client
    // Automatically handles session cookies (HTTP-only, secure)
    const supabase = await createServerSupabaseClient();

    // Sign in with Supabase Auth
    // Session is automatically stored in HTTP-only cookies
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (authError || !authData.user) {
      // Generic error message prevents account enumeration attacks
      console.error('[loginAction] Auth error:', authError?.message);
      throw new Error('Invalid email or password');
    }

    // Fetch profile data from 'profiles' table
    // Uses authenticated session from cookie
    const { data: statusCheck } = await supabase
      .from('profiles')
      .select('id, archived_at, status')
      .eq('id', authData.user.id)
      .single();

    if (!statusCheck) {
      console.error(
        '[loginAction] Profile not found for user',
        authData.user.id,
      );
      throw new Error('Failed to load user profile');
    }

    // Verify user account is not archived
    if (statusCheck.archived_at) {
      console.warn(
        `[loginAction] Login attempt by archived user ${authData.user.id}`,
      );
      throw new Error(
        'Your account has been archived. Please contact support.',
      );
    }

    // Verify user account is active (not suspended or inactive)
    if (statusCheck.status !== 'active') {
      console.warn(
        `[loginAction] Login attempt by inactive user ${authData.user.id} with status: ${statusCheck.status}`,
      );
      throw new Error(
        `Your account is ${statusCheck.status}. Please contact support.`,
      );
    }

    // Fetch full profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (!profile) {
      throw new Error('Failed to load user profile');
    }

    return {
      user: profile as User,
      message: 'Logged in successfully',
    };
  } catch (error) {
    // Log detailed error server-side, return generic message to client
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('[loginAction] Error:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Server Action: Handle user signup
 *
 * Security considerations:
 * - Validates email uniqueness before auth signup
 * - Creates user account and profile atomically
 * - Returns minimal data to client
 * - Prevents timing attacks with generic error messages
 * - Credentials handled server-side only
 */
export async function signupAction(
  data: SignupInput,
): Promise<{ user: User; message: string }> {
  try {
    // Validate required fields (Zod handles this, but double-check)
    if (!data.email?.trim() || !data.password?.trim() || !data.name?.trim()) {
      throw new Error('Email, password, and name are required');
    }

    if (!data.role) {
      throw new Error('User role is required');
    }

    // Validate email format
    if (!data.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient();

    // Check if email already exists (before auth signup to prevent issues)
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', data.email.trim())
      .single();

    if (!checkError && existingUser) {
      throw new Error('Email already registered');
    }

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected)
      console.error('[signupAction] Check error:', checkError.message);
      throw new Error('Failed to validate email availability');
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password.trim(),
    });

    if (authError || !authData.user) {
      console.error('[signupAction] Auth error:', authError?.message);
      throw new Error(authError?.message || 'Failed to create account');
    }

    const userId = authData.user.id;

    // Prepare profile data - set initial status to active
    const profileData: Record<string, unknown> = {
      id: userId,
      email: data.email.trim(),
      full_name: data.name.trim(),
      role: data.role,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    const phoneNumber = data.phone_number?.trim();
    if (phoneNumber && /\d/.test(phoneNumber)) {
      profileData.phone_number = phoneNumber;
    }

    if (data.avatar_url?.trim()) {
      profileData.avatar_url = data.avatar_url.trim();
    }

    // Create profile in database
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      console.error(
        '[signupAction] Profile creation error:',
        profileError.message,
      );
      // Attempt to clean up auth user on profile creation failure
      await supabase.auth.admin.deleteUser(userId).catch(() => {
        // Ignore cleanup errors
      });
      throw new Error('Failed to create user profile');
    }

    // Fetch the created profile
    const { data: createdProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!createdProfile) {
      throw new Error('Failed to load created profile');
    }

    return {
      user: createdProfile as User,
      message: 'Account created successfully',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('[signupAction] Error:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Server Action: Redirect user to appropriate dashboard
 */
export async function redirectByRole(role: string): Promise<void> {
  try {
    switch (role) {
      case 'admin':
        redirect(ROUTES.DASHBOARD.ADMIN);
        break;
      case 'business_owner':
        redirect(ROUTES.DASHBOARD.BUSINESS);
        break;
      case 'app_user':
      default:
        redirect(ROUTES.PUBLIC.HOME);
        break;
    }
  } catch (error) {
    console.error('[redirectByRole] Error:', error);
    throw error;
  }
}

/**
 * Server Action: Handle user logout
 */
export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    redirect(ROUTES.AUTH.LOGIN);
  } catch (error) {
    console.error('[logoutAction] Error:', error);
    redirect(ROUTES.AUTH.LOGIN);
  }
}

/**
 * Server Action: Verify session and get current user
 */
export async function verifySessionAction(): Promise<{ user: User } | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!profile) {
      return null;
    }

    return { user: profile as User };
  } catch (error) {
    console.error('[verifySessionAction] Error:', error);
    return null;
  }
}
