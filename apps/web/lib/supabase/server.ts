import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client for Next.js Server Components / Route Handlers.
 * Anon key + the user's auth cookie. RLS enforces tenancy.
 *
 * NEVER import the service-role key in this app — it lives in apps/jobs only.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component context — setAll is a no-op here.
            // Middleware refreshes the session.
          }
        },
      },
    },
  );
}
