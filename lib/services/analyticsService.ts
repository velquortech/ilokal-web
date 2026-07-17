import http from './client';

async function browserGet(path: string) {
  return http.get(path);
}

async function buildQs(params?: Record<string, string | number>) {
  if (!params) return '';
  return `?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`;
}

export async function coupons(params?: Record<string, string | number>) {
  // Server-side coupon analytics requires auth/secrets, so only use HTTP fallback
  const qs = await buildQs(params);
  return browserGet(`/analytics/coupons${qs}`);
}

export async function dashboard(params?: Record<string, string | number>) {
  // Server-side dashboard requires auth/secrets, so only use HTTP fallback
  const qs = await buildQs(params);
  return browserGet(`/analytics/dashboard${qs}`);
}

export async function revenue(params?: Record<string, string | number>) {
  // Server-side revenue analytics requires auth/secrets, so only use HTTP fallback
  const qs = await buildQs(params);
  return browserGet(`/analytics/revenue${qs}`);
}

export async function traffic(params?: Record<string, string | number>) {
  // Server-side traffic analytics requires auth/secrets, so only use HTTP fallback
  const qs = await buildQs(params);
  return browserGet(`/analytics/traffic${qs}`);
}

export default {
  coupons,
  dashboard,
  revenue,
  traffic,
};
