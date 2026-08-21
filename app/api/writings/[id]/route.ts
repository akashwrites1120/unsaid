import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('public_writings')
      .select('id, content, word_count, category, challenge_mode, challenge_duration, created_at')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Writing not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch writing' },
        { status: 500 }
      );
    }

    // Format the response
    const writing = {
      id: data.id,
      content: data.content,
      wordCount: data.word_count,
      category: data.category,
      challengeMode: data.challenge_mode,
      challengeDuration: data.challenge_duration,
      createdAt: data.created_at,
    };

    return NextResponse.json(writing);

  } catch (error) {
    console.error('Error fetching writing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}