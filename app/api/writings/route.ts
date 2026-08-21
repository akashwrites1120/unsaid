import { NextRequest, NextResponse } from 'next/server';
import { publishConfig } from '@/lib/config/publishConfig';
import { categories, type CategoryKey } from '@/lib/config/categories';
import { getChallengeMode, type ChallengeModeKey } from '@/lib/config/challengeModes';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { countWords, htmlToPlainText } from '@/lib/utils/text';
import {
  createPublicWriting,
  countPublicWritings,
  listPublicWritings,
} from '@/lib/db/queries';

/** Hard cap on published content size (chars) — abuse guard (4.5). */
const MAX_CONTENT_CHARS = 100_000;
const MAX_BODY_BYTES = 200_000;

interface PublishRequestBody {
  content: string;
  category: CategoryKey;
  challengeMode: ChallengeModeKey;
  challengeDuration: number;
}

function validatePublishBody(body: unknown): body is PublishRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.content === 'string' &&
    b.content.length > 0 &&
    typeof b.category === 'string' &&
    categories[b.category as CategoryKey] !== undefined &&
    typeof b.challengeMode === 'string' &&
    getChallengeMode(b.challengeMode as ChallengeModeKey) !== undefined &&
    typeof b.challengeDuration === 'number' &&
    Number.isFinite(b.challengeDuration) &&
    b.challengeDuration > 0 &&
    b.challengeDuration < 24 * 60 * 60 * 1000
  );
}

export async function POST(request: NextRequest) {
  try {
    // ---- Abuse guards (4.5): rate limit per IP, then payload sanity ----
    const rateLimitResult = checkRateLimit(getClientIp(request), {
      windowMs: 60_000,
      maxRequests: 5,
      keyPrefix: 'publish',
    });

    if (!rateLimitResult.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000));
      return NextResponse.json(
        { error: 'Too many publish requests. Please wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      );
    }

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Content too large.' },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!validatePublishBody(body)) {
      return NextResponse.json(
        { error: 'Invalid request data.' },
        { status: 400 }
      );
    }

    // Publishing kill switch (maintenance).
    if (!publishConfig.enabled) {
      return NextResponse.json(
        { error: 'Publishing is currently disabled.' },
        { status: 503 }
      );
    }

    // Trust nothing from the client: strip markup and recompute the word
    // count server-side before applying the gate.
    const plainText = htmlToPlainText(body.content);
    if (!plainText) {
      return NextResponse.json({ error: 'Content is empty.' }, { status: 400 });
    }
    if (plainText.length > MAX_CONTENT_CHARS) {
      return NextResponse.json({ error: 'Content too large.' }, { status: 413 });
    }

    const wordCount = countWords(plainText);
    if (wordCount < publishConfig.minWordCount) {
      return NextResponse.json(
        {
          error: `Writing must be at least ${publishConfig.minWordCount} words to publish.`,
          required: publishConfig.minWordCount,
          actual: wordCount,
        },
        { status: 400 }
      );
    }

    const { id, createdAt } = await createPublicWriting({
      content: plainText,
      wordCount,
      category: body.category,
      challengeMode: body.challengeMode,
      challengeDuration: Math.round(body.challengeDuration),
    });

    return NextResponse.json({
      success: true,
      id,
      url: `/feed/${id}`,
      wordCount,
      publishedAt: createdAt,
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: 'Failed to publish. Please try again.' },
      { status: 500 }
    );
  }
}

const DEFAULT_PAGE_LIMIT = 12;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as CategoryKey | null;
    const sort = searchParams.get('sort') === 'popular' ? 'popular' : 'recent';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_LIMIT), 10) || DEFAULT_PAGE_LIMIT));

    if (category && categories[category] === undefined) {
      return NextResponse.json({ error: 'Unknown category.' }, { status: 400 });
    }

    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      listPublicWritings({ sort, category, limit, offset }),
      countPublicWritings(category),
    ]);

    const writings = rows.map((row) => ({
      id: row.id,
      excerpt:
        row.content.length > 180 ? `${row.content.slice(0, 180).trimEnd()}…` : row.content,
      wordCount: row.word_count,
      category: row.category,
      challengeMode: row.challenge_mode,
      challengeDuration: row.challenge_duration,
      createdAt: row.created_at,
      reactionCount: Number(row.total_reactions ?? 0),
    }));

    return NextResponse.json({
      writings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: offset + writings.length < total,
      },
    });
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json(
      { error: 'Failed to load writings.' },
      { status: 500 }
    );
  }
}
