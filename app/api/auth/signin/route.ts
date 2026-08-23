import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { getServerSupabase } from '@/lib/db/supabase';
import { authErrorMessage, setSessionCookie } from '@/lib/auth/server';

const PASSWORD_MAX = 200;

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(getClientIp(request), {
      windowMs: 60_000,
      maxRequests: 10,
      keyPrefix: 'signin',
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!username || !password || password.length > PASSWORD_MAX) {
      return NextResponse.json({ error: 'Enter your user id and password.' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase.rpc('verify_login', {
      p_username: username,
      p_password: password,
    });

    if (error) {
      return NextResponse.json({ error: authErrorMessage(error) }, { status: 401 });
    }

    const token = Array.isArray(data) ? data[0] : data;
    if (!token) {
      return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ user: { username } });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
