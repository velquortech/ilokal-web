-- Cloud object inventory for ilokal-database — READ-ONLY.
--
-- Companion to cloud_drift_probe.sql, answering a DIFFERENT question.
-- The drift probe asks "did each migration RUN" (one discriminator each).
-- This asks "does every object those migrations declare actually EXIST".
--
-- WHY BOTH: a migration can be recorded in the ledger and be only PARTIALLY
-- applied, and the drift probe reports it APPLIED. That is not theoretical —
-- on 2026-08-10 this sweep found `idx_products_section_id` missing from cloud
-- while 20260801061117 read APPLIED. Cause: the index was added to the
-- migration file in a LATER commit (ad680af) than the one that created it
-- (b2c9a32). Cloud had already applied the file and written its ledger row, so
-- `db push` skipped it and the added statement never landed.
--
-- => Any migration EDITED IN PLACE after cloud applied it silently loses the
--    edit. Re-run this sweep after any such edit.
--
-- Regenerate the VALUES list from the migrations with:
--   grep -ioE "create (or replace )?function public\.[a-z0-9_]+" supabase/migrations/*.sql
--   grep -ioE "create (unique )?index (if not exists )?[a-z0-9_]+"  supabase/migrations/*.sql
--   grep -ioE "create trigger [a-z0-9_]+"                          supabase/migrations/*.sql
--   grep -oE  'CREATE POLICY "[^"]+"'                              supabase/migrations/*.sql

SELECT kind, name, CASE WHEN present THEN 'ok' ELSE 'MISSING' END AS status
FROM (VALUES
  ('function','admin_businesses_missing_menu',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_businesses_missing_menu')),
  ('function','admin_businesses_missing_menu_ids',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_businesses_missing_menu_ids')),
  ('function','admin_businesses_missing_menu_stats',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_businesses_missing_menu_stats')),
  ('function','admin_business_followup_target',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_business_followup_target')),
  ('function','analytics_platform_growth',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='analytics_platform_growth')),
  ('function','business_products',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='business_products')),
  ('function','cancel_booking',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='cancel_booking')),
  ('function','decide_booking',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='decide_booking')),
  ('function','enforce_product_section_cap',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='enforce_product_section_cap')),
  ('function','events_nearby',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='events_nearby')),
  ('function','get_app_setting_bool',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_app_setting_bool')),
  ('function','get_business_public_info',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_business_public_info')),
  ('function','get_business_rating_summary',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_business_rating_summary')),
  ('function','guard_event_review_columns',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='guard_event_review_columns')),
  ('function','handle_event_published_notification',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='handle_event_published_notification')),
  ('function','handle_new_user',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='handle_new_user')),
  ('function','mobile_deals',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='mobile_deals')),
  ('function','nearby_businesses',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='nearby_businesses')),
  ('function','notify_event_proposal_submitted',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='notify_event_proposal_submitted')),
  ('function','public_feature_flags',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='public_feature_flags')),
  ('function','release_products_from_archived_section',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='release_products_from_archived_section')),
  ('function','request_booking',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='request_booking')),
  ('function','section_product_counts',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='section_product_counts')),
  ('function','set_business_initial_status',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_business_initial_status')),
  ('function','set_event_initial_status',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_event_initial_status')),
  ('function','sync_business_type_id',EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='sync_business_type_id')),
  ('index','idx_booking_requests_branch',to_regclass('public.idx_booking_requests_branch') IS NOT NULL),
  ('index','idx_booking_requests_business',to_regclass('public.idx_booking_requests_business') IS NOT NULL),
  ('index','idx_booking_requests_product_window',to_regclass('public.idx_booking_requests_product_window') IS NOT NULL),
  ('index','idx_booking_requests_user',to_regclass('public.idx_booking_requests_user') IS NOT NULL),
  ('index','idx_branches_business_id_live',to_regclass('public.idx_branches_business_id_live') IS NOT NULL),
  ('index','idx_businesses_business_type_id',to_regclass('public.idx_businesses_business_type_id') IS NOT NULL),
  ('index','idx_businesses_created_at',to_regclass('public.idx_businesses_created_at') IS NOT NULL),
  ('index','idx_categories_business_type',to_regclass('public.idx_categories_business_type') IS NOT NULL),
  ('index','idx_categories_business_type_id',to_regclass('public.idx_categories_business_type_id') IS NOT NULL),
  ('index','idx_events_address_trgm',to_regclass('public.idx_events_address_trgm') IS NOT NULL),
  ('index','idx_events_business',to_regclass('public.idx_events_business') IS NOT NULL),
  ('index','idx_events_live_banner',to_regclass('public.idx_events_live_banner') IS NOT NULL),
  ('index','idx_events_location',to_regclass('public.idx_events_location') IS NOT NULL),
  ('index','idx_events_name_trgm',to_regclass('public.idx_events_name_trgm') IS NOT NULL),
  ('index','idx_events_product',to_regclass('public.idx_events_product') IS NOT NULL),
  ('index','idx_events_reviewed_by',to_regclass('public.idx_events_reviewed_by') IS NOT NULL),
  ('index','idx_events_review_queue',to_regclass('public.idx_events_review_queue') IS NOT NULL),
  ('index','idx_products_bookable',to_regclass('public.idx_products_bookable') IS NOT NULL),
  ('index','idx_products_business_kind_status',to_regclass('public.idx_products_business_kind_status') IS NOT NULL),
  ('index','idx_products_business_section',to_regclass('public.idx_products_business_section') IS NOT NULL),
  ('index','idx_product_sections_business_position',to_regclass('public.idx_product_sections_business_position') IS NOT NULL),
  ('index','idx_products_section_id',to_regclass('public.idx_products_section_id') IS NOT NULL),
  ('index','idx_profiles_created_at',to_regclass('public.idx_profiles_created_at') IS NOT NULL),
  ('index','uq_product_sections_business_name',to_regclass('public.uq_product_sections_business_name') IS NOT NULL),
  ('trigger','handle_app_settings_updated_at',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='handle_app_settings_updated_at' AND NOT tgisinternal)),
  ('trigger','on_update_events',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='on_update_events' AND NOT tgisinternal)),
  ('trigger','on_update_product_sections',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='on_update_product_sections' AND NOT tgisinternal)),
  ('trigger','trg_booking_requests_updated_at',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_booking_requests_updated_at' AND NOT tgisinternal)),
  ('trigger','trg_businesses_sync_business_type',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_businesses_sync_business_type' AND NOT tgisinternal)),
  ('trigger','trg_event_published_notification',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_event_published_notification' AND NOT tgisinternal)),
  ('trigger','trg_guard_event_review_columns',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_guard_event_review_columns' AND NOT tgisinternal)),
  ('trigger','trg_product_sections_cap',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_product_sections_cap' AND NOT tgisinternal)),
  ('trigger','trg_product_sections_release_products',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_product_sections_release_products' AND NOT tgisinternal)),
  ('trigger','trg_set_business_initial_status',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_set_business_initial_status' AND NOT tgisinternal)),
  ('trigger','trg_set_event_initial_status',EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_set_event_initial_status' AND NOT tgisinternal)),
  ('policy','Admins manage all bookings', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Admins manage all bookings')),
  ('policy','Admins manage all events', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Admins manage all events')),
  ('policy','Admins manage all shop sections', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Admins manage all shop sections')),
  ('policy','Admins manage app settings', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Admins manage app settings')),
  ('policy','Authenticated read app settings', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Authenticated read app settings')),
  ('policy','Event images: owner or admin delete', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Event images: owner or admin delete')),
  ('policy','Event images: owner or admin update', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Event images: owner or admin update')),
  ('policy','Event images: owner or admin upload', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Event images: owner or admin upload')),
  ('policy','Event images: public read', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Event images: public read')),
  ('policy','Owners manage own events', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Owners manage own events')),
  ('policy','Owners manage own shop sections', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Owners manage own shop sections')),
  ('policy','Owners read bookings for their business', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Owners read bookings for their business')),
  ('policy','Owners view own events', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Owners view own events')),
  ('policy','Public view approved events', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Public view approved events')),
  ('policy','Public view sections of verified businesses', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Public view sections of verified businesses')),
  ('policy','Users read own bookings', EXISTS (SELECT 1 FROM pg_policy WHERE polname='Users read own bookings')),
  ('column','products.kind', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='kind')),
  ('column','products.booking_mode', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='booking_mode')),
  ('column','products.duration_minutes', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='duration_minutes')),
  ('column','products.lead_time_minutes', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='lead_time_minutes')),
  ('column','products.inventory_count', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='inventory_count')),
  ('column','products.capacity', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='capacity')),
  ('column','products.deposit_amount', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='deposit_amount')),
  ('column','products.min_duration_units', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='min_duration_units')),
  ('column','products.max_duration_units', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='max_duration_units')),
  ('column','products.service_location', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='service_location')),
  ('column','products.section_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='section_id')),
  ('column','businesses.offering_mode', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='offering_mode')),
  ('column','businesses.business_type_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='business_type_id')),
  ('column','businesses.menu_reminder_sent_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' AND column_name='menu_reminder_sent_at')),
  ('column','categories.business_type_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='business_type_id')),
  ('column','business_types.offering_profile', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='business_types' AND column_name='offering_profile')),
  ('column','business_settings.onboarding_tour_completed_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='business_settings' AND column_name='onboarding_tour_completed_at')),
  ('column','business_settings.onboarding_checklist_dismissed_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='business_settings' AND column_name='onboarding_checklist_dismissed_at')),
  ('column','coupons.image_url', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coupons' AND column_name='image_url')),
  ('column','events.latitude', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='latitude')),
  ('column','events.longitude', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='longitude'))
) AS t(kind,name,present)
ORDER BY present, kind, name;
