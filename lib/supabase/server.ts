/**
 * Server-side Supabase client
 * Used in API routes and Server Components
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createServerClient() {
  const cookieStore = cookies();

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op for server-side
      },
    },
  });
}