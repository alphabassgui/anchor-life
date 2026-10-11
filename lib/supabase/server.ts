import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client factory for Server Components and Route Handlers (TASK-102).
 *
 * Next.js 16: `cookies()` is async, so this factory is async and must be awaited.
 * Cookie handling uses the current `@supabase/ssr` `getAll`/`setAll` API.
 * Uses only the public anon key — never the service-role key (AGENTS.md §3.4).
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` was called from a Server Component render, where writing
          // cookies is not allowed. Safe to ignore: the middleware refreshes
          // the session and writes the cookies on its response.
        }
      },
    },
  });
}
