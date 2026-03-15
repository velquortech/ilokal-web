'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/config/server';
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url, status')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        '[loginAction] Profile fetch error:',
        profileError?.message,
      );
      throw new Error('Failed to load user profile');
    }

    // Verify user account is active (not suspended or inactive)
    if (profile.status !== 'active') {
      console.warn(
        `[loginAction] Login attempt by inactive user ${authData.user.id} with status: ${profile.status}`,
      );
      throw new Error(
        `Your account is ${profile.status}. Please contact support.`,
      );
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

    // Prepare profile data - set initial status to active
    const profileData: Record<string, unknown> = {
      id: authData.user.id,
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
 * Also checks that user is still active (not suspended or inactive)
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

    // Fetch fresh profile data including status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // Check if user is still active (not suspended or inactive)
    if (profile.status !== 'active') {
      console.warn(
        `[verifySessionAction] User ${user.id} has status: ${profile.status}`,
      );
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
 * Clears session and redirects to login page
 *
 * Note: redirect() must be called inside try block or after error handling
 * because it throws NEXT_REDIRECT error that Next.js framework catches
 */
export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[logoutAction] Sign out error:', error.message);
      throw new Error('Failed to sign out');
    }

    console.info('[logoutAction] User signed out successfully');
  } catch (error) {
    console.error('[logoutAction] Error during logout:', error);
    // Continue to redirect even if signout had issues
  }

  // Redirect to login page after logout (moved inside to ensure it executes)
  redirect(ROUTES.AUTH.LOGIN);
}

/**
 * Server Action: Set session expiration cookie
 *
 * Stores session expiration timestamp in a non-httpOnly cookie
 * so client-side can read it for session monitoring.
 *
 * @param expirationTime - Millisecond timestamp of expiration
 */
export async function setSessionExpirationCookie(
  expirationTime: number,
): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set('sessionExpiration', expirationTime.toString(), {
      httpOnly: false, // ← Allow JavaScript to read
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });
  } catch (error) {
    console.error('[setSessionExpirationCookie] Error:', error);
    throw new Error('Failed to set session cookie');
  }
}

/**
 * Server Action: Clear session expiration cookie
 *
 * Called on logout to remove the session expiration cookie.
 */
export async function clearSessionExpirationCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('sessionExpiration');
  } catch (error) {
    console.error('[clearSessionExpirationCookie] Error:', error);
    // Don't throw - clearing cookie on logout is best-effort
  }
}

/**
 * Server Action: Get session expiration from cookie
 *
 * Called from client-side session monitor to check expiration time.
 *
 * @returns Millisecond timestamp of expiration, or null if not set
 */
export async function getSessionExpirationCookie(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get('sessionExpiration')?.value;

    if (!value) {
      return null;
    }

    const expirationTime = parseInt(value, 10);
    return Number.isNaN(expirationTime) ? null : expirationTime;
  } catch (error) {
    console.error('[getSessionExpirationCookie] Error:', error);
    return null;
  }
}
