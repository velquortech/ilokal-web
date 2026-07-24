'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/supabase/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { ROUTES, businessPath } from '@/config/routeConfig';
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

    // No profiles-by-email precheck: the anon/cookie client can't see other
    // users' rows under RLS (the check was dead code and a user-enumeration
    // surface). auth.signUp reports duplicate emails itself.

    // Sign up with Supabase Auth. The chosen role travels in user metadata:
    // the on_auth_user_created trigger (handle_new_user) reads it through an
    // allowlist ('app_user' | 'business_owner' — never 'admin') and inserts
    // the profile with the correct role in a privileged path. A client-session
    // role write would be reverted by the SEC-1 privilege trigger.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password.trim(),
      options: {
        data: {
          full_name: data.name.trim(),
          role: data.role,
        },
      },
    });

    if (authError || !authData.user) {
      console.error('[signupAction] Auth error:', authError?.message);
      throw new Error(authError?.message || 'Failed to create account');
    }

    const userId = authData.user.id;

    // The trigger already created the profile with the right role. Merge in
    // the extras the trigger doesn't handle (phone/avatar). role/status are
    // intentionally NOT written here — privileged columns, trigger-owned.
    const profileData: Record<string, unknown> = {
      id: userId,
      email: data.email.trim(),
      full_name: data.name.trim(),
      updated_at: new Date().toISOString(),
    };

    const phoneNumber = data.phone_number?.trim();
    if (phoneNumber && /\d/.test(phoneNumber)) {
      profileData.phone_number = phoneNumber;
    }

    if (data.avatar_url?.trim()) {
      profileData.avatar_url = data.avatar_url.trim();
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      // Non-fatal: the account + correctly-roled profile already exist; only
      // the optional extras failed to merge. Failing the whole signup here
      // would strand a live account behind an error message.
      console.error(
        '[signupAction] Profile extras update error:',
        profileError.message,
      );
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
 * Server Action: Login restricted to admin role only.
 * Signs the user out and throws if the account is not an admin.
 */
export async function loginAsAdmin(
  email: string,
  password: string,
): Promise<{ user: User; message: string }> {
  const result = await loginAction(email, password);

  if (result.user.role !== 'admin') {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    throw new Error(
      'This portal is for admins only. Please use the Business portal.',
    );
  }

  return result;
}

/**
 * Server Action: Login restricted to business_owner role only.
 * Signs the user out and throws if the account is not a business owner.
 */
export async function loginAsBusiness(
  email: string,
  password: string,
): Promise<{ user: User; businessId: string | null; message: string }> {
  const result = await loginAction(email, password);

  if (result.user.role !== 'business_owner') {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    throw new Error(
      'This portal is for business owners only. Please use the Admin portal.',
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', result.user.id)
    .maybeSingle();

  return { ...result, businessId: business?.id ?? null };
}

/**
 * Server Action: Redirect user to appropriate dashboard
 */
export async function redirectByRole(
  role: string,
  businessId?: string | null,
): Promise<void> {
  switch (role) {
    case 'admin':
      redirect(ROUTES.DASHBOARD.ADMIN);
      break;
    case 'business_owner':
      redirect(
        businessId ? businessPath(businessId) : ROUTES.BUSINESS.registration,
      );
      break;
    case 'app_user':
    default:
      redirect(ROUTES.BUSINESS.home);
      break;
  }
}

/**
 * Expire every Supabase auth cookie on the response.
 *
 * Safety net for a failed `auth.signOut()`: auth-js RETURNS an error rather
 * than throwing, and for a non-401/403/404 failure (e.g. a GoTrue 5xx surfacing
 * as `AuthRetryableFetchError`) it bails out BEFORE removing the local session —
 * so the `sb-*` cookies would survive an apparently-successful logout. Clearing
 * them here guarantees the browser cannot keep using the session even when the
 * server-side token revoke did not land.
 *
 * Covers chunked cookies (`sb-<ref>-auth-token.0`, `.1`, …) via the prefix match.
 */
async function clearSupabaseAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) {
    if (!name.startsWith('sb-')) continue;
    cookieStore.set(name, '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }
}

/**
 * Server Action: Handle user logout
 */
export async function logoutAction(): Promise<void> {
  // Same sign-out semantics as `signOutAction` (incl. the cookie safety net);
  // only the navigation differs.
  await signOutAction();

  // Perform redirect outside of try/catch so the Next.js internal redirect
  // control flow (throws `NEXT_REDIRECT`) is not caught and logged here.
  redirect(ROUTES.AUTH.LOGIN);
}

/**
 * Server Action: sign out WITHOUT redirecting.
 *
 * The redirect-less counterpart to `logoutAction` — clears the Supabase session
 * (cookies) and reports whether it actually succeeded. Client callers own the
 * navigation (`useRouter().replace`) so it can be role-specific and reliable
 * from an event handler; server-initiated flows keep using
 * `logoutAction`/`redirectByRole`.
 *
 * Never throws — the result flag is the single signal callers branch on.
 *
 * `ok` is true only when the browser is guaranteed to no longer hold a Supabase
 * session (the revoke succeeded, or it failed and we expired the `sb-*` cookies
 * ourselves). `false` means the session may still be live, so the caller MUST
 * NOT present the user as signed out.
 */
export async function signOutAction(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createServerSupabaseClient();
    // auth-js returns `{ error }`; it does not throw on a failed revoke.
    const { error } = await supabase.auth.signOut();
    if (!error) return { ok: true };

    console.error('[signOutAction] Error signing out:', error);
  } catch (error) {
    console.error('[signOutAction] Error signing out:', error);
  }

  // Revoke failed — fall back to expiring the cookies so the session cannot be
  // reused from this browser.
  try {
    await clearSupabaseAuthCookies();
    return { ok: true };
  } catch (cookieError) {
    console.error('[signOutAction] Failed to clear auth cookies:', cookieError);
    return { ok: false };
  }
}

/**
 * Server Action: Verify session and get current user
 */
export async function verifySessionAction(): Promise<{ user: User } | null> {
  try {
    const auth = await assertAuthorized();
    if (!auth.authorized) return null;
    return { user: auth.profile as User };
  } catch (error) {
    console.error('[verifySessionAction] Error:', error);
    return null;
  }
}

/**
 * Server Action: Handle signup form submission
 * Wraps signupAction with validation and error handling for useActionState
 */
export async function signupFormAction(
  _state: unknown,
  formData: FormData,
): Promise<{
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  success?: boolean;
  role?: string;
}> {
  try {
    const { signupSchema } = await import('@/lib/validation/auth');

    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      phone_number: (formData.get('phone_number') as string) || '',
      role: formData.get('role') as string,
      avatar_url: (formData.get('avatar_url') as string) || '',
    };

    // No PII logging here — the submitted object contains the raw password.

    // Client-side validation with Zod
    const result = signupSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? 'root');
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return { fieldErrors };
    }

    // Call the signup server action
    const response = await signupAction(result.data);

    return {
      success: true,
      role: response.user.role,
      message: response.message,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to sign up. Please try again.';

    console.error('[signupFormAction] Error:', errorMessage);

    // Check if it's a redirect (from Next.js)
    if (errorMessage.includes('NEXT_REDIRECT')) {
      return { success: true };
    }

    // Check if error is email-related
    const isEmailError =
      errorMessage.toLowerCase().includes('email') ||
      errorMessage.toLowerCase().includes('already registered') ||
      errorMessage.toLowerCase().includes('already exists') ||
      errorMessage.toLowerCase().includes('user already');

    if (isEmailError) {
      return { fieldErrors: { email: errorMessage } };
    }

    return { error: errorMessage };
  }
}
