import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client (TASK-103a) — SERVER-ONLY.
 *
 * Bypasses Row-Level Security, so it must NEVER be imported into client code.
 * Required for registration because `students` has RLS enabled with no INSERT
 * policy and no user session exists yet at sign-up time.
 *
 * Uses the plain `@supabase/supabase-js` client (not `@supabase/ssr`): no cookies,
 * no session persistence.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only) in .env.local",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
