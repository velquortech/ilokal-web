/**
 * Initials for an avatar fallback.
 *
 * Shared because the second caller appeared: `AdminUserMenu` had its own copy,
 * and the business `UserMenu` was rendering shadcn's placeholder `"CN"` — two
 * hardcoded letters belonging to nobody, on the one control that identifies who
 * is signed in.
 *
 * Takes the first letter of the first and last word, so "Seed Business Owner"
 * reads "SO" rather than "SB" — the surname carries more identity than a middle
 * word. Runs on grapheme-ish boundaries via `Array.from`, so a name starting
 * with an emoji or an astral character yields that character instead of half a
 * surrogate pair.
 *
 * @param fallback what to show when there is no usable name. Callers pass
 *   something meaningful for their surface; the default is deliberately blank,
 *   because an empty circle reads as "no picture" while stray letters read as
 *   someone else's account.
 */
export function initialsFromName(name?: string | null, fallback = ''): string {
  const words = (name ?? '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return fallback;

  const first = Array.from(words[0]!)[0] ?? '';
  const last = words.length > 1 ? (Array.from(words.at(-1)!)[0] ?? '') : '';

  const initials = `${first}${last}`.toUpperCase();
  return initials || fallback;
}
