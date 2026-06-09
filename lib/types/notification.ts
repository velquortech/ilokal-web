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
  | 'system';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'business_document_approved',
  'business_document_rejected',
  'business_verified',
  'business_rejected',
  'system',
];

/**
 * Free-form, normalized-out metadata. `remarks` carries the admin's
 * approve/disapprove note; other keys are notification-type specific.
 */
export interface NotificationMetadata {
  remarks?: string;
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
