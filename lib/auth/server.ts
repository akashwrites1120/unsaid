/**
 * Server-side session helpers.
 *
 * The browser holds only an opaque uuid token in an httpOnly cookie; every
 * lookup goes through the `get_session_user` RPC so session rows are never
 * directly selectable by clients.
 */

import type { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/db/supabase';

export const SESSION_COOKIE = 'wol_session';

/** 30 days, matching the RPC's session expiry. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SessionUser {
  id: string;
  username: string;
}

function readToken(request: NextRequest): string | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token && UUID_RE.test(token) ? token : null;
}

/** Resolve the signed-in user for a request, or null. */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const token = readToken(request);
  if (!token) return null;

  const supabase = getServerSupabase();
  const { data, error } = await supabase.rpc('get_session_user', { p_token: token });

  if (error) throw new Error(`Session lookup failed: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { id: row.user_id, username: row.username };
}

/** Attach the session cookie (call after signup/signin returns a token). */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

/** Map Postgres RPC errors to user-safe messages. */
export function authErrorMessage(error: { message?: string } | null): string {
  const message = error?.message ?? '';
  if (message.includes('INVALID_USERNAME')) {
    return 'Usernames are 3–24 letters, numbers or underscores.';
  }
  if (message.includes('INVALID_PASSWORD')) {
    return 'Passwords must be at least 8 characters.';
  }
  if (message.includes('INVALID_CREDENTIALS')) {
    return 'Wrong username or password.';
  }
  if (message.includes('duplicate key')) {
    return 'That user id is taken — try another.';
  }
  return 'Something went wrong. Please try again.';
}
