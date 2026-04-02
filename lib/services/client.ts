/* Unified service client: uses axios-based client on browser and fetch on server
   Delegates to unified apiClient helper for client-side requests to reuse interceptors.
*/
import apiClient from './utils/apiClient';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const DEFAULT_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function buildUrl(path: string) {
  // Ensure path starts with '/'
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${DEFAULT_BASE}/api${p}`;
}

export async function request<T = unknown>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const url = buildUrl(path);
    const opts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    };

    const res = await fetch(url, opts);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}) as unknown);
      const err = new Error(
        payload &&
          typeof payload === 'object' &&
          'message' in (payload as Record<string, unknown>)
          ? String((payload as Record<string, unknown>).message)
          : `Request failed with status ${res.status}`,
      );
      (err as unknown as { status?: number }).status = res.status;
      (err as unknown as { data?: unknown }).data = payload;
      throw err as unknown;
    }

    return (await res.json()) as T;
  }

  // Browser: use typed axios methods to avoid dynamic indexing
  const url = `/api${path}`;
  switch (method) {
    case 'GET':
      return (await apiClient.get(url, { headers })) as T;
    case 'POST':
      return (await apiClient.post(url, body, { headers })) as T;
    case 'PUT':
      return (await apiClient.put(url, body, { headers })) as T;
    case 'DELETE':
      return (await apiClient.delete(url, { headers })) as T;
    case 'PATCH':
      return (await apiClient.patch(url, body, { headers })) as T;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

export const http = {
  get: <T = unknown>(path: string, headers?: Record<string, string>) =>
    request<T>('GET', path, undefined, headers),
  post: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) => request<T>('POST', path, body, headers),
  put: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) => request<T>('PUT', path, body, headers),
  del: <T = unknown>(path: string, headers?: Record<string, string>) =>
    request<T>('DELETE', path, undefined, headers),
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) => request<T>('PATCH', path, body, headers),
};

export default http;
