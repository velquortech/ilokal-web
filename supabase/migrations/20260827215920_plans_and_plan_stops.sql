-- ============================================================
-- Date planner — plans and plan_stops
-- (docs/superpowers/specs/2026-08-22-date-planner-design.md)
-- ------------------------------------------------------------
-- The mobile planner lets a signed-in user assemble an outing: a
-- plan has a title, one target date, and an ordered list of stops,
-- each a business with an optional time-of-day. Nothing here is a
-- booking — no business sees it. It is the user's private note.
--
-- Two tables, one date, many ordered stops:
--   plans       - owner + title + target_date
--   plan_stops  - business + optional stop_time + 0-based position
--
-- Stop ordering is stored explicitly via `position` so reorder is a
-- single UPDATE of the array, and so the client's "one PUT replaces
-- the whole stop list" model (which makes position desync structurally
-- impossible) has a column to write to.
-- ============================================================

CREATE TABLE IF NOT EXISTS plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  target_date date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_stops (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stop_time   time,             -- NULL: check the day only, not the hour
  position    integer NOT NULL, -- 0-based order within the plan
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON plans (user_id, target_date);
CREATE INDEX ON plan_stops (plan_id, position);

-- ============================================================
-- Row-level security
-- ------------------------------------------------------------
-- A plan is private: nothing outside its owner reads or writes it.
-- `plans` restricts on the owner column directly. `plan_stops` has no
-- owner column, so it restricts THROUGH its parent — the same shape as
-- the `business_settings` policy, which scopes through `businesses`
-- rather than carrying its own owner_id. Unlike `follows`, there is no
-- public-read policy: nobody but the owner may see a plan's contents.
-- ============================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plans" ON plans
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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
