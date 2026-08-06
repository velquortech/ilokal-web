/**
 * Registration gating: the Documents step (and its field group) must appear
 * only when the require_business_documents flag is on.
 */

import { describe, it, expect } from 'vitest';
import { getSteps } from '../data/steps';
import { getStepFieldGroups } from '../provider/registration-form-provider';

describe('getSteps', () => {
  it('includes the Documents step when documents are required', () => {
    const steps = getSteps(true);
    expect(steps).toHaveLength(6);
    expect(steps.map((s) => s.title)).toEqual([
      'Business Category',
      'Shop Information',
      'Gallery',
      'Documents',
      'What You Offer',
      'Review & Submit',
    ]);
  });

  it('drops the Documents step when documents are waived', () => {
    const steps = getSteps(false);
    expect(steps).toHaveLength(5);
    expect(steps.map((s) => s.title)).not.toContain('Documents');
    expect(steps[steps.length - 1].title).toBe('Review & Submit');
  });

  it('asks for the menu in both modes, always just before review', () => {
    // The whole point of the step: a shop must not be able to finish
    // registering with an empty catalogue, whatever the documents flag says.
    // Last-but-one because Review shows what is about to be submitted, so it
    // has to come after everything it summarises.
    for (const requireDocuments of [true, false]) {
      const titles = getSteps(requireDocuments).map((s) => s.title);
      expect(titles).toContain('What You Offer');
      expect(titles[titles.length - 2]).toBe('What You Offer');
    }
  });
});

describe('getStepFieldGroups', () => {
  it('mirrors getSteps: one field group per step, in the same order', () => {
    expect(getStepFieldGroups(true)).toHaveLength(getSteps(true).length);
    expect(getStepFieldGroups(false)).toHaveLength(getSteps(false).length);
  });

  it('includes document fields only when documents are required', () => {
    const withDocs = getStepFieldGroups(true).flat();
    const withoutDocs = getStepFieldGroups(false).flat();

    expect(withDocs).toContain('business_license');
    expect(withDocs).toContain('tax_certificate');
    expect(withoutDocs).not.toContain('business_license');
    expect(withoutDocs).not.toContain('tax_certificate');
  });

  it('keeps the terms acceptance on the final step in both modes', () => {
    for (const requireDocuments of [true, false]) {
      const groups = getStepFieldGroups(requireDocuments);
      expect(groups[groups.length - 1]).toEqual(['accepted_terms']);
    }
  });

  it('validates the offerings field in both modes', () => {
    // Without a field group the step renders but `nextStep()` never checks it,
    // so Continue would advance past an empty catalogue — the step would exist
    // and enforce nothing. This is the parity the length assertion above only
    // half-covers.
    for (const requireDocuments of [true, false]) {
      expect(getStepFieldGroups(requireDocuments).flat()).toContain(
        'offerings',
      );
    }
  });
});
