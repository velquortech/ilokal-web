/**
 * Shop-section validation.
 *
 * Mirrors the DB constraints from `20260801061117` so the owner gets a
 * readable message instead of a constraint violation — but the DB stays the
 * authority: these rules exist there too, because a direct PostgREST call
 * never passes through this file.
 */

import { z } from 'zod';
import { MAX_SECTION_NAME_LENGTH } from '@/lib/types/section';

/**
 * Trimmed before length checks, matching the DB's `char_length(btrim(name))`.
 * A name of three spaces is a blank name, not a 3-character one.
 */
const sectionName = z
  .string()
  .trim()
  .min(1, 'Section name is required')
  .max(
    MAX_SECTION_NAME_LENGTH,
    `Keep it under ${MAX_SECTION_NAME_LENGTH} characters — it is a heading, not a description`,
  );

export const createSectionSchema = z.object({
  name: sectionName,
});

export const updateSectionSchema = z
  .object({
    name: sectionName.optional(),
    position: z.number().int().min(0).max(999).optional(),
  })
  .refine((v) => v.name !== undefined || v.position !== undefined, {
    message: 'Nothing to update',
  });

/** Reorder takes the full ordered list of ids — see `reorderSections`. */
export const reorderSectionsSchema = z.object({
  // z.guid(), not z.uuid(): Zod 4's uuid() is strict RFC-9562 and rejects this
  // app's Postgres-generated ids (CLAUDE.md).
  section_ids: z.array(z.guid()).min(1).max(100),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
