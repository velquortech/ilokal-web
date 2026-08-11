-- Purge the personal fields of long-archived profiles.
--
-- WHY: self-service account deletion is an ARCHIVE, not a hard delete —
-- `profiles.archived_at` + `status='inactive'`, so the account can be restored
-- if the user changes their mind. Without this job the archive is permanent
-- retention of everyone's email, name, phone and photo, which is not what the
-- published policy says and is not defensible under Play's data-deletion
-- policy or RA 10173. The policy states a 90-day recovery window followed by a
-- purge; this is the statement being made true.
--
-- ⚠️ THE HOSTED POLICY DEPENDS ON THIS RUNNING. `/privacy` and
-- `/delete-account` both tell users their personal fields are purged after 90
-- days. Until this migration is applied AND the cron job is scheduled, that
-- sentence is a claim the system does not keep. Apply before publishing the
-- URLs to the Play Console.
--
-- WHY NOT A HARD DELETE: `businesses.owner_id`, `follows.user_id` and
-- `user_redemptions.user_id` all reference `profiles` ON DELETE NO ACTION, so
-- deleting the row raises a foreign key violation for any user who owns a
-- shop, follows a business, or ever redeemed an offer (21 of 58 live profiles
-- on 2026-08-11). Anonymising the row keeps those references intact while the
-- person behind them stops being identifiable — which is what the policy
-- promises: records of what was done, in a form that no longer identifies you.

-- ─── The purge ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purge_archived_profiles(
  p_retention_days integer DEFAULT 90,
  p_limit integer DEFAULT 500
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_purged integer := 0;
BEGIN
  -- Bounded per run so a large backlog cannot hold a long transaction on
  -- `profiles`, which every authenticated request reads.
  WITH due AS (
    SELECT id
    FROM public.profiles
    WHERE archived_at IS NOT NULL
      AND archived_at < now() - make_interval(days => p_retention_days)
      -- The tombstone address is the not-yet-purged marker, and it has to be
      -- `email` rather than a nulled column: `profiles.email` is NOT NULL, so
      -- it cannot be blanked, and `full_name` IS nullable — keying on that
      -- would permanently skip every user who never set a name.
      AND email NOT LIKE '%@deleted.invalid'
    ORDER BY archived_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.profiles p
     SET full_name    = NULL,
         phone_number = NULL,
         avatar_url   = NULL,
         -- Per-id so it stays unique under any unique index on email, and on
         -- the `.invalid` TLD (RFC 2606), which can never resolve — a purged
         -- row can therefore never be mailed by accident.
         email        = 'deleted-' || p.id::text || '@deleted.invalid'
    FROM due
   WHERE p.id = due.id;

  GET DIAGNOSTICS v_purged = ROW_COUNT;
  RETURN v_purged;
END;
$$;

COMMENT ON FUNCTION public.purge_archived_profiles(integer, integer) IS
  'Anonymises profiles archived longer than p_retention_days (default 90). '
  'Blanks name/phone/avatar/email; keeps the row so FK references from '
  'businesses, follows and user_redemptions stay intact. Idempotent.';

-- Service-role only: it rewrites other people''s rows and nothing in the app
-- should be able to invoke it.
REVOKE EXECUTE ON FUNCTION public.purge_archived_profiles(integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_archived_profiles(integer, integer)
  TO service_role;

-- Finding the due rows is the job's only scan; index the predicate it uses.
-- Partial on `archived_at IS NOT NULL` alone — the tombstone test is a LIKE on
-- a text column and is not index-sargable here, but archived profiles are a
-- small slice of the table, so the partial index is what does the work.
CREATE INDEX IF NOT EXISTS idx_profiles_archived_pending_purge
  ON public.profiles (archived_at)
  WHERE archived_at IS NOT NULL;

-- ⚠️ KNOWN GAP — this purges `public.profiles` only. The address also lives in
-- `auth.users.email` and inside `auth.identities.identity_data`, which this
-- deliberately does not touch: writing to the auth schema by hand can break
-- GoTrue invariants, and the supported route (admin delete of the auth user)
-- is the very thing the NO ACTION foreign keys refuse. Closing it properly
-- means changing `businesses.owner_id`, `follows.user_id` and
-- `user_redemptions.user_id` to ON DELETE SET NULL / CASCADE so a real delete
-- becomes possible. Until then the published policy's wording is accurate
-- about what users SEE being removed, and this gap is the reason the wording
-- says personal fields are purged rather than that every trace is erased.

-- ─── Schedule ────────────────────────────────────────────────────────────────
-- Daily. Wrapped so an environment without pg_cron still applies the migration
-- (the function then runs only when invoked), matching
-- 20260630000001_notification_outbox.sql.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'purge-archived-profiles',
    '15 4 * * *',
    $job$SELECT public.purge_archived_profiles()$job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable — run purge_archived_profiles() manually (%).', SQLERRM;
END;
$$;
