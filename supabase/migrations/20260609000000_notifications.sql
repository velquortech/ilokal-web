-- notifications: single normalized table holding every user-facing notification.
-- Recipient + actor are separate FKs (no duplicated user data); business_id links
-- the related business; free-form remarks/extra fields live in metadata JSONB.
-- Keyset (cursor) pagination is backed by the (user_id, created_at DESC, id DESC) index.

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN (
                            'business_document_approved',
                            'business_document_rejected',
                            'business_verified',
                            'business_rejected',
                            'system'
                          )),
  title       text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body        text        CHECK (body IS NULL OR char_length(body) <= 2000),
  business_id uuid        REFERENCES businesses(id) ON DELETE CASCADE,
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}'::jsonb
                          CHECK (jsonb_typeof(metadata) = 'object'),
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Keyset pagination: newest-first, tie-broken by id.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC, id DESC);

-- Cheap unread-count + unread-only filtering.
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recipient reads own notifications.
CREATE POLICY "Users read own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Recipient marks own notifications read (read_at flip; app layer restricts columns).
CREATE POLICY "Users update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System/admin insertion goes through a SECURITY DEFINER RPC: authenticated users
-- have no INSERT policy, so an admin cannot write a row for another user directly.
-- The RPC authorizes the caller (admin, or the recipient for self-notifications)
-- and performs the insert with elevated rights.
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id     uuid,
  p_type        text,
  p_title       text,
  p_body        text  DEFAULT NULL,
  p_business_id uuid  DEFAULT NULL,
  p_actor_id    uuid  DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized to create notifications';
  END IF;

  INSERT INTO notifications (
    user_id, type, title, body, business_id, actor_id, metadata
  )
  VALUES (
    p_user_id, p_type, p_title, p_body, p_business_id, p_actor_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Lock down the RPC: only authenticated users may attempt it (body re-checks role).
REVOKE ALL ON FUNCTION create_notification(uuid, text, text, text, uuid, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, uuid, uuid, jsonb) TO authenticated;
