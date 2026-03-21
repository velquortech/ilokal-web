/**
 * Admin Schema Validation Test Suite
 * Tests: User form schemas, edit schemas, validation rules
 */

import { describe, it, expect } from 'vitest';
import { userFormSchema, adminEditSchema } from '../schemas/userFormSchema';

describe('Admin User Form Schema', () => {
  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const data = {
        email: 'admin@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const data = {
        email: 'not-an-email',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject email exceeding max length', () => {
      const longEmail = 'a'.repeat(256) + '@example.com';
      const data = {
        email: longEmail,
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Full Name Validation', () => {
    it('should accept valid full names', () => {
      const validNames = ['John Doe', "O'Connor", 'Jean-Pierre', 'Maria-Elena'];
      for (const name of validNames) {
        const data = {
          email: 'user@example.com',
          full_name: name,
          password: 'SecurePass123',
          confirm_password: 'SecurePass123',
          role: 'admin' as const,
        };
        const result = userFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty full name', () => {
      const data = {
        email: 'user@example.com',
        full_name: '',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = ['John123', 'John@Doe', 'John_Doe'];
      for (const name of invalidNames) {
        const data = {
          email: 'user@example.com',
          full_name: name,
          password: 'SecurePass123',
          confirm_password: 'SecurePass123',
          role: 'admin' as const,
        };
        const result = userFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      }
    });

    it('should reject name exceeding max length', () => {
      const longName = 'a'.repeat(256);
      const data = {
        email: 'user@example.com',
        full_name: longName,
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should accept passwords 8+ characters', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject passwords less than 8 characters', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'Short1',
        confirm_password: 'Short1',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'DifferentPass123',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Role Validation', () => {
    it('should accept valid roles', () => {
      const roles = ['admin', 'business_owner', 'app_user'] as const;
      for (const role of roles) {
        const data = {
          email: 'user@example.com',
          full_name: 'John Doe',
          password: 'SecurePass123',
          confirm_password: 'SecurePass123',
          role,
        };
        const result = userFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid role', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'superadmin',
      } as unknown;
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Status Validation', () => {
    it('should accept valid status values', () => {
      const statuses = ['active', 'inactive', 'suspended'] as const;
      for (const status of statuses) {
        const data = {
          email: 'user@example.com',
          full_name: 'John Doe',
          password: 'SecurePass123',
          confirm_password: 'SecurePass123',
          role: 'admin' as const,
          status,
        };
        const result = userFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
        status: 'deleted',
      } as unknown;
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow missing status (optional)', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Phone Number Validation', () => {
    it('should accept valid international phone numbers', () => {
      const validNumbers = ['+19324234324', '+1234567890', '+44 7911123456'];
      for (const phone of validNumbers) {
        const data = {
          email: 'user@example.com',
          full_name: 'John Doe',
          password: 'SecurePass123',
          confirm_password: 'SecurePass123',
          role: 'admin' as const,
          phone_number: phone,
        };
        const result = userFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject phone numbers without country code', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
        phone_number: '9324234324',
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow empty phone number (optional)', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
        phone_number: '',
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Avatar URL Validation', () => {
    it('should accept valid URLs', () => {
      const urls = [
        'https://example.com/avatar.jpg',
        'http://cdn.example.com/images/avatar.png',
      ];
      for (const url of urls) {
        const data = {
          email: 'user@example.com',
          full_name: 'John Doe',
          password: 'SecurePass123',
          confirm_password: 'SecurePass123',
          role: 'admin' as const,
          avatar_url: url,
        };
        const result = userFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should reject non-URL strings', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
        avatar_url: 'not-a-url',
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow empty avatar URL (optional)', () => {
      const data = {
        email: 'user@example.com',
        full_name: 'John Doe',
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
        role: 'admin' as const,
        avatar_url: '',
      };
      const result = userFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe('Admin Edit Schema', () => {
  describe('Full Name Validation', () => {
    it('should accept valid names for editing', () => {
      const data = {
        full_name: 'Updated Name',
        email: 'user@example.com',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty name in edit', () => {
      const data = {
        full_name: '',
        email: 'user@example.com',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      const data = {
        full_name: 'Invalid@Name',
        email: 'user@example.com',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Email Validation (Edit)', () => {
    it('should accept valid email in edit', () => {
      const data = {
        full_name: 'John Doe',
        email: 'updated@example.com',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require email in edit schema', () => {
      const data = {
        full_name: 'John Doe',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Password Validation (Edit)', () => {
    it('should allow missing password (optional)', () => {
      const data = {
        full_name: 'John Doe',
        email: 'user@example.com',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept password update if 8+ chars', () => {
      const data = {
        full_name: 'John Doe',
        email: 'user@example.com',
        password: 'NewPass123',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Phone Number Validation (Edit)', () => {
    it('should accept valid phone updates', () => {
      const data = {
        full_name: 'John Doe',
        email: 'user@example.com',
        phone_number: '+19324234324',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow empty phone (optional)', () => {
      const data = {
        full_name: 'John Doe',
        email: 'user@example.com',
        phone_number: '',
      };
      const result = adminEditSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
