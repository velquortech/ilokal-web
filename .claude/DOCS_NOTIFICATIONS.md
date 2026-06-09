# BUSINESS DOCUMENT REVIEW + NOTIFICATIONS — parities & action items

> **TEMPORARY WORKING DOC.** Branch: `feat/admin-rework` (continuing). This file
> lives at `.claude/DOCS_NOTIFICATIONS.md` and is the single source of truth for
> this effort. **Delete it once all action items are checked off and merged.**
>
> Self-reference: `.claude/DOCS_NOTIFICATIONS.md`

## Goal

1. **Admin business-document review page** — a backend surface where an admin can
   review every document a business submitted (`businesses.verification_documents`
   JSONB: `business_license`, `tax_certificate`, `additional_docs`), examine each,
   and **approve** or **disapprove with remarks**.
2. **Notifications** — approving/disapproving a business's documents emits a
   notification to the business owner. A single normalized `notifications` table
   holds all notifications (system-wide), with constraints + indexes.
3. **Business notification bell** — the existing bell in `BusinessHeader` becomes
   functional, reading notifications via **keyset (cursor) pagination** so the list
   is bounded and never bloats.
4. **Quick win (DONE)** — comment out the non-functional **Ask (BETA)** button and
   **Messages** icon in `BusinessHeader`; keep the bell.

---

## Current-state findings (verified)

| Concern | State |
| --- | --- |
| `notifications` table | **Does not exist.** Only `notification_preferences` (per-user settings, `20260605000000`) exists. → must create. |
| Business documents | `businesses.verification_documents` JSONB `{ business_license, tax_certificate, additional_docs }` (`20260419085758`). Object-shape CHECK only. |
| Verify/reject flow | API `POST /api/admin/businesses/[id]/verify` + `/reject` already accept `notes`/`reason` but **discard them** (`verifyBusiness(_notes)` ignores). Service: `lib/api/business/businessService.ts`. |
| `verification_status` enum | `pending | verified | suspended | rejected`. |
| Admin businesses page | **None** (sidebar entry commented). API routes exist under `/api/admin/businesses/*`. |
| Business header bell | Static `notificationActions` (badge hardcoded `3`), links to `/business/notifications` (no such route). `ActionButton` is a plain `Link`. |
| Data access rule | Components never touch Supabase. Reads/writes via Server Actions (`'use server'`) or API routes. Admin mutations also pass `assertAuthorized({ roles: ['admin'] })`. |

---

## Schema — `notifications` (new, migration `20260609000000`)

