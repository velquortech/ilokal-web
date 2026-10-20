-- Read-only snapshot of what the schema gate compares code against: every
-- public table/view column, every public function's INPUT argument names
-- (RETURNS TABLE columns are OUT args, so they are filtered out) and how many
-- trailing ones have defaults, and the migration versions already applied.
-- One row, one JSON document, so the API and psql paths parse it the same way.
SELECT json_build_object(
  'columns', (
    SELECT coalesce(json_agg(json_build_object('table', c.table_name, 'column', c.column_name)), '[]')
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
  ),
  'functions', (
    SELECT coalesce(json_agg(json_build_object(
      'name', p.proname,
      'args', (
        SELECT coalesce(json_agg(a.name ORDER BY a.ord), '[]')
        FROM unnest(
          coalesce(p.proargnames, '{}'::text[]),
          coalesce(p.proargmodes, array_fill('i'::"char", ARRAY[coalesce(cardinality(p.proargnames), 0)]))
        ) WITH ORDINALITY AS a(name, mode, ord)
        WHERE a.mode IN ('i', 'b', 'v')
      ),
      'defaults', p.pronargdefaults
    )), '[]')
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  ),
  'migrations', (
    SELECT coalesce(json_agg(m.version ORDER BY m.version), '[]')
    FROM supabase_migrations.schema_migrations m
  )
) AS schema;
