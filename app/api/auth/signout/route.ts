import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/db/supabase';
import { clearSessionCookie } from '@/lib/auth/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const token = request.cookies.get('wol_session')?.value;

  if (token && UUID_RE.test(token)) {
    try {
      const supabase = getServerSupabase();
      await supabase.rpc('revoke_session', { p_token: token });
    } catch (error) {
      // Cookie is cleared regardless; the orphaned session simply expires.
      console.error('Signout error:', error);
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
