/**
 * Offering vocabulary — server read.
 *
 * One join: business → business_type → offering_profile, resolved through the
 * pure fallback contract in `lib/utils/offeringVocabulary.ts`.
 *
 * `React.cache`d because the business layout and the page under it both want
 * it in the same request (and `generateMetadata` on the public profile makes a
 * third caller) — same pattern as `getPublicBusinessProfile`.
 *
 * Never throws: a failed read is not worth 500ing a page over. It degrades to
 * the retail vocabulary, which is exactly what every surface rendered before
 * phase 2.
 */

import { cache } from 'react';
import { createServerSupabaseClient } from '@/supabase/server';
import {
  DEFAULT_OFFERING_VOCABULARY,
  resolveOfferingVocabulary,
} from '@/lib/utils/offeringVocabulary';
import type { OfferingMode, OfferingVocabulary } from '@/lib/types/offering';

export const getOfferingVocabulary = cache(
  async (
    businessId: string | null | undefined,
  ): Promise<OfferingVocabulary> => {
    if (!businessId) return DEFAULT_OFFERING_VOCABULARY;

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('businesses')
        .select('offering_mode, business_types ( offering_profile )')
        .eq('id', businessId)
        .maybeSingle();

      if (error || !data) {
        if (error) console.error('[getOfferingVocabulary]', error);
        return DEFAULT_OFFERING_VOCABULARY;
      }

      // PostgREST types a to-one embed as an object here, but returns an array
      // shape in some join configurations — normalize before reading.
      const typeRow = data.business_types as
        | { offering_profile: unknown }
        | { offering_profile: unknown }[]
        | null;
      const profile = Array.isArray(typeRow)
        ? (typeRow[0]?.offering_profile ?? null)
        : (typeRow?.offering_profile ?? null);

      return resolveOfferingVocabulary(
        profile,
        data.offering_mode as OfferingMode,
      );
    } catch (err) {
      console.error('[getOfferingVocabulary]', err);
      return DEFAULT_OFFERING_VOCABULARY;
    }
  },
);
