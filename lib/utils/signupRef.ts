/**
 * Registration-funnel attribution: where a business signup came from.
 *
 * A tracked link (`/for-business/go?ref=app_profile`) remembers its ref in a
 * cookie; `signupAction` copies it into the new account's metadata, and the
 * shop-insert trigger copies it onto `businesses.signup_ref`. See
 * migration 20261010100000_registration_funnel for the report.
 */

export const SIGNUP_REF_COOKIE = 'ilk_signup_ref';
/** Anonymous per-browser id, so repeat taps count as one visitor. */
export const VISITOR_COOKIE = 'ilk_visitor';
export const SIGNUP_REF_MAX_AGE_S = 60 * 60 * 24 * 30;

// Must match the CHECK on registration_funnel_landings.ref / businesses.signup_ref.
const SIGNUP_REF_PATTERN = /^[a-z0-9_]{1,40}$/;

export function parseSignupRef(
  value: string | null | undefined,
): string | null {
  return value && SIGNUP_REF_PATTERN.test(value) ? value : null;
}
