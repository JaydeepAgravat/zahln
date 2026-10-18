'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** The readable half of the double-submit pair. The session cookie itself is httpOnly and never visible here. */
function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)zahln_csrf=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

/** Browser calls go straight to the API with the session cookie (credentials: 'include') and the CSRF header. */
export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  opts: { body?: unknown; key?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== 'GET') headers['x-csrf-token'] = csrfToken();
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.key) headers['idempotency-key'] = opts.key;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (res.status === 401 && !path.startsWith('/web/auth/')) {
    window.location.assign('/login');
  }
  if (!res.ok) throw new ApiError(res.status, json?.error ?? 'error', json?.message ?? res.statusText);
  return json as T;
}
