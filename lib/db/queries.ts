/**
 * Data-access layer for public writings and reactions.
 *
 * Feed/detail reads go through SECURITY DEFINER RPCs so each post can carry
 * its author's username without ever exposing app_users to clients directly.
 *
 * Identity model: publishing and reacting require a signed-in user. Posts
 * show the author's username; reaction rows are keyed by user id with one
 * reaction per user per writing.
 */

import { getServerSupabase } from './supabase';
import type { CategoryKey, ChallengeModeKey } from '@/lib/config';

export interface PublicWritingRow {
  id: string;
  content: string;
  word_count: number;
  category: CategoryKey;
  challenge_mode: ChallengeModeKey;
  challenge_duration: number; // milliseconds
  created_at: string;
  author_username: string | null;
  total_reactions: number;
}

export interface CreateWritingInput {
  content: string;
  wordCount: number;
  category: CategoryKey;
  challengeMode: ChallengeModeKey;
  challengeDuration: number;
  /** Set from the signed-in session at publish time. */
  authorId?: string | null;
}

export interface WritingListParams {
  sort?: 'recent' | 'popular';
  category?: CategoryKey | null;
  limit?: number;
  offset?: number;
}

export type ReactionType = 'heart' | 'clap' | 'mind_blown' | 'relate';

export const reactionTypes: ReactionType[] = ['heart', 'clap', 'mind_blown', 'relate'];

/**
 * Insert a published writing. Returns the created row's id + timestamp.
 */
export async function createPublicWriting(
  input: CreateWritingInput
): Promise<{ id: string; createdAt: string }> {
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('public_writings')
    .insert({
      content: input.content,
      word_count: input.wordCount,
      category: input.category,
      challenge_mode: input.challengeMode,
      challenge_duration: input.challengeDuration,
      author_id: input.authorId ?? null,
    })
    .select('id, created_at')
    .single();

  if (error) throw new Error(`Failed to create writing: ${error.message}`);

  return { id: data.id, createdAt: data.created_at };
}

interface FeedRpcRow {
  id: string;
  content: string;
  word_count: number;
  category: CategoryKey;
  challenge_mode: ChallengeModeKey;
  challenge_duration: number;
  created_at: string;
  total_reactions: number;
  author_username: string | null;
}

/**
 * Fetch a single writing by id (with author username). Returns null when not found.
 */
export async function getPublicWriting(id: string): Promise<PublicWritingRow | null> {
  const supabase = getServerSupabase();

  const { data, error } = await supabase.rpc('get_feed_writing', { p_id: id });

  if (error) throw new Error(`Failed to fetch writing: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return (row as FeedRpcRow | undefined) ?? null;
}

/**
 * List writings with reaction totals and author usernames.
 */
export async function listPublicWritings(
  params: WritingListParams = {}
): Promise<PublicWritingRow[]> {
  const supabase = getServerSupabase();
  const { sort = 'recent', category = null, limit = 20, offset = 0 } = params;

  const { data, error } = await supabase.rpc('list_feed_writings', {
    p_sort: sort,
    p_category: category,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(`Failed to list writings: ${error.message}`);
  return (data as FeedRpcRow[]) ?? [];
}

/**
 * Total count of published writings, optionally filtered by category.
 */
export async function countPublicWritings(category?: CategoryKey | null): Promise<number> {
  const supabase = getServerSupabase();

  let query = supabase
    .from('public_writings')
    .select('id', { count: 'exact', head: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { count, error } = await query;
  if (error) throw new Error(`Failed to count writings: ${error.message}`);
  return count ?? 0;
}

export interface ReactionCounts {
  heart: number;
  clap: number;
  mind_blown: number;
  relate: number;
  total: number;
}

function emptyCounts(): ReactionCounts {
  return { heart: 0, clap: 0, mind_blown: 0, relate: 0, total: 0 };
}

function tallyCounts(rows: { reaction_type: string }[]): ReactionCounts {
  const counts = emptyCounts();
  for (const row of rows) {
    if ((reactionTypes as string[]).includes(row.reaction_type)) {
      counts[row.reaction_type as ReactionType] += 1;
      counts.total += 1;
    }
  }
  return counts;
}

/**
 * Aggregate reaction counts for one writing.
 */
export async function getReactionCounts(writingId: string): Promise<ReactionCounts> {
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('writing_reactions')
    .select('reaction_type')
    .eq('writing_id', writingId);

  if (error) throw new Error(`Failed to fetch reactions: ${error.message}`);
  return tallyCounts(data ?? []);
}

/** The signed-in user's current reaction on a writing, if any. */
export async function getUserReaction(
  writingId: string,
  userId: string
): Promise<ReactionType | null> {
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('writing_reactions')
    .select('reaction_type')
    .eq('writing_id', writingId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch your reaction: ${error.message}`);
  return ((data as { reaction_type: ReactionType } | null)?.reaction_type) ?? null;
}

/**
 * React as a signed-in user — one reaction per user per writing. Reacting
 * with a different emoji replaces the previous one.
 * Returns 'added' | 'switched' | 'duplicate'.
 */
export async function addReaction(
  writingId: string,
  reactionType: ReactionType,
  userId: string
): Promise<'added' | 'switched' | 'duplicate'> {
  const supabase = getServerSupabase();
  const existing = await getUserReaction(writingId, userId);

  if (existing === reactionType) return 'duplicate';

  if (existing) {
    const { error: delError } = await supabase
      .from('writing_reactions')
      .delete()
      .match({ writing_id: writingId, user_id: userId });
    if (delError) throw new Error(`Failed to switch reaction: ${delError.message}`);
  }

  const { error } = await supabase
    .from('writing_reactions')
    .insert({ writing_id: writingId, reaction_type: reactionType, user_id: userId });

  if (error) {
    // Lost a race against a concurrent identical insert — treat as duplicate.
    if (error.code === '23505') return 'duplicate';
    throw new Error(`Failed to add reaction: ${error.message}`);
  }

  return existing ? 'switched' : 'added';
}

/**
 * Remove the signed-in user's reaction on a writing.
 */
export async function removeReaction(writingId: string, userId: string): Promise<void> {
  const supabase = getServerSupabase();

  const { error } = await supabase
    .from('writing_reactions')
    .delete()
    .match({ writing_id: writingId, user_id: userId });

  if (error) throw new Error(`Failed to remove reaction: ${error.message}`);
}
