import { NextRequest, NextResponse } from 'next/server';
import { getPublicWriting } from '@/lib/db/queries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Writing not found' }, { status: 404 });
    }

    const row = await getPublicWriting(id);

    if (!row) {
      return NextResponse.json({ error: 'Writing not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: row.id,
      content: row.content,
      wordCount: row.word_count,
      category: row.category,
      challengeMode: row.challenge_mode,
      challengeDuration: row.challenge_duration,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('Error fetching writing:', error);
    return NextResponse.json(
      { error: 'Failed to load writing.' },
      { status: 500 }
    );
  }
}
