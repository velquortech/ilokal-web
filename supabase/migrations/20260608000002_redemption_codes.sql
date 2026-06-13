-- Server-owned redemption display codes.
--
-- WHY: the 6-char code a customer shows the cashier was previously derived
-- CLIENT-SIDE in the mobile app (FNV-1a + LCG hash of the redemption UUID,
-- `utils/redemptionCode.ts`). The merchant dashboard had to re-implement the
-- exact same hash byte-for-byte to validate a claim — two independent
-- implementations that silently break validation the moment either drifts.
--
-- FIX: make the database the single source of truth. Each user_redemptions row
-- gets a unique `code` assigned at insert by a trigger; the mobile app and the
-- merchant dashboard both just read `code`. No hashing on either side.
--
-- The alphabet matches the old client one (no ambiguous 0/1/O/I/L) so existing
-- printed/expected codes stay legible. Uniqueness is enforced globally by a
-- UNIQUE index and a retry loop, so there is no collision window even at scale.

-- 1. Column (nullable for now so the backfill can run before NOT NULL).
ALTER TABLE public.user_redemptions
  ADD COLUMN IF NOT EXISTS code TEXT;

-- 2. Random 6-char code from the unambiguous alphabet (31 chars).
CREATE OR REPLACE FUNCTION public.gen_redemption_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet CONSTANT TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. Assign a unique code on insert (retry on the astronomically rare clash).
CREATE OR REPLACE FUNCTION public.set_redemption_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := public.gen_redemption_code();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_redemptions WHERE code = candidate
    );
    attempts := attempts + 1;
    -- Defensive escape hatch: if 10 draws all collide (only conceivable when the
    -- table approaches the 31^6 ≈ 887M space), widen to a 7th char and stop.
    IF attempts > 10 THEN
      candidate := candidate || substr(
        '23456789ABCDEFGHJKMNPQRSTUVWXYZ',
        floor(random() * 31)::int + 1, 1
      );
      EXIT;
    END IF;
  END LOOP;
  NEW.code := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_redemption_code ON public.user_redemptions;
CREATE TRIGGER trg_set_redemption_code
  BEFORE INSERT ON public.user_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_redemption_code();

-- ENABLE ALWAYS so the trigger still fires under `session_replication_role =
-- replica` — several seed files set replica mode to bypass the auth.users FK,
-- and a normal (origin-only) trigger would be skipped there, leaving `code`
-- NULL and tripping the NOT NULL constraint below. This only forces OUR
-- code-gen trigger to run; the system RI triggers the seeds want bypassed stay
-- bypassed.
ALTER TABLE public.user_redemptions
  ENABLE ALWAYS TRIGGER trg_set_redemption_code;

-- 4. Backfill existing rows with unique codes.
DO $$
DECLARE
  r RECORD;
  c TEXT;
BEGIN
  FOR r IN SELECT id FROM public.user_redemptions WHERE code IS NULL LOOP
    LOOP
      c := public.gen_redemption_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.user_redemptions WHERE code = c
      );
    END LOOP;
    UPDATE public.user_redemptions SET code = c WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Lock it in: globally unique + always present.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_redemptions_code
  ON public.user_redemptions(code);

ALTER TABLE public.user_redemptions
  ALTER COLUMN code SET NOT NULL;
