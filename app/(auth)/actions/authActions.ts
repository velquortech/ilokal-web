'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import {
  createServerSupabaseClient,
  SUPABASE_COOKIE_PREFIX,
  SUPABASE_COOKIE_OPTIONS,
} from '@/supabase/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { logActionError } from '@/lib/utils/captureError';
import { rateLimit, clientIp } from '@/app/api/helpers/rateLimit';
import { ROUTES, businessPath } from '@/config/routeConfig';
import { User } from '@/lib/types/user';
import { SignupInput } from '@/lib/validation/auth';
import {
  isAuthFailure,
  type AuthErrorCode,
  type AuthFailure,
  type LoginRateLimited,
} from '@/lib/types/authResult';

// SEC-8 budgets for the Server-Action login path — /api/auth/* is covered by
// checkAuthRateLimit, but this action is a separate publicly-invocable door
// (the customer/business login forms), so it enforces the same per-IP +
// per-account budgets itself.
const LOGIN_IP_LIMIT = Number(process.env.AUTH_RATE_LIMIT_IP ?? 30);
const LOGIN_IP_WINDOW_MS = Number(process.env.AUTH_RATE_WINDOW_MS ?? 60_000);
const LOGIN_ACCOUNT_LIMIT = Number(process.env.AUTH_RATE_LIMIT_ACCOUNT ?? 8);
const LOGIN_ACCOUNT_WINDOW_MS = Number(
  process.env.AUTH_ACCOUNT_WINDOW_MS ?? 300_000,
);

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
/**
 * Why these actions RETURN failures instead of throwing.
 *
 * In a production build Next.js replaces the message of anything thrown from a
 * Server Action with "An error occurred in the Server Components render… the
 * specific message is omitted in production builds…". The client then rendered
 * that notice verbatim, because the redacted object is still an `Error` and the
 * usual `error instanceof Error ? error.message : fallback` therefore always
 * took the first branch. Users saw Next's internals where the reason should be.
 *
 * A RETURNED value is not redacted. `LoginRateLimited` already worked this way
 * for the 429 case for exactly this reason; `AuthFailure` generalises it so
 * every failure reason survives the trip to the browser.
 *
 * `redirect()` still throws (NEXT_REDIRECT) — that is navigation, not failure,
 * and every caller keeps its `isRedirectError()` guard.
 */
function fail(code: AuthErrorCode, message: string): AuthFailure {
  return { failed: true, code, message };
}

