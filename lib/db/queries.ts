/**
 * Database Queries
 * All database operations for public writings.
 */

import { createServerClient } from './supabase';
import type { CategoryKey, ChallengeModeKey } from '@/lib/config';

export interface PublicWriting {
  id: string;
  content: string;
  word_count: number;
  category: CategoryKey;
  challenge_mode: ChallengeModeKey;
  challenge_duration: number; // seconds
  created_at: string;
}

export interface CreateWritingInput {
  content: string;
  word_count: number;
  category: CategoryKey;
  challenge_mode: ChallengeModeKey;
  challenge_duration: number;
}

export interface WritingListParams {
  sort?: 'recent' | 'popular';
  category?: CategoryKey;
  limit?: number;
  offset?: number;
}

/**
 * Insert a new public writing
 */
export async function createPublicWriting(
  input: CreateWritingInput
): Promise<PublicWriting> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('public_writings')
    .insert({
      content: input.content,
      word_count: input.word_count,
      category: input.category,
      challenge_mode: input.challenge_mode,
      challenge_duration: input.challenge_duration,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create writing: ${error.message}`);
  }

  return data;
}

/**
 * Get a single public writing by ID
 */
export async function getPublicWriting(id: string): Promise<PublicWriting | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('public_writings')
    .select()
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get writing: ${error.message}`);
  }

  return data;
}

/**
 * Get paginated list of public writings
 */
export async function getPublicWritings(
  params: WritingListParams = {}
): Promise<PublicWriting[]> {
  const supabase = createServerClient();
  const { sort = 'recent', category, limit = 20, offset = 0 } = params;

  let query = supabase
    .from('public_writings')
    .select()
    .order(sort === 'recent' ? 'created_at' : 'word_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get writings: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Get total count of public writings (for pagination)
 */
export async function getPublicWritingsCount(category?: CategoryKey): Promise<number> {
  const supabase = createServerClient();

  let query = supabase
    .from('public_writings')
    .select('*', { count: 'exact', head: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count writings: ${error.message}`);
  }

  return count ?? 0;
}