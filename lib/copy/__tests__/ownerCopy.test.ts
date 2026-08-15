/**
 * The copy map's contract (spec §8.1):
 *  1. Both locales define EXACTLY the same keys — a missing Filipino string
 *     would silently render English mid-screen when the variant ships.
 *  2. Every value is a non-empty string — never a blank label.
 *  3. The `en` strings match the CURRENT UI literals — the map must be a
 *     faithful index of what is on screen, or "wire the map" rewrites copy
 *     nobody approved. Asserted against the real sources (stepMeta,
 *     PendingBanner) rather than re-typed literals, so a UI copy change
 *     fails this test instead of silently desyncing the map.
 */

import { describe, it, expect } from 'vitest';
import { OWNER_COPY, ownerCopyFor } from '@/lib/copy/owner';
import { REGISTRATION_STEP_META } from '@/app/business/registration/data/stepMeta';

const EN = OWNER_COPY.en;
const FIL = OWNER_COPY.fil;

describe('owner copy map — locale parity', () => {
  it('defines the same keys in both locales', () => {
    expect(Object.keys(FIL).sort()).toEqual(Object.keys(EN).sort());
  });

  it('has no empty or whitespace-only strings in either locale', () => {
    for (const [key, value] of Object.entries(EN)) {
      expect(value.trim().length, `en.${key}`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(FIL)) {
      expect(value.trim().length, `fil.${key}`).toBeGreaterThan(0);
    }
  });

  it('keeps DB-stored values untranslated (spec §8.1 rule 4)', () => {
    // "Draft" / "Published" stay as loanwords — the UI maps the stored
    // status value to words, never translates the value itself.
    expect(EN.visibilityDraft.startsWith('Draft')).toBe(true);
    expect(EN.visibilityPublished.startsWith('Published')).toBe(true);
    expect(FIL.visibilityDraft.startsWith('Draft')).toBe(true);
    expect(FIL.visibilityPublished.startsWith('Published')).toBe(true);
  });

  it('reads English for an unknown or missing locale', () => {
    expect(ownerCopyFor(null)).toBe(EN);
    expect(ownerCopyFor('es')).toBe(EN);
    expect(ownerCopyFor('')).toBe(EN);
  });
});

describe('owner copy map — en strings match the current UI', () => {
  it('step titles match the registration step metadata', () => {
    expect(EN.stepCategoryTitle).toBe(REGISTRATION_STEP_META.category.title);
    expect(EN.stepInformationTitle).toBe(
      REGISTRATION_STEP_META.information.title,
    );
    expect(EN.stepOfferingsTitle).toBe(REGISTRATION_STEP_META.offerings.title);
    expect(EN.stepDealTitle).toBe(REGISTRATION_STEP_META.deal.title);
    expect(EN.stepReviewTitle).toBe(REGISTRATION_STEP_META.review.title);
  });

  it('step descriptions match the registration step metadata', () => {
    expect(EN.stepCategoryDescription).toBe(
      REGISTRATION_STEP_META.category.description,
    );
    expect(EN.stepInformationDescription).toBe(
      REGISTRATION_STEP_META.information.description,
    );
    expect(EN.stepOfferingsDescription).toBe(
      REGISTRATION_STEP_META.offerings.description,
    );
    expect(EN.stepDealDescription).toBe(
      REGISTRATION_STEP_META.deal.description,
    );
  });

  it('pending-banner copy matches the dashboard banner', () => {
    // Verbatim from the spec §8.1 inventory — the banner renders these today.
    expect(EN.pendingBannerTitle).toBe('Awaiting Verification');
    expect(EN.pendingBannerDetail).toBe(
      '— Your shop is currently invisible to public users while under review.',
    );
  });
});
