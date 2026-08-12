-- Cloud-vs-local drift probe for ilokal-database (skvgasimllpyhyudpycu)
--
-- READ-ONLY. Run against CLOUD. Returns one row per queued migration
-- (the 24 local files after 20260717082537) with a verdict.
--
-- WHY OBJECT EXISTENCE AND NOT supabase_migrations.schema_migrations:
-- the Supabase MCP's apply_migration records its OWN timestamp as the version,
-- and the 2026-07-17 rollout hand-rewrote every ledger row to match the local
-- filename. So a ledger row can exist without its DDL, and DDL can exist under
-- a different version string. The ledger is a hint; the objects are the fact.
--
-- Three migrations are DATA-ONLY (no DDL) and are probed by row existence.

WITH probe(version, migration, kind, what, present) AS (
VALUES
  ('20260717093122','handle_new_user_role_from_metadata','fn-body','handle_new_user reads role from raw_user_meta_data',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='handle_new_user'
           AND prosrc LIKE '%raw_user_meta_data%role%')),

  ('20260723000000','app_settings_registration_gating','table','public.app_settings + set_business_initial_status',
   to_regclass('public.app_settings') IS NOT NULL
   AND EXISTS (SELECT 1 FROM pg_proc WHERE proname='set_business_initial_status')),

  ('20260725000000','business_rating_summary_rpc','function','get_business_rating_summary()',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_business_rating_summary')),

  ('20260727000000','offerings_discriminators','column','products.kind',
   EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='products' AND column_name='kind')),

  ('20260727000001','business_type_offering_profile','column','business_types.offering_profile',
   EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='business_types' AND column_name='offering_profile')),

  -- t.typname filter is load-bearing: without it ANY enum in the database
  -- carrying an 'on_request' label satisfies this.
  ('20260727000002','price_type_on_request','enum','price_type enum has ''on_request''',
   EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
           WHERE t.typname='price_type' AND e.enumlabel='on_request')),

  ('20260727000003','offering_service_attributes','column','products.booking_mode',
   EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='products' AND column_name='booking_mode')),

  ('20260727000004','business_products_offering_columns','fn-body','business_products() projects booking_mode',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='business_products'
           AND pg_get_function_result(oid) LIKE '%booking_mode%')),

  ('20260727000005','booking_requests','table','public.booking_requests',
   to_regclass('public.booking_requests') IS NOT NULL),

  ('20260727000006','business_public_info_rpc','function','get_business_public_info()',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_business_public_info')),

  ('20260801061117','product_sections','table','public.product_sections + products.section_id',
   to_regclass('public.product_sections') IS NOT NULL
   AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='products' AND column_name='section_id')),

  -- Probes one of the FIVE ORIGINALLY-SEEDED categories that only this
  -- migration pins. A bare "business_type_id IS NOT NULL" is NOT a
  -- discriminator: 20260805120000 / 20260805130000 / 20260807000000 all pin
  -- categories too, so any of them alone would satisfy it.
  ('20260801064656','scope_categories_by_vertical','data','an originally-seeded category is pinned to a vertical',
   EXISTS (SELECT 1 FROM public.categories
           WHERE business_type_id IS NOT NULL
             AND (name='Food & Beverages' OR slug='food-beverages'))),

  ('20260802034107','events','table','public.events + event-images bucket',
   to_regclass('public.events') IS NOT NULL
   AND EXISTS (SELECT 1 FROM storage.buckets WHERE id LIKE '%event%')),

  ('20260804061500','events_review_fixes','index','idx_events_name_trgm',
   to_regclass('public.idx_events_name_trgm') IS NOT NULL),

  ('20260804233000','business_settings_onboarding_state','column','business_settings.onboarding_tour_completed_at',
   EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='business_settings'
             AND column_name='onboarding_tour_completed_at')),

  ('20260805090000','public_registration_flags','fn-sig','public_feature_flags() returns 4 cols (has require_business_documents)',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='public_feature_flags'
           AND pg_get_function_result(oid) LIKE '%require_business_documents%')),

  ('20260805120000','more_offering_categories','DATA-ONLY','categories has ''Rooms & Stays''',
   EXISTS (SELECT 1 FROM public.categories WHERE name='Rooms & Stays')),

  ('20260805130000','retail_trades','DATA-ONLY','business_categories has ''Auto Supply / Motor Parts''',
   EXISTS (SELECT 1 FROM public.business_categories WHERE name='Auto Supply / Motor Parts')),

  ('20260806090000','menu_followup','function','admin_businesses_missing_menu + businesses.menu_reminder_sent_at',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='admin_businesses_missing_menu')
   AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='businesses'
                 AND column_name='menu_reminder_sent_at')),

  ('20260806093000','menu_followup_target','function','admin_business_followup_target()',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='admin_business_followup_target')),

  ('20260807000000','service_trades','DATA-ONLY','business_categories has ''Water Refilling Station''',
   EXISTS (SELECT 1 FROM public.business_categories WHERE name='Water Refilling Station')),

  ('20260807120000','coupon_image','column','coupons.image_url',
   EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='coupons' AND column_name='image_url')),

  ('20260807140000','admin_platform_growth','function','analytics_platform_growth()',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='analytics_platform_growth')),

  ('20260808090000','nearby_banner','fn-sig','nearby_businesses() returns banner_url',
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='nearby_businesses'
           AND pg_get_function_result(oid) LIKE '%banner_url%')),

  ('20260812130000','more_shop_categories','DATA-ONLY','business_categories has ''Carinderia / Eatery''',
   EXISTS (SELECT 1 FROM public.business_categories WHERE name='Carinderia / Eatery')),

  ('20260813000000','business_type_active_flag','column','business_types.is_active + Tourism flipped off',
   EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='business_types' AND column_name='is_active')
   AND EXISTS (SELECT 1 FROM public.business_types
               WHERE name='Tourism & Leisure' AND NOT is_active)),

  ('20260814000000','taxonomy_cleanup','DATA-ONLY','business_categories has ''Sari-sari / Convenience Store''',
   EXISTS (SELECT 1 FROM public.business_categories WHERE name='Sari-sari / Convenience Store'))
)
SELECT
  p.version,
  p.migration,
  p.kind,
  CASE WHEN p.present THEN 'APPLIED' ELSE 'MISSING' END AS ddl_verdict,
  CASE WHEN m.version IS NOT NULL THEN 'yes' ELSE 'no' END AS in_ledger,
  CASE
    WHEN p.present AND m.version IS NOT NULL THEN 'ok'
    WHEN p.present AND m.version IS NULL     THEN 'DDL present, ledger row MISSING -> db push will re-apply'
    WHEN NOT p.present AND m.version IS NOT NULL THEN 'ledger row present, DDL MISSING -> db push will SKIP it'
    ELSE 'not applied'
  END AS reconcile_action,
  p.what