Normalized, with FKs, a `type` CHECK, keyset indexes, a partial unread index, RLS,
and a `SECURITY DEFINER` insert RPC (admins have no direct INSERT path to another
user's row under a `auth.uid() = user_id` policy).

```sql
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- recipient
  type        text NOT NULL CHECK (type IN (
                'business_document_approved',
                'business_document_rejected',
                'business_verified',
                'business_rejected',
                'system'
              )),
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body        text CHECK (body IS NULL OR char_length(body) <= 2000),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE, -- related business (nullable)
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- admin who triggered (nullable)
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
                CHECK (jsonb_typeof(metadata) = 'object'),       -- remarks, doc keys, etc.
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Keyset pagination: newest-first, tie-broken by id
CREATE INDEX idx_notifications_user_created
  ON notifications (user_id, created_at DESC, id DESC);
-- Cheap unread-count + unread filter
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- recipient reads own
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
-- recipient marks own read (read_at only; enforced in app layer)
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- System/admin insertion goes through a SECURITY DEFINER RPC (race-safe, auditable)
CREATE FUNCTION create_notification(
  p_user_id uuid, p_type text, p_title text,
  p_body text DEFAULT NULL, p_business_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  -- caller must be an admin (or the recipient themselves, for self-notifications)
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized to create notifications';
  END IF;
  INSERT INTO notifications (user_id, type, title, body, business_id, actor_id, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_business_id, p_actor_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
```

**Why this shape:** recipient + actor are separate FKs (normalized, no duplicated
user data); `business_id` links the related business without embedding it;
free-form remarks/extra fields live in `metadata` JSONB (object-CHECKed). The
`(user_id, created_at DESC, id DESC)` index backs the keyset query exactly.

---

## Cursor pagination contract

Keyset over `(created_at, id)` — **never OFFSET** (avoids drift + scales).

- **Request:** `limit` (default 20, max 50), `cursor` (opaque, base64 of
  `"<created_at_iso>|<id>"`; omitted = first page).
- **Query:** `WHERE user_id = :me [AND (created_at, id) < (:c_created, :c_id)]
  ORDER BY created_at DESC, id DESC LIMIT :limit + 1`. Fetch `limit+1`, the extra
  row signals `has_more`; drop it and emit `next_cursor` from the last kept row.
- **Response:** `{ notifications: [...], next_cursor: string | null, unread_count: number }`.
- **Encode/decode** live in a pure, unit-tested helper (`lib/utils/cursor.ts`).

---

## STATUS (2026-06-09)

Phases A–F **implemented and green** (lint + 1243 tests + build). The **only**
outstanding step is applying the schema: run `make migrate-up` +
`make generate-types` for `20260609000000_notifications.sql` (HIGH-risk, needs
approval). Code is built against manually-added `database.ts` entries that match
what `generate-types` will emit, so it compiles today. Optional mobile route (Phase
E) intentionally deferred.

## Action items (phased — high-risk = human approval before merge)

### Phase A — Quick win (LOW) ✅ DONE
- [x] Comment out **Ask (BETA)** button + **Messages** icon in `BusinessHeader`
      (and the `MessageSquare`/AI-context wiring); keep the bell.

### Phase B — Schema (HIGH: schema — needs approval before `make migrate-up`)
- [ ] `supabase/migrations/20260609000000_notifications.sql` — table + CHECKs + FKs
      + 2 indexes + RLS + `create_notification` RPC (above).
- [ ] `make migrate-up` (local) then `make generate-types` → `lib/types/database.ts`.
- [ ] Domain types in `lib/types/notification.ts` + re-export from `lib/types/index.ts`.
- [ ] Zod schemas in `lib/validation/notification.ts` (list query, mark-read, create).
- **Rollback:** `DROP FUNCTION create_notification; DROP TABLE notifications;`

### Phase C — Notification service layer (MEDIUM)
- [ ] `lib/api/notifications/notificationQuery.ts` — keyset list + unread count.
- [ ] `lib/api/notifications/notificationService.ts` — `emitNotification()` (calls
      `create_notification` RPC), `markRead()`, `markAllRead()`.
- [ ] `lib/utils/cursor.ts` — `encodeCursor`/`decodeCursor` (pure, tested).

### Phase D — Admin document review (MEDIUM/HIGH: admin API)
- [ ] Page `app/admin/[adminId]/businesses/page.tsx` — list businesses (filter by
      status, default `pending`) with submitted-document indicators.
- [ ] Detail/review UI (`components/`) — render each `verification_documents` entry
      via `resolveStorageUrl`; **Approve** / **Disapprove (with remarks)** actions.
- [ ] `actions/businessReviewActions.ts` — `approveDocumentsAction(businessId, remarks?)`
      → status `verified` + `emitNotification(type='business_document_approved')`;
      `rejectDocumentsAction(businessId, remarks)` (remarks **required**) → status
      `rejected` + `emitNotification(type='business_document_rejected', metadata={remarks})`.
- [ ] Persist remarks: thread `notes`/`reason` through `verifyBusiness`/`rejectBusiness`
      (currently discarded) into the notification `metadata`/`body`.
- [ ] Add **Business Documents** entry to admin `sidebarConfig` (`/admin/businesses`).

### Phase E — Business notification bell (MEDIUM)
- [ ] `getNotificationsAction({ cursor, limit })` + `markNotificationReadAction(id)`
      + `markAllNotificationsReadAction()` (server actions; RLS-scoped client).
- [ ] `NotificationBell` client component — dropdown panel, live unread badge,
      infinite scroll (loads next page via `next_cursor` on scroll-end), mark-read
      on click, mark-all-read. Replaces the static bell `ActionButton` in
      `BusinessHeader`.
- [ ] (Optional parity) protected mobile route `GET /api/protected/mobile/notifications`
      with the same cursor contract — **defer unless mobile needs it now.**

### Phase F — Tests + cleanup
- [ ] Unit: `cursor` encode/decode (round-trip, malformed input), notification
      builders, validation schemas.
- [ ] Integration (admin): approve/reject sets status **and** emits the right
      notification type + remarks; unauthorized blocked.
- [ ] Integration (business): notifications list keyset pagination (`next_cursor`,
      `has_more`, ordering), unread count, mark-read flips `read_at`, RLS scoping
      (user can't read another user's rows).
- [ ] `yarn lint --fix && yarn build && yarn test:run` green.
- [ ] Update `.claude/CHANGELOG.md`; **delete this doc**.

---

## Decisions / defaults (override if needed)

- **Surface:** business web dashboard (the bell in the screenshot). Bell opens a
  **dropdown panel** with infinite scroll (cursor) — not a full page.
- **Mobile:** out of scope for now; route stubbed in Phase E as optional.
- **Admin route:** `/admin/[adminId]/businesses` (document review lives here).
- **Disapprove remarks:** **required**; approve remarks optional.
