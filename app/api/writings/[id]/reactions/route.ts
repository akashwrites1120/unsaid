import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import {
  addReaction,
  getReactionCounts,
  reactionTypes,
  removeReaction,
  type ReactionType,
} from '@/lib/db/queries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Anonymous session fingerprint: a coarse hash of stable request headers.
 * Deliberately non-identifying — it only prevents duplicate reactions from
 * the same browser and stores nothing about the visitor.
 */
function sessionFingerprint(request: NextRequest): string {
  const combined = [
    request.headers.get('user-agent') ?? '',
    request.headers.get('accept-language') ?? '',
  ].join('|');

  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 33) ^ combined.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function parseId(id: string): string | null {
  return UUID_RE.test(id) ? id : null;
}

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
    return NextResponse.json({ counts });
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

    const result = await addReaction(writingId, reactionType, sessionFingerprint(request));
    const counts = await getReactionCounts(writingId);

    return NextResponse.json({ counts, result });
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

    await removeReaction(writingId, reactionType, sessionFingerprint(request));
    const counts = await getReactionCounts(writingId);

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json({ error: 'Failed to remove reaction.' }, { status: 500 });
  }
}
