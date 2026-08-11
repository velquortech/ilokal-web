/**
 * The hosted legal surfaces are a COMPLIANCE contract, not just two pages.
 *
 * Both URLs get typed into the Google Play Console (App content → Privacy
 * policy, Data safety → Data deletion) and into the store listing. Nothing in
 * this repo can see those fields, so the failure mode is silent and external:
 * a rename here leaves a dead link in a submission nobody re-reads until the
 * next review. These assertions are the only thing standing between a
 * refactor and a rejected app.
 *
 * They are also a truthfulness contract. The pages tell users their personal
 * fields are purged after a stated number of days; the same number has to be
 * the one the purge job actually uses, and the pages must not re-acquire the
 * "permanently removes your account" wording the archive made false.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROUTES } from '@/config/routeConfig';
import { isProtectedPath } from '@/lib/utils/protectedRoutes';
import {
  ACCOUNT_PURGE_AFTER_DAYS,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY,
} from '@/lib/legal/content';

const ROOT = join(__dirname, '..', '..', '..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

/**
 * Comments are stripped before sweeping source. These files quote the wording
 * they exist to prevent ("permanently removes…"), and a sweep that fails on
 * its own explanation teaches the next person to delete the explanation.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('hosted legal URLs', () => {
  it('are exactly the paths registered with Play', () => {
    // Hard-coded on purpose: this test is the record of what was submitted.
    // If a path legitimately changes, updating Play is part of the change, and
    // editing this line is the prompt to do it.
    expect(ROUTES.LEGAL.PRIVACY).toBe('/privacy');
    expect(ROUTES.LEGAL.DELETE_ACCOUNT).toBe('/delete-account');
  });

  it('are reachable signed-out', () => {
    // A policy URL that redirects to /sign-in fails review outright, and the
    // deletion page exists specifically for people who no longer have the app.
    expect(isProtectedPath(ROUTES.LEGAL.PRIVACY)).toBe(false);
    expect(isProtectedPath(ROUTES.LEGAL.DELETE_ACCOUNT)).toBe(false);
  });

  it('are in the proxy matcher, so a live session still refreshes', () => {
    // Both mount PublicShell, whose header reads the session. Unmatched,
    // nothing refreshes an expiring token and a signed-in visitor renders as
    // anonymous — the trap /explore and /for-business each hit.
    const proxy = stripComments(read('proxy.ts'));
    expect(proxy).toContain(`'${ROUTES.LEGAL.PRIVACY}'`);
    expect(proxy).toContain(`'${ROUTES.LEGAL.DELETE_ACCOUNT}'`);
  });

  it('are linked from the public footer, not only from the Play Console', () => {
    const footer = stripComments(
      read('components/customer/CustomerFooter.tsx'),
    );
    expect(footer).toContain('ROUTES.LEGAL.PRIVACY');
  });

  it('reference each other, so either entry point reaches the other', () => {
    const privacy = stripComments(read('app/(legal)/privacy/page.tsx'));
    const deletion = stripComments(read('app/(legal)/delete-account/page.tsx'));
    expect(privacy).toContain('ROUTES.LEGAL.DELETE_ACCOUNT');
    expect(deletion).toContain('ROUTES.LEGAL.PRIVACY');
  });

  it('use the route constants rather than literal paths', () => {
    // The repo rule generally; here it is what keeps the two pages, the
    // footer, the proxy matcher and this test from drifting apart.
    const deletion = stripComments(read('app/(legal)/delete-account/page.tsx'));
    expect(deletion).not.toMatch(/href="\/privacy"/);
  });
});

describe('privacy policy content', () => {
  it('describes deletion as an archive, never as permanent removal', () => {
    // The exact sentence the mobile copy still carries. It is false: deletion
    // archives, and a hard delete would raise a foreign key violation for any
    // user who owns a shop, follows a business, or has redeemed an offer.
    const deletionSection = PRIVACY_POLICY.sections.find(
      (section) => section.heading === 'Deleting your account',
    );
    expect(deletionSection).toBeDefined();

    const text = [
      ...(deletionSection?.paragraphs ?? []),
      ...(deletionSection?.bullets ?? []),
    ].join(' ');

    expect(text).not.toMatch(/permanently removes/i);
    expect(text).toMatch(/archive/i);
    expect(text).toContain(String(ACCOUNT_PURGE_AFTER_DAYS));
  });

  it('states the retention window as one number, shared with the purge job', () => {
    // Two pages quoting two different windows is precisely the discrepancy a
    // reviewer reads as a misdeclared Data Safety form.
    const deletionPage = read('app/(legal)/delete-account/page.tsx');
    expect(deletionPage).toContain('ACCOUNT_PURGE_AFTER_DAYS');
    expect(deletionPage).not.toMatch(/\b90 days\b/);

    const migration = read(
      'supabase/migrations/20260811120000_purge_archived_profiles.sql',
    );
    expect(migration).toContain(
      `p_retention_days integer DEFAULT ${ACCOUNT_PURGE_AFTER_DAYS}`,
    );
  });

  it('gives a contact address on both pages', () => {
    // Play requires a way to request deletion without installing the app.
    expect(
      PRIVACY_POLICY.sections.some((s) =>
        [...(s.paragraphs ?? []), ...(s.bullets ?? [])].some((t) =>
          t.includes(PRIVACY_CONTACT_EMAIL),
        ),
      ),
    ).toBe(true);

    const deletion = read('app/(legal)/delete-account/page.tsx');
    expect(deletion).toContain('PRIVACY_CONTACT_EMAIL');
    expect(deletion).toContain('mailto:');
  });

  it('has no empty section', () => {
    // A heading with nothing under it reads as content that failed to load.
    for (const section of PRIVACY_POLICY.sections) {
      const body =
        (section.paragraphs?.length ?? 0) + (section.bullets?.length ?? 0);
      expect(body, `section "${section.heading}" is empty`).toBeGreaterThan(0);
    }
  });
});

describe('purge job', () => {
  const migration = read(
    'supabase/migrations/20260811120000_purge_archived_profiles.sql',
  );

  it('never sets the NOT NULL email column to NULL', () => {
    // `profiles.email` is NOT NULL — blanking it would fail on every run, and
    // the job would silently never purge anything.
    expect(migration).not.toMatch(/email\s*=\s*NULL/i);
    expect(migration).toContain('@deleted.invalid');
  });

  it('does not key idempotency on a nullable column', () => {
    // `full_name` is nullable, so a user who never set a name would look
    // already-purged and be skipped forever.
    expect(migration).not.toMatch(/AND\s+full_name\s+IS\s+NOT\s+NULL/i);
  });

  it('is service-role only', () => {
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.purge_archived_profiles/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.purge_archived_profiles[\s\S]*?TO service_role/,
    );
  });

  it('pins search_path, per the SECURITY DEFINER standard', () => {
    expect(migration).toContain('SET search_path = public, pg_temp');
  });
});
