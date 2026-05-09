import { createClient } from '@supabase/supabase-js';

/**
 * Worker-side Supabase client.
 * Uses the SERVICE-ROLE key — bypasses RLS.
 *
 * This client must never be imported by apps/web. Workers are
 * authenticated by job ownership, not by user session, so they need
 * unrestricted access to read/write any user's job rows.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase config: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
