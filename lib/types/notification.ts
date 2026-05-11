export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  email: boolean;
  push: boolean;
  digest: 'daily' | 'weekly' | 'none';
};

export type CreateNotificationRequest = {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
};

export type PaginatedNotificationsResponse = {
  items: Notification[];
  total: number;
  page: number;
  per_page: number;
};
