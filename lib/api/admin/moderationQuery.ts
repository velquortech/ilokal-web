import { createServerSupabaseClient } from '@/supabase/server';
import type { ModerationReport, FlaggedContent } from '@/lib/types';

export async function fetchFlaggedContent(
  page = 1,
  per_page = 20,
): Promise<FlaggedContent[]> {
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * per_page;
  const { data } = await supabase
    .from('flags')
    .select('id, type, target_id, snippet, flags, last_flagged_at')
    .order('last_flagged_at', { ascending: false })
    .range(from, from + per_page - 1);

  if (!Array.isArray(data)) return [];
  return data as FlaggedContent[];
}

export async function fetchReports(
  page = 1,
  per_page = 20,
): Promise<ModerationReport[]> {
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * per_page;
  const { data } = await supabase
    .from('moderation_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, from + per_page - 1);

  if (!Array.isArray(data)) return [];
  return data as ModerationReport[];
}

export async function createReport(
  input: Partial<ModerationReport>,
): Promise<ModerationReport | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('moderation_reports')
    .insert(input)
    .select()
    .limit(1)
    .single();
  if (!data) return null;
  return data as ModerationReport;
}

export async function updateReportStatus(
  id: string,
  status: string,
  comment?: string,
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const updates: Record<string, unknown> = { status };
  if (comment) updates['details'] = comment;
  const { error } = await supabase
    .from('moderation_reports')
    .update(updates)
    .eq('id', id);
  return !error;
}

export async function suspendEntity(
  target_type: string,
  target_id: string,
  reason?: string,
  until?: string,
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  // For simplicity, write to a suspensions table or update user/business table depending on type
  const payload = { target_type, target_id, reason, until };
  const { error } = await supabase.from('suspensions').insert(payload);
  return !error;
}

export async function warnEntity(
  target_type: string,
  target_id: string,
  message: string,
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const payload = { target_type, target_id, message };
  const { error } = await supabase.from('warnings').insert(payload);
  return !error;
}
