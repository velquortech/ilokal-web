-- notification_preferences: per-user notification settings
-- The type and query layer already reference this table; this migration creates it.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      boolean     NOT NULL DEFAULT true,
  push       boolean     NOT NULL DEFAULT false,
  digest     text        NOT NULL DEFAULT 'daily'
                          CHECK (digest IN ('daily', 'weekly', 'none')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
