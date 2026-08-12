-- events_enable.sql — flip the events feature flag ON for LOCAL seeds.
--
-- The events feature ships DARK (migration 20260802034107 inserts
-- enable_events = 'false'), and events.sql seeds 14 rows across every status.
-- Without this flip the approved rows would never surface on the local explore
-- banner / events feed / admin queue — the local demo would look broken.
--
-- LOCAL-ONLY: deliberately NOT in the Makefile CLOUD_SEED_FILES list — cloud
-- seeding must keep the public events surface dark until the feature is ready
-- for production. Only `make seed-db` and `supabase db reset` (config.toml
-- sql_paths) apply this file, both of which target the local Docker stack.
--
-- Idempotent: upserts the single app_settings row on every run.

INSERT INTO public.app_settings (key, value)
VALUES ('enable_events', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb;
