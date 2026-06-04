import { describe, it, expect } from 'vitest';
import { updateBusinessProfileSchema } from './business';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_URL = 'https://example.com/image.png';

const minimalValid = { shop_name: 'My Cafe' };

describe('updateBusinessProfileSchema', () => {
  // ===== shop_name =====

  describe('shop_name', () => {
    it('accepts a valid shop name', () => {
      const result = updateBusinessProfileSchema.safeParse(minimalValid);
      expect(result.success).toBe(true);
    });

    it('rejects shop_name shorter than 2 characters', () => {
      const result = updateBusinessProfileSchema.safeParse({
        shop_name: 'A',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/at least 2/);
    });

    it('rejects shop_name longer than 255 characters', () => {
      const result = updateBusinessProfileSchema.safeParse({
        shop_name: 'A'.repeat(256),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/255/);
    });

    it('rejects missing shop_name', () => {
      const result = updateBusinessProfileSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ===== description =====

  describe('description', () => {
    it('accepts undefined description', () => {
      const result = updateBusinessProfileSchema.safeParse(minimalValid);
      expect(result.success).toBe(true);
    });

    it('accepts null description', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects description longer than 1000 characters', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        description: 'A'.repeat(1001),
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/1000/);
    });
  });

  // ===== logo_url =====

  describe('logo_url', () => {
    it('accepts a valid logo URL', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        logo_url: VALID_URL,
      });
      expect(result.success).toBe(true);
    });

    it('accepts null logo_url', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        logo_url: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects a non-URL string for logo_url', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        logo_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/URL/i);
    });
  });

  // ===== banner_url =====

  describe('banner_url', () => {
    it('accepts a valid banner URL', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        banner_url: VALID_URL,
      });
      expect(result.success).toBe(true);
    });

    it('accepts null banner_url', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        banner_url: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects a non-URL string for banner_url', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        banner_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  // ===== category_id =====

  describe('category_id', () => {
    it('accepts a valid UUID for category_id', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        category_id: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it('accepts null category_id', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        category_id: null,
      });
      expect(result.success).toBe(true);
    });

    it('accepts undefined category_id', () => {
      const result = updateBusinessProfileSchema.safeParse(minimalValid);
      expect(result.success).toBe(true);
    });

    it('rejects a non-UUID string for category_id', () => {
      const result = updateBusinessProfileSchema.safeParse({
        ...minimalValid,
        category_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/category ID/i);
    });
  });

  // ===== full valid payload =====

  it('accepts a complete valid payload', () => {
    const result = updateBusinessProfileSchema.safeParse({
      shop_name: 'My Cafe',
      description: 'A cozy place',
      logo_url: VALID_URL,
      banner_url: VALID_URL,
      category_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shop_name).toBe('My Cafe');
      expect(result.data.category_id).toBe(VALID_UUID);
    }
  });
});
