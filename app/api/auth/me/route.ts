import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ user: null });
  }
}
