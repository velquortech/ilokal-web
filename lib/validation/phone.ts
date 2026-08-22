import { z } from 'zod';

/**
 * `profiles.phone_number` — E.164, enforced by the DATABASE.
 *
 * ```
 * CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}(\s\d+)?$')
 * ```
 *
 * 🔴 The app validated this as `z.string().optional()`, i.e. not at all. So an
 * owner typing their own number the way every Filipino writes it —
 * `09171234567` — got a **500** carrying the raw constraint text back to the
 * browser (JAVASCRIPT-NEXTJS-8). An empty string failed the same way: `''` is
 * not NULL and does not match, so "clear my phone number" was also a 500.
 */
export const PHONE_E164 = /^\+[1-9]\d{1,14}(\s\d+)?$/;

const PHONE_FORMAT_MESSAGE =
  'Enter a mobile number like 09171234567 or +639171234567';

/**
 * Put a human-typed number into the one shape the database accepts.
 *
 * Rejecting instead of normalising was the other option and it is the wrong
 * one: `09171234567` is how the number is written on the shop's own signage,
 * and a field that refuses it is a field nobody can fill. So:
 *
 *  - spaces, dashes, dots and parens are removed (`0917 123 4567`);
 *  - a leading `0` becomes `+63` — the national trunk prefix stands in for the
 *    country code, and this app is Iloilo-first with a PH-only user base today.
 *    A number that is already `+…` is left alone, so an international owner is
 *    not misread as Filipino;
 *  - `639171234567` (the trunk dropped but no `+`) gets its `+` back.
 *
 * Returns `null` for an empty input, which is what the column wants for "not
 * provided" — the previous behaviour wrote `''` and violated the CHECK.
 */
export function normalizePhoneNumber(input: string): string | null {
  const compact = input.replace(/[\s\-().]/g, '');
  if (!compact) return null;
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('0')) return `+63${compact.slice(1)}`;
  if (compact.startsWith('63')) return `+${compact}`;
  // No recognisable country context. Hand it back unchanged so the schema
  // below reports a format error rather than this function inventing a prefix.
  return compact;
}

/**
 * Optional phone number, normalised then checked against the DB constraint.
 *
 * `null` is the parsed value for "left blank" — matching the column. Callers
 * that must distinguish "not sent" from "cleared" should keep using
 * `.optional()` on their own object key, which is preserved here.
 */
export const optionalPhoneNumberSchema = z
  .string()
  .transform((value) => normalizePhoneNumber(value))
  .refine((value) => value === null || PHONE_E164.test(value), {
    message: PHONE_FORMAT_MESSAGE,
  });