export async function loginAction(
  email: string,
  password: string,
): Promise<{ user: User; message: string } | AuthFailure | LoginRateLimited> {
  try {
    // Validate required fields
    if (!email?.trim() || !password?.trim()) {
      return fail('VALIDATION_ERROR', 'Please enter your email and password.');
    }

    // Validate email format (basic)
    if (!email.includes('@')) {
      return fail('VALIDATION_ERROR', 'Please enter a valid email address.');
    }

    // Rate-limit before any auth/DB work (generic message — no oracle).
    // Bucket keys are shared with POST /api/auth/login (`auth:login:*`) so
    // both doors drain ONE budget — separate keys would double an attacker's
    // per-account attempts by alternating doors.
    // headers() is only available inside a request scope — outside one
    // (unit tests) fall back to a shared bucket rather than crashing login.
    let ip = 'unknown';
    try {
      ip = clientIp({ headers: await headers() });
    } catch {
      // sentry-opt-out: non-request scope — `headers()` throws outside a
      // request, which is expected here and not a fault. Keep the fallback key.
    }
    const ipCheck = rateLimit(
      `auth:login:ip:${ip}`,
      LOGIN_IP_LIMIT,
      LOGIN_IP_WINDOW_MS,
    );
    const accountCheck = rateLimit(
      `auth:login:acct:${email.trim().toLowerCase()}`,
      LOGIN_ACCOUNT_LIMIT,
      LOGIN_ACCOUNT_WINDOW_MS,
    );
    if (!ipCheck.allowed || !accountCheck.allowed) {
      // Returned (not thrown): production Next.js redacts messages thrown
      // from Server Actions, and the form must distinguish 429 from bad
      // credentials.
      return {
        failed: true,
        rateLimited: true,
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please try again in a few minutes.',
      };
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
      // Deliberately identical for "no such account" and "wrong password":
      // a more specific message would be an account-enumeration oracle.
      return fail('INVALID_CREDENTIALS', 'Incorrect email or password.');
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
      return fail(
        'INTERNAL_ERROR',
        'We couldn’t load your account. Please try again.',
      );
    }

    // Verify user account is not archived
    if (statusCheck.archived_at) {
      console.warn(
        `[loginAction] Login attempt by archived user ${authData.user.id}`,
      );
      return fail(
        'ACCOUNT_ARCHIVED',
        'This account has been closed. Please contact support if you think that’s wrong.',
      );
    }

    // Verify user account is active (not suspended or inactive)
    if (statusCheck.status !== 'active') {
      console.warn(
        `[loginAction] Login attempt by inactive user ${authData.user.id} with status: ${statusCheck.status}`,
      );
      return fail(
        'ACCOUNT_INACTIVE',
        statusCheck.status === 'suspended'
          ? 'This account is suspended. Please contact support.'
          : 'This account is inactive. Please contact support to reactivate it.',
      );
    }

    // Fetch full profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (!profile) {
      return fail(
        'INTERNAL_ERROR',
        'We couldn’t load your account. Please try again.',
      );
    }

    return {
      user: profile as User,
      message: 'Logged in successfully',
    };
  } catch (error) {
    // Full detail stays in the server log; the client gets hand-written copy.
    // Rethrowing here is what produced Next's redaction notice in the browser.
    logActionError('loginAction', error);
    return fail(
      'INTERNAL_ERROR',
      'We couldn’t sign you in just now. Please try again.',
    );
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
): Promise<{ user: User; message: string } | AuthFailure> {
  try {
    // Validate required fields (Zod handles this, but double-check)
    if (!data.email?.trim() || !data.password?.trim() || !data.name?.trim()) {
      return fail(
        'VALIDATION_ERROR',
        'Please fill in your name, email and password.',
      );
    }

    if (!data.role) {
      return fail('VALIDATION_ERROR', 'Please choose an account type.');
    }

    // Validate email format
    if (!data.email.includes('@')) {
      return fail('VALIDATION_ERROR', 'Please enter a valid email address.');
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
      // auth.signUp reports a duplicate itself; map it rather than forwarding
      // GoTrue's wording straight to the browser.
      console.error('[signupAction] signUp error:', authError?.message);
      const alreadyRegistered = /already registered|already exists/i.test(
        authError?.message ?? '',
      );
      return alreadyRegistered
        ? fail(
            'EMAIL_TAKEN',
            'That email is already registered. Try signing in instead.',
          )
        : fail(
            'INTERNAL_ERROR',
            'We couldn’t create your account just now. Please try again.',
          );
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
      return fail(
        'INTERNAL_ERROR',
        'Your account was created but we couldn’t load it. Try signing in.',
      );
    }

    return {
      user: createdProfile as User,
      message: 'Account created successfully',
    };
  } catch (error) {
    logActionError('signupAction', error);
    return fail(
      'INTERNAL_ERROR',
      'We couldn’t create your account just now. Please try again.',
    );
  }
}

/**
 * Server Action: Login restricted to admin role only.
 * Signs the user out and throws if the account is not an admin.
 */
export async function loginAsAdmin(
  email: string,
  password: string,
): Promise<{ user: User; message: string } | AuthFailure> {
  const result = await loginAction(email, password);

  // Failures propagate as VALUES. This door used to rethrow them, which is
  // exactly what let Next's redaction notice reach the admin form.
  if (isAuthFailure(result)) return result;

  if (result.user.role !== 'admin') {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return fail(
      'WRONG_PORTAL',
      'This portal is for admins only. Please use the main sign-in page.',
    );
  }

  return result;
}

/**
 * Server Action: unified sign-in for the /sign-in door.
 *
 * Role-agnostic — any account signs in and the caller routes by
 * `user.role` (via `redirectByRole`). On top of `loginAction` it resolves the
 * owner's `businessId` when the account is a business_owner, so the client can
 * land on `/business/[businessId]` (or `/business/registration` when null)
 * without a second round-trip. Rate limiting, generic errors, and the
 * archived/status gates all live in `loginAction`.
 */
export async function signInAction(
  email: string,
  password: string,
): Promise<
  { user: User; businessId: string | null; message: string } | AuthFailure
