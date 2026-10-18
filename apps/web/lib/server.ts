import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Session } from './types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Server components call the API with the browser's own cookies, so the first paint already has data.
 * The API is the only place that decides who may see what; this just forwards the session.
 */
export async function serverGet<T>(path: string): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API}${path}`, {
    headers: { cookie: jar.toString() },
    cache: 'no-store',
  });
  if (res.status === 401) redirect('/login');
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** Like serverGet, but a 403 (plan or role) comes back as null instead of an error page. */
export async function serverGetOptional<T>(path: string): Promise<T | null> {
  const jar = await cookies();
  const res = await fetch(`${API}${path}`, { headers: { cookie: jar.toString() }, cache: 'no-store' });
  if (res.status === 401) redirect('/login');
  if (res.status === 403) return null;
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const getSession = () => serverGet<Session>('/web/session');
