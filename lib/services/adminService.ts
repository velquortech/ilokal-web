import http from './client';
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  AdminUser,
} from '@/lib/types/admin';

type UserOpResult = { data?: AdminUser; error?: string };

async function useServerClient() {
  // dynamic import to avoid pulling server-only code into client bundles
  const client = await import('@/lib/api/admin/userAPIClient');
  return client;
}

export default {
  async createAdmin(data: AdminCreateUserInput): Promise<UserOpResult> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      const res = await client.createAdmin(data as any);
      return {
        data: res.data,
        error: typeof res.error === 'string' ? res.error : undefined,
      };
    }

    try {
      const res = await http.post('/admin/users', data);
      return { data: res as AdminUser };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async createConsumer(data: AdminCreateUserInput): Promise<UserOpResult> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      const res = await client.createConsumer(data as any);
      return {
        data: res.data,
        error: typeof res.error === 'string' ? res.error : undefined,
      };
    }

    try {
      const res = await http.post('/admin/users/consumer', data);
      return { data: res as AdminUser };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async createBusinessOwner(data: AdminCreateUserInput): Promise<UserOpResult> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      const res = await client.createBusinessOwner(data as any);
      return {
        data: res.data,
        error: typeof res.error === 'string' ? res.error : undefined,
      };
    }

    try {
      const res = await http.post('/admin/users/business-owner', data);
      return { data: res as AdminUser };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async updateUser(
    id: string,
    changes: AdminUpdateUserInput,
  ): Promise<UserOpResult> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      const res = await client.updateUser(id, changes as any);
      return {
        data: res.data,
        error: typeof res.error === 'string' ? res.error : undefined,
      };
    }

    try {
      const res = await http.put(`/admin/users/${id}`, changes);
      return { data: res as AdminUser };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async updateUserStatus(
    id: string,
    status: 'active' | 'inactive' | 'suspended',
  ): Promise<UserOpResult> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      const res = await client.updateUserStatus(id, status);
      return {
        data: res.data,
        error: typeof res.error === 'string' ? res.error : undefined,
      };
    }

    try {
      const res = await http.put(`/admin/users/${id}/status`, { status });
      return { data: res as AdminUser };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async deleteUser(id: string): Promise<{ error?: unknown }> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      const res = await client.deleteUser(id);
      return { error: typeof res.error === 'string' ? res.error : undefined };
    }

    try {
      await http.del(`/admin/users/${id}`);
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },

  async restoreUser(id: string): Promise<UserOpResult> {
    if (typeof window === 'undefined') {
      const client = await useServerClient();
      const res = await client.restoreUser(id);
      return {
        data: res.data,
        error: typeof res.error === 'string' ? res.error : undefined,
      };
    }

    try {
      const res = await http.post(`/admin/users/${id}/restore`);
      return { data: res as AdminUser };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
};
