/**
 * Data-access layer for public writings and reactions.
 *
 * Every database read/write in the app funnels through this module so that
 * auth, moderation hooks (NFR-8), or rate-limit policies can be introduced
 * centrally later without rewriting API routes or pages.
 *
 * Anonymity note: rows are always inserted with `author_id: null`. When
 * authentication is added (post-V1), this is the single place to start
 * populating it — no schema rewrite required.
 */

import { getServerSupabase } from './supabase';
import type { CategoryKey, ChallengeModeKey } from '@/lib/config';

const WRITING_COLUMNS = 'id, content, word_count, category, challenge_mode, challenge_duration, created_at';

export interface PublicWritingRow {
  id: string;
  content: string;
  word_count: number;
  category: CategoryKey;
  challenge_mode: ChallengeModeKey;
  challenge_duration: number; // milliseconds
  created_at: string;
}

export interface PublicWritingWithReactions extends PublicWritingRow {
  total_reactions: number;
}

export interface CreateWritingInput {
  content: string;
  wordCount: number;
  category: CategoryKey;
  challengeMode: ChallengeModeKey;
  challengeDuration: number;
  /**
   * Reserved for post-V1 auth. Always null in V1 — anonymous publishing.
   */
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

/**
 * Fetch a single writing by id. Returns null when not found.
 */
export async function getPublicWriting(id: string): Promise<PublicWritingRow | null> {
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from('public_writings')
    .select(WRITING_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch writing: ${error.message}`);
  return (data as PublicWritingRow) ?? null;
}

/**
 * Detects PostgREST's "relation not found in schema cache" error, raised when
 * the aggregated reactions view hasn't been provisioned yet.
 */
function isMissingRelationError(error: { code?: string | null; message: string }): boolean {
  return (
    error.code === 'PGRST205' ||
    /in the schema cache|does not exist/i.test(error.message)
  );
}

const POPULAR_FALLBACK_WINDOW = 1000;

/**
 * Fallback for when the aggregated view isn't provisioned yet (reactions
 * migration pending): reads the base table and derives reaction totals from
 * embedded reaction rows.
 */
async function listWithoutReactionsView(
  params: WritingListParams
): Promise<PublicWritingWithReactions[]> {
  const supabase = getServerSupabase();
  const { sort = 'recent', category, limit = 20, offset = 0 } = params;

  // Popular ranking needs a global aggregate, which PostgREST can't express
  // without the view. We load a bounded recency window and rank it in memory
  // — adequate for the small datasets this app targets.
  const windowSize = sort === 'popular' ? POPULAR_FALLBACK_WINDOW : limit;

  let query = supabase
    .from('public_writings')
    .select(`${WRITING_COLUMNS}, writing_reactions(reaction_type)`)
    .order('created_at', { ascending: false })
    .range(0, Math.max(0, windowSize - 1));

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list writings: ${error.message}`);

  const rows = ((data ?? []) as Array<
    PublicWritingRow & { writing_reactions?: { reaction_type: string }[] | null }
  >).map((row) => ({
    ...row,
    total_reactions: row.writing_reactions?.length ?? 0,
  }));

  if (sort === 'popular') {
    rows.sort((a, b) => b.total_reactions - a.total_reactions);
    return rows.slice(offset, offset + limit);
  }

  return rows;
}

/**
 * List writings with reaction totals. Uses the aggregated view for both sorts
 * so every row carries a correct `total_reactions` value.
 */
export async function listPublicWritings(
  params: WritingListParams = {}
): Promise<PublicWritingWithReactions[]> {
  const supabase = getServerSupabase();
  const { sort = 'recent', category, limit = 20, offset = 0 } = params;

  let query = supabase
    .from('public_writings_with_reactions')
    .select(`${WRITING_COLUMNS}, total_reactions`)
    .order(sort === 'popular' ? 'total_reactions' : 'created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error)) {
      return listWithoutReactionsView(params);
    }
    throw new Error(`Failed to list writings: ${error.message}`);
  }
  return (data as PublicWritingWithReactions[]) ?? [];
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

/**
 * Add a reaction for an anonymous session fingerprint.
 * Returns 'duplicate' when this session already reacted with that type.
 */
export async function addReaction(
  writingId: string,
  reactionType: ReactionType,
  sessionFingerprint: string
): Promise<'added' | 'duplicate'> {
  const supabase = getServerSupabase();
  const match = {
    writing_id: writingId,
    reaction_type: reactionType,
    session_fingerprint: sessionFingerprint,
  };

  const { data: existing } = await supabase
    .from('writing_reactions')
    .select('id')
    .match(match)
    .maybeSingle();

  if (existing) return 'duplicate';

  const { error } = await supabase.from('writing_reactions').insert(match);

  if (error) {
    // Lost a race against a concurrent identical insert — treat as duplicate.
    if (error.code === '23505') return 'duplicate';
    throw new Error(`Failed to add reaction: ${error.message}`);
  }

  return 'added';
}

/**
 * Remove a reaction for an anonymous session fingerprint.
 */
export async function removeReaction(
  writingId: string,
  reactionType: ReactionType,
  sessionFingerprint: string
): Promise<void> {
  const supabase = getServerSupabase();

  const { error } = await supabase
    .from('writing_reactions')
    .delete()
    .match({
      writing_id: writingId,
      reaction_type: reactionType,
      session_fingerprint: sessionFingerprint,
    });

  if (error) throw new Error(`Failed to remove reaction: ${error.message}`);
}
