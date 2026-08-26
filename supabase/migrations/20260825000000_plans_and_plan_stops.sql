-- ============================================================
-- Date Planner — plans and plan_stops
-- ------------------------------------------------------------
-- Lets a signed-in user create a plan (a title, one target
-- date, and an ordered list of business stops). Plans are
-- private to their owner — no public-read policy, unlike
-- follows.
--
-- RLS is owner-scoped at every level:
--   plans        direct user_id = auth.uid() check
--   plan_stops   CHECK through the parent plan's user_id,
--                mirroring the owner-scoped business_settings
--                pattern.
-- ============================================================

-- ─── plans ────────────────────────────────────────────────
-- Each plan is a single-occasion outing owned by one user.
-- target_date is a plain `date` (no timezone) because the
-- value is shop-local wall-clock, not an instant.
CREATE TABLE IF NOT EXISTS plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  target_date date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON plans (user_id, target_date);

-- ─── plan_stops ───────────────────────────────────────────
-- One row per business visit within a plan. The `position`
-- column is 0-based and enforced by the API (PUT replaces
-- the entire stops array in a transaction), so the client
-- never has to reconcile partial updates.
--
-- stop_time is nullable: NULL means "check the day only, not
-- the hour" — the client-side availability util handles this
-- as a day-only check.
CREATE TABLE IF NOT EXISTS plan_stops (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stop_time   time,
  position    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON plan_stops (plan_id, position);

-- ─── Row-level security ───────────────────────────────────
-- plans: direct owner check. Unlike follows, nothing outside
-- the owner reads a plan — no public-read policy.
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plans" ON plans
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- plan_stops: owner check through the parent plan, mirroring
-- the owner-scoped business_settings policy pattern.
ALTER TABLE plan_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plan stops" ON plan_stops
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plans p
      WHERE p.id = plan_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans p
      WHERE p.id = plan_id AND p.user_id = auth.uid()
    )
  );
