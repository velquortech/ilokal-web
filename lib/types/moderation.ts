export type ModerationReport = {
  id: string;
  reporter_id: string;
  target_type: 'user' | 'business' | 'content' | 'coupon' | 'product';
  target_id: string;
  reason: string;
  details?: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'rejected';
  created_at: string;
  updated_at?: string | null;
};

export type FlaggedContent = {
  id: string;
  type: 'review' | 'comment' | 'product' | 'business' | 'other';
  target_id: string;
  snippet?: string | null;
  flags: number;
  last_flagged_at?: string | null;
};

export type ModerationActionRequest = {
  action: 'approve' | 'reject' | 'escalate' | 'dismiss';
  comment?: string | null;
};

export type SuspendRequest = {
  target_type: 'user' | 'business';
  reason?: string | null;
  until?: string | null; // ISO date
};

export type WarnRequest = {
  target_type: 'user' | 'business';
  message: string;
};
