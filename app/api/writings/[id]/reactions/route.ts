import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { getSessionUser } from '@/lib/auth/server';
import {
  addReaction,
  getReactionCounts,
  getUserReaction,
  reactionTypes,
  removeReaction,
  type ReactionType,
} from '@/lib/db/queries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseId(id: string): string | null {
  return UUID_RE.test(id) ? id : null;
}

/** Public: everyone can see totals; a signed-in visitor also gets their own. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const writingId = parseId(id);
    if (!writingId) {
      return NextResponse.json({ error: 'Writing not found' }, { status: 404 });
    }

    const counts = await getReactionCounts(writingId);

    let myReaction: ReactionType | null = null;
    const user = await getSessionUser(request);
    if (user) {
      myReaction = await getUserReaction(writingId, user.id);
    }

    return NextResponse.json({ counts, myReaction });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json({ error: 'Failed to load reactions.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = checkRateLimit(getClientIp(request), {
      windowMs: 60_000,
      maxRequests: 30,
      keyPrefix: 'react',
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
    }

    // Reacting requires an account.
    let user;
    try {
      user = await getSessionUser(request);
    } catch {
      return NextResponse.json({ error: 'Could not verify your session. Please sign in again.' }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to react.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const writingId = parseId(id);
    if (!writingId) {
      return NextResponse.json({ error: 'Writing not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const reactionType = body?.reactionType as ReactionType | undefined;
    if (!reactionType || !reactionTypes.includes(reactionType)) {
      return NextResponse.json({ error: 'Invalid reaction type.' }, { status: 400 });
    }

    const result = await addReaction(writingId, reactionType, user.id);
    const counts = await getReactionCounts(writingId);

    return NextResponse.json({ counts, myReaction: reactionType, result });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json({ error: 'Failed to react.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = checkRateLimit(getClientIp(request), {
      windowMs: 60_000,
      maxRequests: 30,
      keyPrefix: 'react',
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
    }

    let user;
    try {
      user = await getSessionUser(request);
    } catch {
      return NextResponse.json({ error: 'Could not verify your session. Please sign in again.' }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to react.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const writingId = parseId(id);
    if (!writingId) {
      return NextResponse.json({ error: 'Writing not found' }, { status: 404 });
    }

    await removeReaction(writingId, user.id);
    const counts = await getReactionCounts(writingId);

    return NextResponse.json({ counts, myReaction: null });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json({ error: 'Failed to remove reaction.' }, { status: 500 });
  }
}
