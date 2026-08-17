import { describe, it, expect } from 'vitest';
import { createBranchSchema } from '../branches';
import {
  branchInfoSchema,
  branchLocationSchema,
} from '@/app/business/[businessId]/branches/create/validator/branch-create-schema';

describe('createBranchSchema (server-side branch write)', () => {
  it('rejects a whitespace-only branch name', () => {
    const result = createBranchSchema.safeParse({
      name: '   ',
      address: '123 Main St',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['name']);
  });

  it('rejects a whitespace-only address', () => {
    const result = createBranchSchema.safeParse({
      name: 'Downtown Branch',
      address: '  ',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['address']);
  });

  it('trims surrounding whitespace from name and address', () => {
    const result = createBranchSchema.safeParse({
      name: '  Downtown Branch  ',
      address: '  123 Main St  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Downtown Branch');
      expect(result.data.address).toBe('123 Main St');
    }
  });
});

describe('branch wizard schemas', () => {
  it('rejects a whitespace-only branch name at the field', () => {
    const result = branchInfoSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['name']);
  });

  it('rejects a whitespace-only address at the field', () => {
    const result = branchLocationSchema.safeParse({ address: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['address']);
  });

  it('trims padded name and address', () => {
    const name = branchInfoSchema.safeParse({ name: '  Downtown Branch  ' });
    expect(name.success).toBe(true);
    if (name.success) expect(name.data.name).toBe('Downtown Branch');

    const address = branchLocationSchema.safeParse({
      address: '  123 Main St  ',
    });
    expect(address.success).toBe(true);
    if (address.success) expect(address.data.address).toBe('123 Main St');
  });
});