FROM probe p
LEFT JOIN supabase_migrations.schema_migrations m ON m.version = p.version

UNION ALL

-- ---------------------------------------------------------------------------
-- SECTION 2 — POST-REVIEW VERSION ASSERTIONS
--
-- Section 1 answers "does cloud HAVE this object". It cannot answer "does
-- cloud have THIS VERSION of it" — and several of these migrations were
-- EDITED IN PLACE after cloud may have seen them (PR #18 rewrote the seven
-- 20260727* files; PR #27 rewrote 20260804233000; PR #29 rewrote
-- 20260805090000). A pre-review draft satisfies every check above.
--
-- Each row below asserts something the POST-review file adds and the
-- pre-review draft lacks. A FAIL here means cloud holds a stale draft even
-- though section 1 says APPLIED.
--
-- NOTE: keep this in the SAME statement. `supabase db query -f` returns only
-- the LAST result set, so a second statement would silently hide section 1.
-- ---------------------------------------------------------------------------
SELECT ver, mig, 'post-review', verdict, '-', note, what FROM (VALUES
  ('20260727000005','booking_requests',
   -- PR #18 DROPPED the owner UPDATE policy: it had no WITH CHECK, so Postgres
   -- reused USING (which only proved business ownership) and a direct PostgREST
   -- PATCH could rewrite user_id/status/starts_at or re-decide a settled row.
   -- All non-admin writes must go through the SECURITY DEFINER RPCs.
   NOT EXISTS (SELECT 1 FROM pg_policy
               WHERE polrelid='public.booking_requests'::regclass
                 AND polcmd='w' AND polname NOT ILIKE '%admin%'),
   'SECURITY: no non-admin UPDATE policy on booking_requests'),

  ('20260727000000','offerings_discriminators',
   -- Seeds run under session_replication_role=replica, which SKIPS normal
   -- triggers; without ENABLE ALWAYS every seeded business gets a NULL
   -- business_type_id and silently falls back to retail vocabulary.
   COALESCE((SELECT tgenabled='A' FROM pg_trigger
             WHERE tgname='trg_businesses_sync_business_type'), false),
   'trg_businesses_sync_business_type is ENABLE ALWAYS'),

  ('20260804233000','business_settings_onboarding_state',
   to_regclass('public.idx_branches_business_id_live') IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.app_settings WHERE key='enable_onboarding_tour'),
   'partial branch index + seeded enable_onboarding_tour row'),

  ('20260805090000','public_registration_flags',
   -- Pre-review used (value #>> '{}')::boolean, which Postgres accepts for
   -- 'yes'/'on'/'1' and RAISES 22P02 on anything uncastable — and since all
   -- four flags come from ONE call, a bad row blanked every flag for anon.
   EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_app_setting_bool'
           AND prosrc LIKE '%jsonb_typeof%'),
   'get_app_setting_bool counts only a real JSON boolean')
) AS v(ver, mig, ok, note)
CROSS JOIN LATERAL (SELECT CASE WHEN v.ok THEN 'PASS' ELSE 'FAIL - PRE-REVIEW DRAFT ON CLOUD' END) AS r(verdict)
CROSS JOIN LATERAL (SELECT 'version assertion, not existence') AS w(what)

ORDER BY 1, 3;
