/**
 * Shop-section writes.
 *
 * Writes go straight to the table — unlike bookings, there is no RPC, because
 * every rule here is expressible as a constraint or a policy and the DB
 * enforces all of them against a direct PostgREST call too: ownership (RLS),
 * one name per shop (partial unique index), the 30-section cap (trigger,
 * IL003), and the length CHECK.
 *
 * This layer's job is the same as `bookingService`'s: turn a SQLSTATE into
 * copy an owner can act on. A raw driver message names tables, columns and
 * constraints, so it never reaches the client.
 */

import { createServerSupabaseClient } from '@/supabase/server';
import { MAX_SECTIONS_PER_SHOP } from '@/lib/types/section';
import type { ApiResponse, ProductSection } from '@/lib/types';

type PgError = { code?: string; message?: string };

export type SectionErrorCode =
  | 'DUPLICATE_NAME'
  | 'LIMIT_REACHED'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';

function mapSectionError(error: PgError): {
  code: SectionErrorCode;
  message: string;
} {
  switch (error.code) {
    case '23505':
      return {
        code: 'DUPLICATE_NAME',
        message: 'You already have a section with that name.',
      };
    // Private SQLSTATE class: only our triggers raise IL0xx, so a message
    // carrying one is provably ours. A generic code like 22023 is also raised
    // by built-ins, and forwarding it would forward their internals.
    case 'IL003':
      return {
        code: 'LIMIT_REACHED',
        message: `You can have up to ${MAX_SECTIONS_PER_SHOP} sections.`,
      };
    case '23514':
      return {
        code: 'INVALID_INPUT',
        message: 'That name is too long or empty.',
      };
    case '42501':
      return {
        code: 'UNAUTHORIZED',
        message: 'You do not have access to this shop.',
      };
    case 'PGRST116':
      return { code: 'NOT_FOUND', message: 'That section no longer exists.' };
    default:
      return {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      };
  }
}

function failure(error: PgError, context: string): ApiResponse<never> {
  console.error(`[${context}]`, error);
  return { success: false, error: mapSectionError(error) };
}

export async function createSection(
  businessId: string,
  name: string,
): Promise<ApiResponse<ProductSection>> {
  const supabase = await createServerSupabaseClient();

  // New sections land at the end. Reading max(position) then adding one is a
  // race in theory; in practice one owner edits one shop's menu, and the only
  // consequence of a tie is two sections sharing a slot until the next
  // reorder — which `getSectionsWithCounts` already breaks deterministically.
  const { data: last } = await supabase
    .from('product_sections')
    .select('position')
    .eq('business_id', businessId)
    .is('archived_at', null)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('product_sections')
    .insert({
      business_id: businessId,
      name: name.trim(),
      position: (last?.position ?? -1) + 1,
    })
    .select()
    .single();

  if (error) return failure(error, 'createSection');
  return { success: true, data: data as ProductSection };
}

export async function renameSection(
  businessId: string,
  sectionId: string,
  name: string,
): Promise<ApiResponse<ProductSection>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('product_sections')
    .update({ name: name.trim() })
    .eq('id', sectionId)
    // Scoped by business as well as id: RLS already blocks a cross-shop write,
    // but this makes the intent explicit and turns a stray id into a no-op
    // rather than a policy denial.
    .eq('business_id', businessId)
    .is('archived_at', null)
    .select()
    .single();

  if (error) return failure(error, 'renameSection');
  return { success: true, data: data as ProductSection };
}

/**
 * Soft delete. Products in the section are NOT deleted — a DB trigger clears
 * their `section_id`, so they fall into Uncategorised (see the migration).
 */
export async function archiveSection(
  businessId: string,
  sectionId: string,
): Promise<ApiResponse<{ id: string }>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('product_sections')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', sectionId)
    .eq('business_id', businessId)
    .is('archived_at', null)
    .select('id')
    .single();

  if (error) return failure(error, 'archiveSection');
  return { success: true, data: { id: (data as { id: string }).id } };
}

/**
 * Persist a new order.
 *
 * Takes the full ordered id list rather than a single moved item: the caller
 * already knows the final order, and writing each row's index is idempotent —
 * a retry after a partial failure converges instead of drifting.
 */
export async function reorderSections(
  businessId: string,
  sectionIds: string[],
): Promise<ApiResponse<{ updated: number }>> {
  const supabase = await createServerSupabaseClient();

  const results = await Promise.all(
    sectionIds.map((id, index) =>
      supabase
        .from('product_sections')
        .update({ position: index })
        .eq('id', id)
        .eq('business_id', businessId)
        .is('archived_at', null),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return failure(failed.error, 'reorderSections');

  return { success: true, data: { updated: sectionIds.length } };
}
