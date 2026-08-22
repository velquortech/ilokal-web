import { describe, it, expect } from 'vitest';
import { collectStepIssues } from '../stepIssues';

/**
 * The shape react-hook-form actually hands us. Declared locally (not `any`) so
 * the fixtures stay honest about the recursive tree the walker has to survive.
 */
type ErrorNode = {
  message?: string;
  type?: string;
  ref?: unknown;
  root?: ErrorNode;
} & { [key: string]: unknown };

describe('collectStepIssues', () => {
  it('returns nothing when there are no errors', () => {
    expect(collectStepIssues({}, ['shop_name'])).toEqual([]);
  });

  it('returns nothing when the error tree is not an object', () => {
    expect(collectStepIssues(undefined, ['shop_name'])).toEqual([]);
    expect(collectStepIssues(null, ['shop_name'])).toEqual([]);
  });

  it('collects a flat leaf error', () => {
    const errors: Record<string, ErrorNode> = {
      shop_name: { type: 'too_small', message: 'Shop name is required' },
    };
    expect(collectStepIssues(errors, ['shop_name'])).toEqual([
      { path: 'shop_name', message: 'Shop name is required' },
    ]);
  });

  it('collects nested location errors with full dot paths', () => {
    const errors: Record<string, ErrorNode> = {
      location: {
        zip_code: { message: 'ZIP code must be exactly 4 digits' },
        geometry: { message: 'Set your location coordinates to continue' },
      },
    };
    expect(collectStepIssues(errors, ['location'])).toEqual([
      {
        path: 'location.zip_code',
        message: 'ZIP code must be exactly 4 digits',
      },
      {
        path: 'location.geometry',
        message: 'Set your location coordinates to continue',
      },
    ]);
  });

  it('scopes to the field group — an error from another step is not shown', () => {
    const errors: Record<string, ErrorNode> = {
      shop_name: { message: 'Shop name is required' },
      offerings: { message: 'Add at least one item' },
    };
    // Step 2's group. The offerings error belongs to a step the owner has not
    // reached, and showing it would be a phantom blocker.
    expect(collectStepIssues(errors, ['shop_name', 'description'])).toEqual([
      { path: 'shop_name', message: 'Shop name is required' },
    ]);
  });

  it('emits the array-level message and does not descend into its items', () => {
    // The gallery refine hangs its message on the ARRAY object itself.
    const errors: Record<string, ErrorNode> = {
      interior_images: {
        message: 'At least 4 images required',
        0: { message: 'Each image must be 2MB or less' },
      },
    };
    expect(collectStepIssues(errors, ['interior_images'])).toEqual([
      { path: 'interior_images', message: 'At least 4 images required' },
    ]);
  });

  it('collects per-item errors inside a field array', () => {
    const errors: Record<string, unknown> = {
      offerings: [
        { name: { message: 'Name is required' } },
        {
          price: { message: 'Enter a price, or mark it as priced on request' },
        },
      ],
    };
    expect(collectStepIssues(errors, ['offerings'])).toEqual([
      { path: 'offerings.0.name', message: 'Name is required' },
      {
        path: 'offerings.1.price',
        message: 'Enter a price, or mark it as priced on request',
      },
    ]);
  });

  it('collapses the field-array `root` container out of the path', () => {
    // `root` is RHF bookkeeping, not a field — `setFocus('offerings.root')`
    // would target nothing.
    const errors: Record<string, ErrorNode> = {
      offerings: { root: { message: 'Add at least one item' } },
    };
    expect(collectStepIssues(errors, ['offerings'])).toEqual([
      { path: 'offerings', message: 'Add at least one item' },
    ]);
  });

  it('never walks into `ref` — it holds a DOM node', () => {
    const errors: Record<string, ErrorNode> = {
      shop_name: {
        message: 'Shop name is required',
        ref: { message: 'this must never be collected' },
      },
    };
    const issues = collectStepIssues(errors, ['shop_name']);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe('Shop name is required');
  });

  it('dedupes the same problem reported twice', () => {
    const errors: Record<string, ErrorNode> = {
      location: {
        geometry: { message: 'Set your location coordinates to continue' },
        // RHF can surface the same rule from two nodes; an owner must not be
        // told the same thing twice.
        root: { message: 'Set your location coordinates to continue' },
      },
    };
    const issues = collectStepIssues(errors, ['location']);
    expect(issues).toHaveLength(2);
    expect(new Set(issues.map((i) => i.message)).size).toBe(1);
  });

  it('ignores an empty message rather than emitting a blank line', () => {
    const errors: Record<string, ErrorNode> = {
      shop_name: { message: '' },
    };
    expect(collectStepIssues(errors, ['shop_name'])).toEqual([]);
  });
});
