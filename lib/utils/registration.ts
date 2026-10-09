/**
 * Whether a business's owner is still in the registration wizard — the row
 * exists, but `complete_business_registration()` has not stamped it yet.
 *
 * The DATABASE is the record of this, not the browser: an owner who failed
 * mid-submit and comes back on another device (or with cookies cleared) must
 * still be routed back into the wizard rather than left on a dashboard that
 * says "Awaiting Verification" for a shop nothing will ever verify.
 *
 * `=== null`, deliberately not `== null`: `undefined` means the row came from
 * a database without the column (migration 20261009000000 not applied yet),
 * and treating every shop as unfinished there would lock every owner out of
 * their dashboard.
 */
export function isRegistrationUnfinished(
  business: { registration_completed_at?: string | null } | null | undefined,
): boolean {
  return business?.registration_completed_at === null;
}
