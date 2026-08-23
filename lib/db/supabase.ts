/**
 * Supabase clients.
 *
 * Server client (service role): used exclusively by the data-access layer in
 * `lib/db/queries.ts`. Never import this directly from UI components.
 *
 * Auth-readiness (NFR-5 / techstack.md §5): all writes go through
 * `lib/db/queries.ts`, so when authentication lands, an author identity and
 * ownership checks can be inserted centrally without touching API routes.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let serverClient: SupabaseClient | null = null;

/**
 * Server-side client. Prefers the service-role key; falls back to the anon
 * key, which the DB policies allow for anonymous read/write. Lazy so that
 * importing this module never throws at build time when env vars are absent.
 */
export function getServerSupabase(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }

  serverClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}
