import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { getServerSupabase } from '@/lib/db/supabase';
import { authErrorMessage, setSessionCookie } from '@/lib/auth/server';

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const PASSWORD_MAX = 200;

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(getClientIp(request), {
      windowMs: 60_000,
      maxRequests: 10,
      keyPrefix: 'signup',
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: 'Usernames are 3–24 letters, numbers or underscores.' },
        { status: 400 }
      );
    }
    if (password.length < 8 || password.length > PASSWORD_MAX) {
      return NextResponse.json({ error: 'Passwords must be at least 8 characters.' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase.rpc('register_user', {
      p_username: username,
      p_password: password,
    });

    if (error) {
      return NextResponse.json({ error: authErrorMessage(error) }, { status: 400 });
    }

    const token = Array.isArray(data) ? data[0] : data;
    if (!token) {
      return NextResponse.json({ error: 'Could not create your account.' }, { status: 500 });
    }

    const response = NextResponse.json({ user: { username } });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
