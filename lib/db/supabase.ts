/**
 * Supabase Client
 * Server-side and client-side clients for database operations.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Client-side Supabase client (for use in React components)
 */
export const createBrowserClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Server-side Supabase client (for use in API routes, server actions)
 */
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Export a default instance for convenience (browser only)
export const supabase = typeof window !== 'undefined' ? createBrowserClient() : null;