import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { publishConfig } from '@/lib/config/publishConfig';
import { categories, type CategoryKey } from '@/lib/config/categories';
import { getChallengeMode, type ChallengeModeKey } from '@/lib/config/challengeModes';

interface PublishRequestBody {
  content: string;
  wordCount: number;
  category: CategoryKey;
  challengeMode: ChallengeModeKey;
  challengeDuration: number;
}

// Validate the request body
function validatePublishBody(body: any): body is PublishRequestBody {
  return (
    typeof body.content === 'string' &&
    typeof body.wordCount === 'number' &&
    body.wordCount > 0 &&
    categories[body.category] !== undefined &&
    getChallengeMode(body.challengeMode) !== undefined &&
    typeof body.challengeDuration === 'number' &&
    body.challengeDuration > 0
  );
}

export async function POST(request: NextRequest) {
  try {
    // Check if publishing is enabled
    if (!publishConfig.enabled) {
      return NextResponse.json(
        { error: 'Publishing is currently disabled' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request body
    if (!validatePublishBody(body)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Server-side validation of minimum word count
    if (body.wordCount < publishConfig.minWordCount) {
      return NextResponse.json(
        {
          error: `Writing must be at least ${publishConfig.minWordCount} words to publish`,
          required: publishConfig.minWordCount,
          actual: body.wordCount
        },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = createServerClient();

    // Insert the writing into the database
    const { data, error } = await supabase
      .from('public_writings')
      .insert({
        content: body.content.trim(),
        word_count: body.wordCount,
        category: body.category,
        challenge_mode: body.challengeMode,
        challenge_duration: body.challengeDuration,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save writing' },
        { status: 500 }
      );
    }

    // Return success response with the published writing ID
    return NextResponse.json({
      success: true,
      id: data.id,
      url: `/feed/${data.id}`,
      publishedAt: data.created_at,
    });

  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as CategoryKey | null;
    const sort = searchParams.get('sort') || 'recent';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validate category if provided
    if (category && !categories[category]) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = createServerClient();

    // Build the query
    let query = supabase
      .from('public_writings')
      .select('id, content, word_count, category, challenge_mode, challenge_duration, created_at')
      .order('created_at', { ascending: sort === 'recent' ? false : true })
      .range((page - 1) * limit, page * limit - 1);

    // Add category filter if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch writings' },
        { status: 500 }
      );
    }

    // Format the response
    const writings = data.map(writing => ({
      id: writing.id,
      content: writing.content,
      wordCount: writing.word_count,
      category: writing.category,
      challengeMode: writing.challenge_mode,
      challengeDuration: writing.challenge_duration,
      createdAt: writing.created_at,
      excerpt: writing.content.length > 150
        ? writing.content.substring(0, 150) + '...'
        : writing.content,
    }));

    return NextResponse.json({
      writings,
      pagination: {
        page,
        limit,
        total: writings.length,
      },
    });

  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}