CREATE OR REPLACE FUNCTION public.sync_business_type_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_type_name TEXT;
BEGIN
  IF NEW.category_id IS NULL THEN
    NEW.business_type_id := NULL;
  ELSE
    SELECT bc.business_type_id INTO NEW.business_type_id
      FROM public.business_categories bc
     WHERE bc.id = NEW.category_id;
  END IF;

  -- Seed offering_mode from the vertical ON INSERT ONLY.
  --
  -- The one-time backfill below covers existing rows, but without this every
  -- business registered AFTER this migration would be stuck on the 'products'
  -- column default — a salon signing up post-merge would get retail vocabulary
  -- with no way to change it (there is no owner-facing control yet).
  --
  -- Deliberately not applied on UPDATE: once an owner (or admin) sets a mode,
  -- changing category must not silently overwrite their choice.
  IF TG_OP = 'INSERT' AND NEW.business_type_id IS NOT NULL THEN
    SELECT bt.name INTO v_type_name
      FROM public.business_types bt
     WHERE bt.id = NEW.business_type_id;

    NEW.offering_mode := CASE v_type_name
      WHEN 'Services'               THEN 'services'
      WHEN 'Tourism & Leisure'      THEN 'both'
      WHEN 'Entertainment & Events' THEN 'both'
      WHEN 'Health & Wellness'      THEN 'services'
      WHEN 'Education & Learning'   THEN 'services'
      WHEN 'Home & Property Services' THEN 'services'
      ELSE NEW.offering_mode
    END;
  END IF;

  RETURN NEW;
END;
$function$

