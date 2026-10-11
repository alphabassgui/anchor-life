import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client factory (TASK-102).
 *
 * Safe for Client Components. Uses only the public anon key — the
 * SUPABASE_SERVICE_ROLE_KEY must NEVER reach the browser bundle (AGENTS.md §3.4).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
