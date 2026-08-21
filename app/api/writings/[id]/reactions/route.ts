import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Generate a simple session fingerprint for anonymous reaction tracking
function generateSessionFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  // Simple hash-like fingerprint (not cryptographic)
  const combined = `${userAgent}|${acceptLanguage}|${request.nextUrl.origin}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('writing_reactions')
      .select('reaction_type')
      .eq('writing_id', params.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reactions' },
        { status: 500 }
      );
    }

    // Count reactions by type
    const counts = {
      heart: 0,
      clap: 0,
      mind_blown: 0,
      relate: 0,
      total: data.length,
    };

    data.forEach(reaction => {
      if (counts[reaction.reaction_type as keyof typeof counts] !== undefined) {
        counts[reaction.reaction_type as keyof typeof counts]++;
      }
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reactionType } = body;

    if (!reactionType || !['heart', 'clap', 'mind_blown', 'relate'].includes(reactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const sessionFingerprint = generateSessionFingerprint(request);

    // Check if writing exists
    const { data: writing, error: writingError } = await supabase
      .from('public_writings')
      .select('id')
      .eq('id', params.id)
      .single();

    if (writingError || !writing) {
      return NextResponse.json(
        { error: 'Writing not found' },
        { status: 404 }
      );
    }

    // Upsert reaction (insert or update if exists)
    const { data, error } = await supabase
      .from('writing_reactions')
      .upsert({
        writing_id: params.id,
        reaction_type: reactionType,
        session_fingerprint: sessionFingerprint,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate key error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Already reacted with this type' },
          { status: 409 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to add reaction' },
        { status: 500 }
      );
    }

    // Return updated counts
    const { data: allReactions } = await supabase
      .from('writing_reactions')
      .select('reaction_type')
      .eq('writing_id', params.id);

    const counts = {
      heart: 0,
      clap: 0,
      mind_blown: 0,
      relate: 0,
      total: allReactions?.length || 0,
    };

    allReactions?.forEach(reaction => {
      if (counts[reaction.reaction_type as keyof typeof counts] !== undefined) {
        counts[reaction.reaction_type as keyof typeof counts]++;
      }
    });

    return NextResponse.json({ counts, reaction: data });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reactionType } = body;

    if (!reactionType || !['heart', 'clap', 'mind_blown', 'relate'].includes(reactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const sessionFingerprint = generateSessionFingerprint(request);

    const { error } = await supabase
      .from('writing_reactions')
      .delete()
      .eq('writing_id', params.id)
      .eq('reaction_type', reactionType)
      .eq('session_fingerprint', sessionFingerprint);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to remove reaction' },
        { status: 500 }
      );
    }

    // Return updated counts
    const { data: allReactions } = await supabase
      .from('writing_reactions')
      .select('reaction_type')
      .eq('writing_id', params.id);

    const counts = {
      heart: 0,
      clap: 0,
      mind_blown: 0,
      relate: 0,
      total: allReactions?.length || 0,
    };

    allReactions?.forEach(reaction => {
      if (counts[reaction.reaction_type as keyof typeof counts] !== undefined) {
        counts[reaction.reaction_type as keyof typeof counts]++;
      }
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}