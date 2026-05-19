-- handle_new_user had two bugs that caused "Database error when saving new account":
--   1. profiles_role_check only allowed ('admin','business_owner','user') but trigger inserts 'app_user'
--   2. status column does not exist on public.profiles

-- Fix the check constraint to include app_user
ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['admin', 'business_owner', 'user', 'app_user']));

-- Fix the trigger: remove the non-existent status column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'app_user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
