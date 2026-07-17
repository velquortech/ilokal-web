-- Performance (P1): wrap bare auth.uid() / auth.role() in (select ...) across
-- every RLS policy. See .claude/PERFORMANCE_AUDIT.md (P1).
--
-- Postgres treats a bare `auth.uid()` in a policy as volatile and re-evaluates it
-- for EVERY row scanned. Wrapping it as `(select auth.uid())` lets the planner
-- cache the value as an initPlan and evaluate it ONCE per query. On any
-- authenticated query this removes a per-row function call — Supabase's most
-- impactful RLS optimization. Behaviour is identical; only the query plan changes.
--
-- This is catalog-driven: it rewrites the LIVE policy set (last-writer-wins),
-- not the historical migration files, so it captures the current definitions
-- regardless of how many times a policy was redefined. Idempotent — a policy
-- whose expression already contains `select auth.` is skipped, so a re-run is a
-- no-op. Each ALTER is isolated in a subtransaction so one failure (e.g. a
-- storage policy owned by another role on managed platforms) logs and continues
-- instead of aborting the whole migration.
--
-- Rollback: not auto-reversible per-policy, but harmless to leave. To revert a
-- specific policy, redefine it from its source migration.

DO $$
DECLARE
  pol        RECORD;
  new_qual   TEXT;
  new_check  TEXT;
  parts      TEXT;
  changed    BOOLEAN;
  n_changed  INT := 0;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (
        qual       ~* 'auth\.(uid|role)\(\)' OR
        with_check ~* 'auth\.(uid|role)\(\)'
      )
      -- idempotency: skip anything already wrapped
      AND coalesce(qual, '')       !~* 'select\s+auth\.'
      AND coalesce(with_check, '') !~* 'select\s+auth\.'
  LOOP
    changed   := false;
    new_qual  := pol.qual;
    new_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)',  '(select auth.uid())',  'gi');
      new_qual := regexp_replace(new_qual, 'auth\.role\(\)', '(select auth.role())', 'gi');
      IF new_qual IS DISTINCT FROM pol.qual THEN changed := true; END IF;
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, 'auth\.uid\(\)',  '(select auth.uid())',  'gi');
      new_check := regexp_replace(new_check, 'auth\.role\(\)', '(select auth.role())', 'gi');
      IF new_check IS DISTINCT FROM pol.with_check THEN changed := true; END IF;
    END IF;

    IF NOT changed THEN CONTINUE; END IF;

    -- Build the clause list: only include USING / WITH CHECK when present.
    parts := '';
    IF new_qual  IS NOT NULL THEN parts := parts || format(' USING (%s)', new_qual); END IF;
    IF new_check IS NOT NULL THEN parts := parts || format(' WITH CHECK (%s)', new_check); END IF;

    BEGIN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I%s',
        pol.policyname, pol.schemaname, pol.tablename, parts
      );
      n_changed := n_changed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %.% policy "%": %',
        pol.schemaname, pol.tablename, pol.policyname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Wrapped auth.*() in % RLS policies.', n_changed;
END;
$$;
