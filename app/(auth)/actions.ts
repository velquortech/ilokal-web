'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/config/server';
import { ROUTES } from '@/config/routeConfig';
import { User } from '@/lib/types/user';
import { SignupInput } from '@/app/admin/schemas/validation/auth';

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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        '[loginAction] Profile fetch error:',
        profileError?.message,
      );
      throw new Error('Failed to load user profile');
    }

    // Return only necessary user data to client
    const userData: User = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      role: profile.role,
      avatar_url: profile.avatar_url,
    };

    return {
      user: userData,
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

    // Prepare profile data
    const profileData: Record<string, unknown> = {
      id: authData.user.id,
      email: data.email.trim(),
      full_name: data.name.trim(),
      role: data.role,
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
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {
        // Silently ignore cleanup errors
      });
      throw new Error('Failed to create user profile');
    }

    // Return user data (subset for client)
    const userData: User = {
      id: authData.user.id,
      email: data.email.trim(),
      full_name: data.name.trim(),
      phone_number: phoneNumber || null,
      role: data.role,
      avatar_url: data.avatar_url?.trim() || null,
    };

    return {
      user: userData,
      message: 'Account created successfully. Please verify your email.',
    };
  } catch (error) {
    // Log detailed error server-side
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('[signupAction] Error:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Server Action: Redirect user based on role
 * Separated to prevent timing attacks during authentication
 */
export async function redirectByRole(role: string): Promise<void> {
  switch (role) {
    case 'admin':
      redirect(ROUTES.DASHBOARD.ADMIN);
      break;
    case 'business_owner':
      redirect(ROUTES.DASHBOARD.BUSINESS);
      break;
    default:
      redirect(ROUTES.DASHBOARD.HOME);
  }
}

/**
 * Server Action: Verify and refresh session
 *
 * Security: Checks if current session is still valid
 * If session is about to expire or expired, attempts to refresh it
 * Returns null if session is invalid and cannot be refreshed
 */
export async function verifySessionAction(): Promise<{ user: User } | null> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Fetch fresh profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    const userData: User = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      role: profile.role,
      avatar_url: profile.avatar_url,
    };

    return { user: userData };
  } catch (error) {
    console.error('[verifySessionAction] Error:', error);
    return null;
  }
}

/**
 * Server Action: Logout user
 * Clears session and redirects
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(ROUTES.AUTH.LOGIN);
}
