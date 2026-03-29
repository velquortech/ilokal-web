import { createServerSupabaseClient } from '@/supabase/server';

export async function auditEvent(
  eventType: string,
  payload: Record<string, unknown>,
) {
  try {
    const supabase = await createServerSupabaseClient();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Try to persist an audit record; if the table doesn't exist, fall back to console
    const { error } = await supabase.from('audit_logs').insert({
      id,
      event_type: eventType,
      payload: payload,
      created_at: now,
    });

    if (error) {
      console.warn(
        '[auditEvent] failed to persist audit record, falling back to console:',
        error.message || error,
      );
      console.info('[auditEvent]', eventType, payload);
    }
  } catch (err) {
    console.info(
      '[auditEvent] (fallback) ',
      eventType,
      payload,
      err instanceof Error ? err.message : err,
    );
  }
}

export default auditEvent;
