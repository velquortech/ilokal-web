/**
 * Notification domain types
 *
 * Mirrors the `notifications` table (migration `20260609000000_notifications.sql`).
 * Domain-typed (string-union `type`, typed `metadata`, `read_at` timestamp)
 * following the same convention as `user.ts`.
 */

export type NotificationType =
  | 'business_document_approved'
  | 'business_document_rejected'
  | 'business_verified'
  | 'business_rejected'
  | 'coupon_redeemed'
  /** To every admin, when a shop submits an event for review. */
  | 'event_proposal_submitted'
  /** To the shop owner, carrying the reviewer's note in `metadata.remarks`. */
  | 'event_proposal_approved'
  | 'event_proposal_rejected'
  | 'event_nearby'
  | 'system';

/**
 * Runtime mirror of the union above. `notificationTypeSchema` is derived from
 * this rather than repeating it — the two lists drifted apart once already.
 *
 * NOT a complete mirror of the `notifications_type_check` CHECK: the four
 * `booking_*` types added in `20260727000005` are accepted by the database and
 * missing here, so a booking notification cannot be constructed through this
 * union even though the row is legal. Add them before anything on the web side
 * needs to read one.
 */
export const NOTIFICATION_TYPES = [
  'business_document_approved',
  'business_document_rejected',
  'business_verified',
  'business_rejected',
  'coupon_redeemed',
  'event_proposal_submitted',
  'event_proposal_approved',
  'event_proposal_rejected',
  'event_nearby',
  'system',
] as const satisfies readonly NotificationType[];

/**
 * Free-form, normalized-out metadata. `remarks` carries the admin's
 * approve/disapprove note; the `redeemer_*`/`coupon_code`/`branch_*` keys are
 * set on `coupon_redeemed` notifications; other keys are type-specific.
 */
export interface NotificationMetadata {
  remarks?: string;
  redemption_id?: string;
  redeemer_id?: string;
  redeemer_name?: string;
  coupon_code?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  [key: string]: unknown;
}

/** A single notification record (recipient-facing). */
export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  business_id: string | null;
  actor_id: string | null;
  metadata: NotificationMetadata;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  email: boolean;
  push: boolean;
  digest: 'daily' | 'weekly' | 'none';
};

/** Input for emitting a notification (admin/system → recipient). */
export type EmitNotificationInput = {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  business_id?: string | null;
  actor_id?: string | null;
  metadata?: NotificationMetadata;
};

/** @deprecated use {@link EmitNotificationInput} */
export type CreateNotificationRequest = EmitNotificationInput;

/** Keyset (cursor) pagination request for the notification feed. */
export interface NotificationListParams {
  /** Opaque cursor from a prior page's `next_cursor`; omit for the first page. */
  cursor?: string | null;
  /** Page size (default 20, clamped to 50). */
  limit?: number;
}

/** Keyset (cursor) pagination response. */
export interface NotificationPage {
  notifications: Notification[];
  /** Cursor to fetch the next page, or null when there are no more rows. */
  next_cursor: string | null;
  /** Unread count for the recipient (across all pages). */
  unread_count: number;
}

/** @deprecated offset shape — kept for the isomorphic client wrapper annotation. */
export type PaginatedNotificationsResponse = NotificationPage;
