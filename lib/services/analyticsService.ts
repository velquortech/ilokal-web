import http from './client';

async function browserGet(path: string) {
  return http.get(path);
}

async function buildQs(params?: Record<string, string | number>) {
  if (!params) return '';
  return `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`;
}

export async function coupons(params?: Record<string, string | number>) {
  if (typeof window === 'undefined') {
    try {
      const { analyticsService } =
        await import('../api/admin/analyticsService');
      return analyticsService.coupons(params);
    } catch (err) {
      console.error(
        'analyticsService server-fast-path failed, falling back to HTTP',
        err,
      );
      const qs = await buildQs(params);
      return browserGet(`/analytics/coupons${qs}`);
    }
  }

  const qs = await buildQs(params);
  return browserGet(`/analytics/coupons${qs}`);
}

export async function dashboard(params?: Record<string, string | number>) {
  if (typeof window === 'undefined') {
    try {
      const { analyticsService } =
        await import('../api/admin/analyticsService');
      return analyticsService.dashboard(params);
    } catch (err) {
      console.error(
        'analyticsService server-fast-path failed, falling back to HTTP',
        err,
      );
      const qs = await buildQs(params);
      return browserGet(`/analytics/dashboard${qs}`);
    }
  }

  const qs = await buildQs(params);
  return browserGet(`/analytics/dashboard${qs}`);
}

export async function products(params?: Record<string, string | number>) {
  if (typeof window === 'undefined') {
    try {
      const { analyticsService } =
        await import('../api/admin/analyticsService');
      return analyticsService.products(params);
    } catch (err) {
      console.error(
        'analyticsService server-fast-path failed, falling back to HTTP',
        err,
      );
      const qs = await buildQs(params);
      return browserGet(`/analytics/products${qs}`);
    }
  }

  const qs = await buildQs(params);
  return browserGet(`/analytics/products${qs}`);
}

export async function revenue(params?: Record<string, string | number>) {
  if (typeof window === 'undefined') {
    try {
      const { analyticsService } =
        await import('../api/admin/analyticsService');
      return analyticsService.revenue(params);
    } catch (err) {
      console.error(
        'analyticsService server-fast-path failed, falling back to HTTP',
        err,
      );
      const qs = await buildQs(params);
      return browserGet(`/analytics/revenue${qs}`);
    }
  }

  const qs = await buildQs(params);
  return browserGet(`/analytics/revenue${qs}`);
}

export async function traffic(params?: Record<string, string | number>) {
  if (typeof window === 'undefined') {
    try {
      const { analyticsService } =
        await import('../api/admin/analyticsService');
      return analyticsService.traffic(params);
    } catch (err) {
      console.error(
        'analyticsService server-fast-path failed, falling back to HTTP',
        err,
      );
      const qs = await buildQs(params);
      return browserGet(`/analytics/traffic${qs}`);
    }
  }

  const qs = await buildQs(params);
  return browserGet(`/analytics/traffic${qs}`);
}

export default {
  coupons,
  dashboard,
  products,
  revenue,
  traffic,
};
