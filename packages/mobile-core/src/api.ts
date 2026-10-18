import { type ApiErrorCode, ApiErrorSchema } from '@zahln/shared';
import { Platform } from 'react-native';
import type { z } from 'zod';
import { appKind } from './app';

/** The Android emulator reaches the host machine at 10.0.2.2; the iOS simulator shares localhost. */
export const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | 'network',
    message: string,
  ) {
    super(message);
  }
}

type Auth = { token: string; deviceId: string } | null;
let auth: Auth = null;

/** Set after unlock; cleared on lock and sign-out, so a locked app can't make authenticated calls. */
export function setAuth(next: Auth) {
  auth = next;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  timeoutMs?: number;
};

/**
 * Every response is parsed with the shared Zod schema, so an API change that breaks the app
 * fails loudly here instead of rendering `undefined €`.
 */
export async function api<S extends z.ZodType>(
  path: string,
  schema: S,
  opts: RequestOptions = {},
): Promise<z.infer<S>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  // x-app lets the API refuse to bind a till to someone who isn't staff of a business.
  const headers: Record<string, string> = { accept: 'application/json', 'x-app': appKind() };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;
  if (auth) {
    headers.authorization = `Bearer ${auth.token}`;
    headers['x-device-id'] = auth.deviceId;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiRequestError(0, 'network', 'network error');
  } finally {
    clearTimeout(timer);
  }

  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(json);
    throw parsed.success
      ? new ApiRequestError(res.status, parsed.data.error, parsed.data.message)
      : new ApiRequestError(res.status, 'internal', `HTTP ${res.status}`);
  }
  return schema.parse(json);
}