> {
  const result = await loginAction(email, password);

  if (isAuthFailure(result)) return result;

  let businessId: string | null = null;
  if (result.user.role === 'business_owner') {
    const supabase = await createServerSupabaseClient();
    // Same shape as getMyBusinesses/verifyBusinessOwner: archived rows are NOT
    // a destination (the business layout bounces them, and /business now sends
    // an owner with no live business to registration), and `.limit(1)` keeps a
    // second row from turning maybeSingle() into an error — which would send an
    // existing owner into the registration wizard.
    const { data: business, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', result.user.id)
      .is('archived_at', null)
      .limit(1)
      .maybeSingle();
    if (error) {
      // Non-fatal: fall back to the registration route rather than failing a
      // sign-in that already succeeded. Never surface the driver message.
      console.error('[signInAction] business lookup failed:', error.message);
    }
    businessId = business?.id ?? null;
  }

  return { ...result, businessId };
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
      redirect(ROUTES.EXPLORE.HOME);
      break;
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
 * so the `sb-*` cookies would survive an apparently-successful logout.
 *
 * Covers chunked cookies (`sb-<ref>-auth-token.0`, `.1`, …) and the PKCE
 * `-code-verifier` via the prefix match. Deletion matches on name + domain +
 * path, so the attributes are reused from the write path.
 */
async function clearSupabaseAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  for (const { name } of cookieStore.getAll()) {
    if (!name.startsWith(SUPABASE_COOKIE_PREFIX)) continue;
    cookieStore.set(name, '', { ...SUPABASE_COOKIE_OPTIONS, maxAge: 0 });
  }
}

/**
 * The outcome of a sign-out attempt.
 *
 * - `ok` — the browser no longer holds a Supabase session cookie. Only when
 *   this is true may a caller present the user as signed out.
 * - `revoked` — a revoke request was issued for a real session token and
 *   auth-js did not report a failure. It is NOT a hard guarantee: auth-js
 *   deliberately swallows 401/403/404 from `POST /logout`, so a token that was
 *   already unknown to GoTrue reports the same as one that was just killed.
 *   `ok && !revoked` is the strong signal — the sign-out was browser-local
 *   ONLY, and any copy of the token stays usable until it expires. Treat that
 *   as a partial sign-out on a shared device.
 */
type SignOutOutcome = { ok: boolean; revoked: boolean };

/**
 * Server Action: sign out WITHOUT redirecting.
 *
 * Clears the Supabase session and reports what it actually achieved. Client
 * callers own the navigation (`useRouter().replace`) so it can be role-specific
 * and reliable from an event handler — a Server-Action `redirect()` awaited
 * from an `onClick` clears the cookie without navigating.
 *
 * Never throws — the result flags are the only signal callers branch on.
 */
export async function signOutAction(): Promise<SignOutOutcome> {
  let hadSession = false;

  try {
    const supabase = await createServerSupabaseClient();

    // `signOut()` already revokes globally (auth-js defaults to
    // `scope: 'global'` and calls `admin.signOut(accessToken, scope)` under the
    // hood), so there is no separate "admin retry" worth making — re-issuing it
    // with the service-role client would send a byte-identical request and only
    // drag SUPABASE_SERVICE_ROLE_KEY onto this path.
    //
    // `error: null` alone does not prove a revoke happened: auth-js returns
    // early when there is no session at all. Record whether there was one, so
    // `revoked` distinguishes "nothing to revoke" from "revoke issued".
    const { data } = await supabase.auth.getSession();
    hadSession = Boolean(data.session?.access_token);

    // auth-js returns `{ error }`; it does not throw on a failed revoke.
    const { error } = await supabase.auth.signOut();
    if (!error) return { ok: true, revoked: hadSession };

    logActionError('signOutAction:revoke', error);
  } catch (error) {
    logActionError('signOutAction:revoke', error);
  }

  // The revoke failed. Expire the cookies so this browser cannot keep using the
  // session — but the tokens themselves stay valid at GoTrue, hence revoked:false.
  try {
    await clearSupabaseAuthCookies();
    return { ok: true, revoked: false };
  } catch (cookieError) {
    // Distinct context from the revoke failure above: the two are different
    // faults with different consequences (tokens still live vs. this browser
    // still holding a session), and a shared tag would group them as one issue.
    logActionError('signOutAction:clearCookies', cookieError);
    return { ok: false, revoked: false };
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
    logActionError('verifySessionAction', error);
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

    // A returned failure carries real copy; a thrown one would have been
    // replaced by Next's redaction notice in production.
    if (isAuthFailure(response)) {
      return { error: response.message };
    }

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

    // `logActionError` drops control-flow throws itself (`isExpectedError`), so
    // the NEXT_REDIRECT case below is not reported as a fault.
    logActionError('signupFormAction', error);

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

    // ST12: `errorMessage` is the RAW thrown message. It is used above to
    // classify the failure, and must not be what the client receives — this is
    // the unauthenticated signup path, so a Supabase message here would hand a
    // stranger table, column and constraint names. Classify on the raw text,
    // answer with hand-written copy.
    if (isEmailError) {
      return {
        fieldErrors: {
          email: 'That email is already registered. Try signing in instead.',
        },
      };
    }

    return { error: 'Failed to sign up. Please try again.' };
  }
}
